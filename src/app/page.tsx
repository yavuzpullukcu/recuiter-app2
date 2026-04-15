"use client";
import StaffingDashboard from "@/components/StaffingDashboard";
import FirmaAtamalari from "@/components/FirmaAtamalari";
import AIMatcherPage from "./admin/ai-matcher/page"; 

import { useState, useEffect, useCallback } from "react";
import { 
  Users, Search, Plus, AlertCircle, MessageSquare, CheckCircle, 
  Briefcase, X, UserSearch, BarChart3, Building2, LogOut, 
  ChevronDown, ShieldCheck, CreditCard, Cpu, Edit2, FileText, MapPin, 
  Calendar as CalendarIcon, ToggleLeft, ToggleRight, LayoutGrid, Layers,
  Activity, Star, Globe, Clock, Filter, Trash2, ArrowRight, Download
} from "lucide-react";
import CandidateCard from "@/components/CandidateCard";
import CandidateModal from "@/components/CandidateModal";
import CandidateDetail from "@/components/CandidateDetail";
import JDAnalyzer from "@/components/JDAnalyzer";
import LinkedInSearch from "@/components/LinkedInSearch";
import { Candidate, STATUS_CONFIG } from "@/lib/types";
import { extractSkills, calculateMatchScore } from "@/lib/skills";
import { useLanguage } from "@/lib/i18n/LanguageContext";

// â”€â”€â”€ TÄ°PLER VE ARAYÃœZLER â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
interface Job {
  id: number; title: string; company: string | null; description?: string;
  location?: string; startDate?: string; endDate?: string; workload?: string;
  contractType?: string; status?: string; jdFile?: string;
}

type Tab = "staffing" | "candidates" | "find" | "jobs" | "firma" | "ai-matcher";

const LOGO_SRC = "/arkhetalent-logo.png";

function ArkhetalentLogo({ collapsed }: { collapsed: boolean }) {
  return (
    <div className="px-2">
      <img src={LOGO_SRC} alt="arkhetalent nearshore IT" style={{ height: 28, maxWidth: 140, objectFit: "contain", filter: "brightness(0) invert(1)" }} />
    </div>
  );
}

export default function Home() {
  const { t, locale, setLocale } = useLanguage();
  const isDe = locale === "de";
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [jdSkills, setJdSkills] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [sortBy, setSortBy] = useState("match");
  const [showModal, setShowModal] = useState(false);
  const [editingCandidate, setEditingCandidate] = useState<Candidate | null>(null);
  const [viewingCandidate, setViewingCandidate] = useState<Candidate | null>(null);
  const [jobFilter, setJobFilter] = useState<"all" | "active" | "closed">("active");
  const [selectedPosition, setSelectedPosition] = useState("all");
  const [editingJob, setEditingJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("staffing");
  const [collapsed, setCollapsed] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const [jobForm, setJobForm] = useState({ title: "", company: "", description: "", location: "", startDate: "", endDate: "", workload: "", contractType: "Full-time" });
  const [showJobForm, setShowJobForm] = useState(false);
  const [isDraggingOnJD, setIsDraggingOnJD] = useState(false);
  const [isParsingDoc, setIsParsingDoc] = useState(false);
  const [docParseError, setDocParseError] = useState("");
  const [pendingJDFile, setPendingJDFile] = useState<File | null>(null);

  const fetchCandidates = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filterStatus !== "all") params.set("status", filterStatus);
      if (search) params.set("search", search);
      const res = await fetch(`/api/candidates?${params}`);
      setCandidates(await res.json());
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [filterStatus, search]);

  const fetchJobs = useCallback(async () => {
    try {
      const res = await fetch("/api/jobs");
      setJobs(await res.json());
    } catch (err) { console.error(err); }
  }, []);

  useEffect(() => {
    fetch("/api/auth/me").then(r => r.json()).then(data => { if (data?.user) setUser(data.user); }).catch(() => {});
    fetchCandidates(); fetchJobs();
  }, [fetchCandidates, fetchJobs]);

  const handleLogout = async () => { await fetch("/api/auth/logout", { method: "POST" }); window.location.href = "/login"; };

  const handleStatusChange = async (candidateId: number, status: string) => {
    await fetch(`/api/candidates/${candidateId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
    fetchCandidates();
    const res = await fetch(`/api/candidates/${candidateId}`);
    setViewingCandidate(await res.json());
  };

  const parseJDFields = (text: string) => {
    const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
    const t = text.toLowerCase();
    const extracted: Partial<typeof jobForm> = {};

    // Title: first non-empty line that looks like a job title (not too long, no sentence)
    for (const line of lines.slice(0, 8)) {
      if (line.length > 5 && line.length < 80 && !line.includes("GmbH") && !line.includes("AG") && line.split(" ").length <= 7) {
        extracted.title = line.replace(/[*#_]/g, "").trim();
        break;
      }
    }

    // Company: look for keywords
    const companyMatch = text.match(/(?:Company|Firma|Kunde|Auftraggeber|Client|Unternehmen|bei der|bei)\s*[:\-–]?\s*([A-Z][^\n,]{2,40})/i);
    if (companyMatch) extracted.company = companyMatch[1].trim().replace(/[*#_]/g, "");

    // Location: common keywords
    const locationMatch = text.match(/(?:Location|Standort|Ort|Stadt|City|Einsatzort)\s*[:\-–]?\s*([A-Za-zÄÖÜäöüß\s,]{2,40})/i);
    if (locationMatch) extracted.location = locationMatch[1].trim();
    else if (/\bremote\b/i.test(t)) extracted.location = "Remote";
    else if (/\bhybrid\b/i.test(t)) extracted.location = "Hybrid";

    // Start date
    const dateMatch = text.match(/(?:Start|Ab|Startdatum|Beginn|Starttermin|Einsatzbeginn)\s*[:\-–]?\s*([\d]{1,2}[.\-/][\d]{1,2}[.\-/][\d]{2,4}|\d{4}-\d{2}-\d{2}|sofort|ASAP|ab sofort)/i);
    if (dateMatch) {
      const d = dateMatch[1];
      if (/sofort|asap/i.test(d)) extracted.startDate = "";
      else {
        // Try to normalize to YYYY-MM-DD
        const parts = d.replace(/\//g, ".").replace(/-/g, ".").split(".");
        if (parts.length === 3) {
          const [a, b, c] = parts;
          if (c.length === 4) extracted.startDate = `${c}-${b.padStart(2,"0")}-${a.padStart(2,"0")}`;
          else if (a.length === 4) extracted.startDate = `${a}-${b.padStart(2,"0")}-${c.padStart(2,"0")}`;
        }
      }
    }

    // Workload
    const wlMatch = text.match(/(\d{1,3})\s*%|(?:Vollzeit|Full[- ]?time|Vollzeitstelle)/i);
    if (wlMatch) extracted.workload = wlMatch[1] ? `%${wlMatch[1]}` : "%100";
    else if (/(?:Teilzeit|Part[- ]?time)/i.test(t)) extracted.workload = "%50";

    // Contract type
    if (/\bfreelance\b/i.test(t)) extracted.contractType = "Freelance";
    else if (/\bcontract\b|\bkontrat\b|\bfestanstellung\b/i.test(t)) extracted.contractType = "Contract";
    else extracted.contractType = "Full-time";

    return extracted;
  };

  const handleJDDocDrop = async (file: File) => {
    setDocParseError(""); setIsParsingDoc(true);
    try {
      const fd = new FormData(); fd.append("file", file);
      const res = await fetch("/api/parse-document", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      const extracted = parseJDFields(data.text);
      setJobForm((prev) => ({ ...prev, description: data.text, ...extracted }));
      if (file.name.endsWith(".pdf")) setPendingJDFile(file);
      if (!showJobForm) setShowJobForm(true);
    } catch { setDocParseError(isDe ? "Datei konnte nicht gelesen werden." : "Dosya okunamadı."); }
    finally { setIsParsingDoc(false); }
  };

  const handleJobFormSubmit = async () => {
    const res = await fetch("/api/jobs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...jobForm, status: "active" }) });
    const saved = await res.json();
    if (pendingJDFile && saved?.id) {
      const fd = new FormData(); fd.append("file", pendingJDFile);
      await fetch(`/api/jobs/${saved.id}/upload-jd`, { method: "POST", body: fd });
    }
    setShowJobForm(false); setPendingJDFile(null); fetchJobs();
  };

  const handleUpdateJob = async (id: number, data: any) => {
    const res = await fetch(`/api/jobs/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (res.ok) { setEditingJob(null); fetchJobs(); }
  };

  const handleCreateJob = async (title: string, description: string, extra?: any) => {
    await fetch("/api/jobs", { 
      method: "POST", 
      headers: { "Content-Type": "application/json" }, 
      body: JSON.stringify({ title, description, ...extra, status: "active" }) 
    });
    fetchJobs();
  };

  const handleDeleteCandidate = async (id: number) => {
    if (!confirm(t("confirm.deleteCandidate") || "Bu adayÄ± silmek istediÄŸinize emin misiniz?")) return;
    try {
      const res = await fetch(`/api/candidates/${id}`, { method: "DELETE" });
      if (res.ok) {
        setCandidates((prev) => prev.filter((c) => c.id !== id));
      }
    } catch (err) {
      console.error(err);
    }
  };

  // ðŸš€ Ä°ÅžTE DÃœZELTÄ°LEN TEK YER: Silme fonksiyonu arayÃ¼zÃ¼ anÄ±nda gÃ¼nceller (Optimistic Update)
  const handleDeleteJob = async (id: number) => {
  if (!confirm(t("jobs.deleteConfirm"))) return;

  try {
    const res = await fetch(`/api/jobs/${id}`, { method: "DELETE" });
    const data = await res.json().catch(() => null);

    if (!res.ok) {
      throw new Error(data?.error || (isDe ? "Stellenanzeige konnte nicht geloescht werden." : "Is ilani silinemedi."));
    }

    await fetchJobs();
    alert(isDe ? "Stellenanzeige wurde geloescht." : "Is ilani basariyla silindi.");
  } catch (error: any) {
    console.error("Delete error:", error);
    alert(error.message || (isDe ? "Beim Loeschen ist ein Fehler aufgetreten." : "Silme islemi sirasinda hata olustu."));
  }
};

  const handleSaveCandidate = async (form: any, pendingCVFile?: File | null) => {
    const url = editingCandidate ? `/api/candidates/${editingCandidate.id}` : "/api/candidates";
    const method = editingCandidate ? "PUT" : "POST";
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const saved = await res.json();
    if (pendingCVFile && saved?.id) {
      const fd = new FormData(); fd.append("file", pendingCVFile);
      await fetch(`/api/candidates/${saved.id}/upload-cv`, { method: "POST", body: fd });
    }
    setShowModal(false); setEditingCandidate(null); fetchCandidates();
  };

  const sortedCandidates = [...candidates].sort((a, b) => {
    if (sortBy === "match" && jdSkills.length > 0) {
      return calculateMatchScore(JSON.parse(b.skills || "[]"), jdSkills) - calculateMatchScore(JSON.parse(a.skills || "[]"), jdSkills);
    }
    return a.name.localeCompare(b.name);
  });

  const allPositions = Array.from(new Set(candidates.map(c => c.title || "BelirtilmemiÅŸ"))).sort();
  const displayedCandidates = selectedPosition === "all" ? sortedCandidates : sortedCandidates.filter(c => (c.title || "BelirtilmemiÅŸ") === selectedPosition);
  const filteredJobs = jobs.filter((j: Job) => jobFilter === "all" ? true : j.status === jobFilter);

  const formatDisplayDate = (d: string) => d ? new Date(d).toLocaleDateString(locale === "de" ? "de-DE" : "tr-TR") : "-";

  const statsList = [
    { label: t("stats.total"), value: candidates.length, icon: Users, color: "bg-blue-50 text-[#045b7c]" },
    { label: t("stats.new"), value: candidates.filter((c) => c.status === "new").length, icon: AlertCircle, color: "bg-orange-50 text-orange-600" },
    { label: t("stats.contacted"), value: candidates.filter((c) => c.status === "contacted").length, icon: MessageSquare, color: "bg-brand-50 text-brand-600" },
    { label: t("stats.placed"), value: candidates.filter((c) => c.status === "placed").length, icon: CheckCircle, color: "bg-emerald-50 text-emerald-600" },
  ];

  const sidebarW = collapsed ? 64 : 220;

  const navItems: any[] = [
    { id: "staffing", label: "Dashboard", labelDe: "Dashboard", icon: BarChart3 },
    { id: "candidates", label: "Aday Havuzu", labelDe: "Kandidaten", icon: Users },
    { id: "find", label: "Aday Bul", labelDe: "Kandidat finden", icon: UserSearch },
    { id: "jobs", label: "Is Ilanlari", labelDe: "Stellen", icon: Briefcase },
    { id: "firma", label: "Atama Merkezi", labelDe: "Zuweisungen", icon: Building2 },
    { id: "ai-matcher", label: "AI Matcher", labelDe: "AI Matcher", icon: Cpu },
  ];

  return (
    <div className="flex min-h-screen bg-[#f1f5f9] overflow-x-hidden">
      <aside className="fixed left-0 top-0 h-full flex flex-col z-40 transition-all duration-300" style={{ width: sidebarW, background: "#0f172a", borderRight: "1px solid rgba(255,255,255,0.06)" }}>
        {/* Logo */}
        <div className="flex items-center justify-between px-4 py-5 border-b border-white/[0.06]">
          <ArkhetalentLogo collapsed={collapsed} />
          <button onClick={() => setCollapsed(!collapsed)} className="w-6 h-6 flex items-center justify-center text-slate-500 hover:text-slate-300 transition-colors rounded">
            <X size={15} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-3 px-2 overflow-y-auto custom-scrollbar space-y-0.5">
          {navItems.map((item: any) => (
            <button key={item.id} onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                activeTab === item.id
                  ? "bg-[#045b7c] text-white"
                  : "text-slate-400 hover:bg-white/[0.05] hover:text-slate-200"
              }`}>
              <item.icon size={16} className="shrink-0" />
              {!collapsed && <span className="font-medium truncate">{locale === "de" ? item.labelDe : item.label}</span>}
            </button>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-2 pb-4 pt-3 border-t border-white/[0.06] space-y-2">
          {/* Language switcher */}
          <div className="flex bg-white/[0.05] rounded-md p-0.5">
            <button onClick={() => setLocale("tr")} className={`flex-1 py-1 rounded text-xs font-medium transition-colors ${locale === "tr" ? "bg-white text-slate-900" : "text-slate-500 hover:text-slate-300"}`}>TR</button>
            <button onClick={() => setLocale("de")} className={`flex-1 py-1 rounded text-xs font-medium transition-colors ${locale === "de" ? "bg-white text-slate-900" : "text-slate-500 hover:text-slate-300"}`}>DE</button>
          </div>

          {/* New candidate button */}
          <button onClick={() => { setEditingCandidate(null); setShowModal(true); }}
            className="w-full py-2 bg-[#045b7c] text-white rounded-lg text-sm font-medium flex items-center justify-center gap-2 hover:bg-[#03455e] transition-colors">
            <Plus size={15} />
            {!collapsed && <span>Yeni Aday</span>}
          </button>

          {/* User */}
          {!collapsed ? (
            <div className="relative">
              <button onClick={() => setShowUserMenu(!showUserMenu)}
                className="w-full flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-white/[0.05] transition-colors text-left">
                <div className="w-7 h-7 rounded-full bg-[#045b7c] flex items-center justify-center text-white text-xs font-semibold shrink-0">
                  {user?.firstName?.[0]?.toUpperCase() || "Y"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-200 truncate">{user?.firstName ? `${user.firstName} ${user.lastName || ""}`.trim() : "Yavuz Pullukcu"}</p>
                  <p className="text-xs text-slate-500">{user?.plan || "Pro Plan"}</p>
                </div>
                <ChevronDown size={13} className="text-slate-500 shrink-0" />
              </button>
              {showUserMenu && (
                <div className="absolute bottom-full left-0 w-full mb-1 bg-slate-800 border border-slate-700 rounded-lg overflow-hidden shadow-xl">
                  <button onClick={handleLogout} className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm font-medium text-rose-400 hover:bg-slate-700/50 transition-colors">
                    <LogOut size={14} /> Çıkış Yap
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button onClick={handleLogout} className="w-full flex justify-center py-2 text-slate-500 hover:text-rose-400 transition-colors"><LogOut size={16} /></button>
          )}
        </div>
      </aside>

      <main className="flex-1 transition-all duration-300" style={{ marginLeft: sidebarW }}>
        <div className="max-w-6xl mx-auto px-8 py-10 space-y-8">
          {activeTab === "staffing" && <StaffingDashboard locale={locale} />}

          {activeTab === "candidates" && (
            <div className="space-y-5 animate-in fade-in duration-300">
              {/* Stat cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {statsList.map((s: any) => (
                  <div key={s.label} className="bg-white rounded-xl p-4 border border-gray-200 flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${s.color}`}><s.icon size={18} /></div>
                    <div>
                      <p className="text-2xl font-semibold text-gray-900 leading-none">{s.value}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Search + filters */}
              <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
                <div className="relative">
                  <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input value={search} onChange={(e: any) => setSearch(e.target.value)}
                    placeholder={isDe ? "Nach Name, Skill oder Stadt suchen..." : "Aday isminde, teknik yetenekte veya şehirde arama yapın..."}
                    className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:bg-white focus:border-[#045b7c] transition-colors" />
                </div>
                <div className="flex items-center gap-2 overflow-x-auto pb-0.5 custom-scrollbar">
                  <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 shrink-0"><LayoutGrid size={15}/></div>
                  <button onClick={() => setSelectedPosition("all")}
                    className={`whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${selectedPosition === "all" ? "bg-[#045b7c] text-white border-[#045b7c]" : "bg-white text-gray-500 border-gray-200 hover:border-[#045b7c] hover:text-[#045b7c]"}`}>
                    {isDe ? "Alle" : "Tümü"} ({candidates.length})
                  </button>
                  {allPositions.map((pos: string) => (
                    <button key={pos} onClick={() => setSelectedPosition(pos)}
                      className={`whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${selectedPosition === pos ? "bg-[#045b7c] text-white border-[#045b7c]" : "bg-white text-gray-500 border-gray-200 hover:border-[#045b7c] hover:text-[#045b7c]"}`}>
                      {pos} ({candidates.filter(c => (c.title || "Belirtilmemiş") === pos).length})
                    </button>
                  ))}
                </div>
              </div>

              {/* Candidate list */}
              <div className="space-y-3">
                {displayedCandidates.length > 0
                  ? displayedCandidates.map((c: Candidate) => (
                      <CandidateCard key={c.id} candidate={c} jdSkills={jdSkills}
                        onView={() => setViewingCandidate(c)}
                        onEdit={() => { setEditingCandidate(c); setShowModal(true); }}
                        onDelete={() => handleDeleteCandidate(c.id)} />
                    ))
                  : (
                    <div className="py-16 text-center bg-white rounded-xl border border-dashed border-gray-200 flex flex-col items-center gap-3">
                      <Users size={32} className="text-gray-300"/>
                      <p className="text-sm text-gray-400">{isDe ? "Keine Kandidaten gefunden" : "Kriterlere uygun aday bulunamadı"}</p>
                    </div>
                  )
                }
              </div>
            </div>
          )}

          {activeTab === "jobs" && (
            <div className="space-y-5 animate-in fade-in duration-300">
              {/* Header */}
              <div className="flex items-center justify-between bg-white px-5 py-4 rounded-xl border border-gray-200">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-[#045b7c]/10 rounded-lg flex items-center justify-center text-[#045b7c]"><Layers size={18}/></div>
                  <div>
                    <h2 className="text-base font-semibold text-gray-900">{isDe ? "Stellenanzeigen" : "İş İlanları"}</h2>
                    <p className="text-xs text-gray-400">{filteredJobs.length} {isDe ? "aktive Prozesse" : "aktif süreç"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex bg-gray-100 rounded-lg p-0.5">
                    {(["active", "closed", "all"] as const).map((f) => (
                      <button key={f} onClick={() => setJobFilter(f)}
                        className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${jobFilter === f ? "bg-white text-[#045b7c] shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
                        {f === "active" ? (isDe ? "Aktif" : "Aktif") : f === "closed" ? (isDe ? "Pasif" : "Pasif") : (isDe ? "Tümü" : "Tümü")}
                      </button>
                    ))}
                  </div>
                  <button onClick={() => setShowJobForm(!showJobForm)}
                    className="px-4 py-2 bg-[#045b7c] text-white rounded-lg text-sm font-medium flex items-center gap-1.5 hover:bg-[#03455e] transition-colors">
                    <Plus size={15} /> {isDe ? "Neue Stelle" : "Yeni İlan"}
                  </button>
                </div>
              </div>

              {/* New job form */}
              {showJobForm && (
                <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-5 animate-in slide-in-from-top-2 duration-200">
                  <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                    <h3 className="text-sm font-semibold text-gray-900">{isDe ? "Neue Stellenanzeige erstellen" : "Yeni İş İlanı Oluştur"}</h3>
                    {pendingJDFile && (
                      <span className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
                        <CheckCircle size={13}/> {pendingJDFile.name}
                      </span>
                    )}
                  </div>

                  {/* JD upload — first, most prominent */}
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1.5">{isDe ? "JD-Dokument hochladen" : "JD Belgesi Yükle"} <span className="text-[#045b7c] font-semibold">→ alanlar otomatik dolacak</span></label>
                    <div
                      onDragOver={(e: any) => { e.preventDefault(); setIsDraggingOnJD(true); }}
                      onDragLeave={() => setIsDraggingOnJD(false)}
                      onDrop={(e: any) => { e.preventDefault(); setIsDraggingOnJD(false); const f = e.dataTransfer.files[0]; if (f) handleJDDocDrop(f); }}
                      onClick={() => { if (!isParsingDoc) { const inp = document.createElement("input"); inp.type = "file"; inp.accept = ".pdf,.docx,.doc"; inp.onchange = (ev: any) => { const f = (ev.target as HTMLInputElement).files?.[0]; if (f) handleJDDocDrop(f); }; inp.click(); } }}
                      className={`flex items-center gap-3 px-4 py-3 border border-dashed rounded-lg cursor-pointer transition-colors ${isDraggingOnJD ? "border-[#045b7c] bg-[#045b7c]/5" : "border-gray-300 hover:border-[#045b7c] hover:bg-gray-50"}`}>
                      {isParsingDoc
                        ? <><Cpu size={16} className="text-[#045b7c] animate-pulse shrink-0"/><span className="text-sm text-[#045b7c]">{isDe ? "KI analysiert..." : "Belge analiz ediliyor..."}</span></>
                        : pendingJDFile
                          ? <><CheckCircle size={16} className="text-emerald-500 shrink-0"/><span className="text-sm text-emerald-600">{pendingJDFile.name}</span></>
                          : <><FileText size={16} className="text-gray-400 shrink-0"/><span className="text-sm text-gray-400">{isDe ? "PDF / DOCX sürükleyin veya tıklayın" : "PDF / DOCX sürükleyin veya tıklayın"}</span></>
                      }
                    </div>
                    {docParseError && <p className="text-xs text-rose-500 mt-1">{docParseError}</p>}
                  </div>

                  {/* Form fields */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-xs font-medium text-gray-500 mb-1">{isDe ? "Stellentitel *" : "İlan Başlığı *"}</label>
                      <input value={jobForm.title} onChange={(e: any) => setJobForm({ ...jobForm, title: e.target.value })}
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:bg-white focus:border-[#045b7c] transition-colors" />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs font-medium text-gray-500 mb-1">{isDe ? "Kundenfirma" : "Müşteri Firma"}</label>
                      <input value={jobForm.company || ""} onChange={(e: any) => setJobForm({ ...jobForm, company: e.target.value })}
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:bg-white focus:border-[#045b7c] transition-colors" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">{isDe ? "Standort" : "Lokasyon"}</label>
                      <input value={jobForm.location || ""} onChange={(e: any) => setJobForm({ ...jobForm, location: e.target.value })}
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:bg-white focus:border-[#045b7c] transition-colors" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">{isDe ? "Startdatum" : "Başlangıç"}</label>
                      <input type="date" value={jobForm.startDate || ""} onChange={(e: any) => setJobForm({ ...jobForm, startDate: e.target.value })}
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:bg-white focus:border-[#045b7c] transition-colors cursor-pointer" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">{isDe ? "Auslastung" : "Çalışma Yükü"}</label>
                      <input placeholder="%100" value={jobForm.workload || ""} onChange={(e: any) => setJobForm({ ...jobForm, workload: e.target.value })}
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:bg-white focus:border-[#045b7c] transition-colors" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">{isDe ? "Arbeitsmodell" : "İş Modeli"}</label>
                      <select value={jobForm.contractType || "Full-time"} onChange={(e: any) => setJobForm({ ...jobForm, contractType: e.target.value })}
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:bg-white focus:border-[#045b7c] transition-colors">
                        <option value="Full-time">Full-time</option>
                        <option value="Contract">{isDe ? "Vertrag" : "Kontrat"}</option>
                        <option value="Freelance">Freelance</option>
                      </select>
                    </div>
                    <div className="col-span-2 md:col-span-4">
                      <label className="block text-xs font-medium text-gray-500 mb-1">{isDe ? "Stellenbeschreibung" : "İlan Detayları"}</label>
                      <textarea value={jobForm.description} onChange={(e: any) => setJobForm({ ...jobForm, description: e.target.value })}
                        rows={5} placeholder={isDe ? "Stellendetails..." : "İlan detaylarını buraya yapıştırın..."}
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm resize-none outline-none focus:bg-white focus:border-[#045b7c] transition-colors custom-scrollbar" />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                    <button onClick={() => { setShowJobForm(false); setPendingJDFile(null); setJobForm({ title: "", company: "", description: "", location: "", startDate: "", endDate: "", workload: "", contractType: "Full-time" }); }}
                      className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors">{isDe ? "Abbrechen" : "Vazgeç"}</button>
                    <button onClick={handleJobFormSubmit}
                      className="px-5 py-2 bg-[#045b7c] text-white rounded-lg text-sm font-medium hover:bg-[#03455e] transition-colors">
                      {isDe ? "Stelle speichern" : "İlanı Kaydet"}
                    </button>
                  </div>
                </div>
              )}

              {/* Job cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredJobs.map((job: Job) => (
                  <div key={job.id} className={`bg-white rounded-xl border border-gray-200 p-5 group transition-all hover:shadow-sm border-l-4 ${job.status === "active" ? "border-l-[#045b7c]" : "border-l-gray-300 opacity-70"}`}>
                    <div className="flex justify-between items-start mb-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                          <h3 className="font-semibold text-gray-900 text-base leading-tight">{job.title}</h3>
                          {job.status === "closed" && (
                            <span className="bg-gray-100 text-gray-500 text-[10px] font-medium px-2 py-0.5 rounded-full">{isDe ? "Pasif" : "Pasif"}</span>
                          )}
                        </div>
                        <p className="text-xs text-gray-400 flex items-center gap-1"><Building2 size={11}/> {job.company || "—"}</p>
                      </div>
                      <div className="flex gap-1 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => setEditingJob(job)} className="p-1.5 text-gray-400 hover:text-[#045b7c] hover:bg-gray-100 rounded-lg transition-colors"><Edit2 size={13}/></button>
                        <button onClick={() => handleDeleteJob(job.id)} className="p-1.5 text-gray-400 hover:text-rose-500 hover:bg-gray-100 rounded-lg transition-colors"><X size={13}/></button>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 line-clamp-2 mb-3 leading-relaxed">{job.description || (isDe ? "Keine Beschreibung..." : "İlan tanımı girilmemiş...")}</p>
                    <div className="flex flex-wrap gap-1.5">
                      <span className="px-2 py-1 bg-gray-100 text-gray-500 rounded-md text-[11px] flex items-center gap-1"><MapPin size={10}/> {job.location || "Remote"}</span>
                      <span className={`px-2 py-1 rounded-md text-[11px] flex items-center gap-1 ${job.status === "active" ? "bg-blue-50 text-blue-600" : "bg-gray-100 text-gray-400"}`}><CalendarIcon size={10}/> {job.startDate ? formatDisplayDate(job.startDate) : "ASAP"}</span>
                      <span className="px-2 py-1 bg-gray-100 text-gray-500 rounded-md text-[11px]">{job.contractType || "Full-time"}</span>
                      {job.workload && <span className="px-2 py-1 bg-gray-100 text-gray-500 rounded-md text-[11px]">{job.workload}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "find" && <div className="space-y-6 animate-in fade-in duration-300"><JDAnalyzer jdSkills={jdSkills} onAnalyze={(t: string) => setJdSkills(extractSkills(t))} onClear={() => setJdSkills([])} onCreateJob={handleCreateJob} /><LinkedInSearch jdSkills={jdSkills} onAddCandidate={(d:any)=>handleSaveCandidate(d)} /></div>}
          {activeTab === "firma" && <FirmaAtamalari jobs={jobs} />}
          {activeTab === "ai-matcher" && <AIMatcherPage />}
        </div>
      </main>

      {/* â”€â”€â”€ MODALLAR â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {editingJob && <JobEditModal job={editingJob} onSave={handleUpdateJob} onClose={() => setEditingJob(null)} />}
      {showModal && <CandidateModal candidate={editingCandidate} jdSkills={jdSkills} jobs={jobs.map(j => ({ id: j.id, title: j.title }))} onSave={handleSaveCandidate} onClose={() => { setShowModal(false); setEditingCandidate(null); }} />}
      {viewingCandidate && <CandidateDetail candidate={viewingCandidate} jdSkills={jdSkills} onClose={() => setViewingCandidate(null)} onStatusChange={(status: string) => viewingCandidate && handleStatusChange(viewingCandidate.id, status)} />}
    </div>
  );
}

// ðŸš€ YARDIMCI BÄ°LEÅžENLER (MODALLAR ORANTILI)

function SimpleModal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white rounded-xl w-[640px] max-w-full max-h-[90vh] overflow-hidden shadow-xl flex flex-col border border-gray-200" onClick={(e: any) => e.stopPropagation()}>
        <div className="flex justify-between items-center px-5 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
          <h3 className="font-semibold text-gray-900 text-base">{title}</h3>
          <button onClick={onClose} className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-200 transition-colors"><X size={15} /></button>
        </div>
        <div className="p-5 overflow-y-auto custom-scrollbar">{children}</div>
      </div>
    </div>
  );
}

function JobEditModal({ job, onSave, onClose }: { job: Job, onSave: (id: number, data: any) => void, onClose: () => void }) {
  const { locale } = useLanguage();
  const isDe = locale === "de";
  const [form, setForm] = useState({ ...job });
  const inputCls = "w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:bg-white focus:border-[#045b7c] transition-colors";
  const labelCls = "block text-xs font-medium text-gray-500 mb-1";

  return (
    <SimpleModal title={isDe ? "Stellenverwaltung" : "İlan Yönetimi"} onClose={onClose}>
      <div className="space-y-4">
        {/* Status toggle */}
        <div className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${form.status === "active" ? "bg-emerald-50 border-emerald-200" : "bg-gray-50 border-gray-200"}`}>
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${form.status === "active" ? "bg-emerald-100 text-emerald-600" : "bg-gray-200 text-gray-400"}`}>
              {form.status === "active" ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
            </div>
            <div>
              <p className="text-xs text-gray-400">{isDe ? "Status" : "Durum"}</p>
              <p className={`text-sm font-medium ${form.status === "active" ? "text-emerald-700" : "text-gray-500"}`}>
                {form.status === "active" ? (isDe ? "Aktif" : "İlan Aktif") : (isDe ? "Pasif" : "İlan Donduruldu")}
              </p>
            </div>
          </div>
          <button onClick={() => setForm({...form, status: form.status === "active" ? "closed" : "active"})}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${form.status === "active" ? "bg-rose-500 text-white hover:bg-rose-600" : "bg-emerald-600 text-white hover:bg-emerald-700"}`}>
            {form.status === "active" ? (isDe ? "Deaktivieren" : "Pasife Al") : (isDe ? "Aktivieren" : "Yayına Al")}
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div><label className={labelCls}>{isDe ? "Stellentitel" : "İlan Başlığı"}</label><input value={form.title} onChange={(e: any) => setForm({...form, title: e.target.value})} className={inputCls} /></div>
          <div><label className={labelCls}>{isDe ? "Firma" : "Firma"}</label><input value={form.company || ""} onChange={(e: any) => setForm({...form, company: e.target.value})} className={inputCls} /></div>
        </div>

        <div><label className={labelCls}>{isDe ? "Stellenbeschreibung" : "İlan Tanımı"}</label><textarea value={form.description} onChange={(e: any) => setForm({...form, description: e.target.value})} rows={5} className={`${inputCls} resize-none`} /></div>

        <div className="grid grid-cols-3 gap-3">
          <div><label className={labelCls}>{isDe ? "Standort" : "Lokasyon"}</label><input value={form.location || ""} onChange={(e: any) => setForm({...form, location: e.target.value})} className={inputCls} /></div>
          <div><label className={labelCls}>{isDe ? "Start" : "Başlangıç"}</label><input type="date" value={form.startDate || ""} onChange={(e: any) => setForm({...form, startDate: e.target.value})} className={`${inputCls} cursor-pointer`} /></div>
          <div><label className={labelCls}>{isDe ? "Modell" : "Çalışma Modeli"}</label><select value={form.contractType || ""} onChange={(e: any) => setForm({...form, contractType: e.target.value})} className={inputCls}><option value="Full-time">Full-time</option><option value="Contract">{isDe ? "Vertrag" : "Kontrat"}</option><option value="Freelance">Freelance</option></select></div>
        </div>

        {form.jdFile && (
          <div className="flex items-center justify-between p-3 bg-[#045b7c]/5 border border-[#045b7c]/10 rounded-lg">
            <div className="flex items-center gap-2 text-[#045b7c]">
              <FileText size={16}/>
              <span className="text-sm font-medium">{isDe ? "JD Dokument" : "JD Belgesi"}</span>
            </div>
            <a href={form.jdFile} target="_blank" className="px-3 py-1.5 bg-[#045b7c] text-white text-xs font-medium rounded-lg hover:bg-[#03455e] transition-colors">{isDe ? "Ansehen" : "Görüntüle"}</a>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors">{isDe ? "Abbrechen" : "İptal"}</button>
          <button onClick={() => onSave(job.id, form)} className="px-4 py-2 bg-[#045b7c] text-white rounded-lg text-sm font-medium hover:bg-[#03455e] transition-colors">{isDe ? "Aktualisieren" : "Güncelle"}</button>
        </div>
      </div>
    </SimpleModal>
  );
}





