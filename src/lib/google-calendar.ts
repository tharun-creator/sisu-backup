import { google } from 'googleapis';

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
    } catch (refreshError: any) {
      console.error(' Failed to refresh token:', refreshError.message);
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

/**
 * Parse time string to hours and minutes (24-hour format)
 * Supports: "10:00 AM", "2:00 PM", "6:00 PM", etc.
 */
function parseTime(timeStr: string): { hours: number; minutes: number } | null {
  const timeMatch = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!timeMatch) {
    console.error('Invalid time format:', timeStr);
    return null;
  }
  
  let hours = parseInt(timeMatch[1], 10);
  const minutes = parseInt(timeMatch[2], 10);
  const period = timeMatch[3].toUpperCase();
  
  // Convert to 24-hour format
  if (period === 'PM' && hours !== 12) {
    hours += 12;
  } else if (period === 'AM' && hours === 12) {
    hours = 0;
  }
  
  return { hours, minutes };
}

/**
 * Parse date string to Date object
 * Supports both formats:
 * - ISO: "2026-04-29"
 * - Human-readable: "Saturday, April 25, 2026"
 */
function parseDate(dateStr: string): Date | null {
  let dateObj: Date;
  
  // Try ISO format first (e.g., "2026-04-29")
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    dateObj = new Date(dateStr + 'T12:00:00');
  } else {
    // Try human-readable format
    dateObj = new Date(dateStr + 'T12:00:00');
  }
  
  if (isNaN(dateObj.getTime())) {
    console.error('Invalid date:', dateStr);
    return null;
  }
  
  return dateObj;
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

    // Parse date
    const dateObj = parseDate(appt.date);
    if (!dateObj) {
      console.error(' Failed to parse date:', appt.date);
      return { success: false, error: 'Invalid date format: ' + appt.date };
    }

    // Parse time
    const time = parseTime(appt.time);
    if (!time) {
      console.error(' Failed to parse time:', appt.time);
      return { success: false, error: 'Invalid time format: ' + appt.time };
    }

    // Set the time on the date object
    dateObj.setHours(time.hours, time.minutes, 0, 0);

    console.log(' Parsed datetime:', dateObj.toISOString());

    const endObj = new Date(dateObj.getTime() + 60 * 60 * 1000); // 1 hour duration
    console.log(' End datetime:', endObj.toISOString());

    const event = {
      summary: `SISU Mentorship: ${appt.client} (${appt.company})`,
      description: `Discussion Topic: ${appt.reason}\nClient Email: ${appt.email}\n\nBooked via SISU Website`,
      start: {
        dateTime: dateObj.toISOString(),
        timeZone: 'Asia/Kolkata', // IST timezone for RATS
      },
      end: {
        dateTime: endObj.toISOString(),
        timeZone: 'Asia/Kolkata',
      },
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
  } catch (error: any) {
    console.error(' Error creating Google Calendar event:');
    console.error('Message:', error.message);
    console.error('Code:', error.code);
    console.error('Full error:', JSON.stringify(error, null, 2));
    return { success: false, error: error.message || error };
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
  } catch (error: any) {
    console.error('Error deleting calendar event:', error.message || error);
    return { success: false, error: error.message || error };
  }
}
