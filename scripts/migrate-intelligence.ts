// ─── Job Intelligence Migration Script ──────────────────────────────
// Run with: npx tsx scripts/migrate-intelligence.ts
// Creates RawJob, NormalizedJob, JobMatch tables and indexes.
// Safe to run multiple times (uses IF NOT EXISTS).

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function migrate() {
  console.log("[Migration] Starting job intelligence migration...");

  // Create RawJob table
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS RawJob (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      source          TEXT NOT NULL,
      externalJobId   TEXT,
      url             TEXT,
      titleRaw        TEXT NOT NULL,
      descriptionRaw  TEXT NOT NULL,
      locationRaw     TEXT,
      postedAtRaw     TEXT,
      scrapedAt       DATETIME NOT NULL DEFAULT (datetime('now')),
      rawPayload      TEXT NOT NULL,
      hashSignature   TEXT NOT NULL UNIQUE,
      parsed          BOOLEAN NOT NULL DEFAULT 0,
      createdAt       DATETIME NOT NULL DEFAULT (datetime('now')),
      updatedAt       DATETIME NOT NULL DEFAULT (datetime('now'))
    )
  `);
  console.log("[Migration] RawJob table created");

  // Create NormalizedJob table
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS NormalizedJob (
      id                        INTEGER PRIMARY KEY AUTOINCREMENT,
      rawJobId                  INTEGER NOT NULL UNIQUE,
      titleClean                TEXT NOT NULL,
      roleFamily                TEXT,
      seniority                 TEXT,
      techStackJson             TEXT,
      mustHaveJson              TEXT,
      niceToHaveJson            TEXT,
      languagesJson             TEXT,
      remoteType                TEXT,
      contractModel             TEXT,
      location                  TEXT,
      locationCountry           TEXT,
      projectDuration           TEXT,
      startDate                 TEXT,
      weeklyHours               TEXT,
      capacityPercent           TEXT,
      rateMax                   TEXT,
      urgencyScore              INTEGER NOT NULL DEFAULT 0,
      bodyLeasingFitScore       INTEGER NOT NULL DEFAULT 0,
      candidateDifficultyScore  INTEGER NOT NULL DEFAULT 0,
      summary                   TEXT,
      customerType              TEXT,
      sourceSignals             TEXT,
      status                    TEXT NOT NULL DEFAULT 'new',
      createdAt                 DATETIME NOT NULL DEFAULT (datetime('now')),
      updatedAt                 DATETIME NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (rawJobId) REFERENCES RawJob(id) ON DELETE CASCADE
    )
  `);
  console.log("[Migration] NormalizedJob table created");

  // Create JobMatch table
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS JobMatch (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      normalizedJobId INTEGER NOT NULL,
      candidateId     INTEGER NOT NULL,
      matchScore      INTEGER NOT NULL DEFAULT 0,
      explanation     TEXT,
      missingSkills   TEXT,
      hardFilterPass  BOOLEAN NOT NULL DEFAULT 0,
      skillOverlap    REAL NOT NULL DEFAULT 0,
      createdAt       DATETIME NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (normalizedJobId) REFERENCES NormalizedJob(id) ON DELETE CASCADE,
      FOREIGN KEY (candidateId) REFERENCES Candidate(id) ON DELETE CASCADE
    )
  `);
  console.log("[Migration] JobMatch table created");

  // Create indexes
  const indexes = [
    "CREATE INDEX IF NOT EXISTS idx_rawjob_source ON RawJob(source)",
    "CREATE INDEX IF NOT EXISTS idx_rawjob_hash ON RawJob(hashSignature)",
    "CREATE INDEX IF NOT EXISTS idx_rawjob_parsed ON RawJob(parsed)",
    "CREATE INDEX IF NOT EXISTS idx_normalizedjob_status ON NormalizedJob(status)",
    "CREATE INDEX IF NOT EXISTS idx_normalizedjob_roleFamily ON NormalizedJob(roleFamily)",
    "CREATE INDEX IF NOT EXISTS idx_normalizedjob_bodyLeasing ON NormalizedJob(bodyLeasingFitScore)",
    "CREATE INDEX IF NOT EXISTS idx_jobmatch_score ON JobMatch(matchScore)",
    "CREATE INDEX IF NOT EXISTS idx_jobmatch_normalizedJobId ON JobMatch(normalizedJobId)",
    "CREATE INDEX IF NOT EXISTS idx_jobmatch_candidateId ON JobMatch(candidateId)",
  ];

  for (const idx of indexes) {
    await prisma.$executeRawUnsafe(idx);
  }
  console.log("[Migration] Indexes created");

  // Verify tables
  const tables = await prisma.$queryRawUnsafe<Array<{ name: string }>>(
    "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
  );
  console.log("[Migration] Tables:", tables.map((t) => t.name).join(", "));

  console.log("[Migration] Complete!");
}

migrate()
  .catch((e) => {
    console.error("[Migration] Failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
