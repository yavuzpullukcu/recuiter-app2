"use client";
import { useState, useRef, useCallback } from "react";
import { FileText, Search, ChevronDown, ChevronRight, Plus, Upload, X, Loader2 } from "lucide-react";
import SkillTag from "./SkillTag";
import { useLanguage } from "@/lib/i18n/LanguageContext";

interface Props {
  jdSkills: string[];
  onAnalyze: (text: string) => void;
  onClear: () => void;
  onCreateJob: (title: string, description: string) => void;
}

export default function JDAnalyzer({ jdSkills, onAnalyze, onClear, onCreateJob }: Props) {
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(true);
  const [jdText, setJdText] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState("");
  const [parsedFileName, setParsedFileName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAnalyze = () => {
    onAnalyze(jdText);
  };

  const handleCreateJob = () => {
    if (jobTitle.trim() && jdText.trim()) {
      onCreateJob(jobTitle, jdText);
      setJobTitle("");
    }
  };

  const parseDocument = useCallback(async (file: File) => {
    // Validate file type
    const validTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/msword",
    ];
    const validExtensions = [".pdf", ".docx", ".doc"];
    const hasValidExt = validExtensions.some((ext) => file.name.toLowerCase().endsWith(ext));

    if (!validTypes.includes(file.type) && !hasValidExt) {
      setParseError("Sadece PDF veya Word (.docx) dosyası yüklenebilir");
      return;
    }

    setIsParsing(true);
    setParseError("");
    setParsedFileName("");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/parse-document", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setParseError(data.error || "Dosya okunamadı");
        return;
      }

      // Fill textarea with parsed text and auto-analyze
      setJdText(data.text);
      setParsedFileName(data.fileName);
      onAnalyze(data.text);

      // Try to extract job title from first line
      const firstLine = data.text.split("\n").find((l: string) => l.trim().length > 3 && l.trim().length < 80);
      if (firstLine && !jobTitle) {
        setJobTitle(firstLine.trim());
      }
    } catch (err) {
      setParseError("Bağlantı hatası, tekrar deneyin");
    } finally {
      setIsParsing(false);
    }
  }, [jobTitle, onAnalyze]);

  // Drag & drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) parseDocument(file);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) parseDocument(file);
    e.target.value = "";
  };

  const handleClearAll = () => {
    onClear();
    setJdText("");
    setJobTitle("");
    setParsedFileName("");
    setParseError("");
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-brand-100 flex items-center justify-center">
            <FileText size={20} className="text-brand-600" />
          </div>
          <div className="text-left">
            <h2 className="font-semibold text-gray-900">{t("jd.title")}</h2>
            <p className="text-sm text-gray-500">
              {jdSkills.length > 0
                ? `${jdSkills.length} ${t("jd.subtitle.found")}`
                : t("jd.subtitle.empty")}
            </p>
          </div>
        </div>
        {isOpen ? <ChevronDown size={20} className="text-gray-400" /> : <ChevronRight size={20} className="text-gray-400" />}
      </button>

      {isOpen && (
        <div className="px-4 pb-4 space-y-3">

          {/* Drag & Drop Zone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => !isParsing && fileInputRef.current?.click()}
            className={`relative flex flex-col items-center justify-center gap-2 p-5 border-2 border-dashed rounded-xl cursor-pointer transition-all
              ${isDragging
                ? "border-brand-500 bg-brand-50 scale-[1.01]"
                : "border-gray-300 bg-gray-50 hover:border-brand-400 hover:bg-brand-50"
              }
              ${isParsing ? "cursor-wait pointer-events-none" : ""}
            `}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx,.doc,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={handleFileInput}
              className="hidden"
            />

            {isParsing ? (
              <>
                <Loader2 size={28} className="text-brand-500 animate-spin" />
                <p className="text-sm font-medium text-brand-600">Dosya okunuyor...</p>
              </>
            ) : parsedFileName ? (
              <>
                <div className="flex items-center gap-2">
                  <FileText size={20} className="text-brand-600" />
                  <span className="text-sm font-medium text-brand-700">{parsedFileName}</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleClearAll(); }}
                    className="p-0.5 text-gray-400 hover:text-red-500"
                  >
                    <X size={14} />
                  </button>
                </div>
                <p className="text-xs text-gray-500">Başka bir dosya için tıkla veya sürükle</p>
              </>
            ) : (
              <>
                <Upload size={28} className={`transition-colors ${isDragging ? "text-brand-500" : "text-gray-400"}`} />
                <div className="text-center">
                  <p className="text-sm font-medium text-gray-700">
                    PDF veya Word dosyasını buraya sürükle
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">veya tıklayarak seç · .pdf, .docx</p>
                </div>
              </>
            )}
          </div>

          {parseError && (
            <p className="text-xs text-red-600 flex items-center gap-1">
              <X size={12} /> {parseError}
            </p>
          )}

          {/* Job Title Input */}
          <input
            value={jobTitle}
            onChange={(e) => setJobTitle(e.target.value)}
            placeholder={`${t("jd.jobTitle")} (${t("jd.jobTitlePlaceholder")})`}
            className="w-full p-3 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none"
          />

          {/* JD Text Area */}
          <textarea
            value={jdText}
            onChange={(e) => setJdText(e.target.value)}
            placeholder={t("jd.placeholder")}
            className="w-full h-40 p-3 border border-gray-200 rounded-lg text-sm resize-none focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none"
          />

          {/* Action Buttons */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleAnalyze}
              disabled={!jdText.trim()}
              className="px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Search size={16} /> {t("jd.analyze")}
            </button>
            {jdSkills.length > 0 && jobTitle.trim() && (
              <button
                onClick={handleCreateJob}
                className="px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors flex items-center gap-2"
              >
                <Plus size={16} /> {t("jd.saveAsJob")}
              </button>
            )}
            {(jdSkills.length > 0 || jdText) && (
              <button
                onClick={handleClearAll}
                className="px-4 py-2 text-gray-600 rounded-lg text-sm hover:bg-gray-100 transition-colors"
              >
                {t("jd.clear")}
              </button>
            )}
          </div>

          {/* Detected Skills */}
          {jdSkills.length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-500 mb-2">{t("jd.detectedSkills")}</p>
              <div className="flex flex-wrap">
                {jdSkills.map((skill) => <SkillTag key={skill} skill={skill} highlight />)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
