import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { parseJobDescription } from "@/lib/job-intelligence/parsers/jobParser";
import { parseCSV } from "@/lib/csv-parser";
import { insertNormalizedJob, insertRawJob, rawJobExistsByHash } from "@/lib/job-intelligence/db";
import { runMatchingForJob } from "@/lib/job-intelligence/matching/matcher";

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get("content-type");
    let jobs: Record<string, any>[] = [];

    if (contentType?.includes("application/json")) {
      const data = await request.json();
      jobs = Array.isArray(data) ? data : data.jobs || [];
    } else if (contentType?.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("file") as File;

      if (!file) {
        return NextResponse.json({ error: "No file provided" }, { status: 400 });
      }

      if (file.name.endsWith(".csv")) {
        jobs = parseCSV(await file.text());
      } else if (file.name.endsWith(".json")) {
        const data = JSON.parse(await file.text());
        jobs = Array.isArray(data) ? data : data.jobs || [];
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

    if (jobs.length === 0) {
      return NextResponse.json({ error: "No jobs found in file" }, { status: 400 });
    }

    let importedCount = 0;
    let duplicateCount = 0;
    let errorCount = 0;
    let matchCount = 0;
    const errors: string[] = [];

    for (const row of jobs) {
      try {
        const title = row["Job Title"] || row.title || "N/A";
        const description = row["Job Description"] || row.description || "";
        const source = row["Source"] || row["Source URL"] || row.source || "manual-import";

        const payload: Record<string, unknown> = {
          company: row["Company"] || row.company || "",
          location: row["Location (City)"] || row.location || "",
          languages: row["Languages Required"] || row.languages || "",
          contractType: row["Contract Type"] || row.contractType || "",
          remoteType: row["Remote Type"] || row.remoteType || "",
          startDate: row["Start Date"] || row.startDate || "",
          deadline: row["Deadline"] || row.deadline || "",
          notes: row["Notes"] || row.notes || "",
          rate: row["Salary/Rate Range"] || row.rate || "",
        };

        const hashSignature = createHash("sha256").update(`${title}\n${description}`).digest("hex");
        if (await rawJobExistsByHash(hashSignature)) {
          duplicateCount++;
          continue;
        }

        const parsed = parseJobDescription(title, description, source, payload);
        const rawJobId = await insertRawJob({
          source: String(source),
          url: (row["Source URL"] || row.url || undefined) as string | undefined,
          externalJobId: (row["External Job ID"] || row.externalJobId || undefined) as string | undefined,
          titleRaw: String(title),
          descriptionRaw: String(description),
          locationRaw: (row["Location (City)"] || row.location || undefined) as string | undefined,
          postedAtRaw: (row["Posted At"] || row.postedAt || undefined) as string | undefined,
          rawPayload: JSON.stringify({ row, payload }),
          hashSignature,
        });

        const normalizedJobId = await insertNormalizedJob({
          rawJobId,
          titleClean: String(title),
          roleFamily: parsed.roleFamily || undefined,
          seniority: parsed.seniority || undefined,
          techStackJson: JSON.stringify(parsed.techStack || []),
          mustHaveJson: JSON.stringify(parsed.mustHaveSkills || []),
          niceToHaveJson: JSON.stringify(parsed.niceToHaveSkills || []),
          languagesJson: JSON.stringify(parsed.languages || []),
          remoteType: parsed.remoteType || undefined,
          contractModel: parsed.contractModel || undefined,
          location: parsed.locationCity || (payload.location as string | undefined),
          locationCountry: parsed.locationCountry || undefined,
          projectDuration: parsed.projectDuration || undefined,
          startDate: parsed.startDate || undefined,
          weeklyHours: parsed.weeklyHours || undefined,
          capacityPercent: parsed.capacityPercent || undefined,
          rateMax: parsed.rateMax || undefined,
          urgencyScore: parsed.urgencyScore,
          bodyLeasingFitScore: parsed.bodyLeasingFitScore,
          candidateDifficultyScore: parsed.candidateDifficultyScore,
          summary: parsed.summary || undefined,
          customerType: parsed.customerType || undefined,
          sourceSignals: JSON.stringify(parsed.sourceSignals || {}),
        });

        matchCount += await runMatchingForJob(normalizedJobId);
        importedCount++;
      } catch (error) {
        errorCount++;
        const errorMsg = error instanceof Error ? error.message : String(error);
        errors.push(`Row "${row["Job Title"] || row.title || "Unknown"}": ${errorMsg}`);
      }
    }

    return NextResponse.json(
      {
        success: true,
        importedCount,
        duplicateCount,
        errorCount,
        matchCount,
        errors: errors.length > 0 ? errors : undefined,
        message: `Imported ${importedCount} jobs successfully${duplicateCount ? `, skipped ${duplicateCount} duplicates` : ""}`,
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
