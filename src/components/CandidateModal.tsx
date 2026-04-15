"use client";
import { useState, useEffect } from "react";
import { X, Plus, Save, FileText, Trash2, Upload, Cpu, CheckCircle, Sparkles, MessageSquare, Phone, Mail, CalendarDays, RefreshCw, Send } from "lucide-react";
import { Activity } from "@/lib/types";
import StarRating from "./StarRating";
import { Candidate, STATUS_CONFIG } from "@/lib/types";
import { useLanguage } from "@/lib/i18n/LanguageContext";

interface Props {
  candidate?: Candidate | null;
  jdSkills?: string[];
  jobs?: { id: number; title: string }[];
  onSave: (data: any, pendingCVFile?: File | null) => void;
  onClose: () => void;
}

// ─── CV metin çözümleme ──────────────────────────────────────────────────────

const TECH_SKILLS = [
  "JavaScript","TypeScript","Python","Java","Go","Golang","Rust","C#","C++","PHP","Ruby","Swift","Kotlin","Scala","R",
  "React","Next.js","Vue","Vue.js","Angular","Svelte","React Native","Flutter","Electron",
  "Node.js","Express","NestJS","Fastify","Hapi","Koa",
  "Django","FastAPI","Flask","Spring","Spring Boot","Laravel","Rails","ASP.NET",
  "Docker","Kubernetes","Helm","Terraform","Ansible","Pulumi",
  "AWS","Azure","GCP","Google Cloud","Vercel","Netlify","Heroku","DigitalOcean",
  "PostgreSQL","MySQL","SQLite","MongoDB","Redis","Elasticsearch","Cassandra","DynamoDB","Neo4j",
  "GraphQL","REST","gRPC","WebSocket","Kafka","RabbitMQ","NATS","Celery",
  "Git","GitHub","GitLab","Bitbucket","CI/CD","Jenkins","GitHub Actions","CircleCI","ArgoCD",
  "Linux","Bash","Shell","Nginx","Apache","Prometheus","Grafana","Datadog","Sentry",
  "Microservices","DevOps","MLOps","AI","Machine Learning","Deep Learning","LLM","OpenAI","LangChain",
  "TensorFlow","PyTorch","Pandas","NumPy","Scikit-learn","Spark","Hadoop",
  "HTML","CSS","Tailwind","SCSS","Sass","Webpack","Vite","Rollup",
  "Agile","Scrum","Kanban","JIRA","Confluence","Figma",
];

const TURKISH_CITIES = [
  "İstanbul","Istanbul","Ankara","İzmir","Izmir","Bursa","Antalya","Adana","Konya","Kayseri",
  "Mersin","Diyarbakır","Eskişehir","Samsun","Trabzon","Gaziantep","Kocaeli","Sakarya","Tekirdağ",
];
const GERMAN_CITIES = [
  "Berlin","München","Munich","Hamburg","Frankfurt","Köln","Cologne","Stuttgart","Düsseldorf",
  "Leipzig","Dortmund","Essen","Bremen","Dresden","Hannover","Nuremberg","Nürnberg",
];

function parseCVFields(text: string, filename?: string): {
  name?: string; title?: string; company?: string; location?: string;
  email?: string; phone?: string; linkedin?: string;
  experience?: number; skills?: string[];
} {
  const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
  const result: ReturnType<typeof parseCVFields> = {};

  // ── E-posta ──────────────────────────────────────────────────────────────
  const emailMatch = text.match(/[\w.+'-]+@[\w-]+\.[a-zA-Z]{2,}/);
  if (emailMatch) result.email = emailMatch[0];

  // ── Telefon (TR +90 / DE +49 / uluslararası) ─────────────────────────────
  const phoneMatch = text.match(/(\+90|\+49|\+\d{1,3}|0)[\s.\-()]?\(?\d{3,4}\)?[\s.\-]?\d{3,4}[\s.\-]?\d{2,6}/);
  if (phoneMatch) result.phone = phoneMatch[0].replace(/\s/g, "").replace(/[()]/g, "");

  // ── LinkedIn ─────────────────────────────────────────────────────────────
  const liMatch = text.match(/(?:linkedin\.com\/in\/)([\w%-]+)/i);
  if (liMatch) result.linkedin = `https://linkedin.com/in/${liMatch[1]}`;

  // ── İsim: çok katmanlı strateji ─────────────────────────────────────────
  const nameCharRe = /^[A-Za-zÇĞİÖŞÜçğışöşüÄÖÜäöüß\s'-]+$/;

  // Strateji 1: ilk 8 satır içinde 2-4 kelime, harf/boşluk dışında karakter yok
  for (const line of lines.slice(0, 8)) {
    const words = line.split(/\s+/);
    if (
      words.length >= 2 && words.length <= 4 &&
      nameCharRe.test(line) &&
      !line.includes("@") && !/\d/.test(line) &&
      line.length >= 4 && line.length < 55
    ) {
      result.name = words.map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");
      break;
    }
  }

  // Strateji 2: Dosya adından çıkar — "Ahmet Yahya Bilgin-CV.pdf" → "Ahmet Yahya Bilgin"
  if (!result.name && filename) {
    const base = filename.replace(/\.[^.]+$/, ""); // uzantıyı kaldır
    const cleaned = base
      .replace(/[-_](cv|resume|lebenslauf|ozgecmis|özgeçmiş).*/i, "") // "-CV", "_resume" vb. kaldır
      .replace(/[_-]/g, " ")
      .trim();
    const words = cleaned.split(/\s+/);
    if (words.length >= 2 && words.length <= 5 && nameCharRe.test(cleaned)) {
      result.name = words.map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");
    }
  }

  // ── Unvan/Pozisyon ────────────────────────────────────────────────────────
  const titleKeywords = /engineer|developer|architect|designer|manager|analyst|consultant|lead|senior|junior|fullstack|full.?stack|backend|frontend|devops|sre|qa|cto|cpo|vp of/i;
  for (const line of lines.slice(0, 12)) {
    if (titleKeywords.test(line) && !line.includes("@") && !/^\d/.test(line)) {
      // Virgül veya pipe ile gelen fazlalıkları kes, makul uzunlukta tut
      const cleaned = line.replace(/[*#_|]/g, "").split(/[,|•·]/)[0].trim();
      if (cleaned.length > 3 && cleaned.length < 60) {
        result.title = cleaned;
        break;
      }
    }
  }

  // ── Şirket: "at X", "@ X", "Company:" vb. ─────────────────────────────────
  const compMatch = text.match(/(?:^|\n)\s*(?:Company|Firma|Şirket|Employer|Arbeitgeber)\s*[:\-–]\s*(.+)/im);
  if (compMatch) {
    result.company = compMatch[1].trim().replace(/[*#_]/g, "");
  } else {
    // "at CompanyName" veya "@ CompanyName" kalıbı
    const atMatch = text.match(/(?:\bat\b|@)\s+([A-Z][A-Za-z0-9\s&.,-]{2,40})/);
    if (atMatch) result.company = atMatch[1].trim();
  }

  // ── Konum ────────────────────────────────────────────────────────────────
  if (/\bremote\b/i.test(text)) {
    result.location = "Remote";
  } else {
    const allCities = [...TURKISH_CITIES, ...GERMAN_CITIES];
    for (const city of allCities) {
      if (new RegExp(`\\b${city}\\b`, "i").test(text)) {
        result.location = city;
        break;
      }
    }
    if (!result.location) {
      // "Location: ..." kalıbı
      const locMatch = text.match(/(?:Location|Standort|Şehir|Stadt|City|Adres)\s*[:\-–]\s*([\w\s,]+)/i);
      if (locMatch) result.location = locMatch[1].split(",")[0].trim();
    }
  }

  // ── Deneyim yılı ─────────────────────────────────────────────────────────
  const expMatches = [
    text.match(/(\d+)\s*\+?\s*(?:years?|yıl|Jahre)\s+(?:of\s+)?(?:experience|Erfahrung|deneyim)/i),
    text.match(/(?:experience|Erfahrung|deneyim)\s+(?:of\s+)?(\d+)\s*\+?\s*(?:years?|yıl|Jahre)/i),
    text.match(/(\d+)\s*\+?\s*(?:years?|yıl|Jahre)/i),
  ];
  for (const m of expMatches) {
    if (m && parseInt(m[1]) > 0 && parseInt(m[1]) <= 40) {
      result.experience = parseInt(m[1]);
      break;
    }
  }
  // Alternatif: iş geçmişi tarih aralıklarından hesapla
  if (!result.experience) {
    const yearMatches = text.match(/20\d{2}/g);
    if (yearMatches && yearMatches.length >= 2) {
      const years = yearMatches.map(Number).sort();
      const span = Math.max(...years) - Math.min(...years);
      if (span > 0 && span <= 40) result.experience = span;
    }
  }

  // ── Yetenekler ────────────────────────────────────────────────────────────
  const found: string[] = [];
  for (const skill of TECH_SKILLS) {
    const pattern = new RegExp(`(?<![a-zA-Z])${skill.replace(/[.+]/g, "\\$&")}(?![a-zA-Z])`, "i");
    if (pattern.test(text) && !found.includes(skill)) {
      found.push(skill);
    }
  }
  // Normalize: "Next.js" yerine "Next.js" (canonical form koru)
  if (found.length > 0) result.skills = found.slice(0, 20);

  return result;
}

// ─── Modal ───────────────────────────────────────────────────────────────────

export default function CandidateModal({ candidate, jdSkills = [], jobs = [], onSave, onClose }: Props) {
  const { t } = useLanguage();

  const initial = candidate
    ? { ...candidate, skills: JSON.parse(candidate.skills || "[]") }
    : {
        name: "", title: "", company: "", location: "", linkedin: "", email: "", phone: "",
        skills: [] as string[], experience: 0, status: "new", rating: 3, notes: "", jobId: null as number | null,
      };

  const [form, setForm] = useState<any>(initial);
  const [skillInput, setSkillInput] = useState("");
  const [pendingCVFile, setPendingCVFile] = useState<File | null>(null);
  const [cvError, setCvError] = useState("");
  const [isParsing, setIsParsing] = useState(false);
  const [parsedFields, setParsedFields] = useState<Set<string>>(new Set());
  const [isDragging, setIsDragging] = useState(false);

  // ── Timeline / Aktivite ──────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<"profile" | "activity">("profile");
  const [activities, setActivities] = useState<Activity[]>(candidate?.activities || []);
  const [noteInput, setNoteInput] = useState("");
  const [noteType, setNoteType] = useState("note");
  const [isAddingNote, setIsAddingNote] = useState(false);

  useEffect(() => {
    if (candidate?.id && activeTab === "activity") {
      fetch(`/api/candidates/${candidate.id}/activities`)
        .then((r) => r.json())
        .then((data) => { if (Array.isArray(data)) setActivities(data); })
        .catch(() => {});
    }
  }, [activeTab, candidate?.id]);

  const addNote = async () => {
    if (!noteInput.trim() || !candidate?.id) return;
    setIsAddingNote(true);
    try {
      const res = await fetch(`/api/candidates/${candidate.id}/activities`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: noteType, content: noteInput }),
      });
      if (res.ok) {
        const created = await res.json();
        setActivities((prev) => [created, ...prev]);
        setNoteInput("");
      }
    } finally {
      setIsAddingNote(false);
    }
  };

  const addSkill = () => {
    const s = skillInput.trim();
    if (s && !form.skills.includes(s)) {
      setForm({ ...form, skills: [...form.skills, s] });
      setSkillInput("");
    }
  };

  const parseAndFill = async (file: File) => {
    setCvError("");
    if (file.size > 10 * 1024 * 1024) { setCvError("Dosya boyutu 10MB'ı geçemez"); return; }
    if (!file.name.match(/\.(pdf|docx|doc)$/i)) { setCvError("PDF veya DOCX dosyası yükleyin"); return; }

    setPendingCVFile(file);
    setIsParsing(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/parse-document", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Dosya okunamadı");

      const extracted = parseCVFields(data.text, file.name);
      const filled = new Set<string>();

      setForm((prev: any) => {
        const next = { ...prev };
        for (const [key, value] of Object.entries(extracted)) {
          if (!candidate || !prev[key] || (Array.isArray(prev[key]) && prev[key].length === 0)) {
            if (value !== undefined && value !== null && value !== "") {
              next[key] = value;
              filled.add(key);
            }
          }
        }
        return next;
      });
      setParsedFields(filled);
    } catch (err: any) {
      setCvError(err.message || "CV analiz edilemedi");
    } finally {
      setIsParsing(false);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) parseAndFill(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) parseAndFill(file);
  };

  const handleSubmit = () => {
    if (!form.name.trim()) return;
    onSave({ ...form, skills: form.skills }, pendingCVFile);
  };

  const cvFileName = pendingCVFile?.name || (form as any).cvFile?.split("/").pop();
  const hasCv = pendingCVFile || (form as any).cvFile;

  const isAutoFilled = (field: string) => parsedFields.has(field);

  const inputCls = (field: string) =>
    `w-full px-3 py-2 border rounded-lg text-sm outline-none transition-colors ${
      isAutoFilled(field)
        ? "border-emerald-300 bg-emerald-50 focus:border-emerald-500"
        : "border-gray-200 focus:border-[#045b7c]"
    }`;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl border border-gray-200" onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="sticky top-0 bg-white z-10 border-b border-gray-100">
          <div className="flex items-center justify-between px-5 py-4">
            <div className="flex items-center gap-2.5">
              <h3 className="text-base font-semibold text-gray-900">
                {candidate ? "Adayı Düzenle" : "Yeni Aday Ekle"}
              </h3>
              {parsedFields.size > 0 && (
                <span className="flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-full text-xs font-medium border border-emerald-200">
                  <Sparkles size={11} /> {parsedFields.size} alan otomatik dolduruldu
                </span>
              )}
            </div>
            <button onClick={onClose} className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 hover:bg-gray-200 transition-colors">
              <X size={15} />
            </button>
          </div>
          {/* Tabs — sadece düzenleme modunda */}
          {candidate && (
            <div className="flex gap-1 px-5 pb-0">
              {[
                { key: "profile", label: "Profil" },
                { key: "activity", label: `Aktiviteler${activities.length > 0 ? ` (${activities.length})` : ""}` },
              ].map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setActiveTab(key as "profile" | "activity")}
                  className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === key
                      ? "border-[#045b7c] text-[#045b7c]"
                      : "border-transparent text-gray-400 hover:text-gray-600"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── AKTİVİTE TAB ─────────────────────────────────────────────── */}
        {candidate && activeTab === "activity" && (
          <div className="p-5 space-y-4">

            {/* Not ekleme formu */}
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
              <div className="flex gap-2 mb-3">
                {[
                  { value: "note",      label: "Not",     icon: <MessageSquare size={13} /> },
                  { value: "call",      label: "Arama",   icon: <Phone size={13} /> },
                  { value: "email",     label: "E-posta", icon: <Mail size={13} /> },
                  { value: "interview", label: "Mülakat", icon: <CalendarDays size={13} /> },
                ].map(({ value, label, icon }) => (
                  <button
                    key={value}
                    onClick={() => setNoteType(value)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      noteType === value
                        ? "bg-[#045b7c] text-white"
                        : "bg-white border border-gray-200 text-gray-500 hover:border-gray-300"
                    }`}
                  >
                    {icon} {label}
                  </button>
                ))}
              </div>
              <textarea
                value={noteInput}
                onChange={(e) => setNoteInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) addNote(); }}
                placeholder="Notunuzu yazın… (Ctrl+Enter ile kaydet)"
                className="w-full h-20 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm resize-none outline-none focus:border-[#045b7c] transition-colors"
              />
              <div className="flex justify-end mt-2">
                <button
                  onClick={addNote}
                  disabled={!noteInput.trim() || isAddingNote}
                  className="flex items-center gap-1.5 px-4 py-2 bg-[#045b7c] text-white rounded-lg text-sm font-medium hover:bg-[#03455e] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Send size={13} /> {isAddingNote ? "Kaydediliyor..." : "Kaydet"}
                </button>
              </div>
            </div>

            {/* Zaman cizelgesi */}
            {activities.length === 0 ? (
              <div className="text-center py-10 text-gray-400 text-sm">
                <MessageSquare size={28} className="mx-auto mb-2 opacity-30" />
                Henuz aktivite yok
              </div>
            ) : (
              <div className="relative">
                <div className="absolute left-4 top-2 bottom-2 w-px bg-gray-200" />
                <div className="space-y-1">
                  {activities.map((act) => {
                    type ActCfg = { icon: React.ReactNode; color: string; bg: string };
                    const cfgMap: Record<string, ActCfg> = {
                      note:          { icon: <MessageSquare size={13} />, color: "text-gray-500",  bg: "bg-gray-100"  },
                      status_change: { icon: <RefreshCw size={13} />,     color: "text-blue-500",  bg: "bg-blue-50"   },
                      call:          { icon: <Phone size={13} />,         color: "text-green-500", bg: "bg-green-50"  },
                      email:         { icon: <Mail size={13} />,          color: "text-amber-500", bg: "bg-amber-50"  },
                      interview:     { icon: <CalendarDays size={13} />,  color: "text-purple-500",bg: "bg-purple-50" },
                    };
                    const { icon, color, bg } = cfgMap[act.type] ?? cfgMap.note;

                    const relTime = (() => {
                      const diff = Date.now() - new Date(act.createdAt).getTime();
                      const mins = Math.floor(diff / 60000);
                      if (mins < 1) return "az once";
                      if (mins < 60) return `${mins} dk once`;
                      const hrs = Math.floor(mins / 60);
                      if (hrs < 24) return `${hrs} saat once`;
                      const days = Math.floor(hrs / 24);
                      if (days === 1) return "dun";
                      if (days < 7) return `${days} gun once`;
                      return new Date(act.createdAt).toLocaleDateString("tr-TR");
                    })();

                    return (
                      <div key={act.id} className="flex gap-3 pl-2 py-2">
                        <div className={`relative z-10 w-6 h-6 rounded-full ${bg} ${color} flex items-center justify-center shrink-0 ring-2 ring-white`}>
                          {icon}
                        </div>
                        <div className="flex-1 bg-white border border-gray-100 rounded-xl px-3 py-2.5 shadow-sm">
                          <p className="text-sm text-gray-700 leading-snug">{act.content}</p>
                          <p className="text-xs text-gray-400 mt-1">{relTime}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── PROFİL TAB (veya yeni aday formu) ───────────────────────── */}
        {(!candidate || activeTab === "profile") && (
        <div className="p-5 space-y-5">

          {/* CV Yukleme */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">
              CV Dosyasi
              {!hasCv && <span className="text-[#045b7c] font-semibold ml-1">yukle, alanlar otomatik dolsun</span>}
            </label>

            {hasCv ? (
              <div className={`flex items-center gap-3 px-4 py-3 rounded-lg border ${isParsing ? "border-[#045b7c]/30 bg-[#045b7c]/5" : "border-emerald-200 bg-emerald-50"}`}>
                {isParsing
                  ? <Cpu size={16} className="text-[#045b7c] animate-pulse shrink-0" />
                  : <CheckCircle size={16} className="text-emerald-500 shrink-0" />
                }
                <span className="text-sm text-gray-700 flex-1 truncate">
                  {isParsing ? "CV analiz ediliyor..." : cvFileName || "CV mevcut"}
                </span>
                {!isParsing && !pendingCVFile && candidate?.id && (
                  <a href={`/api/candidates/${candidate.id}/preview-cv`} target="_blank" rel="noopener noreferrer"
                    className="text-xs px-2 py-1 text-[#045b7c] hover:bg-[#045b7c]/10 rounded border border-[#045b7c]/20 transition-colors">
                    Goruntule
                  </a>
                )}
                {!isParsing && (
                  <button onClick={() => { setPendingCVFile(null); setParsedFields(new Set()); setForm({ ...form, cvFile: null }); }}
                    className="p-1 text-gray-400 hover:text-rose-500 transition-colors rounded">
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ) : (
              <label
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                className={`flex items-center gap-3 px-4 py-3 border border-dashed rounded-lg cursor-pointer transition-colors ${
                  isDragging ? "border-[#045b7c] bg-[#045b7c]/5" : "border-gray-300 hover:border-[#045b7c] hover:bg-gray-50"
                }`}>
                <Upload size={16} className="text-gray-400 shrink-0" />
                <span className="text-sm text-gray-400">PDF veya DOCX suruklleyin ya da tiklayin</span>
                <input type="file" accept=".pdf,.docx,.doc,application/pdf" onChange={handleFileInput} className="hidden" />
              </label>
            )}
            {cvError && <p className="text-xs text-rose-500 mt-1">{cvError}</p>}
          </div>

          {/* Kisisel bilgiler */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                {t("modal.name")} * {isAutoFilled("name") && <span className="text-emerald-500 text-[10px]">otomatik</span>}
              </label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputCls("name")} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                {t("modal.position")} {isAutoFilled("title") && <span className="text-emerald-500 text-[10px]">otomatik</span>}
              </label>
              <input value={form.title || ""} onChange={(e) => setForm({ ...form, title: e.target.value })} className={inputCls("title")} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                {t("modal.company")} {isAutoFilled("company") && <span className="text-emerald-500 text-[10px]">otomatik</span>}
              </label>
              <input value={form.company || ""} onChange={(e) => setForm({ ...form, company: e.target.value })} className={inputCls("company")} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                {t("modal.location")} {isAutoFilled("location") && <span className="text-emerald-500 text-[10px]">otomatik</span>}
              </label>
              <input value={form.location || ""} onChange={(e) => setForm({ ...form, location: e.target.value })} className={inputCls("location")} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                {t("modal.email")} {isAutoFilled("email") && <span className="text-emerald-500 text-[10px]">otomatik</span>}
              </label>
              <input value={form.email || ""} onChange={(e) => setForm({ ...form, email: e.target.value })} className={inputCls("email")} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                {t("modal.phone")} {isAutoFilled("phone") && <span className="text-emerald-500 text-[10px]">otomatik</span>}
              </label>
              <input value={form.phone || ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={inputCls("phone")} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                LinkedIn {isAutoFilled("linkedin") && <span className="text-emerald-500 text-[10px]">otomatik</span>}
              </label>
              <input value={form.linkedin || ""} onChange={(e) => setForm({ ...form, linkedin: e.target.value })} placeholder="https://linkedin.com/in/..." className={inputCls("linkedin")} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                {t("modal.experience")} (yil) {isAutoFilled("experience") && <span className="text-emerald-500 text-[10px]">otomatik</span>}
              </label>
              <input type="number" min={0} max={40} value={form.experience} onChange={(e) => setForm({ ...form, experience: parseInt(e.target.value) || 0 })} className={inputCls("experience")} />
            </div>
          </div>

          {/* Durum + Ilan */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">{t("modal.status")}</label>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-[#045b7c] transition-colors">
                {Object.keys(STATUS_CONFIG).map((key) => (
                  <option key={key} value={key}>{t(`status.${key}`)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">{t("modal.jobPosting")}</label>
              <select value={form.jobId || ""} onChange={(e) => setForm({ ...form, jobId: e.target.value ? parseInt(e.target.value) : null })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-[#045b7c] transition-colors">
                <option value="">{t("modal.notSelected")}</option>
                {jobs.map((j) => <option key={j.id} value={j.id}>{j.title}</option>)}
              </select>
            </div>
          </div>

          {/* Puan */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">{t("modal.rating")}</label>
            <StarRating rating={form.rating} onChange={(r: number) => setForm({ ...form, rating: r })} />
          </div>

          {/* Yetenekler */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              {t("modal.skills")} {isAutoFilled("skills") && form.skills.length > 0 && (
                <span className="text-emerald-500 text-[10px]">{form.skills.length} yetenek otomatik bulundu</span>
              )}
            </label>
            <div className="flex gap-2 mb-2">
              <input
                value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSkill(); } }}
                className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-[#045b7c] transition-colors"
                placeholder={t("modal.addSkill")}
              />
              <button onClick={addSkill} className="px-3 py-2 bg-gray-100 rounded-lg text-sm hover:bg-gray-200 transition-colors"><Plus size={16} /></button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {form.skills.map((skill: string) => (
                <span key={skill} className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs ${
                  isAutoFilled("skills") ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-[#045b7c]/5 text-[#045b7c] border border-[#045b7c]/10"
                }`}>
                  {skill}
                  <button onClick={() => setForm({ ...form, skills: form.skills.filter((s: string) => s !== skill) })} className="hover:text-rose-500 transition-colors"><X size={11} /></button>
                </span>
              ))}
            </div>
            {jdSkills.length > 0 && (
              <div className="mt-2 pt-2 border-t border-gray-100">
                <p className="text-xs text-gray-400 mb-1">{t("modal.quickSkillAdd")}</p>
                <div className="flex flex-wrap gap-1">
                  {jdSkills.filter((s) => !form.skills.includes(s)).map((skill) => (
                    <button key={skill} onClick={() => setForm({ ...form, skills: [...form.skills, skill] })}
                      className="px-2 py-0.5 bg-[#045b7c]/5 text-[#045b7c] rounded text-xs hover:bg-[#045b7c]/10 border border-[#045b7c]/10 transition-colors">
                      + {skill}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Notlar */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Notlar</label>
            <textarea value={form.notes || ""} onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="w-full h-20 px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none outline-none focus:border-[#045b7c] transition-colors" />
          </div>

        </div>
        )}

        {/* Footer */}
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-gray-100 sticky bottom-0 bg-white">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors">Iptal</button>
          {(!candidate || activeTab === "profile") && (
            <button onClick={handleSubmit} disabled={!form.name.trim()}
              className="px-5 py-2 bg-[#045b7c] text-white rounded-lg text-sm font-medium hover:bg-[#03455e] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5">
              <Save size={15} /> Kaydet
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
