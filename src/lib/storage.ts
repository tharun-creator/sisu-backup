import fs from "fs";
import path from "path";
import { Pool } from "pg";
import { Resend } from "resend";

const APPOINTMENTS_FILE = path.join(process.cwd(), "pending_appointments.json");
const DATABASE_URL = process.env.DATABASE_URL;

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const globalForDb = globalThis as typeof globalThis & {
  appointmentsPool?: Pool;
};

const pool =
  DATABASE_URL && !DATABASE_URL.includes("[YOUR-PASSWORD]")
    ? globalForDb.appointmentsPool ??
      new Pool({
        connectionString: DATABASE_URL,
        ssl: {
          rejectUnauthorized: false,
        },
      })
    : null;

if (pool) {
  globalForDb.appointmentsPool = pool;
}

type AppointmentLog = {
  status: string;
  timestamp: string;
  note?: string;
};

export type Appointment = {
  id: string;
  client: string;
  company: string;
  email: string;
  reason: string;
  date: string;
  time: string;
  requested: string;
  status: string;
  calendarEventId?: string | null;
  logs: AppointmentLog[];
  createdAt?: string;
};

type AppointmentRow = {
  id: string;
  client: string;
  company: string | null;
  email: string;
  reason: string | null;
  date: string;
  time: string;
  requested: string | null;
  status: string | null;
  calendar_event_id: string | null;
  logs: AppointmentLog[] | string | null;
  created_at: string | Date | null;
};

let dbInitialized = false;

function ensureDatabaseConfigured() {
  if (!pool) {
    throw new Error(
      "DATABASE_URL is not configured. Add your Supabase PostgreSQL connection string to .env.local.",
    );
  }

  if (DATABASE_URL?.includes("[YOUR-PASSWORD]")) {
    throw new Error(
      "DATABASE_URL still contains [YOUR-PASSWORD]. Replace it with your actual Supabase database password.",
    );
  }

  return pool;
}

function normalizeLogs(logs: AppointmentRow["logs"]): AppointmentLog[] {
  if (!logs) {
    return [];
  }

  if (typeof logs === "string") {
    try {
      return JSON.parse(logs) as AppointmentLog[];
    } catch {
      return [];
    }
  }

  return Array.isArray(logs) ? logs : [];
}

function normalizeAppointment(row: AppointmentRow): Appointment {
  return {
    id: row.id,
    client: row.client,
    company: row.company ?? "N/A",
    email: row.email,
    reason: row.reason ?? "No reason provided",
    date: row.date,
    time: row.time,
    requested: row.requested ?? "",
    status: row.status ?? "pending",
    calendarEventId: row.calendar_event_id,
    logs: normalizeLogs(row.logs),
    createdAt:
      row.created_at instanceof Date
        ? row.created_at.toISOString()
        : row.created_at ?? undefined,
  };
}

async function readLegacyAppointmentsFile(): Promise<Appointment[]> {
  if (!fs.existsSync(APPOINTMENTS_FILE)) {
    return [];
  }

  try {
    const data = fs.readFileSync(APPOINTMENTS_FILE, "utf-8");
    const parsed = JSON.parse(data);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.map((item: Partial<Appointment>) => ({
      id: item.id ?? `appt-${Date.now()}`,
      client: item.client ?? "Unknown",
      company: item.company ?? "N/A",
      email: item.email ?? "",
      reason: item.reason ?? "No reason provided",
      date: item.date ?? "",
      time: item.time ?? "",
      requested: item.requested ?? "",
      status: item.status ?? "pending",
      calendarEventId: item.calendarEventId ?? null,
      logs: Array.isArray(item.logs) ? item.logs : [],
    }));
  } catch (error) {
    console.error("Failed to read legacy appointments file:", error);
    return [];
  }
}

async function initDatabase() {
  const db = ensureDatabaseConfigured();

  await db.query(`
    CREATE TABLE IF NOT EXISTS appointments (
      id TEXT PRIMARY KEY,
      client TEXT NOT NULL,
      company TEXT,
      email TEXT NOT NULL,
      reason TEXT,
      date TEXT NOT NULL,
      time TEXT NOT NULL,
      requested TEXT,
      status TEXT DEFAULT 'pending',
      calendar_event_id TEXT,
      logs JSONB DEFAULT '[]'::jsonb,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    )
  `);

  const existingRows = await db.query(
    `SELECT COUNT(*)::int AS count FROM appointments`,
  );
  const existingCount = existingRows.rows[0]?.count ?? 0;

  if (existingCount > 0) {
    return;
  }

  const legacyAppointments = await readLegacyAppointmentsFile();

  for (const appointment of legacyAppointments) {
    await db.query(
      `
        INSERT INTO appointments (
          id,
          client,
          company,
          email,
          reason,
          date,
          time,
          requested,
          status,
          calendar_event_id,
          logs
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb)
        ON CONFLICT (id) DO NOTHING
      `,
      [
        appointment.id,
        appointment.client,
        appointment.company,
        appointment.email,
        appointment.reason,
        appointment.date,
        appointment.time,
        appointment.requested,
        appointment.status,
        appointment.calendarEventId,
        JSON.stringify(appointment.logs),
      ],
    );
  }
}

async function ensureDatabaseReady() {
  if (dbInitialized) {
    return ensureDatabaseConfigured();
  }

  await initDatabase();
  dbInitialized = true;
  return ensureDatabaseConfigured();
}

export async function loadAppointments(): Promise<Appointment[]> {
  const db = await ensureDatabaseReady();
  const result = await db.query(`
    SELECT
      id,
      client,
      company,
      email,
      reason,
      date,
      time,
      requested,
      status,
      calendar_event_id,
      logs,
      created_at
    FROM appointments
    ORDER BY date ASC, time ASC
  `);

  return result.rows.map((row) => normalizeAppointment(row as AppointmentRow));
}

export async function saveAppointments(appointments: Appointment[]) {
  const db = await ensureDatabaseReady();
  await db.query(`DELETE FROM appointments`);

  for (const appointment of appointments) {
    await addAppointment(appointment);
  }
}

export async function addAppointment(appointment: Appointment) {
  const db = await ensureDatabaseReady();

  await db.query(
    `
      INSERT INTO appointments (
        id,
        client,
        company,
        email,
        reason,
        date,
        time,
        requested,
        status,
        calendar_event_id,
        logs
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb)
      ON CONFLICT (id) DO UPDATE SET
        client = EXCLUDED.client,
        company = EXCLUDED.company,
        email = EXCLUDED.email,
        reason = EXCLUDED.reason,
        date = EXCLUDED.date,
        time = EXCLUDED.time,
        requested = EXCLUDED.requested,
        status = EXCLUDED.status,
        calendar_event_id = EXCLUDED.calendar_event_id,
        logs = EXCLUDED.logs
    `,
    [
      appointment.id,
      appointment.client,
      appointment.company || "N/A",
      appointment.email,
      appointment.reason || "No reason provided",
      appointment.date,
      appointment.time,
      appointment.requested || "",
      appointment.status || "pending",
      appointment.calendarEventId ?? null,
      JSON.stringify(appointment.logs || []),
    ],
  );
}

export async function updateAppointment(
  id: string,
  updates: Partial<Appointment>,
) {
  const db = await ensureDatabaseReady();

  const columnMap: Record<string, string> = {
    client: "client",
    company: "company",
    email: "email",
    reason: "reason",
    date: "date",
    time: "time",
    requested: "requested",
    status: "status",
    calendarEventId: "calendar_event_id",
    logs: "logs",
  };

  const setClauses: string[] = [];
  const values: unknown[] = [];
  let index = 1;

  for (const [key, rawValue] of Object.entries(updates)) {
    const column = columnMap[key];

    if (!column) {
      continue;
    }

    const value = key === "logs" ? JSON.stringify(rawValue ?? []) : rawValue;
    setClauses.push(
      `${column} = $${index}${key === "logs" ? "::jsonb" : ""}`,
    );
    values.push(value);
    index += 1;
  }

  if (setClauses.length === 0) {
    return false;
  }

  values.push(id);

  await db.query(
    `UPDATE appointments SET ${setClauses.join(", ")} WHERE id = $${index}`,
    values,
  );

  return true;
}

export async function deleteAppointment(id: string) {
  const db = await ensureDatabaseReady();
  await db.query(`DELETE FROM appointments WHERE id = $1`, [id]);
  return true;
}

export async function sendAppointmentEmail(
  appointment: Appointment,
  type: "accepted" | "declined" | "rescheduled",
) {
  if (!resend) {
    console.warn("Resend API key not found. Email not sent.");
    return { success: false, error: "Email provider not configured" };
  }

  if (!appointment.email) {
    console.warn("No email address found for appointment:", appointment.id);
    return { success: false, error: "No email address found" };
  }

  const subjects = {
    accepted: "Meeting Confirmed: SISU Mentorship with RATS",
    declined: "Update on your SISU Mentorship Request",
    rescheduled: "Rescheduling: SISU Mentorship with RATS",
  };

  const messages = {
    accepted: `Hello ${appointment.client},\n\nYour meeting with RATS has been confirmed for ${appointment.date} at ${appointment.time}.\n\nWe look forward to seeing you!\n\nBest,\nSISU Team`,
    declined: `Hello ${appointment.client},\n\nThank you for your interest in SISU Mentorship. Unfortunately, RATS is unable to accommodate your request at this time.\n\nBest regards,\nSISU Team`,
    rescheduled: `Hello ${appointment.client},\n\nRATS would like to reschedule your session. Please check the dashboard or contact us for new availability.\n\nBest,\nSISU Team`,
  };

  try {
    const data = await resend.emails.send({
      from: "SISU Mentorship <onboarding@resend.dev>",
      to: appointment.email,
      subject: subjects[type],
      text: messages[type],
    });

    return { success: true, data };
  } catch (error) {
    console.error("Failed to send email:", error);
    return { success: false, error };
  }
}
