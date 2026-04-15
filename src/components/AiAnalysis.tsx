"use client";
import { useState } from "react";
import { Sparkles, Loader2, CheckCircle2, AlertTriangle, MessageSquare } from "lucide-react";
import { runAiAnalysis } from "@/app/actions/ai-match";

interface AiAnalysisProps {
  matchId: number;
  jdText: string;
  cvText: string;
  initialData?: any;
}

export default function AiAnalysis({ matchId, jdText, cvText, initialData }: AiAnalysisProps) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(initialData);

  const handleStartAnalysis = async () => {
    setLoading(true);
    const result = await runAiAnalysis(matchId, jdText, cvText);
    if (result.success) {
      setData(result.data);
    }
    setLoading(false);
  };

  // Verileri parse etme (JSON string olarak sakladığımız için)
  const strengths = data?.aiStrengths ? JSON.parse(data.aiStrengths) : [];
  const risks = data?.aiRiskAreas ? JSON.parse(data.aiRiskAreas) : [];
  const questions = data?.interviewQuestions ? JSON.parse(data.interviewQuestions) : [];

  return (
    <div className="space-y-4 p-6 bg-white rounded-2xl border border-gray-100 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold flex items-center gap-2 text-gray-800">
          <Sparkles className="text-brand-500" size={20} /> AI Eşleşme Analizi
        </h3>
        {!data && (
          <button
            onClick={handleStartAnalysis}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-xl hover:bg-brand-700 disabled:opacity-50 transition-all"
          >
            {loading ? <Loader2 className="animate-spin" size={16} /> : <Sparkles size={16} />}
            {loading ? "Analiz Ediliyor..." : "AI Analizi Başlat"}
          </button>
        )}
      </div>

      {data && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
          {/* Skor Kartı */}
          <div className="p-4 bg-brand-50 rounded-xl border border-brand-100 text-center">
            <p className="text-sm text-brand-600 font-medium">Uyum Skoru</p>
            <p className="text-4xl font-black text-brand-700">%{data.matchScore}</p>
            <p className="text-xs text-brand-500 mt-1 capitalize">Uyum: {data.roleFit}</p>
          </div>

          {/* Özet */}
          <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
            <p className="text-sm font-bold text-gray-700 mb-2">AI Değerlendirmesi</p>
            <p className="text-sm text-gray-600 italic leading-relaxed">"{data.explanation}"</p>
          </div>

          {/* Güçlü Yanlar */}
          <div className="space-y-2">
            <p className="text-sm font-bold text-green-700 flex items-center gap-2">
              <CheckCircle2 size={16} /> Güçlü Yanlar
            </p>
            <ul className="text-sm text-gray-600 space-y-1">
              {strengths.map((s: string, i: number) => <li key={i} className="bg-green-50 p-2 rounded-lg">✓ {s}</li>)}
            </ul>
          </div>

          {/* Riskler */}
          <div className="space-y-2">
            <p className="text-sm font-bold text-orange-700 flex items-center gap-2">
              <AlertTriangle size={16} /> Riskler / Eksikler
            </p>
            <ul className="text-sm text-gray-600 space-y-1">
              {risks.map((r: string, i: number) => <li key={i} className="bg-orange-50 p-2 rounded-lg">⚠ {r}</li>)}
            </ul>
          </div>

          {/* Mülakat Soruları */}
          <div className="md:col-span-2 p-4 bg-purple-50 rounded-xl border border-purple-100">
            <p className="text-sm font-bold text-purple-700 flex items-center gap-2 mb-3">
              <MessageSquare size={16} /> Önerilen Mülakat Soruları
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              {questions.map((q: string, i: number) => (
                <div key={i} className="bg-white p-3 rounded-lg border border-purple-100 shadow-sm text-gray-700 font-medium">
                  {i+1}. {q}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}