"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { toPng } from "html-to-image";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import ChatMessage from "@/components/chat/chat-message";
import type { ChartSpec } from "@/types/chart";

interface Message {
  role: "user" | "assistant";
  text: string;
  chart?: ChartSpec;
}

interface Conversation {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

interface ProactiveInsight {
  type: "warning" | "success" | "info";
  title: string;
  text: string;
}

export default function ElaineChatPage() {
  const params = useParams();
  const router = useRouter();
  const hotelId = params.hotelId as string;

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [insights, setInsights] = useState<ProactiveInsight[]>([]);
  const [insightsDismissed, setInsightsDismissed] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [exportingChat, setExportingChat] = useState(false);
  const [loadingConvId, setLoadingConvId] = useState<string | null>(null);
  const [hasVoice, setHasVoice] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const chatAreaRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const activeConvRef = useRef<string | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Keep ref in sync with activeConvId for use in async callbacks
  useEffect(() => {
    activeConvRef.current = activeConvId;
  }, [activeConvId]);

  useEffect(() => {
    textareaRef.current?.focus();
    setHasVoice(!!(window.SpeechRecognition || window.webkitSpeechRecognition));
  }, []);

  // Load conversations list
  useEffect(() => {
    fetch(`/api/hotels/${hotelId}/conversations`)
      .then((r) => r.json())
      .then((d) => setConversations(d.conversations ?? []))
      .catch(() => {});
  }, [hotelId]);

  // Load proactive insights on mount
  useEffect(() => {
    fetchInsights();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hotelId]);

  async function fetchInsights() {
    try {
      const res = await fetch(`/api/hotels/${hotelId}/chat/insights`);
      if (res.ok) {
        const data = await res.json();
        setInsights(data.insights ?? []);
      }
    } catch {
      // silently fail
    }
  }

  // Track latest requested conversation to avoid race conditions
  const loadingConvRef = useRef<string | null>(null);
  // Local cache of messages per conversation so we don't lose in-progress work
  const messagesCacheRef = useRef<Record<string, Message[]>>({});

  // Keep cache in sync whenever messages change
  useEffect(() => {
    if (activeConvId && messages.length > 0) {
      messagesCacheRef.current[activeConvId] = messages;
    }
  }, [messages, activeConvId]);

  // Load a conversation
  async function loadConversation(convId: string) {
    loadingConvRef.current = convId;
    setLoadingConvId(convId);
    setActiveConvId(convId);
    setInsightsDismissed(true);

    // Immediately show cached messages if available (e.g. in-progress stream)
    const cached = messagesCacheRef.current[convId];
    setMessages(cached ?? []);

    try {
      const res = await fetch(`/api/hotels/${hotelId}/conversations/${convId}`);
      if (!res.ok) {
        console.error("Failed to load conversation:", res.status, await res.text().catch(() => ""));
        if (loadingConvRef.current === convId) setLoadingConvId(null);
        return;
      }
      const data = await res.json();
      if (loadingConvRef.current === convId) {
        const dbMessages: Message[] = data.messages ?? [];
        // Use DB messages if they have more content, otherwise keep cache
        if (dbMessages.length >= (cached?.length ?? 0)) {
          setMessages(dbMessages);
          messagesCacheRef.current[convId] = dbMessages;
        }
        setLoadingConvId(null);
      }
    } catch (err) {
      console.error("Failed to load conversation:", err);
      if (loadingConvRef.current === convId) setLoadingConvId(null);
    }
  }

  // Create new conversation
  async function createConversation(title: string): Promise<string | null> {
    try {
      const res = await fetch(`/api/hotels/${hotelId}/conversations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });
      if (!res.ok) return null;
      const data = await res.json();
      setConversations((prev) => [data, ...prev]);
      setActiveConvId(data.id);
      return data.id;
    } catch {
      return null;
    }
  }

  // Rename conversation
  async function renameConversation(convId: string, newTitle: string) {
    try {
      await fetch(`/api/hotels/${hotelId}/conversations/${convId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle }),
      });
      setConversations((prev) =>
        prev.map((c) => (c.id === convId ? { ...c, title: newTitle } : c))
      );
    } catch {
      // silently fail
    }
    setRenamingId(null);
  }

  // Delete conversation
  async function deleteConversation(convId: string) {
    try {
      await fetch(`/api/hotels/${hotelId}/conversations/${convId}`, {
        method: "DELETE",
      });
      setConversations((prev) => prev.filter((c) => c.id !== convId));
      if (activeConvId === convId) {
        setActiveConvId(null);
        setMessages([]);
      }
    } catch {
      // silently fail
    }
  }

  // Start new chat
  function startNewChat() {
    setActiveConvId(null);
    setMessages([]);
    setInsightsDismissed(false);
    textareaRef.current?.focus();
  }

  const sendMessage = useCallback(async (overrideText?: string) => {
    const text = (overrideText ?? input).trim();
    if (!text || isLoading) return;

    const userMessage: Message = { role: "user", text };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput("");
    setIsLoading(true);
    setInsightsDismissed(true);

    // Auto-create conversation on first message if none active
    let convId = activeConvId;
    if (!convId) {
      const title = text.length > 50 ? text.slice(0, 50) + "..." : text;
      convId = await createConversation(title);
    }

    // Capture the conversation this response belongs to
    const sentConvId = convId;
    const isStillActive = () => activeConvRef.current === sentConvId;

    try {
      const res = await fetch(`/api/hotels/${hotelId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId: convId,
          messages: updatedMessages.map((m) => ({
            role: m.role,
            content: m.text,
          })),
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Request failed" }));
        if (isStillActive()) {
          setMessages((prev) => [
            ...prev,
            { role: "assistant", text: `Error: ${err.error ?? "Something went wrong"}` },
          ]);
        }
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
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const event = JSON.parse(line.slice(6));
            if (event.type === "text") {
              assistantText += event.text;
              if (isStillActive()) {
                setMessages((prev) => {
                  const updated = [...prev];
                  const lastMsg = updated[updated.length - 1];
                  if (lastMsg?.role === "assistant") {
                    lastMsg.text = assistantText;
                    lastMsg.chart = assistantChart;
                  } else {
                    updated.push({ role: "assistant", text: assistantText, chart: assistantChart });
                  }
                  return [...updated];
                });
              }
            } else if (event.type === "chart") {
              assistantChart = event.chart;
              if (isStillActive()) {
                setMessages((prev) => {
                  const updated = [...prev];
                  const lastMsg = updated[updated.length - 1];
                  if (lastMsg?.role === "assistant") {
                    lastMsg.chart = assistantChart;
                  } else {
                    updated.push({ role: "assistant", text: assistantText, chart: assistantChart });
                  }
                  return [...updated];
                });
              }
            } else if (event.type === "error") {
              assistantText += `\n\nError: ${event.error}`;
            }
          } catch {
            // skip malformed JSON
          }
        }
      }

      if (isStillActive() && !assistantText && !assistantChart) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", text: "I couldn't generate a response. Please try again." },
        ]);
      }
    } catch {
      if (isStillActive()) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", text: "Connection error. Please try again." },
        ]);
      }
    }

    setIsLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input, isLoading, messages, hotelId, activeConvId]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Voice input
  async function toggleVoice() {
    setVoiceError(null);

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    // Request mic permission explicitly first
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop()); // release immediately
    } catch {
      setVoiceError("Microphone access denied. Please allow microphone in your browser settings.");
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let transcript = "";
      for (let i = 0; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      setInput(transcript);
    };

    recognition.onend = () => setIsListening(false);
    recognition.onerror = (event: Event & { error?: string }) => {
      setIsListening(false);
      const code = event.error || "unknown";
      if (code === "not-allowed") {
        setVoiceError("Microphone access denied. Please allow microphone in your browser settings.");
      } else if (code === "network") {
        setVoiceError("Voice requires a secure (HTTPS) connection.");
      } else if (code !== "aborted" && code !== "no-speech") {
        setVoiceError(`Voice error: ${code}`);
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  }

  // Export chat as PDF
  async function exportChat() {
    if (!chatAreaRef.current || messages.length === 0) return;
    setExportingChat(true);
    try {
      // Clone the chat area and restyle for light-mode PDF
      const clone = chatAreaRef.current.cloneNode(true) as HTMLElement;
      clone.style.width = "800px";
      clone.style.padding = "32px";
      clone.style.background = "#FFFFFF";
      clone.style.color = "#1a1a1a";
      clone.style.overflow = "visible";
      clone.style.height = "auto";
      clone.style.maxHeight = "none";
      clone.style.position = "absolute";
      clone.style.left = "-9999px";
      clone.style.top = "0";

      // Override all text colors to dark for readability
      clone.querySelectorAll("*").forEach((el) => {
        const htmlEl = el as HTMLElement;
        htmlEl.style.color = "#1a1a1a";
        // Make user bubbles light blue, assistant bubbles light gray
        const bg = htmlEl.style.background || "";
        if (bg.includes("rgba(252,219,55")) {
          htmlEl.style.background = "#EBF5FF";
          htmlEl.style.border = "1px solid #B3D4FC";
        } else if (bg.includes("var(--glass")) {
          htmlEl.style.background = "#F5F5F5";
          htmlEl.style.border = "1px solid #E0E0E0";
        }
      });

      document.body.appendChild(clone);

      const canvas = await html2canvas(clone, {
        backgroundColor: "#FFFFFF",
        scale: 2,
        useCORS: true,
        logging: false,
      });

      document.body.removeChild(clone);

      const imgWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      const margin = 10;
      const contentWidth = imgWidth - margin * 2;
      const imgHeight = (canvas.height * contentWidth) / canvas.width;

      const pdf = new jsPDF("p", "mm", "a4");

      // Add header — dark text on white for readability
      pdf.setFontSize(18);
      pdf.setTextColor(26, 26, 26);
      pdf.text("Elaine – Conversation Export", margin, 15);
      pdf.setFontSize(9);
      pdf.setTextColor(100, 100, 100);
      pdf.text(new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }), margin, 22);
      pdf.setDrawColor(180, 180, 180);
      pdf.setLineWidth(0.3);
      pdf.line(margin, 25, imgWidth - margin, 25);

      const headerOffset = 30;
      const usableHeight = pageHeight - headerOffset - margin;
      const imgData = canvas.toDataURL("image/png");

      if (imgHeight <= usableHeight) {
        pdf.addImage(imgData, "PNG", margin, headerOffset, contentWidth, imgHeight);
      } else {
        // Multi-page: slice the canvas into pages
        let remainingHeight = canvas.height;
        let sourceY = 0;
        let isFirstPage = true;

        while (remainingHeight > 0) {
          const currentUsable = isFirstPage ? usableHeight : pageHeight - margin * 2;
          const sliceHeight = Math.min(
            remainingHeight,
            (currentUsable / contentWidth) * canvas.width
          );

          const pageCanvas = document.createElement("canvas");
          pageCanvas.width = canvas.width;
          pageCanvas.height = sliceHeight;
          const ctx = pageCanvas.getContext("2d")!;
          ctx.fillStyle = "#FFFFFF";
          ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
          ctx.drawImage(canvas, 0, sourceY, canvas.width, sliceHeight, 0, 0, canvas.width, sliceHeight);

          const pageData = pageCanvas.toDataURL("image/png");
          const drawHeight = (sliceHeight * contentWidth) / canvas.width;
          const yPos = isFirstPage ? headerOffset : margin;

          if (!isFirstPage) pdf.addPage();
          pdf.addImage(pageData, "PNG", margin, yPos, contentWidth, drawHeight);

          sourceY += sliceHeight;
          remainingHeight -= sliceHeight;
          isFirstPage = false;
        }
      }

      pdf.save(`elaine-conversation-${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (err) {
      console.error("PDF export failed:", err);
    }
    setExportingChat(false);
  }

  const suggestions = [
    "How can I improve our breakfast experience based on what guests from different countries and traveler types are saying?",
    "Show me our response rate and quality scores",
    "Create a chart of rating trends over time",
    "What do guests say about breakfast?",
    "Compare ratings across review platforms",
    "Show me a breakdown of sentiment by category",
  ];


  return (
    <div className="flex h-[calc(100vh-12rem)] gap-4">
      {/* Sidebar — conversation history */}
      {sidebarOpen && (
        <div
          className="hidden md:flex flex-col w-64 shrink-0 rounded-2xl overflow-hidden"
          style={{
            background: "linear-gradient(135deg, var(--glass-bg) 0%, var(--glass-bg-end) 100%)",
            border: "1px solid var(--glass-border)",
            boxShadow: "var(--card-shadow)",
          }}
        >
          {/* Sidebar header */}
          <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: "1px solid var(--glass-border)" }}>
            <span className="text-foreground text-sm font-semibold">Conversations</span>
            <button
              onClick={startNewChat}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-gold hover:bg-[var(--input-bg)] transition-colors"
              title="New conversation"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </button>
          </div>

          {/* Conversation list */}
          <div className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5">
            {conversations.length === 0 && (
              <p className="text-muted text-xs text-center py-6 px-3">
                Your conversations with Elaine will appear here
              </p>
            )}
            {conversations.map((conv) => (
              <div
                key={conv.id}
                className={`group flex items-center rounded-xl px-3 py-2 cursor-pointer transition-all ${
                  activeConvId === conv.id
                    ? "bg-gold/10 border border-gold/20"
                    : "hover:bg-[var(--input-bg)] border border-transparent"
                }`}
                onClick={() => {
                  loadConversation(conv.id);
                }}
              >
                {renamingId === conv.id ? (
                  <input
                    autoFocus
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onBlur={() => renameConversation(conv.id, renameValue)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") renameConversation(conv.id, renameValue);
                      if (e.key === "Escape") setRenamingId(null);
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="flex-1 bg-transparent text-foreground text-xs outline-none border-b border-gold/30"
                  />
                ) : (
                  <>
                    {loadingConvId === conv.id ? (
                      <span className="flex-1 text-xs text-gold truncate animate-pulse">Loading...</span>
                    ) : (
                      <span className="flex-1 text-xs text-[var(--text-secondary)] truncate">{conv.title}</span>
                    )}
                  </>
                )}
                <div className="hidden group-hover:flex items-center gap-0.5 ml-1 shrink-0">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setRenamingId(conv.id);
                      setRenameValue(conv.title);
                    }}
                    className="p-1 text-muted hover:text-foreground rounded transition-colors"
                    title="Rename"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteConversation(conv.id);
                    }}
                    className="p-1 text-muted hover:text-danger rounded transition-colors"
                    title="Delete"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="hidden md:flex text-muted hover:text-foreground transition-colors p-1.5 rounded-lg hover:bg-[var(--input-bg)]"
              title={sidebarOpen ? "Hide sidebar" : "Show sidebar"}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <line x1="9" y1="3" x2="9" y2="21" />
              </svg>
            </button>
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{
                background: "linear-gradient(135deg, rgba(252,219,55,0.2), rgba(170,138,0,0.15))",
                border: "1px solid rgba(252,219,55,0.2)",
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="2">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
            </div>
            <div>
              <h2 className="text-foreground font-bold text-lg">Elaine</h2>
              <p className="text-muted text-xs">Your AI hotel assistant</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {messages.length > 0 && (
              <button
                onClick={exportChat}
                disabled={exportingChat}
                className="text-muted hover:text-foreground transition-colors text-xs flex items-center gap-1 px-3 py-1.5 rounded-lg hover:bg-[var(--input-bg)] disabled:opacity-50"
                title="Export conversation as PDF"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                {exportingChat ? "Exporting..." : "Export PDF"}
              </button>
            )}
            <button
              onClick={() => router.push(`/dashboard/${hotelId}`)}
              className="text-muted hover:text-foreground transition-colors text-xs flex items-center gap-1 px-3 py-1.5 rounded-lg hover:bg-[var(--input-bg)]"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
              Close
            </button>
          </div>
        </div>

        {/* Proactive insights */}
        {insights.length > 0 && !insightsDismissed && messages.length === 0 && (
          <div className="mb-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted uppercase tracking-wider">Recent Insights</span>
              <button onClick={() => setInsightsDismissed(true)} className="text-muted hover:text-foreground text-xs transition-colors">
                Dismiss
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {insights.map((insight, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setInput(insight.text);
                    textareaRef.current?.focus();
                  }}
                  className="text-left rounded-xl p-3 transition-all hover:scale-[1.01] cursor-pointer"
                  style={{
                    background: "linear-gradient(135deg, var(--glass-bg) 0%, var(--glass-bg-end) 100%)",
                    border: `1px solid ${
                      insight.type === "warning" ? "rgba(255,107,107,0.2)" :
                      insight.type === "success" ? "rgba(53,221,159,0.2)" :
                      "rgba(147,220,246,0.2)"
                    }`,
                  }}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{
                        background:
                          insight.type === "warning" ? "#B85050" :
                          insight.type === "success" ? "#4A8F6B" :
                          "#516B84",
                      }}
                    />
                    <span className="text-foreground text-xs font-semibold">{insight.title}</span>
                  </div>
                  <p className="text-muted text-[11px] leading-relaxed">{insight.text}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Chat container */}
        <div
          className="flex-1 rounded-2xl flex flex-col overflow-hidden"
          style={{
            background: "linear-gradient(135deg, var(--glass-bg) 0%, var(--glass-bg-end) 100%)",
            border: "1px solid var(--glass-border)",
            boxShadow: "var(--card-shadow)",
          }}
        >
          {/* Messages */}
          <div ref={chatAreaRef} className="flex-1 overflow-y-auto px-6 py-6 space-y-1">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center px-6">
                <div
                  className="w-20 h-20 rounded-2xl flex items-center justify-center mb-5"
                  style={{
                    background: "linear-gradient(135deg, rgba(252,219,55,0.15), rgba(170,138,0,0.1))",
                    border: "1px solid rgba(252,219,55,0.15)",
                  }}
                >
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="1.5">
                    <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
                  </svg>
                </div>
                <h3 className="text-foreground font-bold text-xl mb-2">Meet Elaine</h3>
                <p className="text-muted text-sm mb-6 max-w-md">
                  I know every review, rating, and trend for your hotel. Ask me anything — I&apos;ll search your data, run analysis, and create charts instantly.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-lg">
                  {suggestions.map((suggestion) => (
                    <button
                      key={suggestion}
                      onClick={() => {
                        sendMessage(suggestion);
                      }}
                      className="text-left text-xs text-gold-light/60 hover:text-gold-light px-4 py-3 rounded-xl transition-all hover:scale-[1.01]"
                      style={{
                        background: "var(--input-bg)",
                        border: "1px solid var(--subtle-border)",
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
                fullWidth
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

          {/* Voice error */}
          {voiceError && (
            <div className="mx-6 mb-1 px-3 py-2 rounded-lg text-xs" style={{ background: "rgba(239,68,68,0.15)", color: "#fca5a5" }}>
              {voiceError}
            </div>
          )}

          {/* Input */}
          <div className="px-6 py-4 shrink-0" style={{ borderTop: "1px solid var(--glass-border)" }}>
            <div
              className="flex items-end gap-3 rounded-xl px-4 py-3"
              style={{
                background: "var(--input-bg)",
                border: `1px solid ${isListening ? "rgba(252,219,55,0.3)" : "var(--glass-border)"}`,
                transition: "border-color 0.2s",
              }}
            >
              {/* Voice button */}
              {hasVoice && (
                <button
                  onClick={toggleVoice}
                  className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                    isListening ? "animate-pulse" : ""
                  }`}
                  style={{
                    background: isListening ? "rgba(252,219,55,0.2)" : "var(--input-bg)",
                    color: isListening ? "var(--gold)" : "#7e93b2",
                  }}
                  title={isListening ? "Stop listening" : "Voice input"}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
                    <path d="M19 10v2a7 7 0 01-14 0v-2" />
                    <line x1="12" y1="19" x2="12" y2="23" />
                    <line x1="8" y1="23" x2="16" y2="23" />
                  </svg>
                </button>
              )}
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={isListening ? "Listening..." : "Ask Elaine anything about your hotel..."}
                rows={1}
                className="flex-1 bg-transparent text-foreground text-sm placeholder-muted resize-none outline-none max-h-32"
                style={{ scrollbarWidth: "none" }}
              />
              <button
                onClick={() => sendMessage()}
                disabled={!input.trim() || isLoading}
                className="shrink-0 w-9 h-9 rounded-lg flex items-center justify-center transition-all disabled:opacity-30"
                style={{
                  background: input.trim()
                    ? "linear-gradient(135deg, var(--gold), var(--gold-dark))"
                    : "var(--input-bg)",
                }}
              >
                <svg
                  width="18"
                  height="18"
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
            <div className="flex items-center justify-between mt-2">
              <p className="text-muted text-[10px]">Powered by Claude AI. Elaine can make mistakes — verify important data.</p>
              <Link
                href={`/dashboard/${hotelId}`}
                className="text-muted hover:text-gold-light text-[10px] transition-colors"
              >
                Back to Dashboard
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
