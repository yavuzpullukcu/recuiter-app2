import { NextRequest, NextResponse } from "next/server";
import { getMatchesForJob, getNormalizedJobById } from "@/lib/job-intelligence/db";

function safeJsonParse(json: unknown): unknown {
  if (typeof json !== "string") return json ?? null;

  try {
    return JSON.parse(json);
  } catch {
    return json;
  }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id, 10);
    if (isNaN(id)) {
      return NextResponse.json({ error: "Invalid job ID" }, { status: 400 });
    }

    const job = await getNormalizedJobById(id);
    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    const matches = await getMatchesForJob(id);

    return NextResponse.json({
      job: {
        ...job,
        techStack: safeJsonParse(job.techStackJson),
        mustHave: safeJsonParse(job.mustHaveJson),
        niceToHave: safeJsonParse(job.niceToHaveJson),
        languages: safeJsonParse(job.languagesJson),
        sourceSignals: safeJsonParse(job.sourceSignals),
      },
      matches: matches.map((match) => ({
        ...match,
        candidateSkills: safeJsonParse(match.candidateSkills),
        missingSkills: safeJsonParse(match.missingSkills),
      })),
    });
  } catch (err) {
    console.error("[API] Intelligence job detail error:", err);
    return NextResponse.json(
      { error: "Failed to fetch job detail", details: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
