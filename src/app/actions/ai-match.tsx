"use server";

import { prisma as db } from "@/lib/prisma";
import { getAiMatchResult } from "@/lib/ai-service"; // Adım 2'de oluşturduğumuz köprü

export async function runAiAnalysis(matchId: number, jdText: string, cvText: string) {
  try {
    // 1. Docker'daki Python servisine git
    const aiData = await getAiMatchResult(jdText, cvText);

    if (!aiData) throw new Error("AI Analiz sonucu boş döndü.");

    // 2. Gelen detaylı veriyi veritabanına işle
    const updatedMatch = await db.jobMatch.update({
      where: { id: matchId },
      data: {
        matchScore: aiData.score,
        explanation: aiData.summary,
        aiConfidence: aiData.confidence,
        roleFit: aiData.role_fit,
        // Nesne olan verileri string olarak saklıyoruz
        aiStrengths: JSON.stringify(aiData.strengths),
        aiRiskAreas: JSON.stringify(aiData.risk_areas),
        interviewQuestions: JSON.stringify(aiData.interview_questions),
        aiRecommendations: JSON.stringify(aiData.recommendations),
      },
    });

    return { success: true, data: updatedMatch };
  } catch (error) {
    console.error("Analiz kaydedilirken hata:", error);
    return { success: false, error: "Analiz kaydedilemedi." };
  }
}