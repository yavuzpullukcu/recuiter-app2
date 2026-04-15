import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/api-helpers";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const userId = getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const project = await prisma.project.create({
    data: { userId, name: body.name, companyId: parseInt(params.id), jobId: body.jobId || null },
  });
  return NextResponse.json(project, { status: 201 });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const userId = getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("projectId");
  if (!projectId) return NextResponse.json({ error: "projectId required" }, { status: 400 });
  const existing = await prisma.project.findFirst({ where: { id: parseInt(projectId), userId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const assignmentCount = await prisma.assignment.count({ where: { projectId: parseInt(projectId) } });
  if (assignmentCount > 0) return NextResponse.json({ error: "Bu projede atanmış adaylar var. Önce atamaları kaldırın." }, { status: 400 });
  await prisma.project.delete({ where: { id: parseInt(projectId) } });
  return NextResponse.json({ success: true });
}
