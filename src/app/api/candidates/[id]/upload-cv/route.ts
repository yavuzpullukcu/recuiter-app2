import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/api-helpers";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const userId = getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const candidateId = parseInt(params.id);

    // Verify ownership
    const existing = await prisma.candidate.findFirst({ where: { id: candidateId, userId } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!file.type.startsWith("application/pdf")) {
      return NextResponse.json({ error: "Only PDF files are allowed" }, { status: 400 });
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "File size exceeds 10MB limit" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const uploadDir = join(process.cwd(), "public/uploads/cvs");
    await mkdir(uploadDir, { recursive: true });

    const filename = `${candidateId}-${Date.now()}-${file.name}`;
    const filepath = join(uploadDir, filename);
    const relativePath = `/uploads/cvs/${filename}`;

    await writeFile(filepath, buffer);

    const candidate = await prisma.candidate.update({
      where: { id: candidateId },
      data: { cvFile: relativePath },
    });

    return NextResponse.json({
      success: true,
      message: "CV uploaded successfully",
      cvFile: relativePath,
      candidate,
    });
  } catch (error) {
    console.error("CV upload error:", error);
    return NextResponse.json({ error: "Failed to upload CV" }, { status: 500 });
  }
}
