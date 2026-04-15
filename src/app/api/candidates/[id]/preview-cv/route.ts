import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/api-helpers";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const userId = getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const candidateId = parseInt(params.id);

    const candidate = await prisma.candidate.findFirst({
      where: { id: candidateId, userId },
      select: { name: true, cvFile: true },
    });

    if (!candidate) return NextResponse.json({ error: "Candidate not found" }, { status: 404 });
    if (!candidate.cvFile) return NextResponse.json({ error: "No CV file found" }, { status: 404 });

    const filepath = join(process.cwd(), "public", candidate.cvFile);
    const fileBuffer = await readFile(filepath);

    const response = new NextResponse(fileBuffer);
    response.headers.set("Content-Type", "application/pdf");
    response.headers.set("Content-Disposition", "inline");

    return response;
  } catch (error) {
    console.error("CV preview error:", error);
    return NextResponse.json({ error: "Failed to preview CV" }, { status: 500 });
  }
}
