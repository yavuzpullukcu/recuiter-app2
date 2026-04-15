export async function getAiMatchResult(jdText: string, cvText: string) {
  try {
    const formData = new FormData();
    formData.append('jd_text', jdText);
    formData.append('cv_text', cvText);
    formData.append('language', 'tr'); // Varsayılan Türkçe

    // Docker'da çalışan Python servisimize istek atıyoruz
    const response = await fetch('http://localhost:8000/ai-match', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error('AI Engine servis hatası');
    }

    return await response.json();
  } catch (error) {
    console.error("AI Analiz Hatası:", error);
    return null;
  }
}