import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";
import { addAppointment, loadAppointments } from "@/lib/storage";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

const SYSTEM_INSTRUCTION = `You are SISU's intelligent client concierge — a warm, 
professional assistant for the SISU Mentorship Program led by RATS (the mentor). 

ABOUT SISU 
SISU is a premium 1-on-1 mentorship program built for entrepreneurs serious 
about long-term company growth. Here is how it works: 

1. RATS conducts 1-on-1 mentorship sessions with the client. 
2. RATS provides an eagle-eye perspective — seeing what founders often miss. 
3. Goals are set by the entrepreneur themselves; RATS guides execution. 
4. RATS works on important business aspects alongside the client if needed. 
5. RATS can meet the client's team when required. 
6. SISU is a one-year commitment — built to develop systems and achieve 
   sustainable, long-term results for both the entrepreneur and their company. 

PRICING 
- Rs.15,000 per month 
- Includes 2 sittings (1-on-1 sessions) with RATS per month 
- This is a 12-month program (annual commitment) 
- Total investment: Rs.1,80,000 for the full year 

YOUR ROLE 
- Answer questions about SISU warmly and confidently. 
- Help clients understand the value of the program. 
- When a client wants to book an appointment, collect: 
    1. Their full name 
    2. Their company name 
    3. Their email address
    4. A brief reason / what they want to discuss 
  Then say you will suggest available slots. 
- When the user says anything like "book appointment", "schedule a session", 
  "I want to meet", "set up a call" — enter booking flow. 
- Be concise, human, and encouraging. Never be robotic. 
- If asked about RATS personally, say RATS is an experienced business mentor 
  with deep expertise in helping entrepreneurs build scalable systems. 
- Do not discuss competitors or make comparisons. 

TONE 
Professional, warm, and motivating. Like a knowledgeable friend who wants 
you to succeed. Keep responses short and punchy unless explaining the program. 
`;

const sessions: Record<string, any> = {};

async function generateSlots() {
  const slots = [];
  let base = new Date();
  base.setDate(base.getDate() + 1); // Start tomorrow

  // Load existing appointments to check for conflicts
  const existingAppts = await loadAppointments();

  let count = 0;
  while (count < 3) {
    if (base.getDay() !== 0 && base.getDay() !== 6) { // Weekdays
      const slotTimes = ["10:00 AM", "2:00 PM", "4:30 PM"];
      const slotTime = slotTimes[count % 3];
      // Use ISO format for reliable parsing
      const isoDate = base.toISOString().split('T')[0];
      // Also create display format for user
      const displayDate = base.toLocaleDateString("en-US", { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

      // Check if this slot conflicts with any existing appointment (compare ISO dates)
      const conflict = existingAppts.some((appt: any) =>
        appt.date === isoDate && appt.time === slotTime && (appt.status === 'pending' || appt.status === 'accepted')
      );

      if (!conflict) {
        slots.push({
          date: isoDate,
          displayDate: displayDate,
          time: slotTime,
          id: count + 1
        });
        count += 1;
      }
    }
    base.setDate(base.getDate() + 1);
  }
  return slots;
}

function detectBookingIntent(text: string) {
  const keywords = ["book", "appointment", "schedule", "session", "meet", "sitting", "call", "slot", "reserve"];
  return keywords.some(k => text.toLowerCase().includes(k));
}

export async function POST(req: Request) {
  try {
    const { message, sessionId = "default", selectedSlot } = await req.json();

    if (!sessions[sessionId]) {
      sessions[sessionId] = { step: null, history: [] };
    }

    const state = sessions[sessionId];
    let reply = "";

    // Booking Flow
    if (detectBookingIntent(message) || state.step) {
      const step = state.step;

      if (!step) {
        state.step = "name";
        reply = "I will help you set up a session with RATS.\nFirst, could I get your full name?";
      } else if (step === "name") {
        state.name = message.trim();
        state.step = "company";
        reply = `Nice to meet you, ${state.name}.\nWhat is the name of your company or venture?`;
      } else if (step === "company") {
        state.company = message.trim();
        state.step = "email";
        reply = "What is your best email address? RATS will use this to send you a confirmation and session details.";
      } else if (step === "email") {
        const emailInput = message.trim();
        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(emailInput)) {
          reply = "That doesn't look like a valid email address. Could you please provide a valid email (e.g., john@example.com)?";
          state.step = "email"; // Stay on email step
        } else {
          state.email = emailInput;
          state.step = "reason";
          reply = "Got it. Briefly, what would you like to discuss with RATS?\n(E.g., scaling challenges, team systems, revenue goals, etc.)";
        }
      } else if (step === "reason") {
        state.reason = message.trim();
        state.step = "slot";
        return NextResponse.json({
          reply: "Got it. When would you like to meet with RATS? Please select a date and time from the calendar below.",
          type: "date-picker"
        });
      } else if (step === "slot") {
        const finalSlot = selectedSlot || (state.slots && state.slots.find((s: any) => String(s.id) === message.trim()));

        if (!finalSlot) {
          reply = "Please select a date and time from the calendar to continue.";
        } else {
          try {
            // Format date for display (ISO "2026-04-29" -> "Wednesday, April 29, 2026")
            const displayDate = new Date(finalSlot.date + 'T12:00:00').toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            });
            
            const appt = {
              id: `appt-${Date.now()}`,
              client: state.name,
              company: state.company,
              email: state.email,
              reason: state.reason,
              date: finalSlot.date, // Store ISO format for reliable calendar parsing
              time: finalSlot.time,
              requested: new Date().toLocaleDateString("en-US", { day: 'numeric', month: 'short', year: 'numeric' }),
              status: "pending",
              logs: [
                {
                  status: "pending",
                  timestamp: new Date().toISOString(),
                  note: "Appointment request submitted via chat"
                }
              ]
            };
            await addAppointment(appt);
            state.step = null;
            reply = `Done. Your meeting request has been sent to RATS.\n\nProposed: ${displayDate} at ${finalSlot.time}\n\nRATS will review and confirm via email shortly. You will hear back within 24 hours.`;
          } catch (e) {
            console.error("Error saving appointment:", e);
            return NextResponse.json({ error: "Could not save appointment. Please try again." }, { status: 500 });
          }
        }
      }

      state.history.push({ role: "user", parts: [{ text: message }] });
      state.history.push({ role: "model", parts: [{ text: reply }] });
      return NextResponse.json({ reply });
    }

    // Default Chat
    try {
      const model = genAI.getGenerativeModel({
        model: "gemini-1.5-flash",
        systemInstruction: SYSTEM_INSTRUCTION
      });

      const chat = model.startChat({ history: state.history });
      const result = await chat.sendMessage(message);
      const response = await result.response;
      const text = response.text();

      state.history.push({ role: "user", parts: [{ text: message }] });
      state.history.push({ role: "model", parts: [{ text }] });

      return NextResponse.json({ reply: text });
    } catch (e: any) {
      console.error("Gemini AI Error:", e);
      if (e.message?.includes("API_KEY_INVALID")) {
        return NextResponse.json({ error: "Invalid API Key. Please check your .env.local file." }, { status: 401 });
      }
      return NextResponse.json({ error: "I'm having trouble thinking right now. Please try again in a moment." }, { status: 500 });
    }

  } catch (error) {
    console.error("Request Processing Error:", error);
    return NextResponse.json({ error: "Failed to process message" }, { status: 500 });
  }
}
