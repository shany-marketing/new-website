"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import ChatMessage from "./chat-message";
import type { ChartSpec } from "@/types/chart";

interface Message {
  role: "user" | "assistant";
  text: string;
  chart?: ChartSpec;
}

interface ChatDrawerProps {
  hotelId: string;
}

export default function ChatDrawer({ hotelId }: ChatDrawerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-expand when a chart arrives
  const hasCharts = messages.some((m) => m.chart);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Auto-expand on first chart
  useEffect(() => {
    if (hasCharts && !expanded) setExpanded(true);
  }, [hasCharts, expanded]);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    const userMessage: Message = { role: "user", text };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput("");
    setIsLoading(true);

    try {
      const res = await fetch(`/api/hotels/${hotelId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: updatedMessages.map((m) => ({
            role: m.role,
            content: m.text,
          })),
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Request failed" }));
        setMessages((prev) => [
          ...prev,
          { role: "assistant", text: `Error: ${err.error ?? "Something went wrong"}` },
        ]);
        setIsLoading(false);
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) {
        setIsLoading(false);
        return;
      }

      const decoder = new TextDecoder();
      let assistantText = "";
      let assistantChart: ChartSpec | undefined;
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        // Keep the last incomplete line in the buffer
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const event = JSON.parse(line.slice(6));
            if (event.type === "text") {
              assistantText += event.text;
              setMessages((prev) => {
                const updated = [...prev];
                const lastMsg = updated[updated.length - 1];
                if (lastMsg?.role === "assistant") {
                  lastMsg.text = assistantText;
                  lastMsg.chart = assistantChart;
                } else {
                  updated.push({
                    role: "assistant",
                    text: assistantText,
                    chart: assistantChart,
                  });
                }
                return [...updated];
              });
            } else if (event.type === "chart") {
              assistantChart = event.chart;
              setMessages((prev) => {
                const updated = [...prev];
                const lastMsg = updated[updated.length - 1];
                if (lastMsg?.role === "assistant") {
                  lastMsg.chart = assistantChart;
                } else {
                  updated.push({
                    role: "assistant",
                    text: assistantText,
                    chart: assistantChart,
                  });
                }
                return [...updated];
              });
            } else if (event.type === "error") {
              assistantText += `\n\nError: ${event.error}`;
            }
          } catch {
            // skip malformed JSON
          }
        }
      }

      // Final message if nothing was streamed
      if (!assistantText && !assistantChart) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", text: "I couldn't generate a response. Please try again." },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: "Connection error. Please try again." },
      ]);
    }

    setIsLoading(false);
  }, [input, isLoading, messages, hotelId]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <>
      {/* Toggle Button — hidden when drawer is open (drawer has its own X close button) */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full shadow-lg shadow-gold/20 flex items-center justify-center transition-transform hover:scale-110"
          style={{
            background: "linear-gradient(135deg, var(--gold) 0%, var(--gold-dark) 100%)",
          }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1C2A39" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
          </svg>
        </button>
      )}

      {/* Drawer */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className={`fixed top-0 right-0 z-40 h-full flex flex-col transition-[width] duration-300 ease-in-out w-full ${
              expanded ? "sm:w-[55vw]" : "sm:w-[440px]"
            }`}
            style={{
              background: "var(--page-gradient)",
              borderLeft: "1px solid var(--glass-border)",
              boxShadow: "-10px 0 40px rgba(0,0,0,0.25)",
            }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-5 py-4 shrink-0"
              style={{ borderBottom: "1px solid var(--glass-border)" }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{
                    background: "linear-gradient(135deg, rgba(252,219,55,0.2), rgba(170,138,0,0.15))",
                    border: "1px solid rgba(252,219,55,0.2)",
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="2">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-foreground font-semibold text-sm">Elaine</h2>
                  <p className="text-muted text-xs">Your AI hotel assistant</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {/* Expand / collapse toggle */}
                <button
                  onClick={() => setExpanded(!expanded)}
                  className="hidden sm:flex text-muted hover:text-foreground transition-colors p-1.5 rounded-lg hover:bg-[var(--input-bg)]"
                  title={expanded ? "Collapse panel" : "Expand panel"}
                >
                  {expanded ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="4 14 10 14 10 20" />
                      <polyline points="20 10 14 10 14 4" />
                      <line x1="14" y1="10" x2="21" y2="3" />
                      <line x1="3" y1="21" x2="10" y2="14" />
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="15 3 21 3 21 9" />
                      <polyline points="9 21 3 21 3 15" />
                      <line x1="21" y1="3" x2="14" y2="10" />
                      <line x1="3" y1="21" x2="10" y2="14" />
                    </svg>
                  )}
                </button>
                {/* Open full page */}
                <Link
                  href={`/dashboard/${hotelId}/chat`}
                  className="hidden sm:flex text-muted hover:text-foreground transition-colors p-1.5 rounded-lg hover:bg-[var(--input-bg)]"
                  title="Open full page"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
                    <polyline points="15 3 21 3 21 9" />
                    <line x1="10" y1="14" x2="21" y2="3" />
                  </svg>
                </Link>
                {/* Close */}
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-muted hover:text-foreground transition-colors p-1.5 rounded-lg hover:bg-[var(--input-bg)]"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-center px-6">
                  <div
                    className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
                    style={{
                      background: "linear-gradient(135deg, rgba(252,219,55,0.15), rgba(170,138,0,0.1))",
                      border: "1px solid rgba(252,219,55,0.15)",
                    }}
                  >
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="1.5">
                      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
                    </svg>
                  </div>
                  <h3 className="text-foreground font-semibold mb-2">Elaine</h3>
                  <p className="text-muted text-sm mb-4">
                    I know everything about your hotel — reviews, responses, ratings, and trends. Ask me anything.
                  </p>
                  <div className="space-y-2 w-full max-w-sm">
                    {[
                      "What are the most common guest complaints?",
                      "Show me our response rate and quality scores",
                      "Create a chart of rating trends over time",
                    ].map((suggestion) => (
                      <button
                        key={suggestion}
                        onClick={() => {
                          setInput(suggestion);
                          textareaRef.current?.focus();
                        }}
                        className="w-full text-left text-xs text-gold-light/60 hover:text-gold-light px-3 py-2 rounded-xl transition-colors"
                        style={{
                          background: "var(--input-bg)",
                          border: "1px solid var(--glass-border)",
                        }}
                      >
                        &ldquo;{suggestion}&rdquo;
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {messages.map((msg, i) => (
                <ChatMessage
                  key={i}
                  role={msg.role}
                  text={msg.text}
                  chart={msg.chart}
                />
              ))}
              {isLoading && (
                <div className="flex justify-start mb-3">
                  <div
                    className="rounded-2xl rounded-bl-md px-4 py-3"
                    style={{
                      background: "linear-gradient(135deg, var(--glass-bg) 0%, var(--glass-bg-end) 100%)",
                      border: "1px solid var(--glass-border)",
                    }}
                  >
                    <div className="flex gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-gold animate-bounce" style={{ animationDelay: "0ms" }} />
                      <div className="w-2 h-2 rounded-full bg-gold animate-bounce" style={{ animationDelay: "150ms" }} />
                      <div className="w-2 h-2 rounded-full bg-gold animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div
              className="px-4 py-3 shrink-0"
              style={{ borderTop: "1px solid var(--glass-border)" }}
            >
              <div
                className="flex items-end gap-2 rounded-xl px-3 py-2"
                style={{
                  background: "var(--input-bg)",
                  border: "1px solid var(--glass-border)",
                }}
              >
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask Elaine anything..."
                  rows={1}
                  className="flex-1 bg-transparent text-foreground text-sm placeholder-muted resize-none outline-none max-h-32"
                  style={{ scrollbarWidth: "none" }}
                />
                <button
                  onClick={sendMessage}
                  disabled={!input.trim() || isLoading}
                  className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-all disabled:opacity-30"
                  style={{
                    background: input.trim()
                      ? "linear-gradient(135deg, var(--gold), var(--gold-dark))"
                      : "var(--input-bg)",
                  }}
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke={input.trim() ? "#1C2A39" : "#7e93b2"}
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <line x1="22" y1="2" x2="11" y2="13" />
                    <polygon points="22 2 15 22 11 13 2 9 22 2" />
                  </svg>
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
