"use client";

import { useRef, useState } from "react";
import {
  Upload,
  Cpu,
  FileText,
  Loader2,
  FileCheck,
  Download,
  Users,
  TrendingUp,
  Trophy,
  Lightbulb,
  Target,
  XCircle,
} from "lucide-react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { useLanguage } from "@/lib/i18n/LanguageContext";

function useAiMatcherText() {
  const { locale } = useLanguage();
  const isDe = locale === "de";

  return {
    locale,
    isDe,
    invalidFile: isDe ? "Sie können nur PDF- oder Word-Dateien hochladen." : "Sadece PDF veya Word dosyasi yukleyebilirsiniz.",
    fileReadError: isDe ? "Datei konnte nicht gelesen werden." : "Dosya okunamadi.",
    missingInputs: isDe ? "Bitte CVs und Stellenbeschreibung hinzufügen." : "Lutfen CV'leri ve is tanimini ekleyin!",
    processing: isDe ? "Analyse läuft..." : "Analiz ediliyor...",
    start: isDe ? "Analyse starten und sortieren" : "Analizi Baslat ve Sirala",
    newAnalysis: isDe ? "Neue Analyse" : "Yeni Analiz",
    downloadPdf: isDe ? "PDF-Bericht herunterladen" : "Raporu PDF indir",
    jdTitle: isDe ? "1. Stellenbeschreibung (JD)" : "1. Is Tanimi (JD)",
    jdUpload: isDe ? "JD-Datei hochladen" : "JD Dosyasi Yukle",
    jdPlaceholder: isDe ? "Oder die Stellenbeschreibung hier einfügen..." : "Veya is tanimi metnini buraya yapistirin...",
    cvTitle: isDe ? "2. Kandidaten-Lebensläufe" : "2. Aday Ozgecmisleri",
    cvSelect: isDe ? "CV-Dateien auswählen" : "Aday CV'lerini secin",
    cvMulti: isDe ? "Sie können mehrere Dateien auswählen." : "Birden fazla dosya secebilirsiniz.",
    readyForAnalysis: isDe ? "Kandidaten bereit für Analyse" : "Aday analize hazir",
    aiReading: isDe ? "KI liest..." : "Yapay zeka okuyor...",
    jdReady: isDe ? "ist für das System bereit" : "sistem icin hazir",
    jdDrop: isDe ? "JD-Dokument ziehen oder anklicken" : "JD belgesini surukleyin veya tiklayin",
    reportTitle: isDe ? "Kandidatenranking-Bericht" : "Aday Siralama Raporu",
    reportSubtitle: isDe ? "ArkheTalent AI • Strategischer Analysebericht" : "ArkheTalent AI • Stratejik Analiz Raporu",
    rank: isDe ? "Rang" : "Sira",
    candidateName: isDe ? "Kandidatenname" : "Aday Ismi",
    confidence: isDe ? "Vertrauensscore" : "Guven Skoru",
    matchRate: "Match Rate",
    detailTitle: isDe ? "Detaillierte Kompetenzanalyse" : "Detayli Yetkinlik Analizi",
    strengths: isDe ? "Erkannte Stärken" : "Tespit Edilen Yetkinlikler",
    gaps: isDe ? "Kritische Lücken" : "Kritik Eksikler",
    aiAssessment: isDe ? "KI-Bewertung" : "Yapay Zeka Degerlendirmesi",
    interviewTips: isDe ? "Strategische Interviewempfehlungen" : "Stratejik Mulakat Onerileri",
    confidential: isDe ? "ArkheTalent • Vertraulicher Kandidatenbericht" : "ArkheTalent • Confidential Candidate Report",
  };
}

export default function AIMatcherPage() {
  const text = useAiMatcherText();
  const [jobDescription, setJobDescription] = useState("");
  const [cvFiles, setCvFiles] = useState<File[]>([]);
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [isParsingJD, setIsParsingJD] = useState(false);
  const [docParseError, setDocParseError] = useState("");
  const reportRef = useRef<HTMLDivElement>(null);

  const downloadPDF = async () => {
    if (!reportRef.current) return;

    const pdf = new jsPDF("p", "mm", "a4");
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pages = reportRef.current.querySelectorAll(".pdf-page");

    for (let i = 0; i < pages.length; i++) {
      const pageElement = pages[i] as HTMLElement;
      const canvas = await html2canvas(pageElement, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#f8f9fa",
        logging: false,
      });
      const imgData = canvas.toDataURL("image/png");
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      if (i > 0) pdf.addPage();
      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
    }

    pdf.save(`ArkheTalent-${text.isDe ? "Analysebericht" : "Analiz-Raporu"}.pdf`);
  };

  const handleJDFileRead = async (file: File) => {
    const validExt = [".pdf", ".docx", ".doc"];
    if (!validExt.some((ext) => file.name.toLowerCase().endsWith(ext))) {
      setDocParseError(text.invalidFile);
      return;
    }

    setDocParseError("");
    setIsParsingJD(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/parse-document", { method: "POST", body: formData });
      const data = await res.json();
      if (data.text) setJobDescription(data.text);
    } catch {
      setDocParseError(text.fileReadError);
    } finally {
      setIsParsingJD(false);
    }
  };

  const handleMatchSelectedFiles = async () => {
    if (cvFiles.length === 0 || !jobDescription) {
      alert(text.missingInputs);
      return;
    }

    setLoading(true);
    setResults([]);
    setProgress({ current: 0, total: cvFiles.length });

    const allResults: any[] = [];

    for (let i = 0; i < cvFiles.length; i++) {
      setProgress({ current: i + 1, total: cvFiles.length });
      const file = cvFiles[i];

      try {
        const cvFormData = new FormData();
        cvFormData.append("file", file);
        const cvParseRes = await fetch("/api/parse-document", { method: "POST", body: cvFormData });
        const cvParseData = await cvParseRes.json();
        if (!cvParseRes.ok) continue;

        const pyFormData = new FormData();
        pyFormData.append("jd_text", jobDescription);
        pyFormData.append("cv_text", cvParseData.text);
        pyFormData.append("language", text.isDe ? "de" : "tr");

        const pyRes = await fetch("http://localhost:8000/ai-match", { method: "POST", body: pyFormData });
        const pyData = await pyRes.json();

        if (pyData.score !== undefined) {
          allResults.push({ ...pyData, candidateName: file.name.replace(".pdf", "") });
        }
      } catch (error) {
        console.error(`${file.name} analiz edilemedi.`, error);
      }
    }

    allResults.sort((a, b) => b.score - a.score);
    setResults(allResults);
    setLoading(false);
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-emerald-600";
    if (score >= 50) return "text-amber-600";
    return "text-rose-600";
  };

  const currentDate = new Date().toLocaleDateString(text.isDe ? "de-DE" : "tr-TR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="p-6 md:p-10 bg-[#f8f9fa] min-h-screen font-sans text-slate-800">
      <div className="max-w-[1200px] mx-auto space-y-6">
        {!results.length && (
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <FileText className="text-[#045b7c]" size={20} />
                  <h2 className="font-bold text-slate-700 text-sm uppercase tracking-tight">{text.jdTitle}</h2>
                </div>
                <div
                  onClick={() => {
                    const input = document.createElement("input");
                    input.type = "file";
                    input.accept = ".pdf,.docx,.doc";
                    input.onchange = (event) => {
                      const file = (event.target as HTMLInputElement).files?.[0];
                      if (file) handleJDFileRead(file);
                    };
                    input.click();
                  }}
                  className="mb-4 p-6 border-2 border-dashed border-slate-300 rounded-xl text-center cursor-pointer bg-slate-50 hover:bg-slate-100 transition-all group"
                >
                  {isParsingJD ? (
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 className="animate-spin mx-auto text-[#045b7c]" />
                      <p className="text-xs font-bold text-[#045b7c] uppercase tracking-widest">{text.aiReading}</p>
                    </div>
                  ) : (
                    <>
                      <Upload className="mx-auto text-slate-400 mb-2 group-hover:text-[#045b7c] transition-colors" />
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">{text.jdUpload}</p>
                    </>
                  )}
                </div>
                {docParseError && <p className="text-xs text-rose-600 mb-3">{docParseError}</p>}
                <textarea
                  className="w-full h-48 p-4 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#045b7c]/10 focus:border-[#045b7c] transition-all resize-none"
                  placeholder={text.jdPlaceholder}
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                />
              </div>

              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <Users className="text-[#045b7c]" size={20} />
                    <h2 className="font-bold text-slate-700 text-sm uppercase tracking-tight">{text.cvTitle}</h2>
                  </div>
                  <div className="p-8 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50 text-center">
                    <input type="file" accept=".pdf" multiple onChange={(e) => setCvFiles(Array.from(e.target.files || []))} className="hidden" id="cv-upload" />
                    <label htmlFor="cv-upload" className="cursor-pointer">
                      <FileCheck className="mx-auto text-slate-400 mb-2" />
                      <span className="text-xs font-bold text-slate-500 uppercase block mb-1">{text.cvSelect}</span>
                      <span className="text-[10px] text-slate-400 font-medium italic">{text.cvMulti}</span>
                    </label>
                  </div>
                  {cvFiles.length > 0 && (
                    <div className="mt-4 p-3 bg-blue-50 border border-blue-100 rounded-lg">
                      <p className="text-[10px] text-[#045b7c] font-black uppercase tracking-widest">{cvFiles.length} {text.readyForAnalysis}</p>
                    </div>
                  )}
                </div>
                <button
                  onClick={handleMatchSelectedFiles}
                  disabled={loading || cvFiles.length === 0 || !jobDescription}
                  className="w-full py-5 bg-[#045b7c] text-white rounded-lg font-black uppercase tracking-widest hover:bg-[#03455e] transition-all flex items-center justify-center gap-3 shadow-lg shadow-blue-900/10 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <Loader2 className="animate-spin" size={20} /> {progress.current}/{progress.total} {text.processing}
                    </>
                  ) : (
                    <>
                      <TrendingUp size={20} /> {text.start}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {results.length > 0 && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex justify-end gap-3 mb-6">
              <button
                onClick={() => {
                  setResults([]);
                  setCvFiles([]);
                }}
                className="px-6 py-2.5 bg-slate-200 text-slate-700 rounded-lg text-xs font-black uppercase tracking-widest hover:bg-slate-300 transition-all"
              >
                {text.newAnalysis}
              </button>
              <button
                onClick={downloadPDF}
                className="flex items-center gap-2 px-6 py-2.5 bg-[#045b7c] text-white rounded-lg text-xs font-black uppercase tracking-widest shadow-md hover:bg-[#03455e] transition-all"
              >
                <Download size={14} /> {text.downloadPdf}
              </button>
            </div>

            <div ref={reportRef} className="space-y-10">
              <div className="pdf-page bg-[#f8f9fa] p-10 border border-slate-200 rounded-[32px] shadow-sm min-h-fit">
                <div className="bg-[#045b7c] rounded-2xl p-8 flex justify-between items-center text-white mb-10 shadow-lg relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32" />
                  <div className="relative z-10">
                    <h1 className="text-3xl font-black uppercase tracking-tighter mb-1">{text.reportTitle}</h1>
                    <p className="text-xs font-medium text-blue-100 uppercase tracking-widest opacity-80">{text.reportSubtitle}</p>
                  </div>
                  <div className="text-right relative z-10">
                    <img src="/arkhetalent-logo.png" className="h-8 ml-auto mb-2 object-contain" alt="Logo" />
                    <p className="text-[10px] font-bold opacity-80 uppercase tracking-widest">{currentDate}</p>
                  </div>
                </div>

                <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-200">
                  <table className="w-full border-collapse">
                    <thead className="bg-slate-50/80 border-b border-slate-200">
                      <tr>
                        <th className="px-6 py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest text-left w-20">{text.rank}</th>
                        <th className="px-6 py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest text-left">{text.candidateName}</th>
                        <th className="px-6 py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest text-center">{text.confidence}</th>
                        <th className="px-6 py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest text-right">{text.matchRate}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {results.map((res, i) => (
                        <tr key={i} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-5 font-black text-slate-300">{i === 0 ? <Trophy size={20} className="text-amber-500" /> : `#${i + 1}`}</td>
                          <td className="px-6 py-5 font-bold text-slate-700 tracking-tight">{res.candidateName}</td>
                          <td className="px-6 py-5 text-center text-slate-400 font-bold text-sm">%{(res.confidence * 100).toFixed(0)}</td>
                          <td className={`px-6 py-5 text-right font-black text-xl ${getScoreColor(res.score)}`}>%{res.score}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {results.map((res, i) => (
                <div key={i} className="pdf-page bg-[#f8f9fa] p-10 border border-slate-200 rounded-[32px] shadow-sm min-h-[1050px] flex flex-col">
                  <div className="flex justify-between items-start border-b-2 border-slate-200 pb-8 mb-10">
                    <div>
                      <h2 className="text-3xl font-black text-slate-800 uppercase tracking-tighter mb-1">{res.candidateName}</h2>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em]">{text.detailTitle} â€¢ {i + 2}</p>
                    </div>
                    <div className="bg-[#045b7c] text-white px-8 py-3 rounded-2xl text-center shadow-lg shadow-[#045b7c]/20">
                      <span className="block text-[9px] font-black uppercase opacity-70 tracking-widest mb-0.5">{text.matchRate}</span>
                      <span className="text-3xl font-black">%{res.score}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-10 mb-10">
                    <div className="bg-white border border-slate-200 p-8 rounded-[24px] shadow-sm flex-1 min-h-[320px]">
                      <h4 className="text-[11px] font-black text-emerald-600 uppercase tracking-widest mb-6 flex items-center gap-2">
                        <Trophy size={16} /> {text.strengths}
                      </h4>
                      <ul className="space-y-4">
                        {res.matched_points?.map((point: any, idx: number) => (
                          <li key={idx} className="text-xs font-bold text-slate-600 flex gap-3 leading-relaxed">
                            <span className="text-emerald-500 font-black mt-0.5">âœ“</span> {point}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="bg-white border border-slate-200 p-8 rounded-[24px] shadow-sm flex-1 min-h-[320px]">
                      <h4 className="text-[11px] font-black text-rose-600 uppercase tracking-widest mb-6 flex items-center gap-2">
                        <XCircle size={16} /> {text.gaps}
                      </h4>
                      <ul className="space-y-4">
                        {res.missing_points?.map((point: any, idx: number) => (
                          <li key={idx} className="text-xs font-bold text-slate-600 flex gap-3 leading-relaxed">
                            <span className="text-rose-500 font-black mt-0.5">âœ•</span> {point}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="bg-white border border-slate-200 p-8 rounded-[24px] shadow-sm mb-10 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1.5 h-full bg-[#045b7c]" />
                    <h4 className="text-[11px] font-black text-[#045b7c] uppercase tracking-widest mb-5 flex items-center gap-2">
                      <Target size={16} /> {text.aiAssessment}
                    </h4>
                    <p className="text-sm leading-relaxed text-slate-700 font-medium italic whitespace-pre-wrap px-2">"{res.summary}"</p>
                  </div>

                  <div className="bg-[#045b7c]/5 border border-[#045b7c]/10 p-8 rounded-[24px] flex-1">
                    <h4 className="text-[11px] font-black text-[#045b7c] uppercase tracking-widest mb-6 flex items-center gap-2">
                      <Lightbulb size={16} /> {text.interviewTips}
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      {res.recommendations?.map((recommendation: any, idx: number) => (
                        <div key={idx} className="bg-white/70 backdrop-blur-sm p-5 rounded-xl text-xs font-bold text-slate-700 border border-white flex gap-4 shadow-sm transition-all hover:shadow-md">
                          <span className="text-[#045b7c] font-black">â†’</span>
                          <span className="leading-relaxed">{recommendation}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-auto pt-10 text-center border-t border-slate-200">
                    <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.4em]">{text.confidential}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

