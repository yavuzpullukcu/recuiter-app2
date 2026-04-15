import { NextRequest, NextResponse } from "next/server";
import { parseCSV } from "@/lib/csv-parser";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/api-helpers";

export async function POST(request: NextRequest) {
  const userId = getUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const contentType = request.headers.get("content-type");
    let candidates: Record<string, any>[] = [];

    if (contentType?.includes("application/json")) {
      const data = await request.json();
      candidates = Array.isArray(data) ? data : data.candidates || [];
    } else if (contentType?.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("file") as File;

      if (!file) {
        return NextResponse.json({ error: "No file provided" }, { status: 400 });
      }

      if (file.name.endsWith(".csv")) {
        candidates = parseCSV(await file.text());
      } else if (file.name.endsWith(".json")) {
        const data = JSON.parse(await file.text());
        candidates = Array.isArray(data) ? data : data.candidates || [];
      } else {
        return NextResponse.json(
          {
            error: "Please convert Excel to CSV format first",
            instruction: "Open Excel file -> Save As -> CSV UTF-8 format",
          },
          { status: 400 }
        );
      }
    } else {
      return NextResponse.json({ error: "Unsupported content type" }, { status: 400 });
    }

    if (candidates.length === 0) {
      return NextResponse.json({ error: "No candidates found in file" }, { status: 400 });
    }

    let importedCount = 0;
    let duplicateCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    for (const row of candidates) {
      try {
        const name = row["Full Name"] || row.name || "N/A";
        const email = row["Email"] || row.email || null;
        const linkedin = row["LinkedIn URL"] || row.linkedin || null;

        const existing = await prisma.candidate.findFirst({
          where: {
            userId,
            OR: [
              ...(email ? [{ email }] : []),
              ...(linkedin ? [{ linkedin }] : []),
              { name, title: row["Current Title"] || row.title || null },
            ],
          },
          select: { id: true },
        });

        if (existing) {
          duplicateCount++;
          continue;
        }

        const primarySkills = String(row["Primary Skills (comma-separated)"] || row.skills || "")
          .split(",")
          .map((skill) => skill.trim())
          .filter(Boolean);
        const secondarySkills = String(row["Secondary Skills"] || "")
          .split(",")
          .map((skill) => skill.trim())
          .filter(Boolean);

        await prisma.candidate.create({
          data: {
            userId,
            name: String(name),
            title: (row["Current Title"] || row.title || null) as string | null,
            email: email ? String(email) : null,
            linkedin: linkedin ? String(linkedin) : null,
            phone: (row["Phone"] || row.phone || null) as string | null,
            location: (row["Location"] || row.location || "Turkey") as string,
            skills: JSON.stringify([...primarySkills, ...secondarySkills]),
            experience: parseInt(String(row["Years of Experience"] || row.experience || 0), 10) || 0,
            notes: (row["Notes"] || row.notes || null) as string | null,
            type: "external",
            status: "new",
          },
        });

        importedCount++;
      } catch (error) {
        errorCount++;
        errors.push(
          `Candidate "${row["Full Name"] || row.name || "Unknown"}": ${
            error instanceof Error ? error.message : "Unknown error"
          }`
        );
      }
    }

    return NextResponse.json(
      {
        success: true,
        importedCount,
        duplicateCount,
        errorCount,
        errors: errors.length > 0 ? errors : undefined,
        message: `Imported ${importedCount} candidates successfully${duplicateCount ? `, skipped ${duplicateCount} duplicates` : ""}`,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Import error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Import failed" },
      { status: 500 }
    );
  }
}
