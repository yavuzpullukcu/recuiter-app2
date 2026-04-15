"use client";
import { useState, useEffect, useCallback } from "react";
import { 
  Plus, Search, X, Edit2, Building2, Users, Briefcase, 
  ChevronDown, Send, UserCircle, MessageCircle, Clock, CreditCard, Upload 
} from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageContext";

// â”€â”€â”€ TÄ°PLER VE ARA YÃœZLER (KOMPLE MÄ°MARÄ° KORUNDU) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
interface Job { id: number; title: string; company: string | null; }
interface Company { id: number; name: string; description: string | null; projects: Project[]; }
interface Project { id: number; name: string; companyId: number; jobId?: number | null; assignments: Assignment[]; }
interface Assignment {
  id: number; candidateId: number; weeklyHours: number; hourlyRate: number; currency: string; notes: string | null;
  contactPerson: string | null; contactTitle: string | null; status: string | null;
  candidate: { id: number; name: string; title: string | null; type: string };
  contract: { id: number; startDate: string; endDate: string; contractFile?: string } | null;
}
interface Candidate { id: number; name: string; title: string | null; type: string; }

const PIPELINE_STATUSES = [
  "CV Gonderildi", "Firma Incelemede", "1. Mulakat Planlandi", "Teknik Test Asamasi",
  "Final Mulakati", "Teklif Yapildi", "Ise Yerlesti", "Olumsuz / Red"
];

const STATUS_LABELS: Record<string, { tr: string; de: string }> = {
  "CV Gonderildi": { tr: "CV Gonderildi", de: "CV gesendet" },
  "Firma Incelemede": { tr: "Firma Incelemede", de: "Beim Kunden in Pruefung" },
  "1. Mulakat Planlandi": { tr: "1. Mulakat Planlandi", de: "1. Interview geplant" },
  "Teknik Test Asamasi": { tr: "Teknik Test Asamasi", de: "Technischer Test" },
  "Final Mulakati": { tr: "Final Mulakati", de: "Finales Interview" },
  "Teklif Yapildi": { tr: "Teklif Yapildi", de: "Angebot gemacht" },
  "Ise Yerlesti": { tr: "Ise Yerlesti", de: "Platziert" },
  "Olumsuz / Red": { tr: "Olumsuz / Red", de: "Absage" },
};

function normalizeStatus(status?: string | null) {
  const compact = (status || "").toLocaleLowerCase("tr-TR");
  if (compact.includes("yerle")) return "Ise Yerlesti";
  if (compact.includes("teklif")) return "Teklif Yapildi";
  if (compact.includes("teknik")) return "Teknik Test Asamasi";
  if (compact.includes("final")) return "Final Mulakati";
  if (compact.includes("mulakat")) return "1. Mulakat Planlandi";
  if (compact.includes("incele")) return "Firma Incelemede";
  if (compact.includes("red") || compact.includes("olumsuz")) return "Olumsuz / Red";
  if (compact.includes("cv")) return "CV Gonderildi";
  return "CV Gonderildi";
}

function getStatusLabel(status: string | null | undefined, locale: string) {
  const key = normalizeStatus(status);
  const entry = STATUS_LABELS[key] || STATUS_LABELS["CV Gonderildi"];
  return locale === "de" ? entry.de : entry.tr;
}

export default function FirmaAtamalari({ jobs = [] }: { jobs?: Job[] }) {
  const { locale } = useLanguage();
  const isDe = locale === "de";
  const text = {
    loading: isDe ? "Wird geladen..." : "Yukleniyor...",
    syncError: isDe ? "Fehler bei der Datensynchronisierung:" : "Veri senkronizasyon hatasi:",
    requestError: isDe ? "Bei der Serverkommunikation ist ein Fehler aufgetreten." : "Sunucuyla iletisim kurulurken bir hata olustu.",
    removeAssignmentConfirm: isDe ? "Soll dieser Kandidatenprozess komplett entfernt werden?" : "Bu aday surecini tamamen kaldirmak istediginize emin misiniz?",
    deleteProjectConfirm: isDe ? "Soll das Projekt mit allen Einreichungen geloescht werden?" : "Projeyi ve icindeki tum sunumlari silmek istiyor musunuz?",
    portfolioTitle: isDe ? "Kundenportfolio" : "Musteri Portfoyu",
    addCompany: isDe ? "Kunde hinzufuegen" : "Firma Ekle",
    processChannel: isDe ? "Prozesskanali" : "surec kanali",
    candidates: isDe ? "Kandidaten" : "aday",
    dragHint: isDe ? "Kandidaten hierher ziehen" : "Adayi buraya surukle",
    addProject: isDe ? "Prozesskanal definieren" : "Sunum Kanali Tanimla",
    allPortfolio: isDe ? "Gesamtes Portfolio" : "Tum Portfoy",
    unassigned: isDe ? "Nicht zugewiesen" : "Bostakiler",
    searchPlaceholder: isDe ? "Nach Name oder Titel suchen..." : "Isim, unvan veya yetenek ara...",
    unspecifiedTitle: isDe ? "Position nicht angegeben" : "Pozisyon belirtilmemis",
    internal: isDe ? "Intern" : "Dahili",
    activeProcess: isDe ? "Aktiver Prozess" : "Aktif surec",
    companyFormTitle: isDe ? "Kundenformular" : "Firma Kayit Formu",
    projectFormTitle: isDe ? "Prozesskanal / Position" : "Sunum Kanali / Pozisyon",
    reviewing: isDe ? "In Pruefung" : "Inceleniyor",
  };
  const [companies, setCompanies] = useState<Company[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [search, setSearch] = useState("");
  const [rightTab, setRightTab] = useState<"unassigned" | "all">("all");
  const [dragCandidateId, setDragCandidateId] = useState<number | null>(null);
  const [modal, setModal] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // 1. VERÄ° YÃ–NETÄ°MÄ° VE SENKRONÄ°ZASYON
  const fetchData = useCallback(async () => {
    try {
      const [compRes, candRes] = await Promise.all([fetch("/api/companies"), fetch("/api/candidates")]);
      setCompanies(await compRes.json());
      setCandidates(await candRes.json());
    } catch (err) { console.error(text.syncError, err); }
    finally { setLoading(false); }
  }, [text.syncError]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // 2. GELÄ°ÅžMÄ°Åž MAPLEME VE FÄ°LTRELEME MANTIÄžI
  const assignmentMap = new Map<number, { projectName: string; companyName: string; status?: string }>();
  companies.forEach((co) => co.projects.forEach((p) => p.assignments.forEach((a) => {
    assignmentMap.set(a.candidateId, {
      projectName: p.name,
      companyName: co.name,
      status: a.status || "CV Gonderildi",
    });
  })));

  const assignedIds = new Set(assignmentMap.keys());
  const filteredCandidates = candidates.filter((c) => {
    const matchesSearch = c.name.toLowerCase().includes(search.toLowerCase()) || (c.title || "").toLowerCase().includes(search.toLowerCase());
    if (rightTab === "unassigned") return !assignedIds.has(c.id) && matchesSearch;
    return matchesSearch;
  });

  // 3. SÃœRÃœKLE BIRAK Ä°ÅžLEYÄ°CÄ°SÄ°
  const handleDrop = (companyId: number, projectId: number) => {
    if (!dragCandidateId) return;
    setModal({ type: "assign", candidateId: dragCandidateId, companyId, projectId });
  };

  // 4. FORMDATA DESTEKLÄ° API Ä°LETÄ°ÅžÄ°MÄ° (PDF DOSYASI Ä°Ã‡Ä°N)
  const handleRequest = async (url: string, method: string, data: any, file?: File | null) => {
    const formData = new FormData();
    Object.keys(data).forEach(key => {
      if (data[key] !== null && data[key] !== undefined) formData.append(key, data[key]);
    });
    if (file) formData.append("file", file); // PDF DosyasÄ± pakete ekleniyor

    const res = await fetch(url, { method, body: formData });
    if (res.ok) {
      setModal(null); setDragCandidateId(null); fetchData();
    } else {
      const error = await res.json();
      alert(error.error || text.requestError);
    }
  };

  const handleAssign = (data: any, file?: File | null) => handleRequest("/api/assignments", "POST", data, file);
  const handleEditAssignment = (id: number, data: any, file?: File | null) => handleRequest(`/api/assignments/${id}`, "PUT", data, file);

  const handleRemoveAssignment = async (id: number) => {
    if(!confirm(text.removeAssignmentConfirm)) return;
    const res = await fetch(`/api/assignments/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const error = await res.json().catch(() => null);
      alert(error?.error || text.requestError);
      return;
    }
    fetchData();
  };

  const handleAddCompany = async (data: any) => {
    await fetch("/api/companies", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    setModal(null); fetchData();
  };

  const handleAddProject = async (companyId: number, name: string) => {
    await fetch(`/api/companies/${companyId}/projects`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }) });
    setModal(null); fetchData();
  };

  const handleDeleteProject = async (companyId: number, projectId: number) => {
    if(!confirm(text.deleteProjectConfirm)) return;
    await fetch(`/api/companies/${companyId}/projects?projectId=${projectId}`, { method: "DELETE" });
    fetchData();
  };

  if (loading) return (
    <div className="flex items-center justify-center py-20 text-sm text-gray-400">{text.loading}</div>
  );

  return (
    <div className="flex gap-6 animate-in fade-in duration-700" style={{ minHeight: 780 }}>
      {/* â”€â”€â”€ SOL PANEL: MÃœÅžTERÄ°LER & KANALLAR â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div className="w-[430px] flex-shrink-0 max-h-[82vh] overflow-y-auto space-y-6 pr-2 custom-scrollbar">
        <div className="flex justify-between items-center sticky top-0 bg-gray-50 z-20 pb-3 border-b border-gray-200 mb-3">
          <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
            <Building2 size={15} className="text-[#045b7c]"/> {text.portfolioTitle}
          </h3>
          <button onClick={() => setModal({ type: "addCompany" })} className="flex items-center gap-1.5 px-3 py-1.5 bg-[#045b7c] text-white text-xs font-medium rounded-lg hover:bg-[#03455e] transition-colors">
            <Plus size={13} /> {text.addCompany}
          </button>
        </div>

        {companies.map((co) => {
          const totalAssigned = co.projects.reduce((s, p) => s + p.assignments.length, 0);
          return (
            <div key={co.id} className="bg-white rounded-xl border border-gray-200 p-4 hover:border-[#045b7c]/30 transition-colors">
              <div className="flex justify-between items-center mb-3">
                <div>
                  <h4 className="text-sm font-semibold text-gray-900">{co.name}</h4>
                  <p className="text-xs text-gray-400 mt-0.5">{co.projects.length} {text.processChannel}</p>
                </div>
                <span className="text-xs font-medium text-[#045b7c] bg-[#045b7c]/5 px-2.5 py-1 rounded-full border border-[#045b7c]/10">{totalAssigned} {text.candidates}</span>
              </div>

              <div className="space-y-2 mb-3">
                {co.projects.map((p) => (
                  <div
                    key={p.id}
                    onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add("border-[#045b7c]", "bg-blue-50"); }}
                    onDragLeave={(e) => e.currentTarget.classList.remove("border-[#045b7c]", "bg-blue-50")}
                    onDrop={(e) => { e.preventDefault(); e.currentTarget.classList.remove("border-[#045b7c]", "bg-blue-50"); handleDrop(co.id, p.id); }}
                    className="group/proj border border-dashed border-gray-200 rounded-lg p-3 transition-colors bg-gray-50/50 hover:border-[#045b7c]/40"
                  >
                    <div className="flex justify-between items-center mb-2">
                      <div className="flex items-center gap-2">
                        <Briefcase size={12} className="text-gray-400" />
                        <span className="text-xs font-medium text-gray-700">{p.name}</span>
                      </div>
                      <button onClick={() => handleDeleteProject(co.id, p.id)} className="opacity-0 group-hover/proj:opacity-100 p-1 text-gray-300 hover:text-red-500 rounded transition-all"><X size={12} /></button>
                    </div>

                    {p.assignments.map((a) => (
                      <div key={a.id} className="bg-white border border-gray-100 rounded-lg px-3 py-2 flex items-center justify-between mb-1 hover:border-gray-200 transition-colors border-l-2 border-l-[#045b7c]">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <p className="text-xs font-medium text-gray-800 truncate">{a.candidate.name}</p>
                            {a.contract && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${normalizeStatus(a.status) === "Ise Yerlesti" ? "bg-emerald-100 text-emerald-700" : "bg-[#045b7c]/5 text-[#045b7c]"}`}>
                              {a.status ? getStatusLabel(a.status, locale) : text.reviewing}
                            </span>
                            <span className="text-[10px] text-gray-400 truncate">{a.contactPerson || "HR"}</span>
                          </div>
                        </div>
                        <div className="flex gap-1 ml-2 shrink-0">
                          <button onClick={() => setModal({ type: "editAssignment", assignment: a, projectName: p.name, companyName: co.name })} className="p-1.5 text-gray-400 hover:text-[#045b7c] hover:bg-[#045b7c]/5 rounded transition-colors"><Edit2 size={12} /></button>
                          <button onClick={() => handleRemoveAssignment(a.id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"><X size={12} /></button>
                        </div>
                      </div>
                    ))}
                    {p.assignments.length === 0 && <p className="text-xs text-gray-300 text-center py-2">{text.dragHint}</p>}
                  </div>
                ))}
              </div>
              <button onClick={() => setModal({ type: "addProject", companyId: co.id })}
                className="w-full py-2 border border-dashed border-gray-200 rounded-lg text-xs text-gray-400 hover:border-[#045b7c] hover:text-[#045b7c] hover:bg-[#045b7c]/5 transition-colors flex items-center justify-center gap-1.5">
                <Plus size={12} /> {text.addProject}
              </button>
            </div>
          );
        })}
      </div>

      {/* â”€â”€â”€ SAÄž PANEL: ADAY PORTFÃ–YÃœ â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div className="flex-1 bg-white rounded-xl border border-gray-200 p-5 flex flex-col">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex bg-gray-100 rounded-lg p-0.5">
            <button onClick={() => setRightTab("all")} className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${rightTab === "all" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>{text.allPortfolio}</button>
            <button onClick={() => setRightTab("unassigned")} className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${rightTab === "unassigned" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>{text.unassigned}</button>
          </div>
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={text.searchPlaceholder}
              className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:border-[#045b7c] focus:bg-white transition-colors" />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto space-y-2">
          {filteredCandidates.map((c) => {
            const isAssigned = assignedIds.has(c.id);
            return (
              <div
                key={c.id}
                draggable={!isAssigned}
                onDragStart={() => !isAssigned && setDragCandidateId(c.id)}
                className={`flex items-center justify-between px-3 py-2.5 rounded-lg border transition-all ${
                  isAssigned
                    ? "bg-gray-50 border-gray-100 opacity-50 cursor-default"
                    : "bg-white border-gray-200 hover:border-[#045b7c]/30 hover:bg-[#045b7c]/5 cursor-grab active:cursor-grabbing"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 ${isAssigned ? "bg-gray-200 text-gray-400" : "bg-[#045b7c] text-white"}`}>
                    {c.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{c.name}</p>
                    <p className="text-xs text-gray-400">{c.title || text.unspecifiedTitle}</p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${c.type === "internal" ? "bg-blue-50 text-blue-600" : "bg-orange-50 text-orange-600"}`}>
                    {c.type === "internal" ? text.internal : "Nearshore"}
                  </span>
                  {isAssigned && <span className="text-xs text-[#045b7c]">{text.activeProcess}</span>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* â”€â”€â”€ MODALLAR (411+ SATIRIN ASIL GÃœCÃœ) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {modal?.type === "assign" && <AssignModal candidateId={modal.candidateId} projectId={modal.projectId} candidates={candidates} onAssign={handleAssign} onClose={() => setModal(null)} />}
      {modal?.type === "addCompany" && <SimpleModal title={text.companyFormTitle} onClose={() => setModal(null)}><CompanyForm onSubmit={handleAddCompany} /></SimpleModal>}
      {modal?.type === "addProject" && <SimpleModal title={text.projectFormTitle} onClose={() => setModal(null)}><ProjectForm onSubmit={(name) => handleAddProject(modal.companyId, name)} /></SimpleModal>}
      {modal?.type === "editAssignment" && <EditAssignmentModal assignment={modal.assignment} projectName={modal.projectName} companyName={modal.companyName} onSave={(data: any, file?: File | null) => handleEditAssignment(modal.assignment.id, data, file)} onClose={() => setModal(null)} />}
    </div>
  );
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// ALT BÄ°LEÅžENLER (MODALLAR VE FORMLAR)
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function SimpleModal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/50 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white rounded-xl w-[520px] max-w-full shadow-xl border border-gray-200 overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"><X size={16} /></button>
        </div>
        <div className="p-5 max-h-[75vh] overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

function CompanyForm({ onSubmit }: { onSubmit: (data: any) => void }) {
  const { locale } = useLanguage();
  const isDe = locale === "de";
  const [name, setName] = useState(""); const [desc, setDesc] = useState("");
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">{isDe ? "Kunde / Unternehmen *" : "Musteri / Kurum Adi *"}</label>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="SAP Deutschland GmbH"
          className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:bg-white focus:border-[#045b7c] focus:ring-1 focus:ring-[#045b7c]/20 transition-all" />
      </div>
      <div className="flex justify-end pt-1">
        <button onClick={() => name && onSubmit({ name, description: desc })} disabled={!name}
          className="px-4 py-2 bg-[#045b7c] text-white rounded-lg text-sm font-medium hover:bg-[#03455e] disabled:opacity-50 transition-colors">{isDe ? "Speichern" : "Kaydet"}</button>
      </div>
    </div>
  );
}

function ProjectForm({ onSubmit }: { onSubmit: (name: string) => void }) {
  const { locale } = useLanguage();
  const isDe = locale === "de";
  const [name, setName] = useState("");
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">{isDe ? "Prozesskanal / Positionstitel *" : "Sunum Kanali / Pozisyon Basligi *"}</label>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Cloud Architect"
          className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:bg-white focus:border-[#045b7c] focus:ring-1 focus:ring-[#045b7c]/20 transition-all" />
      </div>
      <div className="flex justify-end pt-1">
        <button onClick={() => name && onSubmit(name)} disabled={!name}
          className="px-4 py-2 bg-[#045b7c] text-white rounded-lg text-sm font-medium hover:bg-[#03455e] disabled:opacity-50 transition-colors">{isDe ? "Speichern" : "Kaydet"}</button>
      </div>
    </div>
  );
}

function AssignModal({ candidateId, projectId, candidates, onAssign, onClose }: any) {
  const { locale } = useLanguage();
  const isDe = locale === "de";
  const [form, setForm] = useState({ contactPerson: "", contactTitle: "", status: "CV Gonderildi", notes: "", weeklyHours: "40", hourlyRate: "", currency: "EUR", contractStart: new Date().toISOString().split("T")[0], contractEnd: "" });
  const [contractFile, setContractFile] = useState<File | null>(null);
  const cand = candidates.find((c: any) => c.id === candidateId);
  const isPlaced = normalizeStatus(form.status) === "Ise Yerlesti";

  const inputCls = "w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:bg-white focus:border-[#045b7c] focus:ring-1 focus:ring-[#045b7c]/20 transition-all";
  const labelCls = "block text-xs font-medium text-gray-600 mb-1";

  return (
    <SimpleModal title={isDe ? "Kandidaten vorstellen" : "Aday Sunumu Baslat"} onClose={onClose}>
      <div className="space-y-4">
        <div className="flex items-center gap-3 p-3 bg-[#045b7c]/5 border border-[#045b7c]/10 rounded-lg">
          <div className="w-8 h-8 bg-[#045b7c] rounded-full flex items-center justify-center text-white shrink-0"><Send size={14}/></div>
          <div>
            <p className="text-xs text-gray-500">{isDe ? "Zielkandidat" : "Hedef Aday"}</p>
            <p className="text-sm font-semibold text-gray-900">{cand?.name}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div><label className={labelCls}>{isDe ? "Ansprechperson" : "Muhatap Kisi"}</label><input value={form.contactPerson} onChange={(e) => setForm({...form, contactPerson: e.target.value})} placeholder="Sabine Meyer" className={inputCls} /></div>
          <div><label className={labelCls}>{isDe ? "Titel" : "Unvani"}</label><input value={form.contactTitle} onChange={(e) => setForm({...form, contactTitle: e.target.value})} placeholder="HR Director" className={inputCls} /></div>
        </div>

        <div>
          <label className={labelCls}>{isDe ? "Prozessstatus" : "Surec Durumu"}</label>
          <select value={form.status} onChange={(e) => setForm({...form, status: e.target.value})} className={inputCls}>
            {PIPELINE_STATUSES.map(s => <option key={s} value={s}>{getStatusLabel(s, locale)}</option>)}
          </select>
        </div>

        {isPlaced && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 space-y-3">
            <p className="text-xs font-semibold text-emerald-700 flex items-center gap-1.5"><CreditCard size={12}/> {isDe ? "Vertragsdetails" : "Kontrat Detaylari"}</p>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="block text-xs font-medium text-emerald-700 mb-1">{isDe ? "Stundensatz" : "Saatlik Ucret"}</label><input type="number" value={form.hourlyRate} onChange={(e) => setForm({...form, hourlyRate: e.target.value})} className="w-full px-3 py-2 bg-white border border-emerald-200 rounded-lg text-sm outline-none focus:border-emerald-500"/></div>
              <div><label className="block text-xs font-medium text-emerald-700 mb-1">{isDe ? "Wochenstunden" : "Haftalik Saat"}</label><input type="number" value={form.weeklyHours} onChange={(e) => setForm({...form, weeklyHours: e.target.value})} className="w-full px-3 py-2 bg-white border border-emerald-200 rounded-lg text-sm outline-none focus:border-emerald-500"/></div>
              <div><label className="block text-xs font-medium text-emerald-700 mb-1">{isDe ? "Start" : "Baslangic"}</label><input type="date" value={form.contractStart} onChange={(e) => setForm({...form, contractStart: e.target.value})} className="w-full px-3 py-2 bg-white border border-emerald-200 rounded-lg text-sm outline-none focus:border-emerald-500"/></div>
              <div><label className="block text-xs font-medium text-emerald-700 mb-1">{isDe ? "Geplantes Ende" : "Planlanan Bitis"}</label><input type="date" value={form.contractEnd} onChange={(e) => setForm({...form, contractEnd: e.target.value})} className="w-full px-3 py-2 bg-white border border-emerald-200 rounded-lg text-sm outline-none focus:border-emerald-500"/></div>
            </div>
            <div>
              <label className="block text-xs font-medium text-emerald-700 mb-1.5">{isDe ? "Vertrags-PDF" : "Kontrat PDF"}</label>
              <input type="file" accept=".pdf" onChange={(e) => setContractFile(e.target.files?.[0] || null)} className="hidden" id="contract-pdf-upload" />
              <label htmlFor="contract-pdf-upload" className="flex items-center gap-2 px-3 py-2 border border-dashed border-emerald-300 rounded-lg cursor-pointer hover:bg-emerald-50 transition-colors text-xs text-emerald-600">
                <Upload size={13} />
                {contractFile ? contractFile.name : (isDe ? "PDF auswaehlen oder ziehen" : "PDF sec veya surukle")}
              </label>
            </div>
          </div>
        )}

        <div><label className={labelCls}>{isDe ? "Notizen" : "Notlar"}</label><textarea value={form.notes} onChange={(e) => setForm({...form, notes: e.target.value})} rows={3} className={`${inputCls} resize-none`} /></div>
        <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors">{isDe ? "Abbrechen" : "Iptal"}</button>
          <button onClick={() => onAssign({ ...form, candidateId, projectId }, contractFile)} className="px-4 py-2 bg-[#045b7c] text-white rounded-lg text-sm font-medium hover:bg-[#03455e] transition-colors">{isDe ? "Prozess starten" : "Sunumu Baslat"}</button>
        </div>
      </div>
    </SimpleModal>
  );
}

function EditAssignmentModal({ assignment, projectName, companyName, onSave, onClose }: any) {
  const { locale } = useLanguage();
  const isDe = locale === "de";
  const [form, setForm] = useState({ contactPerson: assignment.contactPerson || "", contactTitle: assignment.contactTitle || "", status: assignment.status || "CV Gonderildi", notes: assignment.notes || "", weeklyHours: String(assignment.weeklyHours || 40), hourlyRate: String(assignment.hourlyRate || ""), currency: assignment.currency || "EUR", contractStart: assignment.contract?.startDate || "", contractEnd: assignment.contract?.endDate || "" });
  const [contractFile, setContractFile] = useState<File | null>(null);
  const isPlaced = normalizeStatus(form.status) === "Ise Yerlesti";

  const inputCls = "w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:border-[#045b7c] focus:bg-white transition-colors";
  const labelCls = "block text-xs font-medium text-gray-500 mb-1";

  return (
    <SimpleModal title={isDe ? "Prozess aktualisieren" : "Sureci Guncelle"} onClose={onClose}>
      <div className="space-y-4">
        {/* Candidate header */}
        <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
          <div className="w-8 h-8 bg-[#045b7c]/10 rounded-full flex items-center justify-center text-[#045b7c] shrink-0">
            <MessageCircle size={14}/>
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">{assignment.candidate.name}</p>
            <p className="text-xs text-gray-400">{companyName} Â· {projectName}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>{isDe ? "Verantwortlich" : "Sorumlu"}</label>
            <input value={form.contactPerson} onChange={(e) => setForm({...form, contactPerson: e.target.value})} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>{isDe ? "Titel" : "Unvan"}</label>
            <input value={form.contactTitle} onChange={(e) => setForm({...form, contactTitle: e.target.value})} className={inputCls} />
          </div>
        </div>

        <div>
          <label className={labelCls}>{isDe ? "Pipeline-Status" : "Pipeline Statusu"}</label>
          <select value={form.status} onChange={(e) => setForm({...form, status: e.target.value})} className={inputCls + " cursor-pointer"}>
            {PIPELINE_STATUSES.map(s => <option key={s} value={s}>{getStatusLabel(s, locale)}</option>)}
          </select>
        </div>

        {isPlaced && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 space-y-3">
            <p className="text-xs font-medium text-emerald-700 flex items-center gap-1.5"><CreditCard size={13}/> {isDe ? "Vertragsdetails" : "Kontrat Detaylari"}</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-emerald-700 mb-1">{isDe ? "Stundensatz" : "Saatlik Ucret"}</label>
                <input type="number" value={form.hourlyRate} onChange={(e) => setForm({...form, hourlyRate: e.target.value})} className="w-full bg-white border border-emerald-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-emerald-500 transition-colors"/>
              </div>
              <div>
                <label className="block text-xs font-medium text-emerald-700 mb-1">{isDe ? "Wochenstunden" : "Haftalik Saat"}</label>
                <input type="number" value={form.weeklyHours} onChange={(e) => setForm({...form, weeklyHours: e.target.value})} className="w-full bg-white border border-emerald-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-emerald-500 transition-colors"/>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-emerald-700 mb-1">{isDe ? "Start" : "Baslangic"}</label>
                <input type="date" value={form.contractStart} onChange={(e) => setForm({...form, contractStart: e.target.value})} className="w-full bg-white border border-emerald-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-emerald-500 cursor-pointer"/>
              </div>
              <div>
                <label className="block text-xs font-medium text-emerald-700 mb-1">{isDe ? "Geplantes Ende" : "Bitis"}</label>
                <input type="date" value={form.contractEnd} onChange={(e) => setForm({...form, contractEnd: e.target.value})} className="w-full bg-white border border-emerald-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-emerald-500 cursor-pointer"/>
              </div>
            </div>
            <div className="pt-2 border-t border-emerald-200/60">
              <label className="block text-xs font-medium text-emerald-700 mb-2">{isDe ? "Vertrags-PDF" : "Sozlesme PDF"}</label>
              <input type="file" accept=".pdf" onChange={(e) => setContractFile(e.target.files?.[0] || null)} className="hidden" id="contract-pdf-edit" />
              <label htmlFor="contract-pdf-edit" className="flex items-center gap-2 px-3 py-2 border border-dashed border-emerald-300 rounded-lg bg-white hover:bg-emerald-50 transition-colors cursor-pointer">
                <Upload size={14} className="text-emerald-500 shrink-0" />
                <span className="text-xs text-emerald-700 truncate">
                  {contractFile ? contractFile.name : (assignment.contract?.contractFile ? (isDe ? "Vorhandenen Vertrag ersetzen" : "Mevcut kontrati degistir") : (isDe ? "PDF auswaehlen" : "PDF sec"))}
                </span>
              </label>
            </div>
          </div>
        )}

        <div>
          <label className={labelCls}>{isDe ? "Prozessnotiz" : "Surec Notu"}</label>
          <textarea value={form.notes} onChange={(e) => setForm({...form, notes: e.target.value})} rows={3} className={inputCls + " resize-none"} />
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors">{isDe ? "Abbrechen" : "Iptal"}</button>
          <button onClick={() => onSave({ ...form }, contractFile)} className="px-4 py-2 bg-[#045b7c] text-white rounded-lg text-sm font-medium hover:bg-[#03455e] transition-colors">{isDe ? "Speichern" : "Kaydet"}</button>
        </div>
      </div>
    </SimpleModal>
  );
}









