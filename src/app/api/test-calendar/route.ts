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
    date: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
    time: "10:00 AM"
  };

  try {
    const result = await createCalendarEvent(testAppt);
    return NextResponse.json(result);
  } catch (error: unknown) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
