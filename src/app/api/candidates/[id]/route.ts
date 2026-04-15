import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/api-helpers";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const userId = getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const candidate = await prisma.candidate.findFirst({
    where: { id: parseInt(params.id), userId },
    include: { job: true, activities: { orderBy: { createdAt: "desc" } } },
  });
  if (!candidate) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(candidate);
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const userId = getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const id = parseInt(params.id);
  const existing = await prisma.candidate.findFirst({ where: { id, userId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const data: any = {};
  if (body.name !== undefined) data.name = body.name;
  if (body.title !== undefined) data.title = body.title;
  if (body.company !== undefined) data.company = body.company;
  if (body.location !== undefined) data.location = body.location;
  if (body.linkedin !== undefined) data.linkedin = body.linkedin;
  if (body.email !== undefined) data.email = body.email;
  if (body.phone !== undefined) data.phone = body.phone;
  if (body.skills !== undefined) data.skills = JSON.stringify(body.skills);
  if (body.experience !== undefined) data.experience = body.experience;
  if (body.status !== undefined) data.status = body.status;
  if (body.rating !== undefined) data.rating = body.rating;
  if (body.notes !== undefined) data.notes = body.notes;
  if (body.jobId !== undefined) data.jobId = body.jobId;
  const candidate = await prisma.candidate.update({ where: { id }, data });
  if (body.status && body.status !== existing.status) {
    await prisma.activity.create({
      data: { userId, type: "status_change", content: `Durum "${existing.status}" -> "${body.status}" olarak degistirildi`, candidateId: id },
    });
  }
  return NextResponse.json(candidate);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const userId = getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const existing = await prisma.candidate.findFirst({ where: { id: parseInt(params.id), userId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await prisma.candidate.delete({ where: { id: parseInt(params.id) } });
  return NextResponse.json({ success: true });
}
