"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { Target, Users, CalendarDays, Eye, Workflow } from "lucide-react";

const features = [
  { icon: Target, title: "1-on-1 Mentorship", desc: "Personalized guidance tailored to your specific challenges and goals." },
  { icon: Eye, title: "Eagle-eye Perspective", desc: "Seeing the blind spots and opportunities that founders often miss." },
  { icon: Workflow, title: "Founder-driven Goals", desc: "You set the destination; we build the systems to get you there." },
  { icon: Users, title: "Team Interaction", desc: "Working alongside your team when required to ensure alignment." },
  { icon: CalendarDays, title: "1-Year Commitment", desc: "Sustainable transformation requires time. We commit for the long haul." },
];

export function MentorshipProgram() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"],
  });

  const y = useTransform(scrollYProgress, [0, 1], [100, -100]);

  return (
    <section id="program" ref={containerRef} className="py-32 relative">
      <div className="max-w-7xl mx-auto px-6">
        <div className="mb-20">
          <h2 className="text-4xl md:text-6xl font-bold mb-6 tracking-tight">The SISU Experience</h2>
          <p className="text-xl text-muted max-w-2xl">A structured, immersive journey designed to develop systems and achieve sustainable, long-term results.</p>
        </div>

        <div className="grid lg:grid-cols-12 gap-12">
          {/* Pricing Card - Sticky */}
          <div className="lg:col-span-5 relative">
            <motion.div 
              style={{ y }}
              className="sticky top-32 glass-panel p-8 rounded-3xl border border-glass-border overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-accent/20 blur-[50px] rounded-full" />
              <h3 className="text-2xl font-bold mb-2">Program Investment</h3>
              <div className="flex items-baseline gap-2 mb-6">
                <span className="text-5xl font-bold tracking-tighter">₹15,000</span>
                <span className="text-muted">/ month</span>
              </div>
              
              <ul className="space-y-4 mb-8">
                <li className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-accent" />
                  <span>2 dedicated sittings with RATS</span>
                </li>
                <li className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-accent" />
                  <span>Access to resources & frameworks</span>
                </li>
                <li className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-accent" />
                  <span>Direct WhatsApp access</span>
                </li>
              </ul>

              <button 
                onClick={() => {
                  document.getElementById('booking')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="w-full bg-foreground text-background py-4 rounded-xl font-medium hover:bg-white/90 transition-colors"
              >
                Apply Now
              </button>
              <p className="text-center text-sm text-muted mt-4">*This is a 12-month annual commitment</p>
            </motion.div>
          </div>

          {/* Storytelling Blocks */}
          <div className="lg:col-span-7 space-y-8">
            {features.map((feature, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.6, delay: idx * 0.1 }}
                className="group p-8 rounded-3xl glass-panel hover:bg-white/5 transition-colors"
              >
                <div className="w-12 h-12 rounded-2xl bg-accent/20 flex items-center justify-center mb-6 text-accent group-hover:scale-110 transition-transform">
                  <feature.icon size={24} />
                </div>
                <h4 className="text-2xl font-bold mb-3">{feature.title}</h4>
                <p className="text-muted leading-relaxed">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
