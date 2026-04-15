import { NextResponse } from "next/server";
import { getHiringTrends, getSourceBreakdown, getTopBodyLeasingJobs } from "@/lib/job-intelligence/db";

export async function GET() {
  try {
    const [trends, sourceBreakdown, topBodyLeasingJobs] = await Promise.all([
      getHiringTrends(),
      getSourceBreakdown(),
      getTopBodyLeasingJobs(),
    ]);

    return NextResponse.json({
      trends,
      sourceBreakdown,
      topBodyLeasingJobs,
    });
  } catch (err) {
    console.error("[API] Trends error:", err);
    return NextResponse.json(
      { error: "Failed to fetch trends", details: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
