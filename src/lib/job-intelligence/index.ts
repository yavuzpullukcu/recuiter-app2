// ─── Job Intelligence Module ────────────────────────────────────────
// Central export for all job intelligence features.

// Types
export type {
  RawJobData,
  CollectorResult,
  ParsedJobData,
  Circle8Signals,
  NemensisSignals,
  MatchResult,
  PipelineResult,
  DailySummary,
} from "./types";

// Collectors
export { BaseCollector, Circle8Collector, NemensisCollector } from "./collectors";

// Parsers
export { parseJobDescription } from "./parsers";

// Matching
export { matchJobToCandidates, runMatchingForJob } from "./matching";

// Pipeline
export { runFullPipeline, generateDailySummary, injectManualJob } from "./pipeline";

// DB Operations
export {
  insertRawJob,
  rawJobExistsByHash,
  getUnparsedRawJobs,
  getNormalizedJobs,
  getNormalizedJobById,
  getMatchesForJob,
  getMatchesForCandidate,
  getSourceBreakdown,
  getTopBodyLeasingJobs,
  getRecentJobsCount,
  getHiringTrends,
} from "./db";
