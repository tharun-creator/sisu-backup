"use client";

import { motion } from "framer-motion";
import { Globe, Users, Zap, BookOpen } from "lucide-react";

const locations = [
  "United States", "United Kingdom", "Tokyo Japan", "Tehran Iran", 
  "Sydney Australia", "Spain", "Southeast Asia", "South America", 
  "South Africa", "Shanghai China", "Seoul South Korea", "Russia", 
  "Mumbai India", "Middle East", "Kolkata India", "Kochi Kerala India", 
  "Italy", "Istanbul Turkey", "Hyderabad", "Hong Kong China"
];

const audiences = [
  "YPO", "Young Professionals", "Venture Capital", "Underserved Communities", 
  "Start-ups", "Sports", "Non-Profits", "Individuals", "Housewives", 
  "Founders / CEOs", "Executives", "Entrepreneurs", "Entertainment Industry", 
  "Development Organizations", "Corporates"
];

export function Profile() {
  return (
    <section id="profile" className="py-32 relative">
      <div className="max-w-7xl mx-auto px-6">
        <div className="mb-20 text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-6 tracking-tight">The Visionary</h2>
          <p className="text-xl text-muted max-w-2xl mx-auto">Empowering individuals, teams, and economies with mindsets, skillsets, and toolsets for the future.</p>
        </div>

        <div className="grid md:grid-cols-12 gap-8">
          
          {/* Statement */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="md:col-span-12 glass-panel p-10 md:p-12 rounded-3xl"
          >
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center text-accent">
                <Globe size={24} />
              </div>
              <h3 className="text-2xl font-bold">Statement</h3>
            </div>
            <p className="text-lg text-muted leading-relaxed max-w-5xl">
              A company builder and a serial experimenter in global exponential tech. His superpower is to enable &apos;that abundant future&apos;. He trains humans making it relatable to individuals, doable for teams, teachable for educators, attainable for CEO&apos;s and adaptable for economies. He facilitates this by empowering them with - <span className="text-foreground font-medium">Mindsets, Skillsets and Toolsets</span> - for AI being a responsible &amp; visible force for good.
            </p>
          </motion.div>

          {/* AI Trainer Profile */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="md:col-span-8 glass-panel p-10 md:p-12 rounded-3xl"
          >
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center text-accent">
                <BookOpen size={24} />
              </div>
              <h3 className="text-2xl font-bold">AI Trainer Profile</h3>
            </div>
            <div className="space-y-4 text-muted leading-relaxed">
              <p><span className="text-foreground font-medium">Ratheesh Krishnan</span> believes in &quot;Making a difference to make a living!&quot; Fondly known as Rats, today he is the Director of SPI Edge, a for-profit entity that nurtures a new breed of disruptive businesses built to benefit from the emerging technologies.</p>
              <p>His formative experiences in social entrepreneurship include working with the founding teams of Teach for India (TFI), Make A Difference (MAD), Bhumi College, Punnagaiyin Mugavari and the Headstart Network Foundation. He is most affectionately known as a mentor and a coach who provokes measurable change in the pattern of how individuals, teams and organizations work.</p>
              <p>His involvement with Start-ups, Scale-ups, MSME&apos;s, Institutional Players, Governments, Consulting Firms and several communities across 15+ countries enables the collective foresight and imagination for all. A graduate in Psychology with 7 International certifications under his belt, he is credited with 2 patents named &apos;Lattice Progression&apos; in Mathematics and &apos;Skill Hacking&apos; in Learning &amp; Development.</p>
              <p>His mission is to enable purpose-driven entrepreneurs to fulfil their potential, thus making a better world. He continues to behave as a kaleidoscope serving as a People Scientist, Possibilist, Raconteur Dreamcatcher, Idea Therapist, Gogiver, Troublemaker and a Culture engineer in contexts that vary with the diversity of projects that people give him permission to participate in.</p>
            </div>
          </motion.div>

          {/* Teaching Style */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="md:col-span-4 glass-panel p-10 md:p-12 rounded-3xl flex flex-col justify-center"
          >
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center text-accent">
                <Zap size={24} />
              </div>
              <h3 className="text-2xl font-bold">Teaching Style</h3>
            </div>
            <p className="text-3xl font-light text-foreground leading-tight">
              <span className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-accent to-accent-hover">Energy, Enthusiasm, Execution</span> and <span className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-accent to-accent-hover">Edge</span> are adjectives you are sure to tag him with!
            </p>
          </motion.div>

          {/* Travel & Audience */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
            className="md:col-span-6 glass-panel p-10 md:p-12 rounded-3xl"
          >
            <h3 className="text-xl font-bold mb-6 flex items-center gap-3">
              <Globe size={20} className="text-accent" /> Can Travel To
            </h3>
            <div className="flex flex-wrap gap-2">
              {locations.map(loc => (
                <span key={loc} className="px-3 py-1.5 rounded-full border border-glass-border bg-white/5 text-sm text-muted">
                  {loc}
                </span>
              ))}
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.4 }}
            className="md:col-span-6 glass-panel p-10 md:p-12 rounded-3xl"
          >
            <h3 className="text-xl font-bold mb-6 flex items-center gap-3">
              <Users size={20} className="text-accent" /> Audience
            </h3>
            <div className="flex flex-wrap gap-2">
              {audiences.map(aud => (
                <span key={aud} className="px-3 py-1.5 rounded-full border border-glass-border bg-accent/10 text-accent text-sm font-medium">
                  {aud}
                </span>
              ))}
            </div>
          </motion.div>

        </div>
      </div>
    </section>
  );
}
