// ─── Job Intelligence Module Types ──────────────────────────────────

export interface RawJobData {
  source: string;
  externalJobId?: string;
  url?: string;
  titleRaw: string;
  descriptionRaw: string;
  locationRaw?: string;
  postedAtRaw?: string;
  rawPayload: Record<string, unknown>;
}

export interface CollectorResult {
  jobs: RawJobData[];
  source: string;
  collectedAt: string;
  totalFound: number;
  newJobs: number;
  duplicates: number;
  errors: string[];
}

export interface ParsedJobData {
  roleFamily: string | null;
  seniority: string | null;
  mustHaveSkills: string[];
  niceToHaveSkills: string[];
  techStack: string[];
  languages: Array<{ lang: string; level: string }>;
  locationCity: string | null;
  locationCountry: string | null;
  remoteType: string | null;
  employmentType: string | null;
  contractModel: string | null;
  projectDuration: string | null;
  startDate: string | null;
  weeklyHours: string | null;
  capacityPercent: string | null;
  rateMax: string | null;
  customerType: string | null;
  summary: string | null;
  bodyLeasingFitScore: number;
  urgencyScore: number;
  candidateDifficultyScore: number;
  sourceSignals: Record<string, unknown>;
}

export interface Circle8Signals extends Record<string, unknown> {
  anuType?: string;
  extensionOption?: string;
  weeklyHours?: string;
  deadline?: string;
  referenceCode?: string;
}

export interface NemensisSignals extends Record<string, unknown> {
  capacityPercent?: string;
  rate?: string;
  remoteOnsiteRatio?: string;
  languageLevels?: Array<{ lang: string; level: string }>;
  securityClearance?: string;
}

export interface MatchResult {
  candidateId: number;
  matchScore: number;
  explanation: string;
  missingSkills: string[];
  hardFilterPass: boolean;
  skillOverlap: number;
}

export interface PipelineResult {
  collectionResults: CollectorResult[];
  parsedCount: number;
  normalizedCount: number;
  matchesGenerated: number;
  errors: string[];
  duration: number;
}

export interface DailySummary {
  date: string;
  newJobsCollected: number;
  jobsParsed: number;
  topBodyLeasingJobs: Array<{
    id: number;
    title: string;
    source: string;
    bodyLeasingFitScore: number;
    urgencyScore: number;
  }>;
  topMatches: Array<{
    jobTitle: string;
    candidateName: string;
    matchScore: number;
  }>;
  sourceBreakdown: Record<string, number>;
}
