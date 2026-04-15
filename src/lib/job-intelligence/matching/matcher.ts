// ─── Job-Candidate Matching Engine ──────────────────────────────────
// Extends the existing calculateMatchScore with weighted multi-factor matching.
// Hard filters + skill overlap + weighted scoring.

import { MatchResult } from "../types";
import { calculateMatchScore } from "../../skills";
import { prisma } from "@/lib/prisma";
import { insertJobMatch, deleteOldMatches } from "../db";

interface NormalizedJobForMatch {
  id: number;
  titleClean: string;
  roleFamily: string | null;
  seniority: string | null;
  mustHaveJson: string | null;
  niceToHaveJson: string | null;
  techStackJson: string | null;
  languagesJson: string | null;
  remoteType: string | null;
  contractModel: string | null;
  location: string | null;
  locationCountry: string | null;
}

interface CandidateForMatch {
  id: number;
  name: string;
  title: string | null;
  skills: string;
  experience: number;
  location: string | null;
  status: string;
}

// ─── Weights for scoring ───────────────────────────────────────────

const WEIGHTS = {
  mustHaveOverlap: 0.40,
  niceToHaveOverlap: 0.10,
  techStackOverlap: 0.15,
  seniorityMatch: 0.10,
  locationMatch: 0.10,
  languageMatch: 0.10,
  experienceMatch: 0.05,
};

// ─── Main Matching Function ────────────────────────────────────────

export async function matchJobToCandidates(
  job: NormalizedJobForMatch,
  options?: { minScore?: number; limit?: number }
): Promise<MatchResult[]> {
  const minScore = options?.minScore ?? 20;
  const limit = options?.limit ?? 50;

  // Get all active candidates
  const candidates = await prisma.candidate.findMany({
    where: {
      status: { notIn: ["rejected"] },
    },
    select: {
      id: true,
      name: true,
      title: true,
      skills: true,
      experience: true,
      location: true,
      status: true,
    },
  });

  const mustHave: string[] = safeJsonParse(job.mustHaveJson, []);
  const niceToHave: string[] = safeJsonParse(job.niceToHaveJson, []);
  const techStack: string[] = safeJsonParse(job.techStackJson, []);
  const languages: Array<{ lang: string; level: string }> = safeJsonParse(job.languagesJson, []);

  const results: MatchResult[] = [];

  for (const candidate of candidates) {
    const candidateSkills: string[] = safeJsonParse(candidate.skills, []);

    // Hard filter checks
    const hardFilterResult = checkHardFilters(job, candidate, candidateSkills, mustHave, languages);

    // Skill overlap calculations
    const mustHaveOverlap = calculateOverlap(candidateSkills, mustHave);
    const niceToHaveOverlap = calculateOverlap(candidateSkills, niceToHave);
    const techStackOverlap = calculateOverlap(candidateSkills, techStack);

    // Seniority match
    const seniorityScore = calculateSeniorityMatch(job.seniority, candidate.experience);

    // Location match
    const locationScore = calculateLocationMatch(job, candidate);

    // Language match
    const languageScore = calculateLanguageMatch(languages, candidateSkills, candidate);

    // Experience match
    const experienceScore = calculateExperienceMatch(job.seniority, candidate.experience);

    // Weighted final score
    const weightedScore = Math.round(
      mustHaveOverlap * WEIGHTS.mustHaveOverlap * 100 +
      niceToHaveOverlap * WEIGHTS.niceToHaveOverlap * 100 +
      techStackOverlap * WEIGHTS.techStackOverlap * 100 +
      seniorityScore * WEIGHTS.seniorityMatch +
      locationScore * WEIGHTS.locationMatch +
      languageScore * WEIGHTS.languageMatch +
      experienceScore * WEIGHTS.experienceMatch
    );

    if (weightedScore >= minScore) {
      // Find missing must-have skills
      const missingSkills = mustHave.filter(
        (s) => !candidateSkills.some((cs) => cs.toLowerCase() === s.toLowerCase())
      );

      // Generate explanation
      const explanation = generateExplanation(
        candidate.name,
        job.titleClean,
        mustHaveOverlap,
        missingSkills,
        hardFilterResult.pass,
        hardFilterResult.reasons
      );

      results.push({
        candidateId: candidate.id,
        matchScore: Math.min(100, weightedScore),
        explanation,
        missingSkills,
        hardFilterPass: hardFilterResult.pass,
        skillOverlap: techStackOverlap,
      });
    }
  }

  // Sort by score descending
  results.sort((a, b) => b.matchScore - a.matchScore);
  return results.slice(0, limit);
}

// ─── Run matching and persist results ──────────────────────────────

export async function runMatchingForJob(normalizedJobId: number): Promise<number> {
  // Fetch normalized job
  const jobRows = await prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
    `SELECT * FROM NormalizedJob WHERE id = ?`,
    normalizedJobId
  );

  if (!jobRows.length) return 0;

  const job = jobRows[0] as unknown as NormalizedJobForMatch;

  // Delete old matches for this job
  await deleteOldMatches(normalizedJobId);

  // Run matching
  const matches = await matchJobToCandidates(job);

  // Persist matches
  for (const match of matches) {
    await insertJobMatch({
      normalizedJobId,
      candidateId: match.candidateId,
      matchScore: match.matchScore,
      explanation: match.explanation,
      missingSkills: JSON.stringify(match.missingSkills),
      hardFilterPass: match.hardFilterPass,
      skillOverlap: match.skillOverlap,
    });
  }

  return matches.length;
}

// ─── Helper Functions ──────────────────────────────────────────────

function safeJsonParse<T>(json: string | null, fallback: T): T {
  if (!json) return fallback;
  try {
    return JSON.parse(json);
  } catch {
    return fallback;
  }
}

function calculateOverlap(candidateSkills: string[], requiredSkills: string[]): number {
  if (!requiredSkills.length) return 0;
  const candidateLower = candidateSkills.map((s) => s.toLowerCase());
  const matched = requiredSkills.filter((s) => candidateLower.includes(s.toLowerCase()));
  return matched.length / requiredSkills.length;
}

function checkHardFilters(
  job: NormalizedJobForMatch,
  candidate: CandidateForMatch,
  candidateSkills: string[],
  mustHave: string[],
  languages: Array<{ lang: string; level: string }>
): { pass: boolean; reasons: string[] } {
  const reasons: string[] = [];

  // Must have at least 30% of must-have skills
  if (mustHave.length > 0) {
    const overlap = calculateOverlap(candidateSkills, mustHave);
    if (overlap < 0.3) {
      reasons.push(`Must-have skill overlap too low: ${Math.round(overlap * 100)}%`);
    }
  }

  // German language required with high level -> check candidate location/notes for Turkish context
  // (Nearshore candidates from Turkey may speak German)
  const germanRequired = languages.some(
    (l) => l.lang === "German" && /native|c[12]|fluent|mutter/i.test(l.level)
  );
  if (germanRequired) {
    // We can't fully verify language from candidate data, just flag it
    reasons.push("Native/fluent German required - verify with candidate");
  }

  return {
    pass: reasons.length === 0,
    reasons,
  };
}

function calculateSeniorityMatch(jobSeniority: string | null, candidateExperience: number): number {
  if (!jobSeniority) return 50;

  const seniorityYears: Record<string, [number, number]> = {
    junior: [0, 2],
    mid: [2, 5],
    senior: [5, 10],
    lead: [8, 15],
    principal: [10, 25],
  };

  const range = seniorityYears[jobSeniority];
  if (!range) return 50;

  if (candidateExperience >= range[0] && candidateExperience <= range[1]) return 100;
  if (candidateExperience > range[1]) return 70; // Overqualified but still OK
  if (candidateExperience >= range[0] - 1) return 60; // Close enough

  return 20;
}

function calculateLocationMatch(
  job: NormalizedJobForMatch,
  candidate: CandidateForMatch
): number {
  // Remote jobs match anyone
  if (job.remoteType === "remote") return 100;

  // No location requirement
  if (!job.location && !job.locationCountry) return 70;

  // Candidate location match
  if (candidate.location && job.location) {
    if (candidate.location.toLowerCase().includes(job.location.toLowerCase())) return 100;
  }

  // For nearshore/body leasing, Turkey candidates are good for Germany
  if (candidate.location && /turkey|türkei|istanbul|ankara|izmir/i.test(candidate.location)) {
    if (job.remoteType === "remote" || job.remoteType === "hybrid") return 80;
    return 40;
  }

  return 50;
}

function calculateLanguageMatch(
  requiredLanguages: Array<{ lang: string; level: string }>,
  candidateSkills: string[],
  candidate: CandidateForMatch
): number {
  if (!requiredLanguages.length) return 70;

  let score = 100;
  for (const lang of requiredLanguages) {
    if (lang.lang === "English") {
      // Most IT professionals speak English
      score -= 0;
    } else if (lang.lang === "German") {
      if (/native|c[12]|fluent|mutter/i.test(lang.level)) {
        score -= 30; // Hard requirement for nearshore
      } else {
        score -= 10;
      }
    }
  }

  return Math.max(0, score);
}

function calculateExperienceMatch(jobSeniority: string | null, candidateExperience: number): number {
  if (!jobSeniority) return 50;
  return calculateSeniorityMatch(jobSeniority, candidateExperience);
}

function generateExplanation(
  candidateName: string,
  jobTitle: string,
  mustHaveOverlap: number,
  missingSkills: string[],
  hardFilterPass: boolean,
  hardFilterReasons: string[]
): string {
  const parts: string[] = [];

  parts.push(`${candidateName} -> ${jobTitle}`);
  parts.push(`Must-have skill match: ${Math.round(mustHaveOverlap * 100)}%`);

  if (missingSkills.length > 0) {
    parts.push(`Missing: ${missingSkills.slice(0, 5).join(", ")}`);
  }

  if (!hardFilterPass) {
    parts.push(`Warnings: ${hardFilterReasons.join("; ")}`);
  }

  return parts.join(". ");
}
