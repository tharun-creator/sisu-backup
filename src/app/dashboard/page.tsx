"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CheckCircle, Clock3, Trash2, XCircle } from "lucide-react";
import Calendar from "@/components/ui/Calendar";
import { format, isSameDay } from "date-fns";
import { parseAppointmentDate } from "@/lib/datetime";

type Appointment = {
  id: string;
  client: string;
  company: string;
  email: string;
  reason: string;
  date: string;
  time: string;
  requested: string;
  status: "pending" | "accepted" | "completed" | "cancelled";
};

export default function DashboardPage() {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [credentials, setCredentials] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());

  async function loadAdminState() {
    const response = await fetch("/api/admin/me");
    const data = await response.json();
    setAuthenticated(Boolean(data.authenticated));
  }

  async function loadAppointments() {
    const response = await fetch("/api/appointments");
    if (!response.ok) {
      if (response.status === 401) {
        setAuthenticated(false);
      }
      return;
    }

    const data = await response.json();
    setAppointments(Array.isArray(data) ? data : []);
  }

  useEffect(() => {
    async function bootstrap() {
      await loadAdminState();
    }
    void bootstrap();
  }, []);

  useEffect(() => {
    if (!authenticated) {
      return;
    }

    const initialLoad = setTimeout(() => {
      void loadAppointments();
    }, 0);
    const timer = setInterval(() => {
      void loadAppointments();
    }, 10000);

    return () => {
      clearTimeout(initialLoad);
      clearInterval(timer);
    };
  }, [authenticated]);

  const filteredAppointments = useMemo(
    () =>
      appointments.filter((appointment) =>
        selectedDate
          ? isSameDay(parseAppointmentDate(appointment.date), selectedDate)
          : true,
      ),
    [appointments, selectedDate],
  );

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const response = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(credentials),
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      setError(data.error || "Admin login failed.");
      return;
    }

    setAuthenticated(true);
    await loadAppointments();
  }

  async function updateStatus(id: string, status: Appointment["status"]) {
    const response = await fetch("/api/appointments", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });

    if (response.ok) {
      await loadAppointments();
    }
  }

  async function deleteAppointment(id: string) {
    const response = await fetch("/api/appointments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", id }),
    });

    if (response.ok) {
      await loadAppointments();
    }
  }

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    setAuthenticated(false);
    setAppointments([]);
  }

  if (authenticated === null) {
    return (
      <main className="min-h-screen bg-black text-white grid place-items-center">
        <p className="text-white/50">Loading admin dashboard...</p>
      </main>
    );
  }

  if (!authenticated) {
    return (
      <main className="min-h-screen bg-black text-white grid place-items-center px-6">
        <div className="w-full max-w-md rounded-[2rem] border border-white/10 bg-white/5 p-8">
          <Link href="/" className="text-sm text-white/40 hover:text-white">
            Back to SISU
          </Link>
          <h1 className="text-3xl font-bold mt-4 mb-2">Admin Dashboard</h1>
          <p className="text-white/50 mb-6">
            Server-side admin authentication is now required before appointment data can be viewed or updated.
          </p>
          {error ? (
            <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-red-200 mb-4">
              {error}
            </div>
          ) : null}
          <form onSubmit={handleLogin} className="space-y-4">
            <input
              required
              type="email"
              placeholder="Admin email"
              value={credentials.email}
              onChange={(e) =>
                setCredentials((prev) => ({ ...prev, email: e.target.value }))
              }
              className="w-full rounded-2xl bg-black/40 border border-white/10 px-4 py-4"
            />
            <input
              required
              type="password"
              placeholder="Admin password"
              value={credentials.password}
              onChange={(e) =>
                setCredentials((prev) => ({ ...prev, password: e.target.value }))
              }
              className="w-full rounded-2xl bg-black/40 border border-white/10 px-4 py-4"
            />
            <button className="w-full rounded-2xl bg-white text-black py-4 font-semibold">
              Sign in
            </button>
          </form>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white px-6 py-24">
      <div className="max-w-7xl mx-auto space-y-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <Link href="/" className="text-sm text-white/40 hover:text-white">
              Back to SISU
            </Link>
            <h1 className="text-5xl font-bold mt-4">Admin Dashboard</h1>
            <p className="text-white/50 mt-2">
              Review paid member booking requests, approve meetings, and sync confirmed sessions into Google Calendar.
            </p>
          </div>
          <button
            onClick={logout}
            className="px-4 py-3 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10"
          >
            Sign out
          </button>
        </div>

        <div className="grid lg:grid-cols-[0.85fr_1.15fr] gap-8">
          <section className="rounded-[2rem] border border-white/10 bg-white/5 p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-semibold">Calendar</h2>
              <button
                onClick={() => setSelectedDate(null)}
                className="text-sm text-white/50 hover:text-white"
              >
                Show all
              </button>
            </div>
            <Calendar
              selectedDate={selectedDate}
              onDateSelect={setSelectedDate}
              appointments={appointments}
            />
          </section>

          <section className="rounded-[2rem] border border-white/10 bg-white/5 p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-semibold">
                {selectedDate ? format(selectedDate, "MMMM do, yyyy") : "All requests"}
              </h2>
              <div className="px-3 py-2 rounded-full bg-white/10 text-sm text-white/70">
                {filteredAppointments.length} items
              </div>
            </div>

            {filteredAppointments.length === 0 ? (
              <div className="rounded-[1.5rem] border border-dashed border-white/10 p-10 text-center text-white/40">
                No appointments found for this view.
              </div>
            ) : (
              <div className="space-y-4">
                {filteredAppointments.map((appointment) => (
                  <article
                    key={appointment.id}
                    className="rounded-[1.5rem] border border-white/10 bg-black/30 p-6"
                  >
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                      <div className="space-y-3">
                        <div>
                          <div className="flex items-center gap-3">
                            <h3 className="text-xl font-semibold">{appointment.client}</h3>
                            <span className="px-2 py-1 rounded-full bg-white/10 text-xs uppercase tracking-wider text-white/70">
                              {appointment.status}
                            </span>
                          </div>
                          <p className="text-white/50">
                            {appointment.company} · {appointment.email}
                          </p>
                        </div>
                        <p className="text-white/80">
                          {appointment.date} at {appointment.time}
                        </p>
                        <p className="text-white/55">{appointment.reason}</p>
                      </div>
                      <div className="flex flex-wrap gap-3">
                        {appointment.status === "pending" ? (
                          <button
                            onClick={() => updateStatus(appointment.id, "accepted")}
                            className="inline-flex items-center gap-2 px-4 py-3 rounded-2xl bg-white text-black font-semibold"
                          >
                            <CheckCircle size={16} />
                            Accept
                          </button>
                        ) : null}
                        {appointment.status === "accepted" ? (
                          <button
                            onClick={() => updateStatus(appointment.id, "completed")}
                            className="inline-flex items-center gap-2 px-4 py-3 rounded-2xl bg-emerald-500/20 text-emerald-200"
                          >
                            <Clock3 size={16} />
                            Complete
                          </button>
                        ) : null}
                        {appointment.status !== "cancelled" ? (
                          <button
                            onClick={() => updateStatus(appointment.id, "cancelled")}
                            className="inline-flex items-center gap-2 px-4 py-3 rounded-2xl bg-white/10 text-white/70"
                          >
                            <XCircle size={16} />
                            Cancel
                          </button>
                        ) : null}
                        <button
                          onClick={() => deleteAppointment(appointment.id)}
                          className="inline-flex items-center gap-2 px-4 py-3 rounded-2xl border border-white/10 text-white/70"
                        >
                          <Trash2 size={16} />
                          Delete
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
