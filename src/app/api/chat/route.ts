import { NextResponse } from "next/server";
import { getPythonChatReply } from "@/lib/python-chat";

export const runtime = "nodejs";
const sessions: Record<
  string,
  { history: { role: "user" | "model"; parts: { text: string }[] }[] }
> = {};

function detectBookingIntent(text: string) {
  const keywords = [
    "book",
    "appointment",
    "schedule",
    "session",
    "meet",
    "sitting",
    "call",
    "slot",
    "reserve",
  ];
  return keywords.some((keyword) => text.toLowerCase().includes(keyword));
}

export async function POST(req: Request) {
  try {
    const { message, sessionId = "default", selectedSlot } = await req.json();

    if (!sessions[sessionId]) {
      sessions[sessionId] = { history: [] };
    }

    const state = sessions[sessionId];

    if (detectBookingIntent(message) || selectedSlot) {
      const reply =
        "Direct booking is now available through the SISU member dashboard.\n\nCreate or sign in to your verified member account, complete the Rs.15,000 payment, and then you can book a meeting with RATS without filling your details again.";
      state.history.push({ role: "user", parts: [{ text: message }] });
      state.history.push({ role: "model", parts: [{ text: reply }] });
      return NextResponse.json({ reply });
    }

    try {
      const result = await getPythonChatReply({
        message,
        history: state.history,
      });

      const text = result.reply;
      state.history.push({ role: "user", parts: [{ text: message }] });
      state.history.push({ role: "model", parts: [{ text }] });

      return NextResponse.json({ reply: text });
    } catch (error: unknown) {
      console.error("Python AI Error:", error);
      return NextResponse.json(
        {
          error:
            "I'm having trouble thinking right now. Please try again in a moment.",
          details: error instanceof Error ? error.message : String(error),
        },
        { status: 500 },
      );
    }
  } catch (error) {
    console.error("Request Processing Error:", error);
    return NextResponse.json({ error: "Failed to process message" }, { status: 500 });
  }
}
