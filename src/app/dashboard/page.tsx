"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Calendar as CalendarIcon, 
  Clock, 
  Briefcase, 
  MessageSquare, 
  CheckCircle, 
  ArrowLeft,
  XCircle,
  MoreVertical,
  Trash2,
  Users,
  Clock3,
  History
} from "lucide-react";
import Link from "next/link";
import Calendar from "@/components/ui/Calendar";
import { format, isSameDay } from "date-fns";

type Appointment = {
  id: string;
  client: string;
  company: string;
  email: string;
  reason: string;
  date: string;
  time: string;
  requested: string;
  status: 'pending' | 'accepted' | 'completed' | 'cancelled';
  logs?: {
    status: string;
    timestamp: string;
    note?: string;
  }[];
};

export default function Dashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [view, setView] = useState<'calendar' | 'history'>('calendar');
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === (process.env.NEXT_PUBLIC_DASHBOARD_PASSWORD || "rats123")) {
      setIsAuthenticated(true);
      setError("");
      // Store in session storage to persist during session
      sessionStorage.setItem("admin_auth", "true");
    } else {
      setError("Incorrect password");
    }
  };

  useEffect(() => {
    if (sessionStorage.getItem("admin_auth") === "true") {
      setIsAuthenticated(true);
    }
  }, []);

  const fetchAppointments = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const res = await fetch("/api/appointments");
      const data = await res.json();
      if (Array.isArray(data)) {
        setAppointments(data);
      } else {
        console.error("API did not return an array:", data);
        setAppointments([]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchAppointments();
    const interval = setInterval(fetchAppointments, 10000); // Auto-refresh every 10s
    return () => clearInterval(interval);
  }, [fetchAppointments]);

  const updateStatus = async (id: string, status: string) => {
    try {
      await fetch("/api/appointments", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      setAppointments((prev) => 
        prev.map((a) => a.id === id ? { ...a, status: status as any } : a)
      );
    } catch (err) {
      console.error(err);
    }
  };

  const deleteAppointment = async (id: string) => {
    if (!confirm("Are you sure you want to delete this appointment?")) return;
    try {
      await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      setAppointments((prev) => prev.filter((a) => a.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const safeAppointments = Array.isArray(appointments) ? appointments : [];

  const filteredAppointments = safeAppointments.filter(appt => 
    selectedDate ? isSameDay(new Date(appt.date), selectedDate) : true
  );

  const stats = {
    pending: safeAppointments.filter(a => a.status === 'pending').length,
    accepted: safeAppointments.filter(a => a.status === 'accepted').length,
    completed: safeAppointments.filter(a => a.status === 'completed').length,
    cancelled: safeAppointments.filter(a => a.status === 'cancelled').length,
    total: safeAppointments.length
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center px-6">
        <Link href="/" className="absolute top-8 left-8 inline-flex items-center text-white/40 hover:text-white transition-colors">
          <ArrowLeft size={16} className="mr-2" /> Back to Home
        </Link>
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-neutral-900 border border-white/5 p-10 rounded-3xl w-full max-w-md text-center shadow-2xl"
        >
          <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <CalendarIcon className="text-white/60" size={32} />
          </div>
          <h1 className="text-2xl font-bold mb-2 text-white">Admin Access</h1>
          <p className="text-white/40 mb-8 text-sm text-balance">This area is restricted. Please enter the master password to continue.</p>
          <form onSubmit={handleLogin} className="space-y-4">
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter Password" 
              className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-center focus:outline-none focus:border-white/30 transition-colors text-white"
            />
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <button type="submit" className="w-full bg-white text-black py-3 rounded-xl font-bold hover:scale-[1.02] active:scale-95 transition-all">
              Unlock Dashboard
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white pt-24 px-6 pb-12">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
          <div>
            <Link href="/" className="inline-flex items-center text-white/40 hover:text-white mb-4 transition-colors">
              <ArrowLeft size={16} className="mr-2" /> Back to Home
            </Link>
            <h1 className="text-5xl font-bold tracking-tighter mb-2">Admin Dashboard</h1>
            <p className="text-white/40 max-w-md">Manage your mentorship sessions, track pending requests, and organize your schedule.</p>
          </div>
          
          <div className="flex gap-4">
            <button 
              onClick={() => setView('calendar')}
              className={`px-6 py-3 rounded-2xl flex items-center gap-2 transition-all font-medium ${
                view === 'calendar' ? 'bg-white text-black' : 'bg-neutral-900 border border-white/5 text-white/40 hover:text-white'
              }`}
            >
              <CalendarIcon size={18} /> Schedule
            </button>
            <button 
              onClick={() => setView('history')}
              className={`px-6 py-3 rounded-2xl flex items-center gap-2 transition-all font-medium ${
                view === 'history' ? 'bg-white text-black' : 'bg-neutral-900 border border-white/5 text-white/40 hover:text-white'
              }`}
            >
              <History size={18} /> History
            </button>
            <div className="bg-neutral-900 border border-white/5 px-6 py-3 rounded-2xl flex items-center gap-4">
              <div className="text-right">
                <p className="text-[10px] uppercase tracking-widest text-white/30 font-bold">System Status</p>
                <p className="text-sm font-medium text-green-500">Online & Live</p>
              </div>
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.5)]" />
            </div>
          </div>
        </div>

        {/* View Switcher: Calendar View */}
        {view === 'calendar' ? (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
              <button 
                onClick={() => setSelectedDate(null)}
                className="bg-neutral-900 border border-white/5 p-8 rounded-3xl group hover:border-white/20 transition-all text-left"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-white/5 rounded-2xl text-white/60"><Clock3 size={24} /></div>
                  <span className="text-3xl font-bold">{stats.pending}</span>
                </div>
                <p className="text-white/40 font-medium">Pending Requests</p>
              </button>
              <div className="bg-neutral-900 border border-white/5 p-8 rounded-3xl group hover:border-white/20 transition-all">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-white/5 rounded-2xl text-white/60"><CheckCircle size={24} /></div>
                  <span className="text-3xl font-bold">{stats.accepted}</span>
                </div>
                <p className="text-white/40 font-medium">Active Sessions</p>
              </div>
              <div className="bg-neutral-900 border border-white/5 p-8 rounded-3xl group hover:border-white/20 transition-all">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-white/5 rounded-2xl text-white/60"><Users size={24} /></div>
                  <span className="text-3xl font-bold">{stats.total}</span>
                </div>
                <p className="text-white/40 font-medium">Total Appointments</p>
              </div>
            </div>

            {/* Action Required: Pending Requests Card */}
            {stats.pending > 0 && (
              <div className="mb-12">
                <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
                  Action Required
                  <span className="text-xs font-bold uppercase tracking-widest bg-orange-500/10 text-orange-500 border border-orange-500/20 px-3 py-1 rounded-full">
                    {stats.pending} New
                  </span>
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {safeAppointments
                    .filter(a => a.status === 'pending')
                    .map((appt) => (
                      <motion.div
                        key={appt.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-neutral-900 border border-orange-500/20 p-8 rounded-[2rem] relative overflow-hidden group hover:border-orange-500/40 transition-all shadow-2xl"
                      >
                        <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                          <Clock3 size={80} />
                        </div>
                        
                        <div className="relative z-10">
                          <div className="flex items-center gap-4 mb-6">
                            <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center text-xl font-bold">
                              {appt.client.charAt(0)}
                            </div>
                            <div>
                              <h3 className="text-xl font-bold">{appt.client}</h3>
                              <p className="text-white/40 text-sm">{appt.email}</p>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4 mb-8">
                            <div className="bg-black/40 p-4 rounded-2xl border border-white/5">
                              <p className="text-[10px] uppercase tracking-widest text-white/30 font-bold mb-1">Company</p>
                              <p className="text-sm font-medium">{appt.company}</p>
                            </div>
                            <div className="bg-black/40 p-4 rounded-2xl border border-white/5">
                              <p className="text-[10px] uppercase tracking-widest text-white/30 font-bold mb-1">Schedule</p>
                              <p className="text-sm font-medium">{appt.date} @ {appt.time}</p>
                            </div>
                          </div>

                          <div className="bg-black/40 p-5 rounded-2xl border border-white/5 mb-8">
                            <p className="text-[10px] uppercase tracking-widest text-white/30 font-bold mb-2">Discussion Topic</p>
                            <p className="text-sm text-white/70 leading-relaxed italic">"{appt.reason}"</p>
                          </div>

                          <div className="flex gap-3">
                            <button
                              onClick={() => updateStatus(appt.id, 'accepted')}
                              className="flex-1 bg-white text-black py-4 rounded-2xl font-bold hover:scale-[1.02] active:scale-95 transition-all shadow-xl"
                            >
                              Approve Request
                            </button>
                            <button
                              onClick={() => updateStatus(appt.id, 'cancelled')}
                              className="bg-white/5 text-white/40 hover:text-white px-6 py-4 rounded-2xl font-medium transition-all"
                            >
                              Decline
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
              {/* Calendar Section */}
              <div className="lg:col-span-5 space-y-6">
                <div className="bg-neutral-900 border border-white/5 p-8 rounded-3xl">
                  <Calendar 
                    selectedDate={selectedDate} 
                    onDateSelect={setSelectedDate} 
                    appointments={appointments}
                  />
                </div>
              </div>

              {/* Appointments List Section */}
              <div className="lg:col-span-7 space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold flex items-center gap-3">
                    {selectedDate ? format(selectedDate, 'MMMM do, yyyy') : 'All Requests'}
                    <span className="text-sm font-normal text-white/30 bg-white/5 px-3 py-1 rounded-full">
                      {filteredAppointments.length}
                    </span>
                  </h2>
                </div>

                {loading ? (
                  <div className="bg-neutral-900 border border-white/5 p-12 rounded-3xl text-center text-white/20 animate-pulse">
                    Syncing appointments...
                  </div>
                ) : filteredAppointments.length === 0 ? (
                  <div className="bg-neutral-900/50 border border-dashed border-white/10 p-16 rounded-3xl text-center">
                    <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6 text-white/10">
                      <CalendarIcon size={32} />
                    </div>
                    <h3 className="text-xl font-medium text-white/40">No sessions scheduled</h3>
                    <p className="text-white/20 text-sm mt-2">Try selecting another date on the calendar.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <AnimatePresence mode="popLayout">
                      {filteredAppointments.map((appt) => (
                        <motion.div
                          layout
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          key={appt.id}
                          className="bg-neutral-900 border border-white/5 p-6 rounded-3xl group transition-all hover:border-white/20"
                        >
                          <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                            <div className="space-y-4 flex-1">
                              <div className="flex items-start justify-between">
                                <div>
                                  <div className="flex items-center gap-3 mb-1">
                                    <h3 className="text-xl font-bold text-white">{appt.client}</h3>
                                    <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border ${
                                      appt.status === 'pending' ? 'bg-orange-500/10 text-orange-500 border-orange-500/20' :
                                      appt.status === 'accepted' ? 'bg-green-500/10 text-green-500 border-green-500/20' :
                                      'bg-white/5 text-white/40 border-white/10'
                                    }`}>
                                      {appt.status}
                                    </span>
                                  </div>
                                  <div className="flex items-center text-white/40 text-sm gap-4">
                                    <span className="flex items-center gap-1.5"><Briefcase size={14} /> {appt.company}</span>
                                    <span className="flex items-center gap-1.5"><Clock size={14} /> {appt.time}</span>
                                  </div>
                                </div>
                                <button 
                                  onClick={() => deleteAppointment(appt.id)}
                                  className="p-2 text-white/20 hover:text-red-500 transition-colors"
                                >
                                  <Trash2 size={18} />
                                </button>
                              </div>
                              
                              <div className="bg-black/50 p-4 rounded-2xl border border-white/5">
                                <h4 className="text-[10px] text-white/30 uppercase font-bold tracking-widest mb-2 flex items-center gap-2">
                                  <MessageSquare size={12} /> Agenda
                                </h4>
                                <p className="text-sm text-white/70 leading-relaxed">{appt.reason}</p>
                              </div>
                            </div>

                            <div className="flex flex-col gap-3 min-w-[160px]">
                              {appt.status === 'pending' ? (
                                <button
                                  onClick={() => updateStatus(appt.id, 'accepted')}
                                  className="flex items-center justify-center gap-2 bg-white text-black px-6 py-3 rounded-xl text-sm font-bold hover:scale-[1.02] active:scale-95 transition-all"
                                >
                                  <CheckCircle size={16} /> Accept
                                </button>
                              ) : appt.status === 'accepted' ? (
                                <button
                                  onClick={() => updateStatus(appt.id, 'completed')}
                                  className="flex items-center justify-center gap-2 bg-green-500/10 text-green-500 border border-green-500/20 px-6 py-3 rounded-xl text-sm font-bold hover:bg-green-500/20 transition-all"
                                >
                                  <CheckCircle size={16} /> Mark Done
                                </button>
                              ) : null}
                              
                              {appt.status !== 'cancelled' && (
                                <button
                                  onClick={() => updateStatus(appt.id, 'cancelled')}
                                  className="flex items-center justify-center gap-2 bg-white/5 text-white/40 hover:text-white px-6 py-3 rounded-xl text-sm font-medium transition-all"
                                >
                                  <XCircle size={16} /> Decline
                                </button>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          /* History View */
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-neutral-900 border border-white/5 p-6 rounded-3xl">
                <p className="text-[10px] uppercase tracking-widest text-white/30 font-bold mb-1">Total Requests</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <div className="bg-neutral-900 border border-white/5 p-6 rounded-3xl">
                <p className="text-[10px] uppercase tracking-widest text-white/30 font-bold mb-1">Completed</p>
                <p className="text-2xl font-bold text-green-500">{stats.completed}</p>
              </div>
              <div className="bg-neutral-900 border border-white/5 p-6 rounded-3xl">
                <p className="text-[10px] uppercase tracking-widest text-white/30 font-bold mb-1">Cancelled</p>
                <p className="text-2xl font-bold text-red-500">{stats.cancelled}</p>
              </div>
              <div className="bg-neutral-900 border border-white/5 p-6 rounded-3xl">
                <p className="text-[10px] uppercase tracking-widest text-white/30 font-bold mb-1">Active</p>
                <p className="text-2xl font-bold text-blue-500">{stats.accepted}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              <div className="lg:col-span-8">
                <div className="bg-neutral-900 border border-white/5 rounded-3xl overflow-hidden">
                  <div className="px-6 py-4 border-b border-white/5 bg-white/[0.02] flex items-center justify-between">
                    <h3 className="font-bold text-sm uppercase tracking-widest text-white/60">Appointment History</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-white/5 bg-white/5">
                          <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-white/30 font-bold">Client</th>
                          <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-white/30 font-bold">Company</th>
                          <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-white/30 font-bold">Schedule</th>
                          <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-white/30 font-bold">Status</th>
                          <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-white/30 font-bold text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {safeAppointments.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="px-6 py-12 text-center text-white/20 italic">No appointment history found.</td>
                          </tr>
                        ) : (
                          safeAppointments
                            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                            .map((appt) => (
                            <tr key={appt.id} className={`group hover:bg-white/[0.02] transition-colors ${selectedAppointment?.id === appt.id ? 'bg-white/[0.05]' : ''}`}>
                              <td className="px-6 py-4">
                                <p className="font-bold">{appt.client}</p>
                                <p className="text-xs text-white/40">{appt.email}</p>
                              </td>
                              <td className="px-6 py-4 text-sm text-white/60">{appt.company}</td>
                              <td className="px-6 py-4 text-sm">
                                <p>{appt.date}</p>
                                <p className="text-xs text-white/40">{appt.time}</p>
                              </td>
                              <td className="px-6 py-4">
                                <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border ${
                                  appt.status === 'pending' ? 'bg-orange-500/10 text-orange-500 border-orange-500/20' :
                                  appt.status === 'accepted' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' :
                                  appt.status === 'completed' ? 'bg-green-500/10 text-green-500 border-green-500/20' :
                                  'bg-red-500/10 text-red-500 border-red-500/20'
                                }`}>
                                  {appt.status}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <button 
                                    onClick={() => setSelectedAppointment(appt)}
                                    className={`p-2 rounded-lg transition-colors ${selectedAppointment?.id === appt.id ? 'bg-white text-black' : 'text-white/20 hover:text-white hover:bg-white/5'}`}
                                  >
                                    <Clock3 size={16} />
                                  </button>
                                  <button 
                                    onClick={() => deleteAppointment(appt.id)}
                                    className="p-2 text-white/20 hover:text-red-500 transition-colors"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-4 space-y-6">
                <div className="bg-neutral-900 border border-white/5 rounded-3xl p-6 h-full flex flex-col">
                  <h3 className="font-bold text-sm uppercase tracking-widest text-white/60 mb-6 flex items-center gap-2">
                    <History size={16} /> Activity Log
                  </h3>
                  
                  {selectedAppointment ? (
                    <div className="flex-1 space-y-6">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-bold text-lg">{selectedAppointment.client}</h4>
                          <button onClick={() => setSelectedAppointment(null)} className="text-white/20 hover:text-white"><XCircle size={18} /></button>
                        </div>
                        <p className="text-sm text-white/40">{selectedAppointment.company}</p>
                      </div>

                      <div className="space-y-4">
                        {(selectedAppointment.logs || [
                          { status: selectedAppointment.status, timestamp: selectedAppointment.requested, note: "Appointment created" }
                        ]).map((log, i) => (
                          <div key={i} className="relative pl-6 border-l border-white/10 pb-4 last:pb-0">
                            <div className={`absolute left-[-5px] top-0 w-2 h-2 rounded-full ${
                              log.status === 'pending' ? 'bg-orange-500' :
                              log.status === 'accepted' ? 'bg-blue-500' :
                              log.status === 'completed' ? 'bg-green-500' :
                              'bg-red-500'
                            }`} />
                            <p className="text-[10px] text-white/30 uppercase font-bold tracking-widest mb-1">
                              {new Date(log.timestamp).toLocaleString('en-US', { 
                                month: 'short', 
                                day: 'numeric', 
                                hour: '2-digit', 
                                minute: '2-digit' 
                              })}
                            </p>
                            <p className="text-sm text-white/70">{log.note || `Status changed to ${log.status}`}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                      <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mb-4 text-white/10">
                        <Clock3 size={24} />
                      </div>
                      <p className="text-white/40 text-sm">Select an appointment to view detailed activity logs.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
