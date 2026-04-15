import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/api-helpers";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const userId = getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const id = parseInt(params.id);
  const contract = await prisma.contract.findFirst({
    where: { id, assignment: { userId } },
  });
  if (!contract) return NextResponse.json({ error: "Contract not found" }, { status: 404 });
  const oldEnd = new Date(contract.endDate);
  const newStart = new Date(oldEnd);
  newStart.setDate(newStart.getDate() + 1);
  const newEnd = new Date(newStart);
  newEnd.setMonth(newEnd.getMonth() + 6);
  const updated = await prisma.contract.update({
    where: { id },
    data: {
      startDate: newStart.toISOString().split("T")[0],
      endDate: newEnd.toISOString().split("T")[0],
      renewalCount: contract.renewalCount + 1,
      status: "active",
    },
    include: { assignment: { include: { candidate: true, project: { include: { company: true } } } } },
  });
  return NextResponse.json(updated);
}
