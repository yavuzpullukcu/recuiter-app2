// ─── Nemensis Collector ─────────────────────────────────────────────
// Collects IT project listings from nemensis.de
// Fields: title, location, job id, posted date, start, duration,
//         capacity, remote/onsite ratio, language requirements,
//         rate/max rate, security clearance, description, skills

import { BaseCollector } from "./base";
import { RawJobData } from "../types";

export class NemensisCollector extends BaseCollector {
  readonly source = "nemensis";
  readonly baseUrl = "https://www.nemensis.de";
  private readonly listUrl = "/en/projects/";

  async getMaxPages(): Promise<number> {
    try {
      const html = await this.fetchPage(`${this.baseUrl}${this.listUrl}`);
      // Nemensis pagination: ?page=N or similar
      const pageMatches = html.match(/[?&]page=(\d+)/g);
      if (pageMatches && pageMatches.length > 0) {
        const pages = pageMatches.map((m) => parseInt(m.replace(/[?&]page=/, "")));
        return Math.max(...pages);
      }
      // Alternative: look for "Seite X von Y" or "Page X of Y"
      const totalMatch = html.match(/(?:page|seite)\s+\d+\s+(?:of|von)\s+(\d+)/i);
      if (totalMatch) return parseInt(totalMatch[1]);
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

    const jobs: RawJobData[] = [];
    for (const listing of listings) {
      try {
        if (listing.detailUrl) {
          const detailHtml = await this.fetchPage(
            listing.detailUrl.startsWith("http")
              ? listing.detailUrl
              : `${this.baseUrl}${listing.detailUrl}`
          );
          const detail = this.parseDetailPage(detailHtml, listing);
          jobs.push(detail);
        } else {
          jobs.push(this.listingToRawJob(listing));
        }
      } catch {
        jobs.push(this.listingToRawJob(listing));
      }
    }

    return jobs;
  }

  private listingToRawJob(listing: Record<string, string>): RawJobData {
    return {
      source: this.source,
      externalJobId: listing.jobId || undefined,
      url: listing.detailUrl
        ? (listing.detailUrl.startsWith("http") ? listing.detailUrl : `${this.baseUrl}${listing.detailUrl}`)
        : undefined,
      titleRaw: listing.title || "Unknown Title",
      descriptionRaw: listing.description || listing.title || "",
      locationRaw: listing.location || undefined,
      postedAtRaw: listing.postedDate || undefined,
      rawPayload: listing,
    };
  }

  private parseListPage(html: string): Array<Record<string, string>> {
    const listings: Array<Record<string, string>> = [];

    // Nemensis uses project cards/list items
    const cardPatterns = [
      /<div[^>]*class="[^"]*project[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/gi,
      /<article[^>]*>([\s\S]*?)<\/article>/gi,
      /<li[^>]*class="[^"]*project[^"]*"[^>]*>([\s\S]*?)<\/li>/gi,
      /<div[^>]*class="[^"]*card[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>/gi,
    ];

    for (const pattern of cardPatterns) {
      let match;
      while ((match = pattern.exec(html)) !== null) {
        const card = match[1];
        const listing: Record<string, string> = {};

        // Title
        const titleMatch = card.match(/<(?:h[1-6]|a)[^>]*>(.*?)<\/(?:h[1-6]|a)>/i);
        if (titleMatch) listing.title = this.stripHtml(titleMatch[1]);

        // Detail URL
        const linkMatch = card.match(/href="([^"]*(?:project|detail|job)[^"]*)"/i)
          || card.match(/href="(\/[^"]*\d+[^"]*)"/i);
        if (linkMatch) listing.detailUrl = linkMatch[1];

        // Job ID
        const idMatch = card.match(/(?:id|project[_-]?id|job[_-]?id)[^>]*>?\s*[:#]?\s*(\d+)/i)
          || (listing.detailUrl && listing.detailUrl.match(/\/(\d+)/));
        if (idMatch) listing.jobId = idMatch[1];

        // Location
        const locMatch = card.match(/(?:location|standort|ort)[^>]*>([^<]+)/i);
        if (locMatch) listing.location = this.stripHtml(locMatch[1]);

        // Posted date
        const dateMatch = card.match(/(?:posted|datum|date|veröffentlicht)[^>]*>?\s*([^<\n]+)/i);
        if (dateMatch) listing.postedDate = this.stripHtml(dateMatch[1]);

        // Short description
        const descMatch = card.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
        if (descMatch) listing.description = this.stripHtml(descMatch[1]);

        if (listing.title) {
          listings.push(listing);
        }
      }
      if (listings.length > 0) break;
    }

    return listings;
  }

  private parseDetailPage(html: string, listing: Record<string, string>): RawJobData {
    const payload: Record<string, string | undefined> = { ...listing };

    // Full description
    const descSection = this.extractBetween(html, '<div class="description"', '</div>')
      || this.extractBetween(html, '<div class="content"', '</div>')
      || this.extractBetween(html, '<div class="project-description"', '</div>');
    const description = this.stripHtml(descSection) || listing.description || "";

    // Structured fields extraction
    const fieldPatterns: Record<string, RegExp[]> = {
      location: [/(?:location|standort|einsatzort)[^:]*:\s*([^<\n]+)/i],
      jobId: [/(?:project\s*(?:id|nr|number)|projekt[_-]?(?:id|nr))[^:]*:\s*([^<\n]+)/i],
      postedDate: [/(?:posted|veröffentlicht|datum|published)[^:]*:\s*([^<\n]+)/i],
      startDate: [/(?:start|beginn|project\s*start)[^:]*:\s*([^<\n]+)/i],
      duration: [/(?:duration|laufzeit|dauer)[^:]*:\s*([^<\n]+)/i],
      capacity: [/(?:capacity|auslastung|workload)[^:]*:\s*([^<\n]+)/i],
      remoteRatio: [
        /(?:remote|home\s*office|mobiles?\s*arbeiten)[^:]*:\s*([^<\n]+)/i,
        /(\d+)\s*%?\s*(?:remote|onsite)/i,
      ],
      languages: [/(?:language|sprache|sprachen)[^:]*:\s*([^<\n]+)/i],
      rate: [/(?:rate|stundensatz|tagessatz|hourly|daily)[^:]*:\s*([^<\n€$]+[€$]?[^<\n]*)/i],
      maxRate: [/(?:max(?:imum)?\s*rate|max\s*stundensatz)[^:]*:\s*([^<\n]+)/i],
      securityClearance: [/(?:security\s*clearance|sicherheitsüberprüfung|ü[1-3]|clearance)[^:]*:\s*([^<\n]+)/i],
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

    // Skills/requirements section
    const skillsSection = this.extractBetween(html, 'skills', '</div>')
      || this.extractBetween(html, 'requirements', '</div>')
      || this.extractBetween(html, 'anforderungen', '</div>');
    if (skillsSection) {
      payload.skills = this.stripHtml(skillsSection);
    }

    return {
      source: this.source,
      externalJobId: payload.jobId || undefined,
      url: listing.detailUrl
        ? (listing.detailUrl.startsWith("http") ? listing.detailUrl : `${this.baseUrl}${listing.detailUrl}`)
        : undefined,
      titleRaw: listing.title || "Unknown Title",
      descriptionRaw: `${description}\n\n${payload.skills || ""}`.trim(),
      locationRaw: payload.location || undefined,
      postedAtRaw: payload.postedDate || undefined,
      rawPayload: payload,
    };
  }
}
