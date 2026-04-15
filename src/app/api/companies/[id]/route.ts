import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/api-helpers";

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const userId = getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const existing = await prisma.company.findFirst({ where: { id: parseInt(params.id), userId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await prisma.company.delete({ where: { id: parseInt(params.id) } });
  return NextResponse.json({ success: true });
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const userId = getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const existing = await prisma.company.findFirst({ where: { id: parseInt(params.id), userId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const body = await req.json();
  const company = await prisma.company.update({ where: { id: parseInt(params.id) }, data: { name: body.name, description: body.description } });
  return NextResponse.json(company);
}
