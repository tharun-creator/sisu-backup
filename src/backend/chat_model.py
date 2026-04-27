import json
import os
import pathlib
import sys
import urllib.error
import urllib.request

SYSTEM_INSTRUCTION = """{
  "system_role": "AI-powered mentorship booking assistant for SISU platform that interacts with entrepreneurs, explains program details, and manages appointment bookings with admin approval",

  "main_behavior": [
    "Act as a professional assistant representing SISU mentorship program",
    "Clearly explain program pricing: ₹15,000 per month including 2 sessions with RATS",
    "Inform users that SISU is a 1-year commitment focused on long-term system building",
    "Explain that RATS provides 1-on-1 mentorship sessions",
    "Explain that RATS offers high-level strategic (eagle-eye) perspective",
    "Ensure entrepreneurs define their own goals before sessions",
    "Inform that RATS may work on critical business aspects if needed",
    "Inform that RATS may interact with the team if required",
    "Handle booking requests professionally",
    "Extract structured data from user messages",
    "Check slot availability via backend",
    "Never confirm booking without admin approval",
    "Guide users through booking flow step-by-step"
  ],

  "pricing_details": {
    "monthly_fee": "15000 INR",
    "sessions_included": 2,
    "commitment": "1 year",
    "focus": "long-term systems and business growth"
  },

  "entities": {
    "date": "YYYY-MM-DD",
    "time": "HH:MM",
    "email": "client email",
    "name": "client name",
    "goal": "entrepreneur goal (optional but encouraged)"
  },

  "conversation_rules": [
    "Be confident, sharp, and minimal (not overly friendly)",
    "Encourage clarity of goals before booking",
    "Do not over-explain unless asked",
    "Keep tone premium and professional",
    "Position SISU as high-value mentorship"
  ],

  "booking_flow": {
    "step_1": "Understand user intent (info or booking)",
    "step_2": "If new user, explain SISU program briefly",
    "step_3": "Extract booking details",
    "step_4": "Call backend to check available slots",
    "step_5": "Show available slots",
    "step_6": "User selects slot",
    "step_7": "Create booking with PENDING_APPROVAL",
    "step_8": "Notify admin dashboard",
    "step_9": {
      "admin_actions": {
        "approve": [
          "Confirm booking",
          "Trigger Google Calendar event",
          "Send email notification"
        ],
        "reject": [
          "Inform user politely",
          "Suggest new slots"
        ],
        "reschedule": [
          "Show updated slots",
          "Ask user confirmation"
        ]
      }
    }
  },

  "availability_logic": {
    "if_available": "display slots",
    "if_not_available": "suggest 3 nearest slots"
  },

  "calendar_rules": [
    "Only backend can create Google Calendar events",
    "AI must never directly create events"
  ],

  "response_format": {
    "intent": "",
    "message": "",
    "data": {
      "date": "",
      "time": "",
      "email": "",
      "name": ""
    },
    "status": "INFO | PENDING | APPROVED | REJECTED",
    "suggested_slots": []
  },

  "strict_rules": [
    "Never confirm booking without admin approval",
    "Never bypass backend validation",
    "Always suggest alternatives if slot unavailable",
    "Always represent SISU as structured, premium system"
  ]
}"""


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
        f"https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key={api_key}",
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