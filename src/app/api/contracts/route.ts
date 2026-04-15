import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/api-helpers";

export async function GET(req: NextRequest) {
  const userId = getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const contracts = await prisma.contract.findMany({
    where: { assignment: { userId } },
    include: { assignment: { include: { candidate: true, project: { include: { company: true } } } } },
    orderBy: { endDate: "asc" },
  });
  return NextResponse.json(contracts);
}
