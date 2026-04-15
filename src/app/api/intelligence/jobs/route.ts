import { NextRequest, NextResponse } from "next/server";
import { getNormalizedJobs } from "@/lib/job-intelligence/db";

export const dynamic = "force-dynamic";

function safeJsonParse(json: unknown): unknown {
  if (typeof json !== "string") return json ?? null;

  try {
    return JSON.parse(json);
  } catch {
    return json;
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || undefined;
    const roleFamily = searchParams.get("roleFamily") || undefined;
    const minBodyLeasingScore = searchParams.get("minBodyLeasingScore")
      ? parseInt(searchParams.get("minBodyLeasingScore")!, 10)
      : undefined;
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!, 10) : 50;
    const offset = searchParams.get("offset") ? parseInt(searchParams.get("offset")!, 10) : 0;

    const jobs = await getNormalizedJobs({
      status,
      roleFamily,
      minBodyLeasingScore,
      limit,
      offset,
    });

    return NextResponse.json(
      jobs.map((job) => ({
        ...job,
        requiredSkills: safeJsonParse(job.mustHaveJson),
        niceToHaveSkills: safeJsonParse(job.niceToHaveJson),
        requiredLanguages: safeJsonParse(job.languagesJson),
      }))
    );
  } catch (err) {
    console.error("[API] Intelligence jobs error:", err);
    return NextResponse.json(
      { error: "Failed to fetch intelligence jobs", details: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
