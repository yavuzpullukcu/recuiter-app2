import { NextRequest, NextResponse } from "next/server";
import { getRecentJobsCount, getSourceBreakdown, getTopBodyLeasingJobs } from "@/lib/job-intelligence/db";
import { prisma } from "@/lib/prisma";

export async function POST(_request: NextRequest) {
  try {
    const [rawJobs, normalizedJobs, matchesGenerated, sourceBreakdown] = await Promise.all([
      prisma.rawJob.count(),
      prisma.normalizedJob.count(),
      prisma.jobMatch.count(),
      getSourceBreakdown(),
    ]);

    return NextResponse.json({
      collectionResults: sourceBreakdown.map((source) => ({
        source: source.source,
        newJobs: source.count,
        duplicates: 0,
        errors: [],
      })),
      parsedCount: rawJobs,
      normalizedCount: normalizedJobs,
      matchesGenerated,
      errors: [],
      duration: 0,
    });
  } catch (err) {
    console.error("[API] Pipeline execution error:", err);
    return NextResponse.json(
      { error: "Pipeline execution failed", details: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const [newJobsCollected, topBodyLeasingRows, sourceRows] = await Promise.all([
      getRecentJobsCount(),
      getTopBodyLeasingJobs(5),
      getSourceBreakdown(),
    ]);

    const sourceBreakdown = Object.fromEntries(sourceRows.map((row) => [row.source, row.count]));

    return NextResponse.json({
      date: new Date().toISOString().split("T")[0],
      newJobsCollected,
      jobsParsed: newJobsCollected,
      topBodyLeasingJobs: topBodyLeasingRows.map((job) => ({
        id: job.id,
        title: job.titleClean,
        source: job.source,
        bodyLeasingFitScore: job.bodyLeasingFitScore,
        urgencyScore: job.urgencyScore,
      })),
      sourceBreakdown,
    });
  } catch (err) {
    console.error("[API] Daily summary error:", err);
    return NextResponse.json(
      { error: "Failed to generate summary", details: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
