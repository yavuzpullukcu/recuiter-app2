from fastapi import FastAPI, Form, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from typing import List
import os
from openai import OpenAI
import json

app = FastAPI()

# CORS (frontend bağlanabilsin diye)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# -------------------------
# AI Matching Fonksiyonu
# -------------------------

def ai_match(jd_text: str, cv_text: str):
    prompt = f"""
You are a technical recruiter.

Extract a clear list of requirements from the Job Description (skills, tools, years, domain items).
Evaluate the CV against each requirement.

Return ONLY valid JSON in this exact format:

{{
  "score": 0-100,
  "summary": "short summary",
  "confidence": 0.0-1.0,
  "requirements": [
    {{
      "requirement": "string",
      "status": "matched" or "missing",
      "evidence": "short quote from CV if matched, otherwise empty string",
      "notes": "short explanation"
    }}
  ]
}}

JOB DESCRIPTION:
{jd_text}

CV:
{cv_text}
"""

    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": "Return only raw JSON. No markdown. No extra text."},
            {"role": "user", "content": prompt}
        ],
        temperature=0.2
    )

    content = response.choices[0].message.content.strip()

    # 1) JSON parse
    try:
        result = json.loads(content)
    except Exception:
        print("AI RAW OUTPUT (parse failed):", content)
        result = {
            "score": 0,
            "summary": "AI JSON parse error",
            "confidence": 0,
            "requirements": []
        }

    # 2) Backward compatible fields for current UI
    reqs = result.get("requirements", [])
    result["matched_points"] = [r.get("requirement", "") for r in reqs if r.get("status") == "matched"]
    result["missing_points"] = [r.get("requirement", "") for r in reqs if r.get("status") == "missing"]

    return result

# -------------------------
# Multi CV Endpoint
# -------------------------

@app.post("/match-files")
async def match_files(
    jd_text: str = Form(...),
    cvs: List[UploadFile] = File(...)
):
    results = []

    for file in cvs:
        content = await file.read()
        text = content.decode("utf-8", errors="ignore")

        ai_result = ai_match(jd_text, text)

        # DEBUG (istersen kalsın)
        print("AI_RESULT_KEYS:", list(ai_result.keys()))
        print("REQ_LEN:", len(ai_result.get("requirements", [])))

        results.append({
            "filename": file.filename,
            **ai_result
        })

    return {"results": results}


# -------------------------
# Health Check
# -------------------------

@app.get("/")
def root():
    return {"status": "API çalışıyor"}