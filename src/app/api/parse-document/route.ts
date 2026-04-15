import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "Dosya bulunamadı" }, { status: 400 });
    }

    const fileName = file.name.toLowerCase();
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    let text = "";

    if (fileName.endsWith(".pdf")) {
      try {
        // YENİ VE ÇOK DAHA GÜÇLÜ: pdf-parse
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const pdfParse = require("pdf-parse");
        
        // PDF'i tampon bellekten (buffer) doğrudan oku
        const data = await pdfParse(buffer);
        text = data.text || "";

      } catch (pdfErr: any) {
        console.error("pdf-parse hatası:", pdfErr?.message);
        return NextResponse.json(
          { error: "PDF okunamadı. Dosya şifreli veya bozuk olabilir." },
          { status: 422 }
        );
      }
    } else if (fileName.endsWith(".docx") || fileName.endsWith(".doc")) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const mammoth = require("mammoth");
        const result = await mammoth.extractRawText({ buffer });
        text = result.value || "";
      } catch (docErr: any) {
        console.error("mammoth hatası:", docErr?.message);
        return NextResponse.json(
          { error: "Word dosyası okunamadı." },
          { status: 422 }
        );
      }
    } else {
      return NextResponse.json(
        { error: "Sadece PDF ve DOCX dosyaları desteklenmektedir" },
        { status: 400 }
      );
    }

    // Metin temizleme algoritmasını güçlendirdik (AI'nin daha iyi anlaması için)
    text = text
      .replace(/\r\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .replace(/\x00/g, " ") // Görünmez hatalı karakterleri temizle
      .trim();

    // Eğer çok az metin çıkmışsa, muhtemelen PDF bir resimdir (Scanner ile taranmıştır)
    if (!text || text.length < 15) {
      return NextResponse.json(
        { error: "Dosyadan yeterli metin çıkarılamadı. Dosya 'resim formatında' (taranmış) bir evrak olabilir." },
        { status: 422 }
      );
    }

    return NextResponse.json({ text, fileName: file.name });
  } catch (error: any) {
    console.error("Genel doküman okuma hatası:", error?.message);
    return NextResponse.json(
      { error: "Dosya işlenirken sunucu tarafında bir hata oluştu" },
      { status: 500 }
    );
  }
}