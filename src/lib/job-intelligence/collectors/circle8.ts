// ─── Circle8 Collector ──────────────────────────────────────────────
// Collects IT project listings from circle8deutschland.de
// Fields: title, location, remote, duration, extension option,
//         weekly hours, start date, deadline, reference code,
//         description, requirements, contract/ANÜ signals

import { BaseCollector } from "./base";
import { RawJobData } from "../types";

export class Circle8Collector extends BaseCollector {
  readonly source = "circle8";
  readonly baseUrl = "https://www.circle8deutschland.de";
  private readonly listUrl = "/en/projects";

  async getMaxPages(): Promise<number> {
    try {
      const html = await this.fetchPage(`${this.baseUrl}${this.listUrl}`);
      // Look for pagination: <a class="page-link" href="...?page=5">
      const pageMatches = html.match(/[?&]page=(\d+)/g);
      if (pageMatches && pageMatches.length > 0) {
        const pages = pageMatches.map((m) => parseInt(m.replace(/[?&]page=/, "")));
        return Math.max(...pages);
      }
      return 1;
    } catch {
      return 1;
    }
  }

  async fetchListPage(page: number): Promise<RawJobData[]> {
    const url = page === 1
      ? `${this.baseUrl}${this.listUrl}`
      : `${this.baseUrl}${this.listUrl}?page=${page}`;

    const html = await this.fetchPage(url);
    const listings = this.parseListPage(html);

    // Fetch detail pages for each listing
    const jobs: RawJobData[] = [];
    for (const listing of listings) {
      try {
        const detailHtml = await this.fetchPage(`${this.baseUrl}${listing.detailUrl}`);
        const detail = this.parseDetailPage(detailHtml, listing);
        jobs.push(detail);
      } catch (err) {
        // If detail page fails, use list-level data
        jobs.push({
          source: this.source,
          externalJobId: listing.referenceCode || undefined,
          url: `${this.baseUrl}${listing.detailUrl}`,
          titleRaw: listing.title,
          descriptionRaw: listing.description || listing.title,
          locationRaw: listing.location || undefined,
          postedAtRaw: listing.deadline || undefined,
          rawPayload: listing,
        });
      }
    }

    return jobs;
  }

  private parseListPage(html: string): Array<Record<string, string>> {
    const listings: Array<Record<string, string>> = [];

    // Circle8 typically uses card-based layouts for project listings
    // Pattern: <div class="project-card"> or <article class="project-item">
    const cardPatterns = [
      /<div[^>]*class="[^"]*project[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/gi,
      /<article[^>]*class="[^"]*project[^"]*"[^>]*>([\s\S]*?)<\/article>/gi,
      /<div[^>]*class="[^"]*card[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>/gi,
      /<tr[^>]*>([\s\S]*?)<\/tr>/gi,
    ];

    for (const pattern of cardPatterns) {
      let match;
      while ((match = pattern.exec(html)) !== null) {
        const card = match[1];
        const listing: Record<string, string> = {};

        // Extract title from heading or link
        const titleMatch = card.match(/<(?:h[1-6]|a)[^>]*>(.*?)<\/(?:h[1-6]|a)>/i);
        if (titleMatch) listing.title = this.stripHtml(titleMatch[1]);

        // Extract detail URL
        const linkMatch = card.match(/href="([^"]*(?:project|detail|job)[^"]*)"/i);
        if (linkMatch) listing.detailUrl = linkMatch[1];

        // Extract location
        const locMatch = card.match(/(?:location|standort|ort)[^>]*>([^<]+)/i)
          || card.match(/(?:📍|🏢)\s*([^<\n]+)/);
        if (locMatch) listing.location = this.stripHtml(locMatch[1]);

        // Extract reference code
        const refMatch = card.match(/(?:ref|referenz|reference)[^>]*>?\s*[:#]?\s*([A-Z0-9-]+)/i);
        if (refMatch) listing.referenceCode = refMatch[1].trim();

        // Extract deadline
        const deadlineMatch = card.match(/(?:deadline|bewerbungsfrist)[^>]*>?\s*([^<\n]+)/i);
        if (deadlineMatch) listing.deadline = this.stripHtml(deadlineMatch[1]);

        // Extract short description
        const descMatch = card.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
        if (descMatch) listing.description = this.stripHtml(descMatch[1]);

        if (listing.title && listing.detailUrl) {
          listings.push(listing);
        }
      }
      if (listings.length > 0) break;
    }

    return listings;
  }

  private parseDetailPage(html: string, listing: Record<string, string>): RawJobData {
    const payload: Record<string, string | undefined> = { ...listing };

    // Extract full description
    const descSection = this.extractBetween(html, '<div class="description"', '</div>')
      || this.extractBetween(html, '<div class="content"', '</div>')
      || this.extractBetween(html, '<div class="project-detail"', '</div>');
    const description = this.stripHtml(descSection) || listing.description || listing.title;

    // Extract structured fields
    const fieldPatterns: Record<string, RegExp[]> = {
      location: [/(?:location|standort|einsatzort)[^:]*:\s*([^<\n]+)/i],
      remote: [/(?:remote|home\s*office|mobiles\s*arbeiten)[^:]*:\s*([^<\n]+)/i],
      duration: [/(?:duration|laufzeit|dauer|zeitraum)[^:]*:\s*([^<\n]+)/i],
      extensionOption: [/(?:extension|verlängerung|option)[^:]*:\s*([^<\n]+)/i],
      weeklyHours: [/(?:weekly\s*hours|wochenstunden|stunden)[^:]*:\s*([^<\n]+)/i],
      startDate: [/(?:start|beginn|ab\s*sofort|start\s*date)[^:]*:\s*([^<\n]+)/i],
      deadline: [/(?:deadline|bewerbungsfrist|frist)[^:]*:\s*([^<\n]+)/i],
      referenceCode: [/(?:reference|referenz|ref\.?\s*(?:code|nr|number)?)[^:]*:\s*([A-Z0-9\-]+)/i],
      anuType: [/(?:ANÜ|arbeitnehmerüberlassung|anü)[^:]*:\s*([^<\n]+)/i],
    };

    for (const [field, patterns] of Object.entries(fieldPatterns)) {
      for (const pattern of patterns) {
        const match = html.match(pattern);
        if (match) {
          payload[field] = match[1].trim();
          break;
        }
      }
    }

    // Extract requirements section
    const reqSection = this.extractBetween(html, 'requirements', '</div>')
      || this.extractBetween(html, 'anforderungen', '</div>')
      || this.extractBetween(html, 'skills', '</div>');
    if (reqSection) {
      payload.requirements = this.stripHtml(reqSection);
    }

    return {
      source: this.source,
      externalJobId: payload.referenceCode || undefined,
      url: listing.detailUrl ? `${this.baseUrl}${listing.detailUrl}` : undefined,
      titleRaw: listing.title || "Unknown Title",
      descriptionRaw: `${description}\n\n${payload.requirements || ""}`.trim(),
      locationRaw: payload.location || undefined,
      postedAtRaw: payload.deadline || undefined,
      rawPayload: payload,
    };
  }
}
