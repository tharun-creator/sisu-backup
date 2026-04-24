import { NextResponse } from "next/server";
import { loadAppointments, saveAppointments, addAppointment, updateAppointment, deleteAppointment, sendAppointmentEmail } from "@/lib/storage";
import { createCalendarEvent, deleteCalendarEvent } from "@/lib/google-calendar";

export async function GET() {
  try {
    const appts = await loadAppointments();
    // Sort by date and time
    const sorted = appts.sort((a: any, b: any) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return dateA - dateB;
    });
    return NextResponse.json(sorted);
  } catch (error) {
    console.error("Failed to fetch appointments:", error);
    return NextResponse.json({ error: "Failed to fetch appointments" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, id, client, company, email, reason, date, time } = body;

    if (action === "delete" || (!action && id && !client)) {
      const appts = await loadAppointments();
      const target = appts.find((a: any) => a.id === id);
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

    // New Appointment Creation
    if (client && email && date && time) {
      const appt = {
        id: `appt-${Date.now()}`,
        client,
        company: company || "N/A",
        email,
        reason: reason || "No reason provided",
        date,
        time,
        requested: new Date().toLocaleDateString("en-US", { day: 'numeric', month: 'short', year: 'numeric' }),
        status: "pending",
        calendarEventId: null,
        logs: [
          {
            status: "pending",
            timestamp: new Date().toISOString(),
            note: "Appointment request submitted via website form"
          }
        ]
      };
      
      await addAppointment(appt);
      
      return NextResponse.json({ success: true, id: appt.id });
    }

    return NextResponse.json({ error: "Invalid action or missing fields" }, { status: 400 });
  } catch (error) {
    console.error("Failed to process request:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { id, status } = body;
    const appts = await loadAppointments();

    const targetIndex = appts.findIndex((a: any) => a.id === id);
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
        // Send email first
        await sendAppointmentEmail(updatedAppt, 'accepted');
        
        // Push to Google Calendar
        console.log('=== Processing accepted appointment ===');
        console.log('Date:', updatedAppt.date);
        console.log('Time:', updatedAppt.time);
        
        const calendarResult = await createCalendarEvent({
          client: updatedAppt.client,
          email: updatedAppt.email,
          company: updatedAppt.company,
          reason: updatedAppt.reason,
          date: updatedAppt.date,
          time: updatedAppt.time
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
            warning: 'Appointment accepted but failed to add to Google Calendar',
            calendarError: calendarResult.error 
          });
        }
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
    console.error("Failed to update status:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
