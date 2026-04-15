import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { extractSkills } from "@/lib/skills";
import { checkLicenseLimit, getUserId } from "@/lib/api-helpers";

// GET /api/jobs
export async function GET(req: NextRequest) {
  const userId = getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const jobs = await prisma.job.findMany({
    where: { userId }, // Multi-tenancy filter
    include: { _count: { select: { candidates: true } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(jobs);
}

// POST /api/jobs — create + auto-analyze skills
export async function POST(req: NextRequest) {
  const userId = getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const currentCount = await prisma.job.count({ where: { userId } });
  const licenseCheck = await checkLicenseLimit(prisma, userId, "jobs", currentCount);
  if (!licenseCheck.allowed) {
    return NextResponse.json({ error: licenseCheck.message }, { status: 403 });
  }

  const skills = extractSkills(body.description || "");

  const job = await prisma.job.create({
    data: {
      userId, // Multi-tenancy
      title: body.title,
      company: body.company || null,
      description: body.description,
      skills: JSON.stringify(skills),
      location: body.location || null,
      startDate: body.startDate || null,
      endDate: body.endDate || null,
      workload: body.workload || null,
      contractType: body.contractType || null,
      status: body.status || "active",
    },
  });

  return NextResponse.json(job, { status: 201 });
}
