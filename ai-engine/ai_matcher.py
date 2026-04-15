import json
from typing import Any, Dict, List
from openai import OpenAI

client = OpenAI()

SYSTEM_INSTRUCTIONS = """
You are an expert technical recruiter.

IMPORTANT:
- Return ONLY valid JSON.
- No markdown, no explanation outside JSON.
- Use ONLY the provided JD and CV content.
- If CV is empty/unreadable, clearly say so.

OUTPUT RULES:

1) "summary"
- Detailed, executive-style explanation.
- Minimum 80 words (Turkish) or 60 words (English/German).
- 3 short paragraphs OR structured bullets.
- Must explain overall evaluation.

2) "summary_sections"
Structured analysis:

{
  "role_fit": "1-2 sentence evaluation",
  "strong_evidence": ["max 3 strong evidences with short quote"],
  "key_gaps": ["max 3 critical missing or weak areas"],
  "next_steps": ["2-3 actionable recommendations"]
}

Be concrete and evidence-based.
"""

def _safe_json_loads(s: str) -> Dict[str, Any]:
    s = (s or "").strip()
    if "{" in s and "}" in s:
        s = s[s.find("{"): s.rfind("}") + 1]
    return json.loads(s)


def ai_match(jd_text: str, cv_text: str) -> Dict[str, Any]:
    prompt = f"""
Extract clear requirements from the Job Description.
Evaluate the CV against each requirement.

CRITICAL EVALUATION RULE (STRICT):
- If the candidate's experience with a requirement is superficial, basic, only theoretical, or lacks strong practical depth, you MUST mark its "status" as "missing" (NOT "matched"). 
- Do not be generous. Only mark as "matched" if there is solid, practical evidence in the CV.
- Explain any weaknesses in the "notes" field.

Return ONLY JSON in this schema:

{{
  "score": 0-100,
  "summary": "detailed executive explanation",
  "summary_sections": {{
      "role_fit": "string",
      "strong_evidence": ["string"],
      "key_gaps": ["string"],
      "next_steps": ["string"]
  }},
  "confidence": 0.0-1.0,
  "requirements": [
    {{
      "requirement": "string",
      "status": "matched" or "missing",
      "evidence": "short quote from CV",
      "notes": "short explanation"
    }}
  ]
}}

Scoring:
- Reflect real evidence strength. Penalize missing or weak skills heavily.
- Empty JD or CV → very low score (0-10).

JD:
\"\"\"{jd_text}\"\"\"

CV:
\"\"\"{cv_text}\"\"\"
"""

    try:
        resp = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": SYSTEM_INSTRUCTIONS},
                {"role": "user", "content": prompt},
            ],
        )

        data = _safe_json_loads(resp.choices[0].message.content)

    except Exception as e:
        return {
            "error": "openai_request_failed",
            "detail": str(e),
            "score": 0,
            "summary": "AI değerlendirmesi yapılamadı.",
            "summary_sections": {
                "role_fit": "",
                "strong_evidence": [],
                "key_gaps": [],
                "next_steps": [],
            },
            "confidence": 0.0,
            "requirements": [],
            "matched_points": [],
            "missing_points": [],
        }

    reqs: List[Dict[str, Any]] = data.get("requirements", []) or []

    data["matched_points"] = [
        r.get("requirement", "") for r in reqs if r.get("status") == "matched"
    ]

    data["missing_points"] = [
        r.get("requirement", "") for r in reqs if r.get("status") == "missing"
    ]

    # Safety normalize
    data["score"] = int(max(0, min(100, float(data.get("score", 0)))))
    data["confidence"] = float(max(0.0, min(1.0, float(data.get("confidence", 0.5)))))

    data.setdefault("summary", "")
    data.setdefault("summary_sections", {
        "role_fit": "",
        "strong_evidence": [],
        "key_gaps": [],
        "next_steps": []
    })
    data.setdefault("requirements", [])

    return data