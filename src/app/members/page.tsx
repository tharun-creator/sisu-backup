"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { CalendarDays, CreditCard, LogOut, ShieldCheck, UserCircle2 } from "lucide-react";
import { ChatCalendar } from "@/components/chat/ChatCalendar";
import { formatAppointmentDate } from "@/lib/datetime";

type Member = {
  id: string;
  name: string;
  company: string;
  email: string;
  emailVerified: boolean;
  paymentStatus: "unpaid" | "paid";
};

type Appointment = {
  id: string;
  reason: string;
  date: string;
  time: string;
  status: string;
};

function MembersPageContent() {
  const searchParams = useSearchParams();
  const [authMode, setAuthMode] = useState<"login" | "register">("register");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [member, setMember] = useState<Member | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [selectedReason, setSelectedReason] = useState("");
  const [authForm, setAuthForm] = useState({
    name: "",
    company: "",
    email: "",
    password: "",
  });
  const [verificationEmail, setVerificationEmail] = useState("");
  const [verificationCode, setVerificationCode] = useState("");

  const sessionId = searchParams.get("session_id");

  const hasPaid = member?.paymentStatus === "paid";

  const memberInitials = useMemo(() => {
    if (!member?.name) {
      return "S";
    }
    return member.name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  }, [member]);

  async function loadMember() {
    const response = await fetch("/api/member/me");
    if (!response.ok) {
      setMember(null);
      setAppointments([]);
      return;
    }

    const data = await response.json();
    setMember(data.member);
    setAppointments(data.appointments ?? []);
  }

  useEffect(() => {
    async function bootstrap() {
      setLoading(true);
      await loadMember();
      setLoading(false);
    }

    void bootstrap();
  }, []);

  useEffect(() => {
    if (!sessionId || !member) {
      return;
    }

    async function verifyPayment() {
      setBusy(true);
      const response = await fetch("/api/member/checkout/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
      const data = await response.json().catch(() => ({}));

      if (response.ok) {
        setMessage("Payment verified. You can book your meeting now.");
        await loadMember();
      } else if (data.error) {
        setError(data.error);
      }
      setBusy(false);
    }

    void verifyPayment();
  }, [sessionId, member]);

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");

    const response = await fetch("/api/member/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(authForm),
    });
    const data = await response.json();
    setBusy(false);

    if (!response.ok) {
      setError(data.error || "Registration failed.");
      return;
    }

    setVerificationEmail(authForm.email);
    setMessage("Verification code sent. Enter it below to activate your account.");
  }

  async function handleVerifyEmail(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");

    const response = await fetch("/api/member/verify-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: verificationEmail,
        code: verificationCode,
      }),
    });
    const data = await response.json();
    setBusy(false);

    if (!response.ok) {
      setError(data.error || "Verification failed.");
      return;
    }

    setVerificationCode("");
    setVerificationEmail("");
    setMember(data.member);
    setMessage("Email verified. Complete payment to unlock direct booking.");
    await loadMember();
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");

    const response = await fetch("/api/member/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: authForm.email,
        password: authForm.password,
      }),
    });
    const data = await response.json();
    setBusy(false);

    if (!response.ok) {
      setError(data.error || "Login failed.");
      return;
    }

    setMember(data.member);
    setMessage("Welcome back. Your dashboard is ready.");
    await loadMember();
  }

  async function startCheckout() {
    setBusy(true);
    setError("");
    setMessage("");
    const response = await fetch("/api/member/checkout", { method: "POST" });
    const data = await response.json();
    setBusy(false);

    if (!response.ok) {
      setError(data.error || "Could not start payment.");
      return;
    }

    if (data.url) {
      window.location.href = data.url;
    }
  }

  async function handleBooking(date: string, time: string) {
    if (!selectedReason.trim()) {
      setError("Add a short agenda before choosing a slot.");
      return;
    }

    setBusy(true);
    setError("");
    setMessage("");

    const response = await fetch("/api/member/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        reason: selectedReason,
        date,
        time,
      }),
    });
    const data = await response.json();
    setBusy(false);

    if (!response.ok) {
      setError(data.error || "Booking failed.");
      return;
    }

    setSelectedReason("");
    setMessage(data.message || "Booking request submitted.");
    await loadMember();
  }

  async function handleLogout() {
    setBusy(true);
    await fetch("/api/member/logout", { method: "POST" });
    setMember(null);
    setAppointments([]);
    setBusy(false);
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-black text-white grid place-items-center">
        <p className="text-white/50">Loading member dashboard...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white px-6 py-24">
      <div className="max-w-6xl mx-auto space-y-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <Link href="/" className="text-sm text-white/40 hover:text-white transition-colors">
              Back to SISU
            </Link>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight mt-3">
              SISU Member Dashboard
            </h1>
            <p className="text-white/50 mt-2 max-w-2xl">
              Verified members can pay the Rs.15,000 membership fee once and then book meetings with RATS directly without re-entering profile details.
            </p>
          </div>
          {member ? (
            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-2 px-4 py-3 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 transition-colors"
            >
              <LogOut size={16} />
              Sign out
            </button>
          ) : null}
        </div>

        {error ? (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-red-200">
            {error}
          </div>
        ) : null}
        {message ? (
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-emerald-200">
            {message}
          </div>
        ) : null}

        {!member ? (
          <div className="grid lg:grid-cols-2 gap-8">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-[2rem] border border-white/10 bg-white/5 p-8"
            >
              <div className="flex gap-3 mb-6">
                <button
                  onClick={() => setAuthMode("register")}
                  className={`px-4 py-2 rounded-full text-sm ${authMode === "register" ? "bg-white text-black" : "bg-white/5 text-white/60"}`}
                >
                  Create Account
                </button>
                <button
                  onClick={() => setAuthMode("login")}
                  className={`px-4 py-2 rounded-full text-sm ${authMode === "login" ? "bg-white text-black" : "bg-white/5 text-white/60"}`}
                >
                  Sign In
                </button>
              </div>

              {authMode === "register" ? (
                <form onSubmit={handleRegister} className="space-y-4">
                  <input
                    required
                    placeholder="Full name"
                    value={authForm.name}
                    onChange={(e) => setAuthForm((prev) => ({ ...prev, name: e.target.value }))}
                    className="w-full rounded-2xl bg-black/40 border border-white/10 px-4 py-4"
                  />
                  <input
                    required
                    placeholder="Company"
                    value={authForm.company}
                    onChange={(e) => setAuthForm((prev) => ({ ...prev, company: e.target.value }))}
                    className="w-full rounded-2xl bg-black/40 border border-white/10 px-4 py-4"
                  />
                  <input
                    required
                    type="email"
                    placeholder="Email address"
                    value={authForm.email}
                    onChange={(e) => setAuthForm((prev) => ({ ...prev, email: e.target.value }))}
                    className="w-full rounded-2xl bg-black/40 border border-white/10 px-4 py-4"
                  />
                  <input
                    required
                    type="password"
                    placeholder="Create password"
                    value={authForm.password}
                    onChange={(e) => setAuthForm((prev) => ({ ...prev, password: e.target.value }))}
                    className="w-full rounded-2xl bg-black/40 border border-white/10 px-4 py-4"
                  />
                  <button
                    type="submit"
                    disabled={busy}
                    className="w-full rounded-2xl bg-white text-black py-4 font-semibold disabled:opacity-60"
                  >
                    {busy ? "Sending verification..." : "Create member account"}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleLogin} className="space-y-4">
                  <input
                    required
                    type="email"
                    placeholder="Email address"
                    value={authForm.email}
                    onChange={(e) => setAuthForm((prev) => ({ ...prev, email: e.target.value }))}
                    className="w-full rounded-2xl bg-black/40 border border-white/10 px-4 py-4"
                  />
                  <input
                    required
                    type="password"
                    placeholder="Password"
                    value={authForm.password}
                    onChange={(e) => setAuthForm((prev) => ({ ...prev, password: e.target.value }))}
                    className="w-full rounded-2xl bg-black/40 border border-white/10 px-4 py-4"
                  />
                  <button
                    type="submit"
                    disabled={busy}
                    className="w-full rounded-2xl bg-white text-black py-4 font-semibold disabled:opacity-60"
                  >
                    {busy ? "Signing in..." : "Sign in"}
                  </button>
                </form>
              )}
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="rounded-[2rem] border border-white/10 bg-white/5 p-8 space-y-6"
            >
              <div className="flex items-center gap-3">
                <ShieldCheck className="text-emerald-400" />
                <h2 className="text-2xl font-semibold">Verify your email</h2>
              </div>
              <p className="text-white/50">
                We validate the email format during signup, then verify ownership with a one-time code sent to the inbox.
              </p>
              <form onSubmit={handleVerifyEmail} className="space-y-4">
                <input
                  required
                  type="email"
                  placeholder="Verified email"
                  value={verificationEmail}
                  onChange={(e) => setVerificationEmail(e.target.value)}
                  className="w-full rounded-2xl bg-black/40 border border-white/10 px-4 py-4"
                />
                <input
                  required
                  inputMode="numeric"
                  placeholder="6-digit code"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  className="w-full rounded-2xl bg-black/40 border border-white/10 px-4 py-4"
                />
                <button
                  type="submit"
                  disabled={busy}
                  className="w-full rounded-2xl border border-white/10 bg-white/10 py-4 font-semibold disabled:opacity-60"
                >
                  {busy ? "Verifying..." : "Verify email and open dashboard"}
                </button>
              </form>
            </motion.div>
          </div>
        ) : (
          <div className="grid lg:grid-cols-[1.2fr_0.8fr] gap-8">
            <div className="space-y-8">
              <section className="rounded-[2rem] border border-white/10 bg-white/5 p-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-white text-black grid place-items-center font-bold">
                      {memberInitials}
                    </div>
                    <div>
                      <p className="text-sm text-white/40">Member profile</p>
                      <h2 className="text-2xl font-semibold">{member.name}</h2>
                      <p className="text-white/50">{member.company} · {member.email}</p>
                    </div>
                  </div>
                  <div className={`px-4 py-2 rounded-full text-sm font-medium ${hasPaid ? "bg-emerald-500/15 text-emerald-300" : "bg-amber-500/15 text-amber-200"}`}>
                    {hasPaid ? "Payment verified" : "Payment pending"}
                  </div>
                </div>
              </section>

              <section className="rounded-[2rem] border border-white/10 bg-white/5 p-8 space-y-6">
                <div className="flex items-center gap-3">
                  <CalendarDays />
                  <h2 className="text-2xl font-semibold">Direct booking</h2>
                </div>
                {!hasPaid ? (
                  <div className="rounded-[1.5rem] border border-white/10 bg-black/30 p-6 space-y-4">
                    <p className="text-white/60">
                      Complete the one-time Rs.15,000 payment to unlock member booking with RATS.
                    </p>
                    <button
                      onClick={startCheckout}
                      disabled={busy}
                      className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-white text-black font-semibold disabled:opacity-60"
                    >
                      <CreditCard size={18} />
                      {busy ? "Preparing checkout..." : "Pay Rs.15,000"}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <textarea
                      rows={4}
                      value={selectedReason}
                      onChange={(e) => setSelectedReason(e.target.value)}
                      placeholder="Add the agenda for this meeting."
                      className="w-full rounded-[1.5rem] bg-black/40 border border-white/10 px-4 py-4 resize-none"
                    />
                    <div className="max-w-md">
                      <ChatCalendar onSelect={handleBooking} />
                    </div>
                  </div>
                )}
              </section>
            </div>

            <section className="rounded-[2rem] border border-white/10 bg-white/5 p-8">
              <div className="flex items-center gap-3 mb-6">
                <UserCircle2 />
                <h2 className="text-2xl font-semibold">Upcoming requests</h2>
              </div>
              {appointments.length === 0 ? (
                <p className="text-white/45">No member bookings yet.</p>
              ) : (
                <div className="space-y-4">
                  {appointments.map((appointment) => (
                    <div
                      key={appointment.id}
                      className="rounded-[1.5rem] border border-white/10 bg-black/30 p-5"
                    >
                      <p className="text-sm text-white/40 uppercase tracking-wide mb-2">
                        {appointment.status}
                      </p>
                      <p className="font-medium">
                        {formatAppointmentDate(appointment.date)} at {appointment.time}
                      </p>
                      <p className="text-white/55 mt-2 text-sm">{appointment.reason}</p>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </main>
  );
}

export default function MembersPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-black text-white grid place-items-center">
          <p className="text-white/50">Loading member dashboard...</p>
        </main>
      }
    >
      <MembersPageContent />
    </Suspense>
  );
}
