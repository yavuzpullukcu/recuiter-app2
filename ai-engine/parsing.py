import os
import re
from io import BytesIO

import pdfplumber

try:
    import docx
except Exception:
    docx = None


def normalize_text(text: str) -> str:
    if not text:
        return ""
    text = text.replace("\x00", " ")
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def _extract_pdf_text_pdfplumber(path: str) -> str:
    try:
        with open(path, "rb") as f:
            data = f.read()
        if not data:
            return ""

        parts = []
        with pdfplumber.open(BytesIO(data)) as pdf:
            for page in pdf.pages:
                t = (page.extract_text() or "").strip()
                if t:
                    parts.append(t)

        return "\n".join(parts).strip()
    except Exception:
        return ""


def _extract_pdf_text_pymupdf(path: str) -> str:
    try:
        import fitz
        doc = fitz.open(path)
        parts = []
        for page in doc:
            t = (page.get_text("text") or "").strip()
            if t:
                parts.append(t)
        return "\n".join(parts).strip()
    except Exception:
        return ""


def _extract_pdf_text_ocr(path: str) -> str:
    try:
        import fitz
        import pytesseract
        from PIL import Image

        tcmd = os.getenv("TESSERACT_CMD") or r"C:\Program Files\Tesseract-OCR\tesseract.exe"
        pytesseract.pytesseract.tesseract_cmd = tcmd

        doc = fitz.open(path)
        parts = []

        for page in doc:
            pix = page.get_pixmap(matrix=fitz.Matrix(2, 2))
            img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)

            text = pytesseract.image_to_string(img, lang="eng+tur")
            text = (text or "").strip()
            if text:
                parts.append(text)

        return "\n".join(parts).strip()
    except Exception:
        return ""


def _extract_docx_text(path: str) -> str:
    if docx is None:
        return ""
    try:
        d = docx.Document(path)
        parts = []
        for p in d.paragraphs:
            t = (p.text or "").strip()
            if t:
                parts.append(t)
        return "\n".join(parts).strip()
    except Exception:
        return ""


def _looks_meaningful(text: str) -> bool:
    text = (text or "").strip()
    if len(text) < 80:
        return False

    words = re.findall(r"[A-Za-zÇĞİÖŞÜçğıöşü0-9]{2,}", text)
    return len(words) >= 30


def extract_text(path: str) -> str:
    if not path or not os.path.exists(path):
        return ""

    ext = os.path.splitext(path)[1].lower()

    if ext == ".pdf":
        t1 = _extract_pdf_text_pdfplumber(path)
        if _looks_meaningful(t1):
            return t1

        t2 = _extract_pdf_text_pymupdf(path)
        if _looks_meaningful(t2):
            return t2

        return _extract_pdf_text_ocr(path)

    if ext == ".docx":
        return _extract_docx_text(path)

    try:
        with open(path, "r", encoding="utf-8", errors="ignore") as f:
            return f.read().strip()
    except Exception:
        return ""