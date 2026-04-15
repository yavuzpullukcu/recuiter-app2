// ─── Job Intelligence DB Layer ──────────────────────────────────────
// Direct SQL queries for the job intelligence tables since Prisma client
// was generated on Windows and can't run in all environments.
// Falls back to raw SQL via better-sqlite3 or prisma.$queryRawUnsafe.

import { prisma } from "@/lib/prisma";

// ─── RawJob Operations ─────────────────────────────────────────────

export async function insertRawJob(data: {
  source: string;
  externalJobId?: string;
  url?: string;
  titleRaw: string;
  descriptionRaw: string;
  locationRaw?: string;
  postedAtRaw?: string;
  rawPayload: string;
  hashSignature: string;
}): Promise<number> {
  const result = await prisma.$queryRawUnsafe<Array<{ id: number }>>(
    `INSERT INTO RawJob (source, externalJobId, url, titleRaw, descriptionRaw, locationRaw, postedAtRaw, rawPayload, hashSignature, parsed, scrapedAt, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, datetime('now'), datetime('now'), datetime('now'))
     RETURNING id`,
    data.source,
    data.externalJobId || null,
    data.url || null,
    data.titleRaw,
    data.descriptionRaw,
    data.locationRaw || null,
    data.postedAtRaw || null,
    data.rawPayload,
    data.hashSignature
  );
  return result[0].id;
}

export async function rawJobExistsByHash(hash: string): Promise<boolean> {
  const result = await prisma.$queryRawUnsafe<Array<{ cnt: number }>>(
    `SELECT COUNT(*) as cnt FROM RawJob WHERE hashSignature = ?`,
    hash
  );
  return result[0].cnt > 0;
}

export async function getUnparsedRawJobs(limit = 50): Promise<Array<{
  id: number;
  source: string;
  externalJobId: string | null;
  url: string | null;
  titleRaw: string;
  descriptionRaw: string;
  locationRaw: string | null;
  postedAtRaw: string | null;
  rawPayload: string;
}>> {
  return prisma.$queryRawUnsafe(
    `SELECT id, source, externalJobId, url, titleRaw, descriptionRaw, locationRaw, postedAtRaw, rawPayload
     FROM RawJob WHERE parsed = 0 ORDER BY createdAt DESC LIMIT ?`,
    limit
  );
}

export async function markRawJobParsed(id: number): Promise<void> {
  await prisma.$queryRawUnsafe(
    `UPDATE RawJob SET parsed = 1, updatedAt = datetime('now') WHERE id = ?`,
    id
  );
}

// ─── NormalizedJob Operations ──────────────────────────────────────

export async function insertNormalizedJob(data: {
  rawJobId: number;
  titleClean: string;
  roleFamily?: string;
  seniority?: string;
  techStackJson?: string;
  mustHaveJson?: string;
  niceToHaveJson?: string;
  languagesJson?: string;
  remoteType?: string;
  contractModel?: string;
  location?: string;
  locationCountry?: string;
  projectDuration?: string;
  startDate?: string;
  weeklyHours?: string;
  capacityPercent?: string;
  rateMax?: string;
  urgencyScore?: number;
  bodyLeasingFitScore?: number;
  candidateDifficultyScore?: number;
  summary?: string;
  customerType?: string;
  sourceSignals?: string;
}): Promise<number> {
  const result = await prisma.$queryRawUnsafe<Array<{ id: number }>>(
    `INSERT INTO NormalizedJob (
      rawJobId, titleClean, roleFamily, seniority, techStackJson, mustHaveJson,
      niceToHaveJson, languagesJson, remoteType, contractModel, location, locationCountry,
      projectDuration, startDate, weeklyHours, capacityPercent, rateMax,
      urgencyScore, bodyLeasingFitScore, candidateDifficultyScore,
      summary, customerType, sourceSignals, status, createdAt, updatedAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'new', datetime('now'), datetime('now'))
    RETURNING id`,
    data.rawJobId,
    data.titleClean,
    data.roleFamily || null,
    data.seniority || null,
    data.techStackJson || null,
    data.mustHaveJson || null,
    data.niceToHaveJson || null,
    data.languagesJson || null,
    data.remoteType || null,
    data.contractModel || null,
    data.location || null,
    data.locationCountry || null,
    data.projectDuration || null,
    data.startDate || null,
    data.weeklyHours || null,
    data.capacityPercent || null,
    data.rateMax || null,
    data.urgencyScore ?? 0,
    data.bodyLeasingFitScore ?? 0,
    data.candidateDifficultyScore ?? 0,
    data.summary || null,
    data.customerType || null,
    data.sourceSignals || null
  );
  return result[0].id;
}

export async function getNormalizedJobs(filters?: {
  status?: string;
  roleFamily?: string;
  minBodyLeasingScore?: number;
  limit?: number;
  offset?: number;
}): Promise<Array<Record<string, unknown>>> {
  let query = `SELECT nj.*, rj.source, rj.url, rj.externalJobId
    FROM NormalizedJob nj
    JOIN RawJob rj ON nj.rawJobId = rj.id
    WHERE 1=1`;
  const params: unknown[] = [];

  if (filters?.status) {
    query += ` AND nj.status = ?`;
    params.push(filters.status);
  }
  if (filters?.roleFamily) {
    query += ` AND nj.roleFamily = ?`;
    params.push(filters.roleFamily);
  }
  if (filters?.minBodyLeasingScore) {
    query += ` AND nj.bodyLeasingFitScore >= ?`;
    params.push(filters.minBodyLeasingScore);
  }

  query += ` ORDER BY nj.bodyLeasingFitScore DESC, nj.urgencyScore DESC`;

  if (filters?.limit) {
    query += ` LIMIT ?`;
    params.push(filters.limit);
  }
  if (filters?.offset) {
    query += ` OFFSET ?`;
    params.push(filters.offset);
  }

  return prisma.$queryRawUnsafe(query, ...params);
}

export async function getNormalizedJobById(id: number): Promise<Record<string, unknown> | null> {
  const results = await prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
    `SELECT nj.*, rj.source, rj.url, rj.externalJobId, rj.titleRaw, rj.descriptionRaw
     FROM NormalizedJob nj
     JOIN RawJob rj ON nj.rawJobId = rj.id
     WHERE nj.id = ?`,
    id
  );
  return results[0] || null;
}

// ─── JobMatch Operations ───────────────────────────────────────────

export async function insertJobMatch(data: {
  normalizedJobId: number;
  candidateId: number;
  matchScore: number;
  explanation?: string;
  missingSkills?: string;
  hardFilterPass: boolean;
  skillOverlap: number;
}): Promise<number> {
  const result = await prisma.$queryRawUnsafe<Array<{ id: number }>>(
    `INSERT INTO JobMatch (normalizedJobId, candidateId, matchScore, explanation, missingSkills, hardFilterPass, skillOverlap, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
     RETURNING id`,
    data.normalizedJobId,
    data.candidateId,
    data.matchScore,
    data.explanation || null,
    data.missingSkills || null,
    data.hardFilterPass ? 1 : 0,
    data.skillOverlap
  );
  return result[0].id;
}

export async function getMatchesForJob(normalizedJobId: number, limit = 20): Promise<Array<Record<string, unknown>>> {
  return prisma.$queryRawUnsafe(
    `SELECT jm.*, c.name as candidateName, c.title as candidateTitle,
            c.skills as candidateSkills, c.experience, c.location as candidateLocation,
            c.linkedin, c.rating
     FROM JobMatch jm
     JOIN Candidate c ON jm.candidateId = c.id
     WHERE jm.normalizedJobId = ?
     ORDER BY jm.matchScore DESC
     LIMIT ?`,
    normalizedJobId,
    limit
  );
}

export async function getMatchesForCandidate(candidateId: number, limit = 20): Promise<Array<Record<string, unknown>>> {
  return prisma.$queryRawUnsafe(
    `SELECT jm.*, nj.titleClean, nj.roleFamily, nj.location as jobLocation,
            nj.bodyLeasingFitScore, nj.remoteType, rj.source, rj.url
     FROM JobMatch jm
     JOIN NormalizedJob nj ON jm.normalizedJobId = nj.id
     JOIN RawJob rj ON nj.rawJobId = rj.id
     WHERE jm.candidateId = ?
     ORDER BY jm.matchScore DESC
     LIMIT ?`,
    candidateId,
    limit
  );
}

// ─── Stats & Summaries ─────────────────────────────────────────────

export async function getSourceBreakdown(): Promise<Array<{ source: string; count: number }>> {
  return prisma.$queryRawUnsafe(
    `SELECT source, COUNT(*) as count FROM RawJob GROUP BY source`
  );
}

export async function getTopBodyLeasingJobs(limit = 10): Promise<Array<Record<string, unknown>>> {
  return prisma.$queryRawUnsafe(
    `SELECT nj.id, nj.titleClean, nj.bodyLeasingFitScore, nj.urgencyScore,
            nj.roleFamily, nj.location, nj.remoteType, rj.source, rj.url
     FROM NormalizedJob nj
     JOIN RawJob rj ON nj.rawJobId = rj.id
     WHERE nj.status = 'new'
     ORDER BY nj.bodyLeasingFitScore DESC, nj.urgencyScore DESC
     LIMIT ?`,
    limit
  );
}

export async function getRecentJobsCount(hours = 24): Promise<number> {
  const result = await prisma.$queryRawUnsafe<Array<{ cnt: number }>>(
    `SELECT COUNT(*) as cnt FROM RawJob WHERE scrapedAt >= datetime('now', '-' || ? || ' hours')`,
    hours
  );
  return result[0].cnt;
}

export async function getHiringTrends(): Promise<Array<Record<string, unknown>>> {
  return prisma.$queryRawUnsafe(
    `SELECT nj.roleFamily, COUNT(*) as jobCount,
            AVG(nj.bodyLeasingFitScore) as avgBodyLeasingScore,
            AVG(nj.urgencyScore) as avgUrgency,
            rj.source
     FROM NormalizedJob nj
     JOIN RawJob rj ON nj.rawJobId = rj.id
     WHERE nj.roleFamily IS NOT NULL
     GROUP BY nj.roleFamily, rj.source
     ORDER BY jobCount DESC`
  );
}

export async function deleteOldMatches(normalizedJobId: number): Promise<void> {
  await prisma.$queryRawUnsafe(
    `DELETE FROM JobMatch WHERE normalizedJobId = ?`,
    normalizedJobId
  );
}
