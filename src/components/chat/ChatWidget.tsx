"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Loader2, Bot, Trash2, ThumbsUp, ThumbsDown } from "lucide-react";

type Message = {
  role: "user" | "bot";
  content: string;
  type?: "text" | "slots";
  availableSlots?: Slot[];
};

type Slot = {
  id?: string | number;
  date: string;
  time: string;
  displayDate?: string;
};

// Mock history data based on the image
const historyItems = [
  { id: 1, title: "Create welcome form" },
  { id: 2, title: "Instructions" },
  { id: 3, title: "Career" },
  { id: 4, title: "Onboarding" },
];


export function ChatWidget() {
  const [sessionId] = useState(() => "session_" + Math.random().toString(36).substring(7));
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "bot",
      content: "Hello. Welcome to SISU Mentorship. I am here to help you learn about the program or book a session with RATS. How can I help you today?",
    },
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
    setMessages((prev) => [...prev, { role: "user", content: userMsg }]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMsg,
          history: messages.slice(0, -1), // send previous messages as history
          sessionId,
        }),
      });

      const data = await response.json();

      if (data.reply) {
        setMessages((prev) => [
          ...prev,
          {
            role: "bot",
            content: data.reply,
            type: data.type,
            availableSlots: data.availableSlots,
          },
        ]);
      } else {
        const errorDetail = data.details ? ` (${data.details})` : "";
        setMessages((prev) => [
          ...prev,
          { role: "bot", content: `Sorry, something went wrong.${errorDetail} Please try again.` },
        ]);
      }
    } catch (error) {
      console.error(error);
      setMessages((prev) => [
        ...prev,
        { role: "bot", content: "Sorry, something went wrong. Please try again." },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSlotSelect = async (slot: Slot) => {
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
          sessionId,
          history: messages,
        }),
      });

      const data = await response.json();
      if (data.reply) {
        setMessages((prev) => [
          ...prev,
          { role: "bot", content: data.reply, type: data.type, availableSlots: data.availableSlots },
        ]);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleClearHistory = () => {
    setMessages([
        {
          role: "bot",
          content: "Hello. Welcome to SISU Mentorship. I am here to help you learn about the program or book a session with RATS. How can I help you today?",
        },
      ]);
  }

  return (
    <div className="flex h-screen bg-[#343541] text-white font-sans">
      {/* Left Sidebar */}
      <div className="w-64 bg-[#202123] p-4 flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-3 p-2 rounded-lg mb-4">
             <Bot size={28}/>
             <h2 className="text-xl font-semibold">SISU AI</h2>
          </div>
          <ul>
            <li className="mb-2">
              <a href="#" className="flex items-center gap-3 p-3 rounded-lg bg-[#343541] text-white">
                <Bot size={20} />
                <span>AI Chat Helper</span>
              </a>
            </li>
          </ul>
        </div>
        <div>
          {/* Pro Plan and Log out can be added here later */}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        <div className="flex-1 overflow-y-auto p-6">
            <div className="max-w-4xl mx-auto">
                {messages.map((msg, idx) => (
                    <div key={idx} className={`py-6 px-4 rounded-lg flex gap-4 ${msg.role === 'bot' ? 'bg-[#444654]' : 'bg-transparent'}`}>
                        <div className={`w-8 h-8 rounded ${msg.role === 'bot' ? 'bg-green-500' : 'bg-blue-500'} flex items-center justify-center`}>
                           {msg.role === 'bot' ? <Bot size={20}/> : 'U'}
                        </div>
                        <div className="flex-1">
                            <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                            {msg.type === "slots" && msg.availableSlots && (
                                <div className="mt-4 space-y-2">
                                    <p className="font-semibold">Available Slots:</p>
                                    {msg.availableSlots.map((slot) => (
                                    <button
                                        key={slot.id}
                                        onClick={() => handleSlotSelect(slot)}
                                        className="block w-full text-left p-3 bg-[#343541] rounded-lg hover:bg-[#202123] transition-all text-sm font-medium"
                                    >
                                        {slot.displayDate || slot.date} at {slot.time}
                                    </button>
                                    ))}
                                </div>
                            )}
                            {msg.role === 'bot' && idx > 0 && (
                                <div className="flex gap-2 mt-4 text-gray-400">
                                    <button className="hover:text-white"><ThumbsUp size={16}/></button>
                                    <button className="hover:text-white"><ThumbsDown size={16}/></button>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
                {isLoading && (
                    <div className="py-6 px-4 rounded-lg flex gap-4 bg-[#444654]">
                        <div className="w-8 h-8 rounded bg-green-500 flex items-center justify-center">
                            <Bot size={20}/>
                        </div>
                        <div className="flex items-center gap-2 text-white/70">
                        <Loader2 size={16} className="animate-spin" />
                        <span>SISU is thinking...</span>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>
        </div>

        {/* Input area */}
        <div className="p-6">
          <div className="max-w-4xl mx-auto">
            <div className="relative">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !isLoading && handleSend()}
                placeholder="Start typing..."
                className="w-full bg-[#40414f] border border-gray-600 rounded-lg py-4 pl-4 pr-12 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500"
                disabled={isLoading}
              />
              <button
                onClick={handleSend}
                disabled={isLoading || !input.trim()}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-lg bg-orange-600 text-white disabled:bg-gray-500 transition-colors"
              >
                <Send size={20} />
              </button>
            </div>
             <p className="text-center text-xs text-gray-400 mt-2">
                Free Research Preview. SISU AI may produce inaccurate information about people, places, or facts.
            </p>
          </div>
        </div>
      </div>

      {/* Right Sidebar */}
      <div className="w-72 bg-[#202123] p-4 flex flex-col">
        <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">History</h2>
            <button onClick={handleClearHistory} className="text-gray-400 hover:text-white">
                <Trash2 size={20}/>
            </button>
        </div>
        <div className="flex-1 overflow-y-auto">
           <ul>
               {historyItems.map(item => (
                   <li key={item.id} className="p-3 mb-2 rounded-lg hover:bg-[#343541] cursor-pointer text-sm truncate">
                       {item.title}
                   </li>
               ))}
           </ul>
        </div>
        <button onClick={handleClearHistory} className="w-full flex items-center justify-center gap-2 p-3 rounded-lg border border-gray-600 hover:bg-gray-700 transition-colors">
            <Trash2 size={16} />
            <span>Clear history</span>
        </button>
      </div>
    </div>
  );
}
