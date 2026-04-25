import { google } from 'googleapis';
import {
  APPOINTMENT_SLOT_TIMES,
  APPOINTMENT_TIME_ZONE,
  buildCalendarDateTime,
  parseTimeLabel,
} from "@/lib/datetime";

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000'
);

// Set credentials with refresh token
oauth2Client.setCredentials({
  refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
});

// Function to get authenticated calendar client with token refresh
async function getCalendarClient() {
  // Check if credentials are set
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET || !process.env.GOOGLE_REFRESH_TOKEN) {
    throw new Error('Missing Google Calendar environment variables');
  }

  // Check if token needs refresh
  const credentials = oauth2Client.credentials;
  if (credentials && credentials.expiry_date && credentials.expiry_date < Date.now()) {
    console.log(' Refreshing access token...');
    try {
      const { credentials: newCredentials } = await oauth2Client.refreshAccessToken();
      oauth2Client.setCredentials(newCredentials);
      console.log(' Token refreshed successfully');
    } catch (refreshError: unknown) {
      console.error(
        ' Failed to refresh token:',
        refreshError instanceof Error ? refreshError.message : String(refreshError),
      );
      throw new Error('Failed to refresh Google token. Please re-authenticate.');
    }
  }

  return google.calendar({ version: 'v3', auth: oauth2Client });
}

/**
 * Validate email address
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function buildOffsetDateTime(date: string, time: string, durationMinutes = 0) {
  const { hours, minutes } = parseTimeLabel(time);
  const utcMillis = Date.UTC(
    Number.parseInt(date.slice(0, 4), 10),
    Number.parseInt(date.slice(5, 7), 10) - 1,
    Number.parseInt(date.slice(8, 10), 10),
    hours - 5,
    minutes - 30 + durationMinutes,
    0,
    0,
  );
  const end = new Date(utcMillis);
  const local = new Date(end.getTime() + 5.5 * 60 * 60 * 1000);
  const localDate = local.toISOString().slice(0, 10);
  const localTime = local.toISOString().slice(11, 19);

  return {
    dateTime: `${localDate}T${localTime}+05:30`,
    timeZone: APPOINTMENT_TIME_ZONE,
  };
}

export async function createCalendarEvent(appt: {
  client: string;
  email: string;
  company: string;
  reason: string;
  date: string;
  time: string;
}) {
  console.log('=== Creating Google Calendar Event ===');
  console.log('Client:', appt.client);
  console.log('Date:', appt.date);
  console.log('Time:', appt.time);

  // Check environment variables
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET || !process.env.GOOGLE_REFRESH_TOKEN) {
    console.error(' Missing Google Calendar environment variables');
    console.error('GOOGLE_CLIENT_ID:', process.env.GOOGLE_CLIENT_ID ? 'set' : 'MISSING');
    console.error('GOOGLE_CLIENT_SECRET:', process.env.GOOGLE_CLIENT_SECRET ? 'set' : 'MISSING');
    console.error('GOOGLE_REFRESH_TOKEN:', process.env.GOOGLE_REFRESH_TOKEN ? 'set' : 'MISSING');
    return { success: false, error: 'Missing environment variables' };
  }

  // Validate email
  if (!isValidEmail(appt.email)) {
    console.error(' Invalid email address:', appt.email);
    return { success: false, error: 'Invalid email address: ' + appt.email };
  }

  try {
    // Get calendar client (handles token refresh)
    const calendar = await getCalendarClient();

    try {
      parseTimeLabel(appt.time);
    } catch {
      console.error(' Failed to parse time:', appt.time);
      return { success: false, error: 'Invalid time format: ' + appt.time };
    }

    const start = buildCalendarDateTime(appt.date, appt.time);
    const end = buildOffsetDateTime(appt.date, appt.time, 60);

    console.log(' Parsed datetime:', start.dateTime);
    console.log(' End datetime:', end.dateTime);

    const event = {
      summary: `SISU Mentorship: ${appt.client} (${appt.company})`,
      description: `Discussion Topic: ${appt.reason}\nClient Email: ${appt.email}\n\nBooked via SISU Website`,
      start,
      end,
      attendees: [{ email: appt.email }],
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 24 * 60 }, // 24 hours before
          { method: 'popup', minutes: 30 }, // 30 minutes before
        ],
      },
    };

    console.log(' Sending event to Google Calendar...');
    const response = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: event,
    });

    console.log(' Google Calendar event created successfully!');
    console.log(' Event link:', response.data.htmlLink);
    return { success: true, data: response.data };
  } catch (error: unknown) {
    console.error(' Error creating Google Calendar event:');
    console.error('Message:', error instanceof Error ? error.message : String(error));
    console.error('Full error:', JSON.stringify(error, null, 2));
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

export async function getBusyCalendarSlots(startDate: string, endDate: string) {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET || !process.env.GOOGLE_REFRESH_TOKEN) {
    return [];
  }

  try {
    const calendar = await getCalendarClient();
    const timeMin = `${startDate}T00:00:00+05:30`;
    const timeMax = `${endDate}T23:59:59+05:30`;
    const response = await calendar.freebusy.query({
      requestBody: {
        timeMin,
        timeMax,
        timeZone: APPOINTMENT_TIME_ZONE,
        items: [{ id: "primary" }],
      },
    });

    const busy = response.data.calendars?.primary?.busy ?? [];
    const slots: { date: string; time: string }[] = [];

    for (const entry of busy) {
      const start = entry.start ? new Date(entry.start) : null;
      const end = entry.end ? new Date(entry.end) : null;

      if (!start || !end || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
        continue;
      }

      for (const dateCursor = new Date(`${startDate}T12:00:00`);
        dateCursor <= new Date(`${endDate}T12:00:00`);
        dateCursor.setDate(dateCursor.getDate() + 1)) {
        const date = dateCursor.toISOString().slice(0, 10);

        for (const time of APPOINTMENT_SLOT_TIMES) {
          const slotStart = new Date(buildCalendarDateTime(date, time).dateTime);
          const slotEnd = new Date(buildOffsetDateTime(date, time, 60).dateTime);

          if (slotStart < end && slotEnd > start) {
            slots.push({ date, time });
          }
        }
      }
    }

    return slots;
  } catch (error) {
    console.error("Failed to read Google Calendar busy slots:", error);
    return [];
  }
}

/**
 * Delete a Google Calendar event
 */
export async function deleteCalendarEvent(eventId: string) {
  console.log('=== Deleting Google Calendar Event ===');
  console.log('Event ID:', eventId);

  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET || !process.env.GOOGLE_REFRESH_TOKEN) {
    console.error('Missing Google Calendar environment variables');
    return { success: false, error: 'Missing environment variables' };
  }

  try {
    const calendar = await getCalendarClient();
    await calendar.events.delete({
      calendarId: 'primary',
      eventId: eventId,
    });
    console.log(' Event deleted successfully');
    return { success: true };
  } catch (error: unknown) {
    console.error(
      'Error deleting calendar event:',
      error instanceof Error ? error.message : String(error),
    );
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}
