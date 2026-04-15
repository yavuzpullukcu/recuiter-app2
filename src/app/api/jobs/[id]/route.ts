import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/api-helpers";

// Tek bir iş ilanının detaylarını getir
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const userId = getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const job = await prisma.job.findFirst({
    where: { id: parseInt(params.id), userId }
  });

  if (!job) return NextResponse.json({ error: "İş ilanı bulunamadı" }, { status: 404 });
  return NextResponse.json(job);
}

// İş ilanını güncelle
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const userId = getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const jobId = parseInt(params.id);
  if (isNaN(jobId)) {
    return NextResponse.json({ error: "GeÃ§ersiz iÅŸ ilanÄ± ID" }, { status: 400 });
  }

  const existingJob = await prisma.job.findFirst({
    where: { id: jobId, userId },
  });

  if (!existingJob) {
    return NextResponse.json({ error: "Ä°ÅŸ ilanÄ± bulunamadÄ±" }, { status: 404 });
  }

  const updatedJob = await prisma.job.update({
    where: { id: jobId },
    data: {
      title: body.title,
      company: body.company,
      description: body.description,
      location: body.location,
      startDate: body.startDate,
      endDate: body.endDate,
      workload: body.workload,
      contractType: body.contractType,
      status: body.status,
      skills:
        body.skills === undefined
          ? existingJob.skills
          : typeof body.skills === "string"
            ? body.skills
            : JSON.stringify(body.skills),
    }
  });

  return NextResponse.json(updatedJob);
}

// İş ilanını sil
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const jobId = parseInt(params.id);

    if (isNaN(jobId)) {
      return NextResponse.json({ error: "Geçersiz iş ilanı ID" }, { status: 400 });
    }

    const existingJob = await prisma.job.findFirst({
      where: { id: jobId, userId }
    });

    if (!existingJob) {
      return NextResponse.json({ error: "İş ilanı bulunamadı" }, { status: 404 });
    }

    await prisma.job.delete({
      where: { id: jobId }
    });

    return NextResponse.json({ success: true, message: "İş ilanı silindi" });
  } catch (error) {
    console.error("JOB_DELETE_ERROR:", error);
    return NextResponse.json(
      { error: "İş ilanı silinirken hata oluştu" },
      { status: 500 }
    );
  }
}
