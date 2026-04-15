// ─── AI Job Parser ──────────────────────────────────────────────────
// Parses raw job descriptions into structured normalized data.
// Uses rule-based extraction enhanced with pattern matching.
// Designed to be easily extended with LLM integration later.

import { ParsedJobData, Circle8Signals, NemensisSignals } from "../types";
import { extractSkills, SKILL_KEYWORDS } from "../../skills";

// ─── Role Family Detection ─────────────────────────────────────────

const ROLE_FAMILIES: Record<string, string[]> = {
  devops: ["devops", "devsecops", "platform engineer", "site reliability", "sre", "infrastructure", "ci/cd"],
  backend: ["backend", "back-end", "server-side", "api developer", "java developer", "python developer", ".net developer", "node.js developer"],
  frontend: ["frontend", "front-end", "ui developer", "react developer", "angular developer", "vue developer"],
  fullstack: ["fullstack", "full-stack", "full stack"],
  data: ["data engineer", "data scientist", "data analyst", "bi developer", "etl", "analytics", "machine learning", "ml engineer", "ai engineer"],
  cloud: ["cloud architect", "cloud engineer", "azure architect", "aws architect", "cloud consultant"],
  security: ["security engineer", "security analyst", "security architect", "penetration tester", "soc analyst", "cybersecurity", "infosec"],
  sap: ["sap consultant", "sap developer", "sap basis", "sap hana", "sap abap", "sap fiori", "sap s/4", "sap btp"],
  mobile: ["mobile developer", "ios developer", "android developer", "flutter developer", "react native"],
  architect: ["solution architect", "enterprise architect", "software architect", "technical architect", "it architect"],
  project: ["project manager", "scrum master", "agile coach", "product owner", "delivery manager"],
  qa: ["qa engineer", "test engineer", "quality assurance", "test automation", "tester"],
  dba: ["database administrator", "dba", "database engineer"],
  network: ["network engineer", "network architect", "network admin"],
};

const SENIORITY_PATTERNS: Record<string, string[]> = {
  junior: ["junior", "entry level", "trainee", "intern", "1-2 years", "0-2 years"],
  mid: ["mid-level", "mid level", "intermediate", "3-5 years", "2-5 years"],
  senior: ["senior", "experienced", "5+ years", "5-10 years", "erfahren"],
  lead: ["lead", "team lead", "tech lead", "principal", "head of", "teamlead"],
  principal: ["principal", "staff engineer", "distinguished", "fellow"],
};

const REMOTE_PATTERNS: Record<string, RegExp[]> = {
  remote: [/100\s*%?\s*remote/i, /fully?\s*remote/i, /remote\s*only/i, /komplett\s*remote/i],
  hybrid: [/hybrid/i, /\d+\s*%?\s*remote.*\d+\s*%?\s*(?:onsite|office|vor\s*ort)/i, /teilweise\s*remote/i, /remote.*onsite/i],
  onsite: [/100\s*%?\s*(?:onsite|on-site|vor\s*ort)/i, /no\s*remote/i, /onsite\s*only/i, /vor\s*ort\s*pflicht/i],
};

const CONTRACT_PATTERNS: Record<string, RegExp[]> = {
  body_leasing: [/body\s*leasing/i, /anü/i, /arbeitnehmerüberlassung/i, /zeitarbeit/i, /leih/i, /staff\s*augmentation/i, /nearshore/i],
  freelance: [/freelance/i, /freiberuflich/i, /contract/i, /contracting/i, /projekt\s*basis/i],
  permanent: [/permanent/i, /festanstellung/i, /unbefristet/i, /full[\s-]?time\s*employ/i],
  project: [/project[\s-]?based/i, /projekt/i, /befristet/i, /werk\s*vertrag/i, /dienstvertrag/i],
};

// ─── Language Extraction ───────────────────────────────────────────

const LANGUAGE_PATTERNS: Array<{ lang: string; patterns: RegExp[] }> = [
  { lang: "German", patterns: [/german\s*[:\-]?\s*(native|fluent|c[12]|b[12]|a[12]|business|mother)/i, /deutsch\s*[:\-]?\s*(muttersprachlich|fließend|c[12]|b[12]|a[12]|verhandlungssicher|gut)/i] },
  { lang: "English", patterns: [/english\s*[:\-]?\s*(native|fluent|c[12]|b[12]|a[12]|business|good)/i, /englisch\s*[:\-]?\s*(muttersprachlich|fließend|c[12]|b[12]|a[12]|verhandlungssicher|gut)/i] },
  { lang: "French", patterns: [/french\s*[:\-]?\s*(native|fluent|c[12]|b[12]|a[12]|business)/i] },
  { lang: "Turkish", patterns: [/turkish\s*[:\-]?\s*(native|fluent|c[12]|b[12]|a[12])/i, /türkisch\s*[:\-]?\s*(muttersprachlich|fließend|c[12]|b[12])/i] },
];

// ─── Main Parser ───────────────────────────────────────────────────

export function parseJobDescription(
  titleRaw: string,
  descriptionRaw: string,
  source: string,
  rawPayload: Record<string, unknown>
): ParsedJobData {
  const fullText = `${titleRaw} ${descriptionRaw}`.toLowerCase();
  const skills = extractSkills(fullText);

  // Detect role family
  const roleFamily = detectRoleFamily(fullText);

  // Detect seniority
  const seniority = detectSeniority(fullText);

  // Categorize skills
  const { mustHave, niceToHave } = categorizeSkills(skills, fullText);

  // Detect languages
  const languages = detectLanguages(fullText, rawPayload);

  // Detect remote type
  const remoteType = detectRemoteType(fullText, rawPayload);

  // Detect contract model
  const contractModel = detectContractModel(fullText, rawPayload);

  // Extract temporal data
  const { startDate, projectDuration, weeklyHours, capacityPercent } = extractTemporalData(fullText, rawPayload);

  // Extract rate
  const rateMax = extractRate(fullText, rawPayload);

  // Detect location
  const { city, country } = extractLocation(fullText, rawPayload);

  // Source-specific signals
  const sourceSignals = source === "circle8"
    ? extractCircle8Signals(fullText, rawPayload)
    : source === "nemensis"
      ? extractNemensisSignals(fullText, rawPayload)
      : {};

  // Calculate scores
  const bodyLeasingFitScore = calculateBodyLeasingFit(contractModel, remoteType, sourceSignals, fullText);
  const urgencyScore = calculateUrgency(startDate, rawPayload, fullText);
  const candidateDifficultyScore = calculateDifficulty(mustHave, languages, seniority, fullText);

  // Generate summary
  const summary = generateSummary(titleRaw, roleFamily, seniority, city, country, remoteType, contractModel, projectDuration);

  return {
    roleFamily,
    seniority,
    mustHaveSkills: mustHave,
    niceToHaveSkills: niceToHave,
    techStack: skills,
    languages,
    locationCity: city,
    locationCountry: country,
    remoteType,
    employmentType: contractModel === "permanent" ? "permanent" : "contract",
    contractModel,
    projectDuration,
    startDate,
    weeklyHours,
    capacityPercent,
    rateMax,
    customerType: detectCustomerType(fullText),
    summary,
    bodyLeasingFitScore,
    urgencyScore,
    candidateDifficultyScore,
    sourceSignals,
  };
}

// ─── Helper Functions ──────────────────────────────────────────────

function detectRoleFamily(text: string): string | null {
  for (const [family, keywords] of Object.entries(ROLE_FAMILIES)) {
    if (keywords.some((kw) => text.includes(kw))) {
      return family;
    }
  }
  return null;
}

function detectSeniority(text: string): string | null {
  for (const [level, keywords] of Object.entries(SENIORITY_PATTERNS)) {
    if (keywords.some((kw) => text.includes(kw))) {
      return level;
    }
  }
  return null;
}

function categorizeSkills(skills: string[], text: string): { mustHave: string[]; niceToHave: string[] } {
  const mustHave: string[] = [];
  const niceToHave: string[] = [];

  // Keywords that indicate required/must-have
  const requiredMarkers = ["must have", "required", "mandatory", "essential", "erforderlich", "zwingend", "muss"];
  const niceMarkers = ["nice to have", "preferred", "optional", "wünschenswert", "von vorteil", "bonus", "plus"];

  for (const skill of skills) {
    const skillLower = skill.toLowerCase();
    // Check if skill appears near "nice to have" markers
    const keywords = SKILL_KEYWORDS[skill] || [skillLower];
    let isNiceToHave = false;

    for (const kw of keywords) {
      const idx = text.indexOf(kw);
      if (idx === -1) continue;

      // Check surrounding context (200 chars before)
      const context = text.substring(Math.max(0, idx - 200), idx);
      if (niceMarkers.some((m) => context.includes(m))) {
        isNiceToHave = true;
        break;
      }
    }

    if (isNiceToHave) {
      niceToHave.push(skill);
    } else {
      mustHave.push(skill);
    }
  }

  return { mustHave, niceToHave };
}

function detectLanguages(text: string, payload: Record<string, unknown>): Array<{ lang: string; level: string }> {
  const languages: Array<{ lang: string; level: string }> = [];

  for (const { lang, patterns } of LANGUAGE_PATTERNS) {
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        languages.push({ lang, level: match[1] });
        break;
      }
    }
  }

  // Check payload for language info
  const payloadLangs = payload.languages || payload.sprachen;
  if (typeof payloadLangs === "string") {
    if (!languages.some((l) => l.lang === "German") && /deutsch|german/i.test(payloadLangs)) {
      languages.push({ lang: "German", level: "required" });
    }
    if (!languages.some((l) => l.lang === "English") && /english|englisch/i.test(payloadLangs)) {
      languages.push({ lang: "English", level: "required" });
    }
  }

  // Default: if no languages detected but text mentions German context
  if (languages.length === 0) {
    if (/germany|deutschland|german/i.test(text)) {
      languages.push({ lang: "German", level: "assumed" });
    }
    languages.push({ lang: "English", level: "assumed" });
  }

  return languages;
}

function detectRemoteType(text: string, payload: Record<string, unknown>): string | null {
  for (const [type, patterns] of Object.entries(REMOTE_PATTERNS)) {
    if (patterns.some((p) => p.test(text))) return type;
  }

  const remoteField = payload.remote || payload.remoteRatio;
  if (typeof remoteField === "string") {
    if (/100|full|komplett/i.test(remoteField)) return "remote";
    if (/hybrid|teil/i.test(remoteField)) return "hybrid";
    if (/0|no|onsite|vor\s*ort/i.test(remoteField)) return "onsite";
  }

  return null;
}

function detectContractModel(text: string, payload: Record<string, unknown>): string | null {
  for (const [model, patterns] of Object.entries(CONTRACT_PATTERNS)) {
    if (patterns.some((p) => p.test(text))) return model;
  }
  return "freelance"; // Default for IT project platforms
}

function extractTemporalData(text: string, payload: Record<string, unknown>) {
  let startDate: string | null = null;
  let projectDuration: string | null = null;
  let weeklyHours: string | null = null;
  let capacityPercent: string | null = null;

  // Start date
  const startMatch = text.match(/(?:start|beginn)[^:]*:\s*([^,\n]+)/i)
    || text.match(/(?:ab\s*sofort|asap|immediately)/i);
  if (startMatch) startDate = startMatch[1]?.trim() || "ASAP";
  if (payload.startDate) startDate = String(payload.startDate);

  // Duration
  const durationMatch = text.match(/(?:duration|laufzeit|dauer)[^:]*:\s*([^,\n]+)/i)
    || text.match(/(\d+)\s*(?:months?|monate?)/i);
  if (durationMatch) projectDuration = durationMatch[1]?.trim() || durationMatch[0];
  if (payload.duration) projectDuration = String(payload.duration);

  // Weekly hours
  const hoursMatch = text.match(/(\d+)\s*(?:hours?|stunden?)\s*(?:per|pro|\/)\s*(?:week|woche)/i)
    || text.match(/(?:weekly\s*hours|wochenstunden)[^:]*:\s*(\d+)/i);
  if (hoursMatch) weeklyHours = hoursMatch[1];
  if (payload.weeklyHours) weeklyHours = String(payload.weeklyHours);

  // Capacity
  const capMatch = text.match(/(?:capacity|auslastung)[^:]*:\s*(\d+)\s*%/i)
    || text.match(/(\d+)\s*%\s*(?:capacity|auslastung)/i);
  if (capMatch) capacityPercent = capMatch[1];
  if (payload.capacity) capacityPercent = String(payload.capacity);

  return { startDate, projectDuration, weeklyHours, capacityPercent };
}

function extractRate(text: string, payload: Record<string, unknown>): string | null {
  const rateMatch = text.match(/(?:max(?:imum)?\s*)?(?:rate|stundensatz|tagessatz)[^:]*:\s*([\d.,]+\s*[€$]?[^,\n]*)/i)
    || text.match(/([\d.,]+)\s*(?:€|eur|euro)\s*(?:per|pro|\/)\s*(?:hour|stunde|h|day|tag)/i);
  if (rateMatch) return rateMatch[1].trim();
  if (payload.rate) return String(payload.rate);
  if (payload.maxRate) return String(payload.maxRate);
  return null;
}

function extractLocation(text: string, payload: Record<string, unknown>): { city: string | null; country: string | null } {
  const germanCities = [
    "berlin", "münchen", "munich", "hamburg", "frankfurt", "köln", "cologne",
    "düsseldorf", "stuttgart", "dortmund", "essen", "leipzig", "bremen",
    "dresden", "hannover", "nürnberg", "nuremberg", "duisburg", "bochum",
    "wuppertal", "bielefeld", "bonn", "münster", "karlsruhe", "mannheim",
    "augsburg", "wiesbaden", "aachen", "königstein", "walldorf",
  ];

  let city: string | null = null;
  let country: string | null = null;

  // From payload
  if (payload.location) {
    const loc = String(payload.location).toLowerCase();
    for (const c of germanCities) {
      if (loc.includes(c)) {
        city = c.charAt(0).toUpperCase() + c.slice(1);
        country = "Germany";
        break;
      }
    }
    if (!city) city = String(payload.location);
  }

  // From text
  if (!city) {
    for (const c of germanCities) {
      if (text.includes(c)) {
        city = c.charAt(0).toUpperCase() + c.slice(1);
        country = "Germany";
        break;
      }
    }
  }

  if (!country && /germany|deutschland/i.test(text)) country = "Germany";
  if (!country && /austria|österreich/i.test(text)) country = "Austria";
  if (!country && /switzerland|schweiz/i.test(text)) country = "Switzerland";

  return { city, country };
}

function detectCustomerType(text: string): string | null {
  if (/dax\s*(?:30|40)|blue\s*chip|konzern/i.test(text)) return "enterprise";
  if (/mittelstand|mid-?size/i.test(text)) return "midsize";
  if (/startup|start-?up/i.test(text)) return "startup";
  if (/public|öffentlich|behörde|government/i.test(text)) return "public_sector";
  if (/bank|versicherung|insurance|financial/i.test(text)) return "financial";
  if (/automotive|auto|car/i.test(text)) return "automotive";
  if (/pharma|healthcare|gesundheit/i.test(text)) return "healthcare";
  return null;
}

// ─── Score Calculations ────────────────────────────────────────────

function calculateBodyLeasingFit(
  contractModel: string | null,
  remoteType: string | null,
  signals: Record<string, unknown>,
  text: string
): number {
  let score = 0;

  // Contract model signals
  if (contractModel === "body_leasing") score += 40;
  else if (contractModel === "freelance") score += 25;
  else if (contractModel === "project") score += 20;

  // Remote friendliness (nearshore-friendly)
  if (remoteType === "remote") score += 20;
  else if (remoteType === "hybrid") score += 10;

  // ANÜ signal (strong body leasing indicator)
  if (signals.anuType || /anü|arbeitnehmerüberlassung/i.test(text)) score += 15;

  // Nearshore / offshore keywords
  if (/nearshore|near-shore|offshore|off-shore/i.test(text)) score += 15;

  // Duration > 6 months (good for leasing)
  const durationMatch = text.match(/(\d+)\s*(?:months?|monate?)/i);
  if (durationMatch && parseInt(durationMatch[1]) >= 6) score += 10;
  else if (durationMatch && parseInt(durationMatch[1]) >= 3) score += 5;

  return Math.min(100, score);
}

function calculateUrgency(startDate: string | null, payload: Record<string, unknown>, text: string): number {
  let score = 0;

  // ASAP / immediate start
  if (/asap|sofort|immediately|urgent|dringend/i.test(text)) score += 40;
  if (startDate && /asap|sofort|immediately/i.test(startDate)) score += 20;

  // Deadline present
  if (payload.deadline) score += 15;

  // Start date within 2 weeks
  if (startDate) {
    const dateMatch = startDate.match(/(\d{1,2})[./](\d{1,2})[./](\d{2,4})/);
    if (dateMatch) {
      const targetDate = new Date(
        parseInt(dateMatch[3].length === 2 ? `20${dateMatch[3]}` : dateMatch[3]),
        parseInt(dateMatch[2]) - 1,
        parseInt(dateMatch[1])
      );
      const daysUntil = (targetDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
      if (daysUntil <= 14 && daysUntil > 0) score += 30;
      else if (daysUntil <= 30 && daysUntil > 0) score += 15;
    }
  }

  // Urgency keywords
  if (/urgent|dringend|schnellstmöglich|asap|immediately/i.test(text)) score += 15;

  return Math.min(100, score);
}

function calculateDifficulty(
  mustHave: string[],
  languages: Array<{ lang: string; level: string }>,
  seniority: string | null,
  text: string
): number {
  let score = 0;

  // Many required skills = harder to find
  if (mustHave.length > 10) score += 30;
  else if (mustHave.length > 7) score += 20;
  else if (mustHave.length > 4) score += 10;

  // German required = harder for nearshore
  if (languages.some((l) => l.lang === "German" && /native|c[12]|fluent|mutter/i.test(l.level))) {
    score += 25;
  } else if (languages.some((l) => l.lang === "German" && /b[12]/i.test(l.level))) {
    score += 15;
  }

  // High seniority = harder
  if (seniority === "principal") score += 20;
  else if (seniority === "lead") score += 15;
  else if (seniority === "senior") score += 10;

  // Security clearance = very restrictive
  if (/security\s*clearance|sicherheitsüberprüfung|ü[23]/i.test(text)) score += 20;

  // Onsite only = harder for nearshore
  if (/onsite\s*only|100\s*%?\s*(?:onsite|vor\s*ort)/i.test(text)) score += 15;

  return Math.min(100, score);
}

function extractCircle8Signals(text: string, payload: Record<string, unknown>): Circle8Signals {
  return {
    anuType: (payload.anuType as string) || (/anü|arbeitnehmerüberlassung/i.test(text) ? "detected" : undefined),
    extensionOption: (payload.extensionOption as string) || undefined,
    weeklyHours: (payload.weeklyHours as string) || undefined,
    deadline: (payload.deadline as string) || undefined,
    referenceCode: (payload.referenceCode as string) || undefined,
  };
}

function extractNemensisSignals(text: string, payload: Record<string, unknown>): NemensisSignals {
  return {
    capacityPercent: (payload.capacity as string) || undefined,
    rate: (payload.rate as string) || (payload.maxRate as string) || undefined,
    remoteOnsiteRatio: (payload.remoteRatio as string) || undefined,
    languageLevels: undefined, // Extracted via detectLanguages
    securityClearance: (payload.securityClearance as string) || (/security\s*clearance|ü[1-3]/i.test(text) ? "required" : undefined),
  };
}

function generateSummary(
  title: string,
  roleFamily: string | null,
  seniority: string | null,
  city: string | null,
  country: string | null,
  remoteType: string | null,
  contractModel: string | null,
  duration: string | null
): string {
  const parts: string[] = [];
  if (seniority) parts.push(seniority.charAt(0).toUpperCase() + seniority.slice(1));
  if (roleFamily) parts.push(roleFamily.toUpperCase());
  parts.push(`position: "${title}".`);
  if (city || country) parts.push(`Location: ${[city, country].filter(Boolean).join(", ")}.`);
  if (remoteType) parts.push(`Remote: ${remoteType}.`);
  if (contractModel) parts.push(`Contract: ${contractModel}.`);
  if (duration) parts.push(`Duration: ${duration}.`);
  return parts.join(" ");
}
