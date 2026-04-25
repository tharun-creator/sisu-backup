'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { CreditCard, ShieldCheck, UserRound } from 'lucide-react';

export function BookingSection() {
  const points = [
    {
      icon: UserRound,
      title: 'Create your member account',
      body: 'Save your profile once instead of typing your details every time you need a session.',
    },
    {
      icon: ShieldCheck,
      title: 'Verify your email',
      body: 'We validate the email format and confirm ownership with a one-time verification code.',
    },
    {
      icon: CreditCard,
      title: 'Pay Rs.15,000 and unlock booking',
      body: 'After payment is confirmed, your member dashboard can book meetings with RATS directly.',
    },
  ];

  return (
    <section id="booking" className="py-32 bg-black relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_45%)] pointer-events-none" />

      <div className="max-w-6xl mx-auto px-6 relative">
        <div className="max-w-3xl mb-14">
          <p className="text-sm uppercase tracking-[0.3em] text-white/40 mb-4">Member Booking</p>
          <h2 className="text-4xl md:text-6xl font-bold tracking-tight mb-5">
            Book professionally, not repeatedly.
          </h2>
          <p className="text-lg text-white/55 leading-relaxed">
            SISU now uses a verified member flow. That means better account security, payment-gated booking,
            and a cleaner experience for returning clients.
          </p>
        </div>

        <div className="grid lg:grid-cols-[1.2fr_0.8fr] gap-8 items-stretch">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="rounded-[2.5rem] border border-white/10 bg-white/5 p-8 md:p-10"
          >
            <div className="space-y-5">
              {points.map((point) => {
                const Icon = point.icon;
                return (
                  <div key={point.title} className="flex gap-4 rounded-[1.75rem] border border-white/8 bg-black/30 p-5">
                    <div className="w-12 h-12 rounded-2xl bg-white text-black grid place-items-center shrink-0">
                      <Icon size={20} />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold mb-2">{point.title}</h3>
                      <p className="text-white/50 leading-relaxed">{point.body}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="rounded-[2.5rem] border border-white/10 bg-white text-black p-8 md:p-10 flex flex-col justify-between"
          >
            <div>
              <p className="text-sm uppercase tracking-[0.25em] text-black/40 mb-4">Members Only</p>
              <h3 className="text-3xl font-bold tracking-tight mb-4">
                Verified members can pay once and book faster.
              </h3>
              <p className="text-black/65 leading-relaxed">
                Use the member dashboard to verify your account, complete billing, and request sessions with RATS
                without re-entering your profile every time.
              </p>
            </div>

            <div className="space-y-3 mt-10">
              <Link
                href="/members"
                className="block text-center rounded-2xl bg-black text-white px-6 py-4 font-semibold hover:opacity-90 transition-opacity"
              >
                Open Member Dashboard
              </Link>
              <Link
                href="#home"
                className="block text-center rounded-2xl border border-black/10 px-6 py-4 font-medium hover:bg-black/5 transition-colors"
              >
                Keep exploring SISU
              </Link>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
