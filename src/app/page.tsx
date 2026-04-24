"use client";

import { useState } from "react";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import { Navbar } from "@/components/layout/Navbar";
import { Hero } from "@/components/sections/Hero";
import { MentorshipProgram } from "@/components/sections/MentorshipProgram";
import { About } from "@/components/sections/About";
import { Profile } from "@/components/sections/Profile";
import { BookingSection } from "@/components/sections/BookingSection";
import { ChatWidget } from "@/components/chat/ChatWidget";

export default function Home() {
  const [loading, setLoading] = useState(true);

  return (
    <main className="bg-background min-h-screen">
      {loading ? (
        <LoadingScreen onComplete={() => setLoading(false)} />
      ) : (
        <>
          <Navbar />
          <Hero />
          <MentorshipProgram />
          <About />
          <Profile />
          <BookingSection />
          <ChatWidget />
        </>
      )}
    </main>
  );
}
