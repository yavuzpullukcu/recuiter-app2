"use client";
import { useState, useRef } from "react";
import { Upload, Download, FileSpreadsheet, CheckCircle, AlertCircle, X, Loader2 } from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageContext";

interface Props {
  onImportComplete: () => void;
  candidateCount: number;
}

// Skill level columns to skill mapping
const SKILL_LEVEL_MAP: Record<string, string> = {
  "Azure DevOps": "Azure DevOps",
  "Enterprise/Platform": "Enterprise Architecture",
  "Security/DevSecOps": "Security (SAST/SCA/DAST)",
  "IaC/Automation": "Terraform",
};

function parseSkillsFromRow(row: any): string[] {
  const skills: string[] = [];
  for (const [colName, skillName] of Object.entries(SKILL_LEVEL_MAP)) {
    const value = row[colName];
    if (value && typeof value === "string" && value.trim().length > 0) {
      const lower = value.toLowerCase();
      if (lower !== "-" && lower !== "yok" && lower !== "none") {
        skills.push(skillName);
      }
    }
  }

  const skillCol = row["Skills"] || row["Beceriler"] || row["skills"] || row["beceriler"];
  if (skillCol && typeof skillCol === "string") {
    skillCol.split(",").forEach((s: string) => {
      const trimmed = s.trim();
      if (trimmed && !skills.includes(trimmed)) skills.push(trimmed);
    });
  }

  const notes = row["Notlar"] || row["Notes"] || row["notes"] || "";
  if (typeof notes === "string") {
    const noteSkills = [
      "Azure DevOps", "Kubernetes", "Docker", "Terraform", "Ansible",
      "CI/CD", "SAST", "DAST", "SCA", "DevSecOps", "RBAC", "Python",
      "Jenkins", "Git", "AWS", "GCP", "PowerShell", "Microservices",
    ];
    for (const skill of noteSkills) {
      if (notes.toLowerCase().includes(skill.toLowerCase()) && !skills.includes(skill)) {
        skills.push(skill);
      }
    }
  }

  return skills;
}

function parseExperience(row: any): number {
  const notes = row["Notlar"] || row["Notes"] || row["notes"] || "";
  const exp = row["Deneyim"] || row["Experience"] || row["experience"] || row["Deneyim (yil)"];
  if (exp && !isNaN(Number(exp))) return Number(exp);
  const match = String(notes).match(/(\d+)\+?\s*y[iı]l/i);
  if (match) return parseInt(match[1]);
  return 0;
}

function parseRating(row: any): number {
  const score = row["Uygunluk Puanı"] || row["Uygunluk Puani"] || row["Score"] || row["Puan"];
  if (score && typeof score === "string") {
    const match = score.match(/(\d+)/);
    if (match) {
      const num = parseInt(match[1]);
      if (num >= 90) return 5;
      if (num >= 80) return 4;
      if (num >= 70) return 3;
      if (num >= 60) return 2;
      return 1;
    }
  }
  const rating = row["Rating"] || row["Degerlendirme"];
  if (rating && !isNaN(Number(rating))) return Math.min(5, Math.max(1, Number(rating)));
  return 3;
}

export default function ExcelImportExport({ onImportComplete, candidateCount }: Props) {
  const { t } = useLanguage();
  const [showImport, setShowImport] = useState(false);
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [fileName, setFileName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setImportResult(null);

    const XLSX = await loadSheetJS();
    if (!XLSX) {
      alert("Excel library could not be loaded.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = evt.target?.result;
        const workbook = XLSX.read(data, { type: "binary" });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(sheet);

        const candidates = jsonData.map((row: any) => ({
          name: row["Aday Adı"] || row["Aday Adi"] || row["Ad Soyad"] || row["Name"] || row["name"] || "",
          title: row["Mevcut Pozisyon"] || row["Pozisyon"] || row["Title"] || row["title"] || "",
          company: row["Şirket"] || row["Sirket"] || row["Company"] || row["company"] || "",
          location: row["Lokasyon"] || row["Location"] || row["location"] || row["Sehir"] || "",
          linkedin: row["LinkedIn Profili"] || row["LinkedIn"] || row["linkedin"] || row["Linkedin"] || "",
          email: row["E-posta"] || row["Email"] || row["email"] || "",
          phone: row["Telefon"] || row["Phone"] || row["phone"] || "",
          skills: parseSkillsFromRow(row),
          experience: parseExperience(row),
          rating: parseRating(row),
          notes: row["Notlar"] || row["Notes"] || row["notes"] || "",
        }));

        setPreviewData(candidates.filter((c: any) => c.name?.trim()));
      } catch (err) {
        console.error("Excel parse error:", err);
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleImport = async () => {
    if (previewData.length === 0) return;
    setImporting(true);

    try {
      const res = await fetch("/api/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidates: previewData }),
      });
      const result = await res.json();
      setImportResult(result);
      if (result.imported > 0) onImportComplete();
    } catch (err) {
      console.error("Import error:", err);
    } finally {
      setImporting(false);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await fetch("/api/export");
      const data = await res.json();

      const XLSX = await loadSheetJS();
      if (!XLSX) return;

      const wsData = [
        ["#", "Ad Soyad", "Pozisyon", "Sirket", "Lokasyon", "LinkedIn", "E-posta", "Telefon", "Beceriler", "Deneyim (yil)", "Durum", "Degerlendirme", "Notlar", "Is Ilani"],
        ...data.map((c: any) => [
          c.no, c.name, c.title, c.company, c.location, c.linkedin, c.email, c.phone,
          c.skills, c.experience, c.status, c.rating, c.notes, c.job,
        ]),
      ];

      const ws = XLSX.utils.aoa_to_sheet(wsData);
      ws["!cols"] = [
        { wch: 4 }, { wch: 22 }, { wch: 28 }, { wch: 18 }, { wch: 14 },
        { wch: 45 }, { wch: 25 }, { wch: 15 }, { wch: 40 }, { wch: 12 },
        { wch: 14 }, { wch: 12 }, { wch: 40 }, { wch: 25 },
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Kandidaten");

      const today = new Date().toISOString().split("T")[0];
      XLSX.writeFile(wb, `Recuter_Candidates_${today}.xlsx`);
    } catch (err) {
      console.error("Export error:", err);
    } finally {
      setExporting(false);
    }
  };

  const resetImport = () => {
    setPreviewData([]);
    setImportResult(null);
    setFileName("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="flex items-center gap-2">
      {/* Import Button */}
      <button
        onClick={() => setShowImport(true)}
        className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2"
      >
        <Upload size={16} /> {t("excel.import")}
      </button>

      {/* Export Button */}
      <button
        onClick={handleExport}
        disabled={exporting || candidateCount === 0}
        className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2 disabled:opacity-50"
      >
        {exporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
        {t("excel.export")}
      </button>

      {/* Import Modal */}
      {showImport && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => { setShowImport(false); resetImport(); }}>
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b">
              <div className="flex items-center gap-3">
                <FileSpreadsheet size={24} className="text-brand-600" />
                <h3 className="text-lg font-semibold">{t("excel.importTitle")}</h3>
              </div>
              <button onClick={() => { setShowImport(false); resetImport(); }} className="p-1 hover:bg-gray-100 rounded-lg">
                <X size={20} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {!importResult && (
                <>
                  <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center hover:border-brand-300 transition-colors">
                    <FileSpreadsheet size={40} className="mx-auto text-gray-300 mb-3" />
                    <p className="text-sm text-gray-600 mb-2">{t("excel.selectFile")}</p>
                    <p className="text-xs text-gray-400 mb-4">{t("excel.supportedCols")}</p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".xlsx,.xls"
                      onChange={handleFileSelect}
                      className="hidden"
                      id="excel-upload"
                    />
                    <label
                      htmlFor="excel-upload"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 cursor-pointer"
                    >
                      <Upload size={16} /> {t("excel.chooseFile")}
                    </label>
                    {fileName && <p className="mt-2 text-sm text-brand-600">{fileName}</p>}
                  </div>

                  {previewData.length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-2">
                        {t("excel.preview")} ({previewData.length} {t("excel.candidatesFound")})
                      </p>
                      <div className="border rounded-lg overflow-hidden max-h-64 overflow-y-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-50 sticky top-0">
                            <tr>
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">{t("modal.name")}</th>
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">{t("modal.position")}</th>
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">{t("modal.company")}</th>
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">LinkedIn</th>
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">{t("modal.skills")}</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {previewData.map((c, i) => (
                              <tr key={i} className="hover:bg-gray-50">
                                <td className="px-3 py-2 font-medium">{c.name}</td>
                                <td className="px-3 py-2 text-gray-500">{c.title}</td>
                                <td className="px-3 py-2 text-gray-500">{c.company}</td>
                                <td className="px-3 py-2">
                                  {c.linkedin ? (
                                    <span className="text-brand-600 text-xs">&#10003; {t("excel.hasLinkedin")}</span>
                                  ) : (
                                    <span className="text-gray-300 text-xs">-</span>
                                  )}
                                </td>
                                <td className="px-3 py-2 text-xs text-gray-500">{c.skills.length} {t("candidate.skills")}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      <div className="flex justify-end gap-3 mt-4">
                        <button onClick={resetImport} className="px-4 py-2 text-gray-600 rounded-lg text-sm hover:bg-gray-100">
                          {t("modal.cancel")}
                        </button>
                        <button
                          onClick={handleImport}
                          disabled={importing}
                          className="px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50 flex items-center gap-2"
                        >
                          {importing ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                          {importing ? t("excel.importing") : `${previewData.length} ${t("excel.importBtn")}`}
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}

              {importResult && (
                <div className="space-y-3">
                  <div className={`p-4 rounded-lg ${importResult.imported > 0 ? "bg-brand-50" : "bg-yellow-50"}`}>
                    <div className="flex items-center gap-2 mb-2">
                      {importResult.imported > 0 ? (
                        <CheckCircle size={20} className="text-brand-600" />
                      ) : (
                        <AlertCircle size={20} className="text-yellow-600" />
                      )}
                      <p className="font-medium text-gray-900">{t("excel.done")}</p>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-gray-500">{t("excel.total")}</p>
                        <p className="text-lg font-bold">{importResult.total}</p>
                      </div>
                      <div>
                        <p className="text-brand-600">{t("excel.added")}</p>
                        <p className="text-lg font-bold text-brand-700">{importResult.imported}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">{t("excel.skipped")}</p>
                        <p className="text-lg font-bold text-gray-400">{importResult.skipped}</p>
                      </div>
                    </div>
                  </div>

                  {importResult.results && (
                    <div className="border rounded-lg overflow-hidden max-h-48 overflow-y-auto">
                      <table className="w-full text-sm">
                        <tbody className="divide-y divide-gray-100">
                          {importResult.results.map((r: any, i: number) => (
                            <tr key={i}>
                              <td className="px-3 py-2 font-medium">{r.name}</td>
                              <td className="px-3 py-2">
                                <span className={`text-xs px-2 py-0.5 rounded-full ${
                                  r.status.includes("eklendi") || r.status.includes("added") ? "bg-brand-100 text-brand-700" : "bg-gray-100 text-gray-500"
                                }`}>
                                  {r.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  <div className="flex justify-end">
                    <button
                      onClick={() => { setShowImport(false); resetImport(); }}
                      className="px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700"
                    >
                      {t("excel.ok")}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Lazy load SheetJS from CDN
let sheetJSLoaded: any = null;
async function loadSheetJS(): Promise<any> {
  if (sheetJSLoaded) return sheetJSLoaded;

  return new Promise((resolve) => {
    if ((window as any).XLSX) {
      sheetJSLoaded = (window as any).XLSX;
      resolve(sheetJSLoaded);
      return;
    }

    const script = document.createElement("script");
    script.src = "https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js";
    script.onload = () => {
      sheetJSLoaded = (window as any).XLSX;
      resolve(sheetJSLoaded);
    };
    script.onerror = () => resolve(null);
    document.head.appendChild(script);
  });
}
