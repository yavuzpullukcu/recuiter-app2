import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/api-helpers";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export async function GET(req: NextRequest) {
  const userId = getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const assignments = await prisma.assignment.findMany({
    where: { userId },
    include: { 
      candidate: true, 
      project: { include: { company: true } }, 
      contract: true 
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(assignments);
}

export async function POST(req: NextRequest) {
  const userId = getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    // 🚀 ÖNEMLİ: JSON yerine FormData olarak okuyoruz
    const formData = await req.formData();

    // FormData'dan temel verileri alalım
    const candidateId = parseInt(formData.get("candidateId") as string);
    const projectId = parseInt(formData.get("projectId") as string);
    const status = formData.get("status") as string || "CV Gönderildi";
    const notes = formData.get("notes") as string || null;
    const weeklyHours = parseInt(formData.get("weeklyHours") as string) || 40;
    const hourlyRate = parseFloat(formData.get("hourlyRate") as string) || 0;
    const currency = formData.get("currency") as string || "EUR";
    const contractStart = formData.get("contractStart") as string;
    const contractEnd = formData.get("contractEnd") as string;

    if (isNaN(candidateId) || isNaN(projectId)) {
      return NextResponse.json({ error: "GeÃ§ersiz aday veya proje seÃ§imi" }, { status: 400 });
    }

    const [candidate, project] = await Promise.all([
      prisma.candidate.findFirst({
        where: { id: candidateId, userId },
        select: { id: true },
      }),
      prisma.project.findFirst({
        where: { id: projectId, userId },
        select: { id: true },
      }),
    ]);

    if (!candidate) {
      return NextResponse.json({ error: "Aday bulunamadÄ±" }, { status: 404 });
    }

    if (!project) {
      return NextResponse.json({ error: "Proje bulunamadÄ±" }, { status: 404 });
    }

    // 🚀 YAVUZ BURASI KRİTİK: Silinen/kaydolmayan irtibat verilerini buradan alıyoruz
    const contactPerson = formData.get("contactPerson") as string;
    const contactTitle = formData.get("contactTitle") as string;

    // 📁 Dosya işleme mantığı (Senin orijinal yapın korundu)
    const file = formData.get("file") as unknown as File | null;
    let filePath: string | null = null;

    if (file && file.size > 0) {
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      const fileName = `${Date.now()}-${file.name.replace(/\s/g, "_")}`;
      const uploadDir = path.join(process.cwd(), "public/uploads/contracts");

      // Klasör kontrolü ve oluşturma
      try { await mkdir(uploadDir, { recursive: true }); } catch (e) { /* Klasör var */ }

      await writeFile(path.join(uploadDir, fileName), buffer);
      filePath = `/uploads/contracts/${fileName}`;
    }

    // 1. Assignment (Atama) Oluşturma
    const assignment = await prisma.assignment.create({
      data: {
        userId,
        candidateId: candidate.id,
        projectId: project.id,
        status,
        contactPerson, // ✅ ARTIK VERİTABANINA KAYDEDİLİYOR
        contactTitle,  // ✅ ARTIK VERİTABANINA KAYDEDİLİYOR
        weeklyHours,
        hourlyRate,
        currency,
        notes,
        // 🚀 Kontrat bilgilerini ve PDF yolunu buraya ekliyoruz
        contract: (contractStart && contractEnd) ? {
          create: {
            startDate: contractStart,
            endDate: contractEnd,
            contractFile: filePath, // PDF yolu veritabanına kaydediliyor
            status: "active",
            renewalCount: 0
          }
        } : undefined,
      },
      include: { candidate: true, project: { include: { company: true } }, contract: true },
    });

    // 2. Adayın ana statüsünü güncelle (Eğer işe yerleştiyse)
    if (status.toLowerCase().includes("yerleşti")) {
      await prisma.candidate.update({
        where: { id: candidate.id },
        data: { status: "placed" }
      });
    }

    return NextResponse.json(assignment, { status: 201 });

  } catch (error) {
    console.error("POST Hatası:", error);
    return NextResponse.json({ error: "Sunucu hatası oluştu" }, { status: 500 });
  }
}
