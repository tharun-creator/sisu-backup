import { NextResponse } from "next/server";
import {
  deleteAppointment,
  loadAppointments,
  sendAppointmentEmail,
  updateAppointment,
} from "@/lib/storage";
import { createCalendarEvent, deleteCalendarEvent } from "@/lib/google-calendar";
import { compareAppointmentSlots, formatAppointmentDate } from "@/lib/datetime";
import { buildRescheduleLog, reserveBestAvailableSlot } from "@/lib/scheduling";
import type { Appointment } from "@/lib/storage";
import { requireAdmin } from "@/lib/auth-helpers";

export async function GET() {
  try {
    await requireAdmin();
    const appts = await loadAppointments();
    const sorted = [...appts].sort(compareAppointmentSlots);
    return NextResponse.json(sorted);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Failed to fetch appointments:", error);
    return NextResponse.json({ error: "Failed to fetch appointments" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await requireAdmin();
    const body = await req.json();
    const { action, id, client } = body;

    if (action === "delete" || (!action && id && !client)) {
      const appts = await loadAppointments();
      const target = appts.find((a: Appointment) => a.id === id);
      if (target && target.email) {
        await sendAppointmentEmail(target, 'declined');
      }
      // Delete from Google Calendar if exists
      if (target?.calendarEventId) {
        await deleteCalendarEvent(target.calendarEventId);
      }
      await deleteAppointment(id);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid action or missing fields" }, { status: 400 });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Failed to process request:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    await requireAdmin();
    const body = await req.json();
    const { id, status } = body;
    const appts = await loadAppointments();

    const targetIndex = appts.findIndex((a: Appointment) => a.id === id);
    if (targetIndex !== -1) {
      const oldStatus = appts[targetIndex].status;
      const newLog = {
        status,
        timestamp: new Date().toISOString(),
        note: `Status changed from ${oldStatus} to ${status}`
      };
      
      const updatedAppt = { 
        ...appts[targetIndex], 
        status,
        logs: [...(appts[targetIndex].logs || []), newLog]
      };
      
      // Update in database
      await updateAppointment(id, { status, logs: updatedAppt.logs });

      if (status === 'accepted') {
        const reservedSlot = await reserveBestAvailableSlot(
          { date: updatedAppt.date, time: updatedAppt.time },
          { excludeAppointmentId: id },
        );

        if (!reservedSlot) {
          return NextResponse.json(
            { error: "No alternative slots are available to accept this appointment." },
            { status: 409 },
          );
        }

        let finalAppointment = updatedAppt;

        if (reservedSlot.rescheduled) {
          const rescheduleLog = buildRescheduleLog(
            { date: updatedAppt.date, time: updatedAppt.time },
            reservedSlot.assigned,
            "Requested slot conflicted with another booking.",
          );
          finalAppointment = {
            ...updatedAppt,
            date: reservedSlot.assigned.date,
            time: reservedSlot.assigned.time,
            logs: [...updatedAppt.logs, rescheduleLog],
          };
          await updateAppointment(id, {
            date: finalAppointment.date,
            time: finalAppointment.time,
            logs: finalAppointment.logs,
          });
          await sendAppointmentEmail(finalAppointment, "rescheduled");
        } else {
          await sendAppointmentEmail(finalAppointment, "accepted");
        }

        const calendarResult = await createCalendarEvent({
          client: finalAppointment.client,
          email: finalAppointment.email,
          company: finalAppointment.company,
          reason: finalAppointment.reason,
          date: finalAppointment.date,
          time: finalAppointment.time
        });

        if (calendarResult.success && calendarResult.data?.id) {
          // Store the calendar event ID
          await updateAppointment(id, { calendarEventId: calendarResult.data.id });
          console.log(' Calendar event ID stored:', calendarResult.data.id);
        } else {
          console.error(' Failed to create calendar event:', calendarResult.error);
          // Still return success but include warning
          return NextResponse.json({ 
            success: true, 
            rescheduled: reservedSlot.rescheduled,
            scheduledFor: `${formatAppointmentDate(finalAppointment.date)} at ${finalAppointment.time}`,
            warning: 'Appointment accepted but failed to add to Google Calendar',
            calendarError: calendarResult.error 
          });
        }

        return NextResponse.json({
          success: true,
          rescheduled: reservedSlot.rescheduled,
          scheduledFor: `${formatAppointmentDate(finalAppointment.date)} at ${finalAppointment.time}`,
        });
      } else if (status === 'cancelled' || status === 'declined') {
        await sendAppointmentEmail(updatedAppt, 'declined');
        
        // Delete from Google Calendar if exists
        if (updatedAppt.calendarEventId) {
          await deleteCalendarEvent(updatedAppt.calendarEventId);
        }
      }

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Failed to update status:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
