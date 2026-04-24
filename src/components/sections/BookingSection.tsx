'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ChatCalendar } from '../chat/ChatCalendar';
import { CheckCircle2, Loader2 } from 'lucide-react';

export function BookingSection() {
  const [step, setStep] = useState<'details' | 'calendar' | 'success'>('details');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    company: '',
    email: '',
    reason: '',
  });
  const [selectedSlot, setSelectedSlot] = useState<{ date: string; time: string } | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleDetailsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setStep('calendar');
  };

  const handleBooking = async (date: string, time: string) => {
    setLoading(true);
    setError('');
    setSelectedSlot({ date, time });

    try {
      // We'll reuse the appointment logic by calling the same API structure
      // or creating a dedicated booking endpoint if needed.
      // For now, let's use a new direct submission to /api/appointments
      const appt = {
        client: formData.name,
        company: formData.company,
        email: formData.email,
        reason: formData.reason,
        date,
        time,
      };

      const response = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(appt),
      });

      if (response.ok) {
        setStep('success');
      } else {
        const data = await response.json().catch(() => null);
        setError(data?.error || 'Booking failed. Please try again.');
      }
    } catch (error) {
      console.error('Booking error:', error);
      setError('Booking failed. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section id="booking" className="py-32 bg-black relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-accent/10 blur-[120px] rounded-full pointer-events-none" />

      <div className="max-w-4xl mx-auto px-6 relative">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">Book Your Session</h2>
          <p className="text-muted text-lg">Select a time to discuss your growth with RATS.</p>
        </div>

        <div className="glass-panel p-8 md:p-12 rounded-[40px] border border-glass-border">
          {step === 'details' && (
            <motion.form 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              onSubmit={handleDetailsSubmit} 
              className="space-y-6"
            >
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted ml-1">Full Name</label>
                  <input
                    required
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="John Doe"
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-accent/50 transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted ml-1">Company Name</label>
                  <input
                    required
                    name="company"
                    value={formData.company}
                    onChange={handleInputChange}
                    placeholder="Acme Inc"
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-accent/50 transition-all"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted ml-1">Email Address</label>
                <input
                  required
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="john@example.com"
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-accent/50 transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted ml-1">What would you like to discuss?</label>
                <textarea
                  required
                  name="reason"
                  value={formData.reason}
                  onChange={handleInputChange}
                  rows={4}
                  placeholder="Scaling strategies, system design, etc."
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-accent/50 transition-all resize-none"
                />
              </div>
              <button
                type="submit"
                className="w-full bg-foreground text-background py-5 rounded-2xl font-bold text-lg hover:bg-white/90 transition-all active:scale-[0.98]"
              >
                Continue to Calendar
              </button>
            </motion.form>
          )}

          {step === 'calendar' && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-8"
            >
              <div className="flex items-center justify-between mb-4">
                <button 
                  onClick={() => setStep('details')}
                  className="text-sm text-muted hover:text-white transition-colors"
                >
                  ← Back to details
                </button>
                <div className="text-right">
                  <p className="text-sm font-medium">{formData.name}</p>
                  <p className="text-xs text-muted">{formData.company}</p>
                </div>
              </div>

              <div className="max-w-md mx-auto">
                <ChatCalendar onSelect={handleBooking} />
              </div>

              {loading && (
                <div className="flex flex-col items-center justify-center gap-3 py-4">
                  <Loader2 className="animate-spin text-accent" size={32} />
                  <p className="text-sm text-muted">Booking your session...</p>
                </div>
              )}

              {error && (
                <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                  {error}
                </div>
              )}
            </motion.div>
          )}

          {step === 'success' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-12 space-y-6"
            >
              <div className="flex justify-center">
                <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center text-green-500">
                  <CheckCircle2 size={48} />
                </div>
              </div>
              <div className="space-y-2">
                <h3 className="text-3xl font-bold">Request Received!</h3>
                <p className="text-muted max-w-sm mx-auto">
                  RATS will review your request for <strong>{selectedSlot?.date}</strong> at <strong>{selectedSlot?.time}</strong> and confirm via email shortly.
                </p>
              </div>
              <button
                onClick={() => {
                  setStep('details');
                  setError('');
                  setFormData({ name: '', company: '', email: '', reason: '' });
                }}
                className="bg-white/10 hover:bg-white/20 px-8 py-3 rounded-xl transition-colors text-sm font-medium"
              >
                Book another session
              </button>
            </motion.div>
          )}
        </div>
      </div>
    </section>
  );
}
