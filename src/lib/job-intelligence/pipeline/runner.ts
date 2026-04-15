// ─── Job Intelligence Pipeline Runner ───────────────────────────────
// Orchestrates the full pipeline: collect -> store -> dedup -> parse -> normalize -> match -> summary

import { Circle8Collector, NemensisCollector } from "../collectors";
import { parseJobDescription } from "../parsers";
import {
  getUnparsedRawJobs,
  markRawJobParsed,
  insertNormalizedJob,
  getNormalizedJobs,
  getTopBodyLeasingJobs,
  getSourceBreakdown,
  getRecentJobsCount,
} from "../db";
import { runMatchingForJob } from "../matching";
import { PipelineResult, DailySummary, CollectorResult } from "../types";

// ─── Full Pipeline ─────────────────────────────────────────────────

export async function runFullPipeline(options?: {
  maxPages?: number;
  sources?: string[];
}): Promise<PipelineResult> {
  const startTime = Date.now();
  const errors: string[] = [];
  const collectionResults: CollectorResult[] = [];
  const sources = options?.sources || ["circle8", "nemensis"];
  const maxPages = options?.maxPages || 3;

  // Step 1: Collect jobs from sources
  console.log("[Pipeline] Step 1: Collecting jobs...");
  for (const source of sources) {
    try {
      const result = await collectFromSource(source, maxPages);
      collectionResults.push(result);
      console.log(`[Pipeline] ${source}: ${result.newJobs} new, ${result.duplicates} duplicates, ${result.errors.length} errors`);
      errors.push(...result.errors.map((e) => `[${source}] ${e}`));
    } catch (err) {
      const msg = `Collection failed for ${source}: ${err instanceof Error ? err.message : String(err)}`;
      errors.push(msg);
      console.error(`[Pipeline] ${msg}`);
    }
  }

  // Step 2: Parse unparsed raw jobs with AI
  console.log("[Pipeline] Step 2: Parsing raw jobs...");
  const parsedCount = await parseUnparsedJobs();
  console.log(`[Pipeline] Parsed ${parsedCount} jobs`);

  // Step 3: Run matching for new normalized jobs
  console.log("[Pipeline] Step 3: Running matching...");
  const matchesGenerated = await runMatchingForNewJobs();
  console.log(`[Pipeline] Generated matches for ${matchesGenerated} jobs`);

  const duration = Date.now() - startTime;
  console.log(`[Pipeline] Complete in ${duration}ms`);

  return {
    collectionResults,
    parsedCount,
    normalizedCount: parsedCount,
    matchesGenerated,
    errors,
    duration,
  };
}

// ─── Individual Pipeline Steps ─────────────────────────────────────

async function collectFromSource(source: string, maxPages: number): Promise<CollectorResult> {
  switch (source) {
    case "circle8":
      return new Circle8Collector().collect(maxPages);
    case "nemensis":
      return new NemensisCollector().collect(maxPages);
    default:
      throw new Error(`Unknown source: ${source}`);
  }
}

async function parseUnparsedJobs(): Promise<number> {
  const unparsed = await getUnparsedRawJobs(100);
  let count = 0;

  for (const raw of unparsed) {
    try {
      let payload: Record<string, unknown> = {};
      try {
        payload = JSON.parse(raw.rawPayload);
      } catch {
        payload = {};
      }

      const parsed = parseJobDescription(
        raw.titleRaw,
        raw.descriptionRaw,
        raw.source,
        payload
      );

      await insertNormalizedJob({
        rawJobId: raw.id,
        titleClean: raw.titleRaw,
        roleFamily: parsed.roleFamily || undefined,
        seniority: parsed.seniority || undefined,
        techStackJson: JSON.stringify(parsed.techStack),
        mustHaveJson: JSON.stringify(parsed.mustHaveSkills),
        niceToHaveJson: JSON.stringify(parsed.niceToHaveSkills),
        languagesJson: JSON.stringify(parsed.languages),
        remoteType: parsed.remoteType || undefined,
        contractModel: parsed.contractModel || undefined,
        location: parsed.locationCity || undefined,
        locationCountry: parsed.locationCountry || undefined,
        projectDuration: parsed.projectDuration || undefined,
        startDate: parsed.startDate || undefined,
        weeklyHours: parsed.weeklyHours || undefined,
        capacityPercent: parsed.capacityPercent || undefined,
        rateMax: parsed.rateMax || undefined,
        urgencyScore: parsed.urgencyScore,
        bodyLeasingFitScore: parsed.bodyLeasingFitScore,
        candidateDifficultyScore: parsed.candidateDifficultyScore,
        summary: parsed.summary || undefined,
        customerType: parsed.customerType || undefined,
        sourceSignals: JSON.stringify(parsed.sourceSignals),
      });

      await markRawJobParsed(raw.id);
      count++;
    } catch (err) {
      console.error(`[Parser] Failed to parse job ${raw.id}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return count;
}

async function runMatchingForNewJobs(): Promise<number> {
  const newJobs = await getNormalizedJobs({ status: "new", limit: 100 });
  let count = 0;

  for (const job of newJobs) {
    try {
      const jobId = job.id as number;
      await runMatchingForJob(jobId);
      count++;
    } catch (err) {
      console.error(`[Matching] Failed for job ${job.id}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return count;
}

// ─── Daily Summary Generator ───────────────────────────────────────

export async function generateDailySummary(): Promise<DailySummary> {
  const recentCount = await getRecentJobsCount(24);
  const topJobs = await getTopBodyLeasingJobs(5);
  const sourceBreakdown = await getSourceBreakdown();

  // Get top matches from last 24h
  const topMatches: DailySummary["topMatches"] = [];
  // We'll query recent matches with joins
  // For now, use the topJobs to indicate available matching targets

  const breakdown: Record<string, number> = {};
  for (const s of sourceBreakdown) {
    breakdown[s.source] = s.count;
  }

  return {
    date: new Date().toISOString().split("T")[0],
    newJobsCollected: recentCount,
    jobsParsed: recentCount,
    topBodyLeasingJobs: topJobs.map((j) => ({
      id: j.id as number,
      title: j.titleClean as string,
      source: j.source as string,
      bodyLeasingFitScore: j.bodyLeasingFitScore as number,
      urgencyScore: j.urgencyScore as number,
    })),
    topMatches,
    sourceBreakdown: breakdown,
  };
}

// ─── Manual Job Injection (for testing / manual entry) ─────────────

export async function injectManualJob(data: {
  title: string;
  description: string;
  source?: string;
  location?: string;
  url?: string;
}): Promise<{ rawJobId: number; normalizedJobId: number }> {
  const crypto = await import("crypto");
  const hash = crypto.createHash("sha256")
    .update(`manual:${data.title}:${data.description.slice(0, 500)}`)
    .digest("hex");

  const { insertRawJob } = await import("../db");
  const rawJobId = await insertRawJob({
    source: data.source || "manual",
    url: data.url || undefined,
    titleRaw: data.title,
    descriptionRaw: data.description,
    locationRaw: data.location || undefined,
    rawPayload: JSON.stringify({ manual: true }),
    hashSignature: hash,
  });

  const parsed = parseJobDescription(data.title, data.description, data.source || "manual", {});

  const normalizedJobId = await insertNormalizedJob({
    rawJobId,
    titleClean: data.title,
    roleFamily: parsed.roleFamily || undefined,
    seniority: parsed.seniority || undefined,
    techStackJson: JSON.stringify(parsed.techStack),
    mustHaveJson: JSON.stringify(parsed.mustHaveSkills),
    niceToHaveJson: JSON.stringify(parsed.niceToHaveSkills),
    languagesJson: JSON.stringify(parsed.languages),
    remoteType: parsed.remoteType || undefined,
    contractModel: parsed.contractModel || undefined,
    location: parsed.locationCity || undefined,
    locationCountry: parsed.locationCountry || undefined,
    projectDuration: parsed.projectDuration || undefined,
    startDate: parsed.startDate || undefined,
    weeklyHours: parsed.weeklyHours || undefined,
    capacityPercent: parsed.capacityPercent || undefined,
    rateMax: parsed.rateMax || undefined,
    urgencyScore: parsed.urgencyScore,
    bodyLeasingFitScore: parsed.bodyLeasingFitScore,
    candidateDifficultyScore: parsed.candidateDifficultyScore,
    summary: parsed.summary || undefined,
    customerType: parsed.customerType || undefined,
    sourceSignals: JSON.stringify(parsed.sourceSignals),
  });

  await markRawJobParsed(rawJobId);
  await runMatchingForJob(normalizedJobId);

  return { rawJobId, normalizedJobId };
}
