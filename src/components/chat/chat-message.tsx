"use client";

import ChartDownload from "./chart-download";
import type { ChartSpec } from "@/types/chart";

interface ChatMessageProps {
  role: "user" | "assistant";
  text: string;
  chart?: ChartSpec;
  fullWidth?: boolean;
}

function formatText(text: string) {
  // Basic markdown: bold, italic, inline code, lists, tables
  // Groups consecutive list items into proper <ul>/<ol> wrappers
  // Groups consecutive table rows into styled <table>
  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];
  let listBuffer: { type: "ul" | "ol"; items: React.ReactNode[] } | null = null;
  let tableBuffer: string[][] | null = null;

  function flushList() {
    if (!listBuffer) return;
    const Tag = listBuffer.type;
    const cls = Tag === "ul" ? "ml-4 list-disc space-y-0.5" : "ml-4 list-decimal space-y-0.5";
    elements.push(<Tag key={`list-${elements.length}`} className={cls}>{listBuffer.items}</Tag>);
    listBuffer = null;
  }

  function flushTable() {
    if (!tableBuffer || tableBuffer.length === 0) return;
    const headers = tableBuffer[0];
    const rows = tableBuffer.slice(1);
    elements.push(
      <div key={`table-${elements.length}`} className="my-3 overflow-x-auto rounded-xl" style={{ border: "1px solid var(--glass-border)" }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: "rgba(252,219,55,0.08)", borderBottom: "1px solid var(--glass-border)" }}>
              {headers.map((h, ci) => (
                <th key={ci} className="text-left text-gold text-xs font-semibold px-3 py-2.5 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => (
              <tr key={ri} style={{ borderBottom: ri < rows.length - 1 ? "1px solid var(--subtle-border)" : undefined }}>
                {row.map((cell, ci) => (
                  <td key={ci} className={`px-3 py-2 ${ci === 0 ? "text-foreground font-medium" : "text-[var(--text-secondary)]"}`} dangerouslySetInnerHTML={{ __html: inlineFormat(cell) }} />
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
    tableBuffer = null;
  }

  lines.forEach((line, i) => {
    // Table separator row (|---|---|) — skip
    if (/^\|[\s\-:|]+\|$/.test(line.trim())) return;

    // Table row
    const tableMatch = line.match(/^\|(.+)\|$/);
    if (tableMatch) {
      flushList();
      const cells = tableMatch[1].split("|").map(c => c.trim());
      if (!tableBuffer) tableBuffer = [];
      tableBuffer.push(cells);
      return;
    }

    // Non-table line — flush any pending table
    flushTable();

    // Headings
    const h3Match = line.match(/^###\s+(.*)/);
    if (h3Match) {
      flushList();
      elements.push(<h3 key={i} className="text-base font-bold mt-3 mb-1" dangerouslySetInnerHTML={{ __html: inlineFormat(h3Match[1]) }} />);
      return;
    }
    const h2Match = line.match(/^##\s+(.*)/);
    if (h2Match) {
      flushList();
      elements.push(<h2 key={i} className="text-lg font-bold mt-3 mb-1" dangerouslySetInnerHTML={{ __html: inlineFormat(h2Match[1]) }} />);
      return;
    }
    const h1Match = line.match(/^#\s+(.*)/);
    if (h1Match) {
      flushList();
      elements.push(<h1 key={i} className="text-xl font-bold mt-3 mb-1" dangerouslySetInnerHTML={{ __html: inlineFormat(h1Match[1]) }} />);
      return;
    }
    // Bullet list items
    const listMatch = line.match(/^[-*]\s+(.*)/);
    if (listMatch) {
      if (!listBuffer || listBuffer.type !== "ul") { flushList(); listBuffer = { type: "ul", items: [] }; }
      listBuffer.items.push(
        <li key={i}><span dangerouslySetInnerHTML={{ __html: inlineFormat(listMatch[1]) }} /></li>
      );
      return;
    }
    // Numbered list items
    const numMatch = line.match(/^\d+\.\s+(.*)/);
    if (numMatch) {
      if (!listBuffer || listBuffer.type !== "ol") { flushList(); listBuffer = { type: "ol", items: [] }; }
      listBuffer.items.push(
        <li key={i}><span dangerouslySetInnerHTML={{ __html: inlineFormat(numMatch[1]) }} /></li>
      );
      return;
    }
    // Non-list line — flush any pending list
    flushList();
    // Horizontal rule (---, ***, ___)
    if (/^[-*_]{3,}\s*$/.test(line.trim())) {
      elements.push(<hr key={i} className="my-4 border-0 h-px" style={{ background: "linear-gradient(to right, transparent, var(--glass-border), transparent)" }} />);
      return;
    }
    // Blockquote
    const bqMatch = line.match(/^>\s*(.*)/);
    if (bqMatch) {
      elements.push(
        <div key={i} className="my-2 pl-3 py-1.5 rounded-r-lg text-sm" style={{ borderLeft: "3px solid var(--gold)", background: "rgba(252,219,55,0.06)" }}>
          <span dangerouslySetInnerHTML={{ __html: inlineFormat(bqMatch[1]) }} />
        </div>
      );
      return;
    }
    // Empty line
    if (!line.trim()) { elements.push(<br key={i} />); return; }
    // Regular paragraph
    elements.push(<p key={i} dangerouslySetInnerHTML={{ __html: inlineFormat(line) }} />);
  });

  flushList();
  flushTable();
  return elements;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function inlineFormat(text: string): string {
  // Escape HTML first to prevent XSS, then apply markdown formatting
  return escapeHtml(text)
    .replace(/`([^`]+)`/g, '<code class="bg-[var(--input-bg)] px-1.5 py-0.5 rounded text-cyan text-xs">$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>");
}

export default function ChatMessage({ role, text, chart, fullWidth }: ChatMessageProps) {
  const isUser = role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-3`}>
      <div
        className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
          isUser ? "rounded-br-md" : "rounded-bl-md"
        } ${fullWidth && !isUser ? "max-w-full w-full" : "max-w-[90%]"}`}
        style={{
          background: isUser
            ? "linear-gradient(135deg, rgba(252,219,55,0.2) 0%, rgba(170,138,0,0.15) 100%)"
            : "linear-gradient(135deg, var(--glass-bg) 0%, var(--glass-bg-end) 100%)",
          border: isUser
            ? "1px solid rgba(252,219,55,0.2)"
            : "1px solid var(--glass-border)",
          color: "var(--foreground)",
        }}
      >
        <div className="space-y-1">{formatText(text)}</div>
        {chart && (
          <div className="mt-3">
            <ChartDownload spec={chart} />
          </div>
        )}
      </div>
    </div>
  );
}
