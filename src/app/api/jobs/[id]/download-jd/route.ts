import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/api-helpers";
import { readFile } from "fs/promises";
import path from "path";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const userId = getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const jobId = parseInt(params.id);
    if (isNaN(jobId)) {
      return NextResponse.json({ error: "Invalid job id" }, { status: 400 });
    }

    const job = await prisma.job.findFirst({ where: { id: jobId, userId } });
    if (!job?.jdFile) return NextResponse.json({ error: "No file" }, { status: 404 });

    const filePath = path.join(process.cwd(), "public", job.jdFile);
    const buffer = await readFile(filePath);
    const fileName = path.basename(job.jdFile);

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${job.title.replace(/[^a-zA-Z0-9._-]/g, "_")}_JD.pdf"`,
      },
    });
  } catch {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }
}
