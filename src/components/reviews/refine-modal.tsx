"use client";

import { useState, useRef, useEffect } from "react";

interface RefineModalProps {
  hotelId: string;
  reviewId: string;
  currentResponse: string;
  onRefined: (text: string) => void;
  onClose: () => void;
}

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function RefineModal({
  hotelId,
  reviewId,
  currentResponse,
  onRefined,
  onClose,
}: RefineModalProps) {
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: currentResponse },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend() {
    if (!input.trim() || loading) return;

    const instruction = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: instruction }]);
    setLoading(true);

    try {
      const res = await fetch(
        `/api/hotels/${hotelId}/reviews/${reviewId}/refine`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            instruction,
            conversationHistory: messages,
          }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMessages((prev) => [...prev, { role: "assistant", content: data.responseText }]);
      onRefined(data.responseText);
    } catch (err: unknown) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `Error: ${err instanceof Error ? err.message : "Failed"}` },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div
        className="w-full max-w-lg rounded-2xl flex flex-col max-h-[80vh]"
        style={{
          background: "linear-gradient(135deg, var(--navy-2) 0%, var(--navy-3) 100%)",
          border: "1px solid var(--glass-border)",
          boxShadow: "0 25px 50px rgba(0,0,0,0.3)",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--subtle-border)]">
          <h3 className="text-foreground font-semibold text-sm">Refine Response</h3>
          <button onClick={onClose} className="text-muted hover:text-foreground transition-colors">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[200px]">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`rounded-xl px-3 py-2 text-sm max-w-[85%] ${
                msg.role === "user"
                  ? "ml-auto bg-gold/20 text-gold-light"
                  : "bg-[var(--input-bg)] text-[var(--text-secondary)]"
              }`}
            >
              <p className="whitespace-pre-wrap">{msg.content}</p>
            </div>
          ))}
          {loading && (
            <div className="bg-[var(--input-bg)] rounded-xl px-3 py-2 text-sm text-muted max-w-[85%]">
              Refining...
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t border-[var(--subtle-border)]">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="e.g. Make it shorter, Add more empathy..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              className="flex-1 px-3 py-2 rounded-lg text-sm bg-[var(--input-bg)] border border-[var(--subtle-border)] text-foreground placeholder:text-muted focus:outline-none focus:border-gold/30"
            />
            <button
              onClick={handleSend}
              disabled={loading || !input.trim()}
              className="px-4 py-2 rounded-lg text-xs font-medium text-navy-1 disabled:opacity-40"
              style={{ background: "linear-gradient(135deg, var(--gold) 0%, var(--gold-dark) 100%)" }}
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
