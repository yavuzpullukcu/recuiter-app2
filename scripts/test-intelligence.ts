// @ts-nocheck
// ─── Job Intelligence Integration Test ──────────────────────────────
// Run with: npx tsx scripts/test-intelligence.ts
// Tests: parsing, scoring, matching, DB operations, pipeline

import Database from "better-sqlite3";
import path from "path";
import { parseJobDescription } from "../src/lib/job-intelligence/parsers";
import { injectManualJob, generateDailySummary } from "../src/lib/job-intelligence/pipeline";
import { getMatchesForJob, getNormalizedJobs, getTopBodyLeasingJobs } from "../src/lib/job-intelligence/db";

const dbPath = path.join(process.cwd(), "prisma", "dev.db");
const db = new Database(dbPath);

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, details?: string) {
  if (condition) {
    console.log(`  ✓ ${testName}`);
    passed++;
  } else {
    console.log(`  ✗ ${testName}${details ? ` - ${details}` : ""}`);
    failed++;
  }
}

async function testParser() {
  console.log("\n=== Test: Job Parser ===");

  const jd1 = `
    Senior DevOps Engineer - Azure Cloud
    Location: Frankfurt, Germany
    Remote: 100% remote
    Duration: 12 months
    Start: ASAP
    Weekly hours: 40
    Contract: ANÜ (Arbeitnehmerüberlassung)

    Requirements:
    - 5+ years experience in Azure DevOps
    - Strong knowledge of Kubernetes, Docker, Terraform
    - CI/CD pipeline experience with YAML pipelines
    - German: B2 level, English: fluent
    - Security scanning (SAST/SCA) experience is a plus

    Nice to have:
    - Helm charts experience
    - ArgoCD / GitOps
    - Python scripting
  `;

  const parsed = parseJobDescription("Senior DevOps Engineer", jd1, "circle8", {});

  assert(parsed.roleFamily === "devops", "Role family = devops");
  assert(parsed.seniority === "senior", "Seniority = senior");
  assert(parsed.remoteType === "remote", "Remote type = remote");
  assert(parsed.contractModel === "body_leasing", "Contract model = body_leasing (ANÜ)");
  assert(parsed.mustHaveSkills.length > 0, `Must-have skills detected: ${parsed.mustHaveSkills.length}`);
  assert(parsed.mustHaveSkills.includes("Azure DevOps") || parsed.mustHaveSkills.includes("Azure Cloud"), "Azure DevOps/Cloud in must-have");
  assert(parsed.mustHaveSkills.includes("Kubernetes"), "Kubernetes in must-have");
  assert(parsed.techStack.includes("Docker"), "Docker in tech stack");
  assert(parsed.techStack.includes("Terraform"), "Terraform in tech stack");
  assert(parsed.languages.length > 0, `Languages detected: ${parsed.languages.length}`);
  assert(parsed.bodyLeasingFitScore >= 40, `Body leasing fit score >= 40: ${parsed.bodyLeasingFitScore}`);
  assert(parsed.urgencyScore > 0, `Urgency score > 0: ${parsed.urgencyScore}`);
  assert(parsed.locationCountry === "Germany", "Location country = Germany");
  assert(parsed.summary !== null && parsed.summary.length > 0, "Summary generated");

  console.log(`  Summary: ${parsed.summary}`);
  console.log(`  BL Score: ${parsed.bodyLeasingFitScore}, Urgency: ${parsed.urgencyScore}, Difficulty: ${parsed.candidateDifficultyScore}`);
}

async function testNemensisParser() {
  console.log("\n=== Test: Nemensis-style Job Parser ===");

  const jd2 = `
    Java Backend Developer
    Location: München (Hybrid - 60% remote, 40% onsite)
    Capacity: 80%
    Duration: 6 months with extension option
    Rate: max 85€/h
    Start: 01.05.2026
    Security Clearance: Ü2 required
    Languages: German C1, English B2

    We are looking for an experienced Java developer for a banking project.
    Requirements: Java, Spring Boot, Microservices, PostgreSQL, REST API
    Nice to have: Kafka, Docker, Kubernetes
  `;

  const parsed = parseJobDescription("Java Backend Developer", jd2, "nemensis", {
    capacity: "80%",
    rate: "85€/h",
    securityClearance: "Ü2",
  });

  assert(parsed.roleFamily === "backend", "Role family = backend");
  assert(parsed.remoteType === "hybrid", "Remote type = hybrid");
  assert(parsed.techStack.includes("Java"), "Java in tech stack");
  assert(parsed.techStack.includes("PostgreSQL"), "PostgreSQL in tech stack");
  assert(parsed.candidateDifficultyScore > 0, `Difficulty score > 0: ${parsed.candidateDifficultyScore} (security clearance)`);
  assert(parsed.languages.some((l) => l.lang === "German"), "German language detected");
  assert(parsed.customerType === "financial", "Customer type = financial (banking)");
}

async function testDBAndPipeline() {
  console.log("\n=== Test: DB & Pipeline (Manual Job Injection) ===");

  try {
    const result = await injectManualJob({
      title: "Test: Senior React Developer - Nearshore",
      description: `
        Looking for a Senior React Developer for body leasing / nearshore engagement.
        Location: Berlin, Germany - Remote OK
        Duration: 12 months
        Start: ASAP
        Requirements: React, TypeScript, Node.js, REST API, Git
        German B1 preferred, English fluent required
      `,
      source: "test",
      location: "Berlin, Germany",
    });

    assert(result.rawJobId > 0, `Raw job created: id=${result.rawJobId}`);
    assert(result.normalizedJobId > 0, `Normalized job created: id=${result.normalizedJobId}`);

    // Verify normalized job in DB
    const jobs = await getNormalizedJobs({ limit: 5 });
    assert(jobs.length > 0, `Normalized jobs in DB: ${jobs.length}`);

    const testJob = jobs.find((j) => (j.titleClean as string).includes("Test: Senior React"));
    assert(!!testJob, "Test job found in normalized jobs");

    if (testJob) {
      assert((testJob.bodyLeasingFitScore as number) > 0, `Body leasing score: ${testJob.bodyLeasingFitScore}`);
      assert((testJob.source as string) === "test", "Source = test");
    }

    // Test matching results
    const matches = await getMatchesForJob(result.normalizedJobId, 10);
    console.log(`  Matches found: ${matches.length}`);
    if (matches.length > 0) {
      const topMatch = matches[0];
      console.log(`  Top match: ${topMatch.candidateName} (score: ${topMatch.matchScore})`);
      assert((topMatch.matchScore as number) > 0, "Top match has positive score");
    }

    // Test top body leasing jobs
    const topBL = await getTopBodyLeasingJobs(5);
    assert(topBL.length > 0, `Top BL jobs: ${topBL.length}`);

    // Test daily summary
    const summary = await generateDailySummary();
    assert(summary.date.length > 0, "Daily summary has date");
    console.log(`  Daily summary: ${summary.newJobsCollected} new jobs`);

  } catch (err) {
    console.log(`  ✗ Pipeline test failed: ${err instanceof Error ? err.message : String(err)}`);
    failed++;
  }
}

async function testInjectSecondJob() {
  console.log("\n=== Test: Second Job Injection (SAP) ===");

  try {
    const result = await injectManualJob({
      title: "Test: SAP S/4HANA Consultant",
      description: `
        SAP S/4HANA migration consultant needed for a large automotive company.
        Location: Stuttgart, Germany
        Remote: Hybrid (3 days onsite)
        Duration: 18 months
        Contract: Freelance / Dienstvertrag
        Requirements: SAP S/4HANA, SAP ABAP, SAP FI/CO, SAP MM/SD
        German: fluent (C1+), English: business level
        Experience: 8+ years in SAP
      `,
      source: "test",
      location: "Stuttgart",
    });

    assert(result.rawJobId > 0, `SAP job created: id=${result.rawJobId}`);

    const jobs = await getNormalizedJobs({ limit: 10 });
    const sapJob = jobs.find((j) => (j.titleClean as string).includes("SAP"));
    assert(!!sapJob, "SAP job in normalized jobs");
    if (sapJob) {
      assert((sapJob.roleFamily as string) === "sap", `Role family = sap`);
      assert((sapJob.customerType as string) === "automotive", "Customer type = automotive");
      console.log(`  SAP BL Score: ${sapJob.bodyLeasingFitScore}, Difficulty: ${sapJob.candidateDifficultyScore}`);
    }
  } catch (err) {
    console.log(`  ✗ SAP job test failed: ${err instanceof Error ? err.message : String(err)}`);
    failed++;
  }
}

async function cleanup() {
  console.log("\n=== Cleanup: Keeping test data (for dashboard) ===");
  console.log("  ✓ Test data preserved in database");
  // NOT cleaning up - keep data for dashboard viewing
}

async function main() {
  console.log("======================================");
  console.log("  Job Intelligence Integration Tests  ");
  console.log("======================================");

  await testParser();
  await testNemensisParser();
  await testDBAndPipeline();
  await testInjectSecondJob();
  await cleanup();

  console.log("\n======================================");
  console.log(`  Results: ${passed} passed, ${failed} failed`);
  console.log("======================================");

  if (failed > 0) process.exit(1);
}

main()
  .catch((e) => {
    console.error("Test suite failed:", e);
    process.exit(1);
  })
  .finally(() => db.close());