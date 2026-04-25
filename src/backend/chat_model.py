import json
import os
import pathlib
import sys
import urllib.error
import urllib.request

SYSTEM_INSTRUCTION = """You are SISU's intelligent client concierge - a warm,
professional assistant for the SISU Mentorship Program led by RATS (the mentor).

ABOUT SISU
SISU is a premium 1-on-1 mentorship program built for entrepreneurs serious
about long-term company growth.

PRICING
- Rs.15,000 per month
- Includes 2 sittings (1-on-1 sessions) with RATS per month
- This is a 12-month program (annual commitment)
- Total investment: Rs.1,80,000 for the full year

YOUR ROLE
- Answer questions about SISU warmly and confidently.
- Keep responses concise, human, and helpful.
- Encourage booking when the user is a strong fit.
- Do not discuss competitors or make comparisons.

TONE
Professional, warm, and motivating.
"""


def read_payload():
    raw = sys.stdin.read()
    if not raw.strip():
        return {}
    return json.loads(raw)


def load_dotenv():
    env_path = pathlib.Path.cwd() / ".env.local"
    if not env_path.exists():
        return

    for raw_line in env_path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip())


def build_contents(history, message):
    contents = []
    for item in history or []:
        role = item.get("role", "user")
        parts = item.get("parts", [])
        text = ""
        if parts and isinstance(parts, list):
            first = parts[0]
            if isinstance(first, dict):
                text = first.get("text", "")
        if text:
            contents.append(
                {
                    "role": "model" if role == "model" else "user",
                    "parts": [{"text": text}],
                }
            )

    contents.append({"role": "user", "parts": [{"text": message}]})
    return contents


def fallback_reply(message):
    lowered = (message or "").lower()
    if "price" in lowered or "cost" in lowered or "fee" in lowered:
        return (
            "SISU is Rs.15,000 per month for a 12-month commitment. "
            "That includes 2 one-on-one sittings with RATS each month."
        )
    if "book" in lowered or "appointment" in lowered or "schedule" in lowered:
        return "I can help with that. Share a few details and we will line up a good slot with RATS."
    return (
        "I can help with SISU program details, pricing, and booking a session with RATS. "
        "Tell me what you would like to know."
    )


def main():
    load_dotenv()
    payload = read_payload()
    message = payload.get("message", "")
    history = payload.get("history", [])
    api_key = os.getenv("GEMINI_API_KEY", "").strip()

    if not api_key:
        print(json.dumps({"reply": fallback_reply(message)}))
        return

    body = json.dumps(
        {
            "systemInstruction": {"parts": [{"text": SYSTEM_INSTRUCTION}]},
            "contents": build_contents(history, message),
            "generationConfig": {
                "temperature": 0.7,
                "topP": 0.9,
                "maxOutputTokens": 400,
            },
        }
    ).encode("utf-8")

    request = urllib.request.Request(
        f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={api_key}",
        data=body,
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            result = json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        error_body = exc.read().decode("utf-8", errors="ignore")
        print(
            json.dumps(
                {
                    "reply": fallback_reply(message),
                    "warning": f"Gemini HTTP {exc.code}",
                    "details": error_body,
                }
            )
        )
        return
    except Exception as exc:
        print(json.dumps({"reply": fallback_reply(message), "warning": str(exc)}))
        return

    candidates = result.get("candidates") or []
    if not candidates:
        print(json.dumps({"reply": fallback_reply(message)}))
        return

    parts = candidates[0].get("content", {}).get("parts", [])
    reply = "\n".join(part.get("text", "") for part in parts if isinstance(part, dict)).strip()
    print(json.dumps({"reply": reply or fallback_reply(message)}))


if __name__ == "__main__":
    main()
