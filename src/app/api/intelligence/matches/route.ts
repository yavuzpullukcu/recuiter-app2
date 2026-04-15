import { NextRequest, NextResponse } from "next/server";
import { getMatchesForCandidate, getMatchesForJob } from "@/lib/job-intelligence/db";
import { prisma } from "@/lib/prisma";

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
    const jobId = searchParams.get("jobId");
    const candidateId = searchParams.get("candidateId");
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!, 10) : 50;

    if (jobId) {
      const matches = await getMatchesForJob(parseInt(jobId, 10), limit);
      return NextResponse.json(
        matches.map((match) => ({
          ...match,
          candidateSkills: safeJsonParse(match.candidateSkills),
          missingSkills: safeJsonParse(match.missingSkills),
        }))
      );
    }

    if (candidateId) {
      const matches = await getMatchesForCandidate(parseInt(candidateId, 10), limit);
      return NextResponse.json(
        matches.map((match) => ({
          ...match,
          missingSkills: safeJsonParse(match.missingSkills),
        }))
      );
    }

    const matches = await prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
      `SELECT jm.*, c.name as candidateName, c.title as candidateTitle,
              nj.titleClean as jobTitle, nj.roleFamily
       FROM JobMatch jm
       JOIN Candidate c ON jm.candidateId = c.id
       JOIN NormalizedJob nj ON jm.normalizedJobId = nj.id
       ORDER BY jm.matchScore DESC
       LIMIT ?`,
      limit
    );

    return NextResponse.json(
      matches.map((match) => ({
        ...match,
        missingSkills: safeJsonParse(match.missingSkills),
      }))
    );
  } catch (err) {
    console.error("[API] Intelligence matches error:", err);
    return NextResponse.json(
      { error: "Failed to fetch matches", details: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
