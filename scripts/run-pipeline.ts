// ─── Pipeline Runner Script ─────────────────────────────────────────
// Run with: npx tsx scripts/run-pipeline.ts
// Runs the full job intelligence pipeline: collect -> parse -> match

import Database from "better-sqlite3";
import path from "path";
import { parseJobDescription } from "../src/lib/job-intelligence/parsers";
import { Circle8Collector, NemensisCollector } from "../src/lib/job-intelligence/collectors";

async function main() {
  const dbPath = path.join(process.cwd(), "prisma", "dev.db");
  const db = new Database(dbPath);

  console.log("=== Job Intelligence Pipeline ===");
  console.log(`Started at: ${new Date().toISOString()}\n`);

  const startTime = Date.now();

  try {
    // Step 1: Collect jobs
    console.log("[Pipeline] Step 1: Collecting jobs...");
    const collections = [
      { collector: new Circle8Collector(), name: "circle8" },
      { collector: new NemensisCollector(), name: "nemensis" },
    ];

    for (const { collector, name } of collections) {
      try {
        const result = await collector.collect(2);
        console.log(`[Pipeline] ${name}: ${result.newJobs} new, ${result.duplicates} duplicates`);
      } catch (err) {
        console.log(`[Pipeline] ${name}: Collection error - ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    // Step 2: Parse unparsed jobs
    console.log("[Pipeline] Step 2: Parsing raw jobs...");
    const unparsed = db.prepare(`SELECT id, titleRaw, descriptionRaw, source, rawPayload FROM RawJob WHERE parsed = 0 LIMIT 100`).all() as any[];
    let parsedCount = 0;

    for (const raw of unparsed) {
      try {
        let payload: Record<string, unknown> = {};
        try {
          payload = JSON.parse(raw.rawPayload);
        } catch {
          payload = {};
        }

        const parsed = parseJobDescription(raw.titleRaw, raw.descriptionRaw, raw.source, payload);

        const stmt = db.prepare(`
          INSERT INTO NormalizedJob (
            rawJobId, titleClean, roleFamily, seniority, techStackJson, mustHaveJson,
            niceToHaveJson, languagesJson, remoteType, contractModel, location, locationCountry,
            projectDuration, startDate, weeklyHours, capacityPercent, rateMax,
            urgencyScore, bodyLeasingFitScore, candidateDifficultyScore,
            summary, customerType, sourceSignals, status, createdAt, updatedAt
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'new', datetime('now'), datetime('now'))
        `);

        stmt.run(
          raw.id,
          raw.titleRaw,
          parsed.roleFamily || null,
          parsed.seniority || null,
          JSON.stringify(parsed.techStack),
          JSON.stringify(parsed.mustHaveSkills),
          JSON.stringify(parsed.niceToHaveSkills),
          JSON.stringify(parsed.languages),
          parsed.remoteType || null,
          parsed.contractModel || null,
          parsed.locationCity || null,
          parsed.locationCountry || null,
          parsed.projectDuration || null,
          parsed.startDate || null,
          parsed.weeklyHours || null,
          parsed.capacityPercent || null,
          parsed.rateMax || null,
          parsed.urgencyScore,
          parsed.bodyLeasingFitScore,
          parsed.candidateDifficultyScore,
          parsed.summary || null,
          parsed.customerType || null,
          JSON.stringify(parsed.sourceSignals)
        );

        db.prepare(`UPDATE RawJob SET parsed = 1, updatedAt = datetime('now') WHERE id = ?`).run(raw.id);
        parsedCount++;
      } catch (err) {
        console.error(`[Pipeline] Parse error for job ${raw.id}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    console.log(`[Pipeline] Parsed: ${parsedCount} jobs`);

    // Step 3: Get stats
    console.log("[Pipeline] Step 3: Generating summary...");
    const jobsTotal = db.prepare(`SELECT COUNT(*) as cnt FROM NormalizedJob`).get() as any;
    const sourceBreakdown = db.prepare(`SELECT source, COUNT(*) as count FROM RawJob GROUP BY source`).all() as any[];

    const duration = Date.now() - startTime;

    console.log("\n=== Pipeline Results ===");
    console.log(`Duration: ${duration}ms`);
    console.log(`Total normalized jobs: ${jobsTotal.cnt}`);
    console.log(`Parsed in this run: ${parsedCount}`);
    console.log(`\nSource Breakdown:`);
    for (const s of sourceBreakdown) {
      console.log(`  ${s.source}: ${s.count} jobs`);
    }

    console.log("\n✅ Pipeline completed successfully!");
    console.log("💡 Refresh http://localhost:3000/intelligence to see new data");
  } catch (err) {
    console.error("Pipeline failed:", err);
    process.exit(1);
  } finally {
    db.close();
  }
}

main();
