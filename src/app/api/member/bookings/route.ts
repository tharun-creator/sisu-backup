import { NextResponse } from "next/server";
import { getCurrentMember } from "@/lib/auth-helpers";
import { addAppointment } from "@/lib/storage";
import { buildRescheduleLog, reserveBestAvailableSlot } from "@/lib/scheduling";
import { formatAppointmentDate } from "@/lib/datetime";

export async function POST(req: Request) {
  const member = await getCurrentMember();

  if (!member) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!member.emailVerified) {
    return NextResponse.json(
      { error: "Please verify your email before booking." },
      { status: 403 },
    );
  }

  if (member.paymentStatus !== "paid") {
    return NextResponse.json(
      { error: "Complete the Rs.15,000 payment before booking a meeting." },
      { status: 403 },
    );
  }

  try {
    const body = await req.json();
    const reason = String(body.reason ?? "").trim();
    const date = String(body.date ?? "");
    const time = String(body.time ?? "");

    if (!reason || !date || !time) {
      return NextResponse.json(
        { error: "Reason, date, and time are required." },
        { status: 400 },
      );
    }

    const reservedSlot = await reserveBestAvailableSlot({ date, time });

    if (!reservedSlot) {
      return NextResponse.json(
        { error: "No available slot could be found right now." },
        { status: 409 },
      );
    }

    const logs = [
      {
        status: "pending",
        timestamp: new Date().toISOString(),
        note: "Booking created from member dashboard after payment verification.",
      },
    ];

    if (reservedSlot.rescheduled) {
      logs.push(
        buildRescheduleLog(
          reservedSlot.requested,
          reservedSlot.assigned,
          "Requested slot was already booked.",
        ),
      );
    }

    const appointment = {
      id: `appt-${Date.now()}`,
      memberId: member.id,
      client: member.name,
      company: member.company,
      email: member.email,
      reason,
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

    await addAppointment(appointment);

    return NextResponse.json({
      success: true,
      appointment,
      message: reservedSlot.rescheduled
        ? `Your requested slot was unavailable, so we moved you to ${formatAppointmentDate(
            reservedSlot.assigned.date,
          )} at ${reservedSlot.assigned.time}.`
        : `Meeting request submitted for ${formatAppointmentDate(
            reservedSlot.assigned.date,
          )} at ${reservedSlot.assigned.time}.`,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Booking failed." },
      { status: 500 },
    );
  }
}
