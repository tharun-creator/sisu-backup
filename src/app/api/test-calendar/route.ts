import { createCalendarEvent } from "@/lib/google-calendar";
import { NextResponse } from "next/server";

export async function GET() {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: "Only available in development mode" }, { status: 403 });
  }

  const testAppt = {
    client: "Test User",
    email: "mohan@example.com", // You can change this to your email
    company: "Test Co",
    reason: "Integration Testing",
    date: new Date(Date.now() + 86400000).toLocaleDateString("en-US", { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
    time: "10:00 AM"
  };

  try {
    const result = await createCalendarEvent(testAppt);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || error }, { status: 500 });
  }
}
