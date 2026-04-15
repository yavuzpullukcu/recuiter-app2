import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/api-helpers";

export async function GET(req: NextRequest) {
  const userId = getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const companies = await prisma.company.findMany({
    where: { userId },
    include: { projects: { include: { assignments: { include: { candidate: true, contract: true } } } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(companies);
}

export async function POST(req: NextRequest) {
  const userId = getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const company = await prisma.company.create({
    data: { userId, name: body.name, description: body.description || null },
    include: { projects: true },
  });
  return NextResponse.json(company, { status: 201 });
}
