from fastapi import FastAPI, Request, UploadFile, File, Form
from fastapi.responses import JSONResponse, HTMLResponse
from fastapi.templating import Jinja2Templates
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Optional

from ai_matcher import ai_match
from parsing import extract_text, normalize_text
from storage import save_file

app = FastAPI(title="Body Leasing - AI CV Matcher")
templates = Jinja2Templates(directory="templates")

# CORS: Next.js (localhost:3000) erişebilsin
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def enrich_explanations(result: dict, language: str = "tr") -> dict:
    reqs = result.get("requirements") or []
    matched = [r for r in reqs if r.get("status") == "matched"]
    missing = [r for r in reqs if r.get("status") == "missing"]

    strengths: List[str] = []
    risk_areas: List[str] = []
    interview_questions: List[dict] = []
    recommendations: List[str] = []

    def T(tr_text: str, de_text: str) -> str:
        return de_text if language == "de" else tr_text

    def _is_weak_match(notes: str) -> bool:
        n = (notes or "").lower()
        weak_keywords = ["basic", "limited", "some exposure", "exposure", "familiar", "beginner"]
        return any(k in n for k in weak_keywords)

    for r in matched[:10]:
        name = (r.get("requirement") or "").strip()
        if not name:
            continue

        ev = (r.get("evidence") or "").strip()
        notes = (r.get("notes") or "").strip()

        if ev:
            strengths.append(
                T(
                    f'{name}: CV’de kanıt var (“{ev}”).',
                    f'{name}: Nachweis im Lebenslauf vorhanden („{ev}“).',
                )
            )
        else:
            strengths.append(T(f"{name}: eşleşti.", f"{name}: erfüllt."))

        if _is_weak_match(notes):
            risk_areas.append(
                T(
                    f"{name}: seviye sınırlı görünüyor ({notes}).",
                    f"{name}: Niveau wirkt begrenzt ({notes}).",
                )
            )
            interview_questions.append(
                {
                    "topic": name,
                    "question": T(
                        f"{name} konusunda son projende tam olarak ne yaptın? Prod ortamda kullandın mı? Somut örnek verebilir misin?",
                        f"Haben Sie {name} produktiv eingesetzt? Was genau haben Sie im letzten Projekt gemacht? Können Sie ein konkretes Beispiel geben?",
                    ),
                }
            )
            recommendations.append(
                T(
                    f"{name} için 1 somut proje örneği + 1 metrik ekle (örn: teslim süresi, performans, ölçek).",
                    f"Für {name} 1 konkretes Projektbeispiel + 1 Kennzahl ergänzen (z.B. Durchlaufzeit, Performance, Skalierung).",
                )
            )

    for r in missing[:10]:
        name = (r.get("requirement") or "").strip()
        if not name:
            continue

        risk_areas.append(T(f"{name}: CV’de görünmüyor.", f"{name}: Im Lebenslauf nicht ersichtlich."))
        interview_questions.append(
            {
                "topic": name,
                "question": T(
                    f"{name} deneyimin var mı? Varsa son projede hangi sorumluluğu aldın?",
                    f"Haben Sie Erfahrung mit {name}? Falls ja: Welche Verantwortung hatten Sie im letzten Projekt?",
                ),
            }
        )
        recommendations.append(
            T(
                f"{name} ile ilgili deneyim varsa CV’ye 1–2 cümle kanıt ekle (teknoloji adı + görev + sonuç).",
                f"Falls Erfahrung mit {name} vorhanden: 1–2 Sätze als Nachweis in den CV ergänzen (Technologie + Aufgabe + Ergebnis).",
            )
        )

    if missing:
        recommendations.append(
            T(
                "Eksik görünen maddeler için GitHub/Case Study/Proje linki eklemek skoru hızlı yükseltir.",
                "Für fehlende Punkte: GitHub/Case Study/Projekt-Links ergänzen, um den Score schnell zu erhöhen.",
            )
        )

    has_perf = any("perform" in (r.get("requirement") or "").lower() for r in reqs)
    if not has_perf:
        recommendations.append(
            T(
                "Performans/optimizasyon örneği ekle (örn: latency %X düştü, throughput %Y arttı, maliyet %Z azaldı).",
                "Ein Performance/Optimierungsbeispiel ergänzen (z.B. Latenz -%X, Durchsatz +%Y, Kosten -%Z).",
            )
        )

    score = float(result.get("score") or 0)
    if score >= 80:
        role_fit = "strong"
    elif score >= 50:
        role_fit = "medium"
    else:
        role_fit = "weak"

    result["strengths"] = strengths
    result["risk_areas"] = risk_areas
    result["interview_questions"] = interview_questions
    result["recommendations"] = recommendations
    result["role_fit"] = role_fit
    return result


@app.get("/", response_class=HTMLResponse)
def home(request: Request):
    return templates.TemplateResponse(request, "index.html", {"results": None})


@app.post("/ai-match")
def ai_match_endpoint(
    jd_text: str = Form(...),
    cv_text: str = Form(...),
    language: str = Form("tr"),
):
    result = ai_match(jd_text=jd_text, cv_text=cv_text)
    result = enrich_explanations(result, language)
    return JSONResponse(result)


@app.post("/match-ui", response_class=HTMLResponse)
async def match_ui(
    request: Request,
    cvs: List[UploadFile] = File(...),
    jd_text: str = Form(""),
    jd_file: Optional[UploadFile] = File(None),
    language: str = Form("tr"),
):
    jd_final = (jd_text or "").strip()

    if (not jd_final) and jd_file is not None:
        jd_bytes = await jd_file.read()
        jd_path = save_file(jd_bytes, jd_file.filename or "jd")
        jd_final = extract_text(jd_path)

    jd_final = normalize_text(jd_final)

    results = []
    for cv in cvs:
        cv_bytes = await cv.read()
        cv_path = save_file(cv_bytes, cv.filename or "cv")

        cv_raw = extract_text(cv_path)
        cv_text = normalize_text(cv_raw)

        res = ai_match(jd_text=jd_final, cv_text=cv_text)

        item = {
            "filename": cv.filename,
            "score": res.get("score", 0),
            "matched_points": res.get("matched_points", []),
            "missing_points": res.get("missing_points", []),
            "summary": res.get("summary", ""),
            "confidence": res.get("confidence", 0.0),
            "requirements": res.get("requirements", []),
            "error": res.get("error"),
            "detail": res.get("detail"),
        }

        item = enrich_explanations(item, language)
        results.append(item)

    results.sort(key=lambda x: x.get("score", 0), reverse=True)

    return templates.TemplateResponse(
    request,
    "index.html",
    {"results": results, "language": language},
)