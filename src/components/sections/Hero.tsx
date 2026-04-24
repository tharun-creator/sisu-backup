"use client";

import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

export function Hero() {
  return (
    <section id="home" className="relative min-h-screen flex items-center pt-20 overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-96 h-96 bg-accent/20 blur-[120px] rounded-full pointer-events-none" />
      
      <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-12 items-center z-10 w-full">
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="space-y-8"
        >
          <div className="inline-block px-4 py-1.5 rounded-full border border-glass-border glass-panel text-sm text-muted">
            The RATS Mentorship Program
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold leading-tight tracking-tighter">
            Transform <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent to-accent-hover">Founders</span>,
            <br />Not Just Businesses
          </h1>
          
          <p className="text-lg md:text-xl text-muted max-w-lg leading-relaxed">
            Build systems, gain clarity, and create long-term impact. 
            A premium 1-on-1 mentorship experience designed for visionary entrepreneurs.
          </p>
          
          <div className="flex items-center gap-4 pt-4">
            <button 
              onClick={() => document.getElementById('booking')?.scrollIntoView({ behavior: 'smooth' })}
              className="flex items-center gap-2 bg-foreground text-background px-8 py-4 rounded-full font-medium hover:scale-105 transition-all"
            >
              Start Your Journey <ArrowRight size={20} />
            </button>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, delay: 0.4 }}
          className="relative h-[600px] rounded-3xl overflow-hidden bg-neutral-900 border border-white/5"
        >
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent z-10" />
          <img
            src="/images/founder.jpg"
            alt="Founder Coach RATS"
            className="w-full h-full object-cover object-center grayscale hover:grayscale-0 transition-all duration-700"
          />
          <div className="absolute bottom-8 left-8 z-20">
            <h3 className="text-2xl font-bold tracking-tighter">RATS</h3>
            <p className="text-white/40 text-sm font-medium">Founder Coach & Strategist</p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
