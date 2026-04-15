import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/api-helpers";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const userId = getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const jobId = parseInt(params.id);
    if (isNaN(jobId)) {
      return NextResponse.json({ error: "Invalid job id" }, { status: 400 });
    }

    const existingJob = await prisma.job.findFirst({
      where: { id: jobId, userId },
      select: { id: true },
    });

    if (!existingJob) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });
    if (file.type && file.type !== "application/pdf") {
      return NextResponse.json({ error: "Only PDF files are allowed" }, { status: 400 });
    }
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "File size exceeds 10MB limit" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const uploadDir = path.join(process.cwd(), "public", "uploads", "jds");
    await mkdir(uploadDir, { recursive: true });

    const fileName = `${jobId}-${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const filePath = path.join(uploadDir, fileName);
    await writeFile(filePath, buffer);

    const dbPath = `/uploads/jds/${fileName}`;
    await prisma.job.update({ where: { id: existingJob.id }, data: { jdFile: dbPath } });

    return NextResponse.json({ jdFile: dbPath });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
