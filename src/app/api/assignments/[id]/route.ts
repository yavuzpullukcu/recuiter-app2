import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/api-helpers";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const userId = getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = parseInt(params.id);
  const existing = await prisma.assignment.findFirst({ 
    where: { id, userId },
    include: { contract: true }
  });
  
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // 🚀 FormData okuma
  const formData = await req.formData();
  
  const contactPerson = formData.get("contactPerson") as string;
  const contactTitle = formData.get("contactTitle") as string;
  const status = formData.get("status") as string;
  const notes = formData.get("notes") as string;
  const weeklyHours = parseInt(formData.get("weeklyHours") as string) || 40;
  const hourlyRate = parseFloat(formData.get("hourlyRate") as string) || 0;
  const currency = formData.get("currency") as string || "EUR";
  const contractStart = formData.get("contractStart") as string;
  const contractEnd = formData.get("contractEnd") as string;
  
  // 🚀 PDF Dosyasını tip hatası almadan alalım
  const file = formData.get("file") as unknown as File | null;
  // Kırmızı çizgi veritabanı senkronu sonrası düzelecek, düzelmezse 'any' cast edelim:
  let filePath = (existing.contract as any)?.contractFile || null;

  // 📁 Dosya kaydetme mantığı
  if (file && file.size > 0) {
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const fileName = `${Date.now()}-${file.name.replace(/\s/g, "_")}`;
    const uploadDir = path.join(process.cwd(), "public/uploads/contracts");
    
    try { await mkdir(uploadDir, { recursive: true }); } catch (e) {}
    
    await writeFile(path.join(uploadDir, fileName), buffer);
    filePath = `/uploads/contracts/${fileName}`;
  }

  // 1. Assignment Güncelleme
  const assignment = await prisma.assignment.update({
    where: { id },
    data: { 
      contactPerson,
      contactTitle,
      status,
      weeklyHours,
      hourlyRate,
      currency,
      notes
    },
    include: { contract: true }
  });

  // 2. Contract Güncelleme veya Oluşturma
  if (status.toLowerCase().includes("yerleşti") || contractStart) {
    if (assignment.contract) {
      await prisma.contract.update({
        where: { id: assignment.contract.id },
        data: { 
          startDate: contractStart || assignment.contract.startDate,
          endDate: contractEnd || assignment.contract.endDate,
          contractFile: filePath // PDF yolu kaydediliyor
        }
      });
    } else {
      await prisma.contract.create({
        data: {
          assignmentId: id,
          startDate: contractStart || new Date().toISOString().split('T')[0],
          endDate: contractEnd || "",
          contractFile: filePath,
          status: "active"
        }
      });
    }
  }

  // 3. Aday ana statüsünü güncelle
  if (status.toLowerCase().includes("yerleşti")) {
    await prisma.candidate.update({
      where: { id: assignment.candidateId },
      data: { status: "placed" }
    });
  }

  return NextResponse.json(assignment);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const userId = getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = parseInt(params.id);
  if (Number.isNaN(id)) {
    return NextResponse.json({ error: "Invalid assignment id" }, { status: 400 });
  }

  const existing = await prisma.assignment.findFirst({
    where: { id, userId },
    include: { candidate: true },
  });

  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.assignment.delete({
    where: { id },
  });

  const remainingAssignments = await prisma.assignment.findMany({
    where: { candidateId: existing.candidateId, userId },
    select: { status: true },
  });

  const hasPlacedAssignment = remainingAssignments.some((assignment) =>
    (assignment.status || "").toLocaleLowerCase("tr-TR").includes("yerle"),
  );

  await prisma.candidate.update({
    where: { id: existing.candidateId },
    data: { status: hasPlacedAssignment ? "placed" : "new" },
  });

  return NextResponse.json({ success: true });
}
