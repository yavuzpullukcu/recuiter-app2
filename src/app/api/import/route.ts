import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/api-helpers";

export async function POST(req: NextRequest) {
  try {
    const userId = getUserId(req);
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { candidates, jobId } = await req.json();
    if (!Array.isArray(candidates) || candidates.length === 0) {
      return NextResponse.json({ error: "No candidates provided" }, { status: 400 });
    }

    let imported = 0;
    let skipped = 0;
    const results: { name: string; status: string }[] = [];

    for (const c of candidates) {
      if (!c.name?.trim()) {
        skipped++;
        results.push({ name: "(bos)", status: "atlanildi - isim yok" });
        continue;
      }

      const existing = await prisma.candidate.findFirst({
        where: {
          userId,
          OR: [
            { name: c.name.trim() },
            ...(c.linkedin ? [{ linkedin: c.linkedin.trim() }] : []),
          ],
        },
      });

      if (existing) {
        skipped++;
        results.push({ name: c.name, status: "atlanildi - zaten mevcut" });
        continue;
      }

      const skills: string[] = c.skills || [];
      const candidate = await prisma.candidate.create({
        data: {
          userId,
          name: c.name.trim(),
          title: c.title?.trim() || null,
          company: c.company?.trim() || null,
          location: c.location?.trim() || null,
          linkedin: c.linkedin?.trim() || null,
          email: c.email?.trim() || null,
          phone: c.phone?.trim() || null,
          skills: JSON.stringify(skills),
          experience: c.experience || 0,
          status: "new",
          rating: c.rating || 3,
          notes: c.notes?.trim() || null,
          jobId: jobId || null,
        },
      });

      await prisma.activity.create({
        data: { userId, type: "note", content: "Excel dosyasindan import edildi", candidateId: candidate.id },
      });

      imported++;
      results.push({ name: c.name, status: "eklendi" });
    }

    return NextResponse.json({ imported, skipped, total: candidates.length, results });
  } catch (error: any) {
    console.error("Import error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
