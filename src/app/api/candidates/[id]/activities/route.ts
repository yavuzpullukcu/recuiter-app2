import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/api-helpers";

// GET /api/candidates/[id]/activities
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const userId = getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const candidateId = parseInt(params.id);
  const candidate = await prisma.candidate.findFirst({ where: { id: candidateId, userId }, select: { id: true } });
  if (!candidate) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const activities = await prisma.activity.findMany({
    where: { candidateId, userId },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(activities);
}

// POST /api/candidates/[id]/activities
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const userId = getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const candidateId = parseInt(params.id);
  const candidate = await prisma.candidate.findFirst({ where: { id: candidateId, userId }, select: { id: true } });
  if (!candidate) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { type, content } = await req.json();
  if (!content?.trim()) return NextResponse.json({ error: "İçerik boş olamaz" }, { status: 400 });

  const activity = await prisma.activity.create({
    data: {
      userId,
      candidateId,
      type: type || "note",
      content: content.trim(),
    },
  });

  return NextResponse.json(activity, { status: 201 });
}
