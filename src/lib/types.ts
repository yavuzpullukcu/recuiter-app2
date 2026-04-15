export interface Candidate {
  id: number;
  name: string;
  title: string | null;
  company: string | null;
  location: string | null;
  linkedin: string | null;
  email: string | null;
  phone: string | null;
  skills: string; // JSON string
  experience: number;
  status: string;
  rating: number;
  notes: string | null;
  jobId: number | null;
  job?: Job | null;
  activities?: Activity[];
  createdAt: string;
  updatedAt: string;
  cvContent?: string;      
  jobMatches?: any[];      
  
}

export interface Job {
  id: number;
  title: string;
  company: string | null;
  description: string;
  skills: string; // JSON string
  location: string | null;
  startDate: string | null;
  endDate: string | null;
  workload: string | null;
  contractType: string | null;
  status: string;
  _count?: { candidates: number };
  candidates?: Candidate[];
  createdAt: string;
  updatedAt: string;
}

export interface Activity {
  id: number;
  type: string;
  content: string;
  candidateId: number;
  createdAt: string;
}

// ─── Job Intelligence Types (for frontend use) ─────────────────────

export interface NormalizedJob {
  id: number;
  rawJobId: number;
  titleClean: string;
  roleFamily: string | null;
  seniority: string | null;
  techStack: string[] | null;
  mustHave: string[] | null;
  niceToHave: string[] | null;
  languages: Array<{ lang: string; level: string }> | null;
  remoteType: string | null;
  contractModel: string | null;
  location: string | null;
  locationCountry: string | null;
  projectDuration: string | null;
  startDate: string | null;
  weeklyHours: string | null;
  capacityPercent: string | null;
  rateMax: string | null;
  urgencyScore: number;
  bodyLeasingFitScore: number;
  candidateDifficultyScore: number;
  summary: string | null;
  customerType: string | null;
  source: string;
  url: string | null;
  status: string;
  createdAt: string;
}

export interface JobMatchResult {
  id: number;
  normalizedJobId: number;
  candidateId: number;
  matchScore: number;
  explanation: string | null;
  missingSkills: string[] | null;
  hardFilterPass: boolean;
  skillOverlap: number;
  candidateName?: string;
  candidateTitle?: string;
}

export const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  new: { label: "Yeni", color: "text-blue-700", bg: "bg-blue-50", dot: "bg-blue-500" },
  contacted: { label: "Iletisime Gecildi", color: "text-amber-700", bg: "bg-amber-50", dot: "bg-amber-500" },
  interview: { label: "Mulakat", color: "text-purple-700", bg: "bg-purple-50", dot: "bg-purple-500" },
  offered: { label: "Teklif", color: "text-green-700", bg: "bg-green-50", dot: "bg-green-500" },
  rejected: { label: "Red", color: "text-red-700", bg: "bg-red-50", dot: "bg-red-500" },
  placed: { label: "Yerlestirildi", color: "text-emerald-700", bg: "bg-emerald-50", dot: "bg-emerald-500" },
};
