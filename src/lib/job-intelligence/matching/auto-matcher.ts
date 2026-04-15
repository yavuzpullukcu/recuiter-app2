import Database from 'better-sqlite3';

export function runAutoMatching(db: Database.Database) {
  try {
    // Get all jobs and candidates
    const jobs = db.prepare(`SELECT * FROM NormalizedJob`).all() as any[];
    const candidates = db.prepare(`SELECT * FROM Candidate`).all() as any[];

    let matchCount = 0;

    for (const job of jobs) {
      for (const candidate of candidates) {
        const score = calculateMatchScore(job, candidate);

        if (score > 0) {
          // Extract matching and missing skills
          const jobSkills = parseSkills(job.requiredSkills);
          const candidateSkills = parseSkills(candidate.primarySkills);

          const matchedSkills = jobSkills.filter(s =>
            candidateSkills.some(cs => cs.toLowerCase().includes(s.toLowerCase()) || s.toLowerCase().includes(cs.toLowerCase()))
          );

          const missingSkills = jobSkills.filter(s =>
            !matchedSkills.includes(s)
          );

          // Insert or update match
          const stmt = db.prepare(`
            INSERT OR REPLACE INTO JobMatch (jobId, candidateId, matchScore, matchedSkills, missingSkills)
            VALUES (?, ?, ?, ?, ?)
          `);

          stmt.run(
            job.id,
            candidate.id,
            Math.round(score),
            JSON.stringify(matchedSkills),
            JSON.stringify(missingSkills)
          );

          matchCount++;
        }
      }
    }

    console.log(`✓ Matching completed: ${matchCount} matches created`);
    return matchCount;
  } catch (error) {
    console.error('✗ Matching error:', error);
    throw error;
  }
}

function calculateMatchScore(job: any, candidate: any): number {
  let score = 0;

  // 1. Must-have Skills (40%)
  const jobSkills = parseSkills(job.requiredSkills);
  const candidateSkills = parseSkills(candidate.primarySkills);
  const mustHaveMatch = calculateSkillMatch(jobSkills, candidateSkills);
  score += mustHaveMatch * 40;

  // 2. Tech Stack (15%)
  const secondarySkills = parseSkills(candidate.secondarySkills);
  const allCandidateSkills = [...candidateSkills, ...secondarySkills];
  const techStackMatch = calculateSkillMatch(jobSkills, allCandidateSkills);
  score += techStackMatch * 15;

  // 3. Seniority (10%)
  const seniority = job.seniority?.toLowerCase() || 'mid';
  const candYears = candidate.yearsOfExperience || 0;
  let seniorityScore = 0.5; // Default

  if (seniority === 'entry' && candYears <= 2) seniorityScore = 1;
  else if (seniority === 'entry') seniorityScore = 0.7;
  else if (seniority === 'mid' && candYears >= 3 && candYears <= 7) seniorityScore = 1;
  else if (seniority === 'mid' && candYears < 3) seniorityScore = 0.7;
  else if (seniority === 'mid' && candYears > 7) seniorityScore = 0.9;
  else if (seniority === 'senior' && candYears >= 7) seniorityScore = 1;
  else if (seniority === 'senior' && candYears >= 5) seniorityScore = 0.8;
  else if (seniority === 'lead' && candYears >= 10) seniorityScore = 1;
  else if (seniority === 'lead' && candYears >= 8) seniorityScore = 0.8;

  score += seniorityScore * 10;

  // 4. Location (10%) - Nearshore bonus for Turkey
  const location = candidate.location?.toLowerCase() || '';
  let locationScore = 0;
  if (location.includes('turkey') || location.includes('istanbul') || location.includes('ankara')) {
    locationScore = 1;
  } else {
    locationScore = 0.5;
  }
  score += locationScore * 10;

  // 5. Language (10%)
  const requiredLanguages = parseSkills(job.requiredLanguages);
  const englishLevel = candidate.englishLevel || '';
  const germanLevel = candidate.germanLevel || '';
  let languageScore = 0.3;

  if (requiredLanguages.some(l => l.toLowerCase().includes('english')) && englishLevel) languageScore += 0.3;
  if (requiredLanguages.some(l => l.toLowerCase().includes('german')) && germanLevel) languageScore += 0.4;
  if (!requiredLanguages.length) languageScore = 1;

  score += Math.min(languageScore, 1) * 10;

  // 6. Experience (5%)
  const expMatch = Math.min(candYears / 10, 1); // Max 10 years for 100%
  score += expMatch * 5;

  // 7. Nice-to-have Skills (10%)
  const niceToHave = parseSkills(job.niceToHaveSkills);
  const niceMatch = calculateSkillMatch(niceToHave, allCandidateSkills);
  score += niceMatch * 10;

  return Math.min(score, 100);
}

function parseSkills(skillsStr: string | any): string[] {
  if (!skillsStr) return [];

  // If it's already parsed (array)
  if (Array.isArray(skillsStr)) return skillsStr;

  // If it's a JSON string
  if (typeof skillsStr === 'string' && (skillsStr.startsWith('[') || skillsStr.startsWith('{'))) {
    try {
      const parsed = JSON.parse(skillsStr);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  // If it's a comma-separated string
  if (typeof skillsStr === 'string') {
    return skillsStr
      .split(',')
      .map(s => s.trim())
      .filter(s => s.length > 0);
  }

  return [];
}

function calculateSkillMatch(requiredSkills: string[], candidateSkills: string[]): number {
  if (requiredSkills.length === 0) return 1;

  const matches = requiredSkills.filter(req =>
    candidateSkills.some(cand =>
      cand.toLowerCase().includes(req.toLowerCase()) ||
      req.toLowerCase().includes(cand.toLowerCase())
    )
  );

  return matches.length / requiredSkills.length;
}
