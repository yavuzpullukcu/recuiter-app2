import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/api-helpers";

export async function GET(req: NextRequest) {
  const userId = getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { subscription: true },
  });

  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  // Count usage
  const [candidateCount, jobCount] = await Promise.all([
    prisma.candidate.count({ where: { userId } }),
    prisma.job.count({ where: { userId } }),
  ]);

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      plan: user.subscription?.plan || "starter",
      subscription: {
        plan: user.subscription?.plan,
        maxCandidates: user.subscription?.maxCandidates,
        maxJobs: user.subscription?.maxJobs,
        status: user.subscription?.status,
        expiresAt: user.subscription?.expiresAt,
      },
      usage: {
        candidates: candidateCount,
        jobs: jobCount,
      },
    },
  });
}
