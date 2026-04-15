// ─── Base Collector ─────────────────────────────────────────────────
// Abstract base class for all job collectors.
// Provides common utilities: hashing, dedup, pagination support.

import crypto from "crypto";
import { RawJobData, CollectorResult } from "../types";
import { insertRawJob, rawJobExistsByHash } from "../db";

export abstract class BaseCollector {
  abstract readonly source: string;
  abstract readonly baseUrl: string;

  // Subclasses implement these
  abstract fetchListPage(page: number): Promise<RawJobData[]>;
  abstract getMaxPages(): Promise<number>;

  // Generate dedup hash from title + description + source
  generateHash(data: RawJobData): string {
    const content = `${data.source}:${data.externalJobId || ""}:${data.titleRaw}:${data.descriptionRaw.slice(0, 500)}`;
    return crypto.createHash("sha256").update(content).digest("hex");
  }

  // Main collection method with pagination and dedup
  async collect(maxPages = 5): Promise<CollectorResult> {
    const result: CollectorResult = {
      jobs: [],
      source: this.source,
      collectedAt: new Date().toISOString(),
      totalFound: 0,
      newJobs: 0,
      duplicates: 0,
      errors: [],
    };

    try {
      const totalPages = await this.getMaxPages();
      const pagesToScrape = Math.min(maxPages, totalPages);

      for (let page = 1; page <= pagesToScrape; page++) {
        try {
          const jobs = await this.fetchListPage(page);
          result.totalFound += jobs.length;

          for (const job of jobs) {
            const hash = this.generateHash(job);
            const exists = await rawJobExistsByHash(hash);

            if (exists) {
              result.duplicates++;
              continue;
            }

            try {
              await insertRawJob({
                source: this.source,
                externalJobId: job.externalJobId,
                url: job.url,
                titleRaw: job.titleRaw,
                descriptionRaw: job.descriptionRaw,
                locationRaw: job.locationRaw,
                postedAtRaw: job.postedAtRaw,
                rawPayload: JSON.stringify(job.rawPayload),
                hashSignature: hash,
              });
              result.newJobs++;
              result.jobs.push(job);
            } catch (err) {
              const msg = err instanceof Error ? err.message : String(err);
              // Skip unique constraint violations (duplicate hash race condition)
              if (msg.includes("UNIQUE constraint")) {
                result.duplicates++;
              } else {
                result.errors.push(`Insert error for "${job.titleRaw}": ${msg}`);
              }
            }
          }
        } catch (err) {
          result.errors.push(`Page ${page} error: ${err instanceof Error ? err.message : String(err)}`);
        }
      }
    } catch (err) {
      result.errors.push(`Collection failed: ${err instanceof Error ? err.message : String(err)}`);
    }

    return result;
  }

  // HTTP fetch helper with timeout and error handling
  protected async fetchPage(url: string): Promise<string> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          "User-Agent": "RecuterBot/1.0 (IT Recruitment Platform)",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "de-DE,de;q=0.9,en;q=0.8",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return response.text();
    } finally {
      clearTimeout(timeout);
    }
  }

  // Simple HTML text extraction (strip tags)
  protected stripHtml(html: string): string {
    return html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, " ")
      .trim();
  }

  // Extract text between two patterns
  protected extractBetween(html: string, startPattern: string, endPattern: string): string {
    const startIdx = html.indexOf(startPattern);
    if (startIdx === -1) return "";
    const afterStart = html.substring(startIdx + startPattern.length);
    const endIdx = afterStart.indexOf(endPattern);
    if (endIdx === -1) return afterStart;
    return afterStart.substring(0, endIdx);
  }
}
