"use client";

import { motion } from "framer-motion";

export function About() {
  return (
    <section id="about" className="py-32 relative overflow-hidden">
      <div className="absolute inset-0 bg-white/[0.02]" />
      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <div className="grid md:grid-cols-2 gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="space-y-6"
          >
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight">Who is RATS?</h2>
            <div className="h-1 w-20 bg-accent rounded-full" />
            <p className="text-xl text-muted leading-relaxed">
              A social entrepreneur and founder coach with deep expertise in helping founders build scalable systems.
            </p>
            <p className="text-muted leading-relaxed">
              With a background at the SBI group and as an ex-Sathyam Cinemas executive, RATS brings a unique blend of corporate discipline and entrepreneurial agility. He works closely with founders and young professionals to navigate the complexities of building a business without losing their minds.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1 }}
            className="relative"
          >
            <div className="aspect-[4/5] rounded-3xl overflow-hidden bg-neutral-900 border border-white/5 relative group">
               <img
                  src="/images/founder.jpg"
                  alt="RATS - SISU Founder"
                  className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-60" />
                <div className="absolute bottom-8 left-8">
                  <p className="text-2xl font-bold tracking-tighter">RATS</p>
                  <p className="text-white/40 text-sm font-medium">Founder & Coach</p>
                </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
