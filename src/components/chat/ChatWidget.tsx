"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, X, Send, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { ChatCalendar } from "./ChatCalendar";

type Message = {
  role: "user" | "bot";
  content: string;
  type?: "text" | "date-picker" | "slots";
  availableSlots?: Slot[];
};

type Slot = {
  id?: string | number;
  date: string;
  time: string;
  displayDate?: string;
};

export function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [sessionId] = useState(() => "session_" + Math.random().toString(36).substring(7));
  const [messages, setMessages] = useState<Message[]>([
    { role: "bot", content: "Hello. Welcome to SISU Mentorship.\nI am here to help you learn about the program or book a session with RATS.\nHow can I help you today?" }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMsg = input.trim();
    setInput("");

    if (userMsg.toLowerCase() === "reset") {
      setMessages([
        { role: "bot", content: "Conversation reset. How can I help you today?" }
      ]);
      return;
    }

    setMessages((prev) => [...prev, { role: "user", content: userMsg }]);
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMsg, sessionId }),
      });

      const data = await response.json();
      
      if (data.reply) {
        setMessages((prev) => [...prev, { 
          role: "bot", 
          content: data.reply,
          type: data.type,
          availableSlots: data.availableSlots
        }]);
      } else {
        const errorDetail = data.details ? ` (${data.details})` : "";
        setMessages((prev) => [...prev, { role: "bot", content: `Sorry, something went wrong.${errorDetail} Please try again.` }]);
      }
    } catch (error) {
      console.error(error);
      setMessages((prev) => [...prev, { role: "bot", content: "Sorry, something went wrong. Please try again." }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDateSelect = async (date: string, time: string) => {
    const userMsg = `I'll pick ${date} at ${time}`;
    setMessages((prev) => [...prev, { role: "user", content: userMsg }]);
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          message: userMsg,
          selectedSlot: { date, time },
          sessionId 
        }),
      });
      
      const data = await response.json();
      if (data.reply) {
        setMessages((prev) => [...prev, { role: "bot", content: data.reply }]);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSlotSelect = async (slot: Slot) => {
    // Use displayDate if available, otherwise fall back to date
    const displayDate = slot.displayDate || slot.date;
    const userMsg = `I'll pick ${displayDate} at ${slot.time}`;
    setMessages((prev) => [...prev, { role: "user", content: userMsg }]);
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          message: userMsg,
          selectedSlot: slot,
          sessionId 
        }),
      });
      
      const data = await response.json();
      if (data.reply) {
        setMessages((prev) => [...prev, { role: "bot", content: data.reply, type: data.type, availableSlots: data.availableSlots }]);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <motion.button
        onClick={() => setIsOpen(true)}
        className={cn(
          "fixed bottom-8 right-8 z-50 p-4 rounded-full bg-foreground text-background shadow-2xl hover:scale-110 transition-transform",
          isOpen ? "hidden" : "block"
        )}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
      >
        <MessageSquare size={28} />
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            className="fixed bottom-8 right-8 z-50 w-96 h-[32rem] glass-panel rounded-3xl flex flex-col overflow-hidden shadow-2xl"
          >
            {/* Header */}
            <div className="p-4 border-b border-glass-border flex items-center justify-between bg-white/5">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center text-white font-bold text-sm">
                  S
                </div>
                <div>
                  <h3 className="font-semibold text-sm">SISU Concierge</h3>
                  <p className="text-xs text-muted">Online</p>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-2 hover:bg-white/10 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((msg, idx) => (
                <div key={idx} className="space-y-2">
                  <div
                    className={cn(
                      "max-w-[85%] p-4 rounded-3xl text-sm whitespace-pre-wrap leading-relaxed shadow-sm",
                      msg.role === "user" 
                        ? "ml-auto bg-blue-600 text-white rounded-br-none"
                        : "mr-auto bg-white/10 text-white rounded-bl-none border border-white/5"
                    )}
                  >
                    {msg.content}
                  </div>
                  {msg.type === "date-picker" && (
                    <ChatCalendar onSelect={handleDateSelect} />
                  )}
                  {msg.type === "slots" && msg.availableSlots && (
                    <div className="space-y-2">
                      {msg.availableSlots.map((slot) => (
                        <button
                          key={slot.id}
                          onClick={() => handleSlotSelect(slot)}
                          className="block w-full text-left p-4 bg-white/10 rounded-2xl hover:bg-white/20 transition-all text-sm font-medium border border-white/5 hover:scale-[1.02] active:scale-95"
                        >
                          {slot.displayDate || slot.date} at {slot.time}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              {isLoading && (
                <div className="flex items-center gap-2 text-white/40 text-xs px-2">
                  <Loader2 size={12} className="animate-spin" />
                  <span>SISU is thinking...</span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 bg-white/5 border-t border-white/5">
              <div className="relative flex items-center gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSend()}
                  placeholder="Type your message..."
                  className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-5 py-3 text-sm focus:outline-none focus:border-blue-500/50 transition-all"
                  disabled={isLoading}
                />
                <button
                  onClick={handleSend}
                  disabled={isLoading || !input.trim()}
                  className="p-3 rounded-xl bg-blue-600 text-white disabled:opacity-50 disabled:bg-white/10 transition-all hover:scale-110 active:scale-90"
                >
                  <Send size={18} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
