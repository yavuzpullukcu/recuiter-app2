import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/api-helpers";

// GET /api/export — export candidates as JSON (frontend will convert to Excel)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const jobId = searchParams.get("jobId");
  const status = searchParams.get("status");

  const userId = getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const where: any = { userId };
  if (jobId) where.jobId = parseInt(jobId);
  if (status && status !== "all") where.status = status;

  const candidates = await prisma.candidate.findMany({
    where,
    include: { job: true },
    orderBy: { rating: "desc" },
  });

  const exportData = candidates.map((c, i) => {
    const skills: string[] = JSON.parse(c.skills || "[]");
    return {
      no: i + 1,
      name: c.name,
      title: c.title || "",
      company: c.company || "",
      location: c.location || "",
      linkedin: c.linkedin || "",
      email: c.email || "",
      phone: c.phone || "",
      skills: skills.join(", "),
      experience: c.experience,
      status: c.status,
      rating: c.rating,
      notes: c.notes || "",
      job: c.job?.title || "",
      createdAt: c.createdAt,
    };
  });

  return NextResponse.json(exportData);
}
