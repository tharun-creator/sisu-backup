import { NextResponse } from "next/server";
import { formatAppointmentDate } from "@/lib/datetime";
import { getPythonChatReply } from "@/lib/python-chat";
import { addAppointment } from "@/lib/storage";
import { buildRescheduleLog, reserveBestAvailableSlot } from "@/lib/scheduling";

export const runtime = "nodejs";

type SessionState = {
  step: "name" | "company" | "email" | "reason" | "slot" | null;
  history: { role: "user" | "model"; parts: { text: string }[] }[];
  name?: string;
  company?: string;
  email?: string;
  reason?: string;
};

const sessions: Record<string, SessionState> = {};

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
      sessions[sessionId] = { step: null, history: [] };
    }

    const state = sessions[sessionId];
    let reply = "";

    if (detectBookingIntent(message) || state.step) {
      const step = state.step;

      if (!step) {
        state.step = "name";
        reply =
          "I will help you set up a session with RATS.\nFirst, could I get your full name?";
      } else if (step === "name") {
        state.name = message.trim();
        state.step = "company";
        reply = `Nice to meet you, ${state.name}.\nWhat is the name of your company or venture?`;
      } else if (step === "company") {
        state.company = message.trim();
        state.step = "email";
        reply =
          "What is your best email address? RATS will use this to send you a confirmation and session details.";
      } else if (step === "email") {
        const emailInput = message.trim();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!emailRegex.test(emailInput)) {
          reply =
            "That doesn't look like a valid email address. Could you please provide a valid email (e.g., john@example.com)?";
          state.step = "email";
        } else {
          state.email = emailInput;
          state.step = "reason";
          reply =
            "Got it. Briefly, what would you like to discuss with RATS?\n(E.g., scaling challenges, team systems, revenue goals, etc.)";
        }
      } else if (step === "reason") {
        state.reason = message.trim();
        state.step = "slot";
        return NextResponse.json({
          reply:
            "Got it. When would you like to meet with RATS? Please select a date and time from the calendar below.",
          type: "date-picker",
        });
      } else if (step === "slot") {
        const finalSlot = selectedSlot;

        if (!finalSlot?.date || !finalSlot?.time) {
          reply = "Please select a date and time from the calendar to continue.";
        } else {
          try {
            if (!state.name || !state.company || !state.email || !state.reason) {
              return NextResponse.json(
                { error: "Booking details were incomplete. Please start again." },
                { status: 400 },
              );
            }

            const reservedSlot = await reserveBestAvailableSlot({
              date: finalSlot.date,
              time: finalSlot.time,
            });

            if (!reservedSlot) {
              return NextResponse.json(
                {
                  error:
                    "That slot is no longer available and there are no alternatives right now. Please try again later.",
                },
                { status: 409 },
              );
            }

            const logs = [
              {
                status: "pending",
                timestamp: new Date().toISOString(),
                note: "Appointment request submitted via chat",
              },
            ];

            if (reservedSlot.rescheduled) {
              logs.push(
                buildRescheduleLog(
                  reservedSlot.requested,
                  reservedSlot.assigned,
                  "The selected slot was already booked.",
                ),
              );
            }

            const appt = {
              id: `appt-${Date.now()}`,
              client: state.name,
              company: state.company,
              email: state.email,
              reason: state.reason,
              date: reservedSlot.assigned.date,
              time: reservedSlot.assigned.time,
              requested: new Date().toLocaleDateString("en-US", {
                day: "numeric",
                month: "short",
                year: "numeric",
              }),
              status: "pending",
              calendarEventId: null,
              logs,
            };

            await addAppointment(appt);
            state.step = null;

            if (reservedSlot.rescheduled) {
              reply = `That exact slot was already taken, so I reserved the next open time for you.\n\nUpdated slot: ${formatAppointmentDate(
                reservedSlot.assigned.date,
              )} at ${reservedSlot.assigned.time}\n\nRATS will review and confirm via email shortly.`;
            } else {
              reply = `Done. Your meeting request has been sent to RATS.\n\nProposed: ${formatAppointmentDate(
                reservedSlot.assigned.date,
              )} at ${reservedSlot.assigned.time}\n\nRATS will review and confirm via email shortly. You will hear back within 24 hours.`;
            }
          } catch (error) {
            console.error("Error saving appointment:", error);
            return NextResponse.json(
              { error: "Could not save appointment. Please try again." },
              { status: 500 },
            );
          }
        }
      }

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
