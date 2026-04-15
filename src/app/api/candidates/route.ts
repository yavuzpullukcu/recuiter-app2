import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkLicenseLimit, getUserId } from "@/lib/api-helpers";

// GET /api/candidates — list all, optional filters
export async function GET(req: NextRequest) {
  const userId = getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const jobId = searchParams.get("jobId");
  const search = searchParams.get("search");

  const where: any = { userId }; // Multi-tenancy filter
  if (status && status !== "all") where.status = status;
  if (jobId) where.jobId = parseInt(jobId);
  if (search) {
    where.OR = [
      { name: { contains: search } },
      { company: { contains: search } },
      { skills: { contains: search } },
      { title: { contains: search } },
    ];
  }

  const candidates = await prisma.candidate.findMany({
    where,
    include: { job: true, activities: { orderBy: { createdAt: "desc" }, take: 5 } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(candidates);
}

// POST /api/candidates — create new candidate
export async function POST(req: NextRequest) {
  const userId = getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const currentCount = await prisma.candidate.count({ where: { userId } });
  const licenseCheck = await checkLicenseLimit(prisma, userId, "candidates", currentCount);
  if (!licenseCheck.allowed) {
    return NextResponse.json({ error: licenseCheck.message }, { status: 403 });
  }

  if (body.jobId) {
    const ownedJob = await prisma.job.findFirst({
      where: { id: body.jobId, userId },
      select: { id: true },
    });

    if (!ownedJob) {
      return NextResponse.json({ error: "SeÃ§ilen iÅŸ ilanÄ± bulunamadÄ±" }, { status: 404 });
    }
  }

  const candidate = await prisma.candidate.create({
    data: {
      userId, // Multi-tenancy
      name: body.name,
      title: body.title || null,
      company: body.company || null,
      location: body.location || null,
      linkedin: body.linkedin || null,
      email: body.email || null,
      phone: body.phone || null,
      skills: JSON.stringify(body.skills || []),
      experience: body.experience || 0,
      status: body.status || "new",
      rating: body.rating || 3,
      notes: body.notes || null,
      jobId: body.jobId || null,
    },
  });

  // Log activity
  await prisma.activity.create({
    data: {
      userId, // Multi-tenancy
      type: "note",
      content: "Aday eklendi",
      candidateId: candidate.id,
    },
  });

  return NextResponse.json(candidate, { status: 201 });
}
