"use client";

import { useState } from "react";

interface GenerateButtonProps {
  hotelId: string;
  reviewId: string;
  hasResponse: boolean;
  usage: number | null;
  limit: number | null;
  onGenerated: (text: string, usage: number) => void;
}

export default function GenerateButton({
  hotelId,
  reviewId,
  hasResponse,
  usage,
  limit,
  onGenerated,
}: GenerateButtonProps) {
  const [loading, setLoading] = useState(false);
  const [showCustom, setShowCustom] = useState(false);
  const [customMessage, setCustomMessage] = useState("");

  const atLimit = limit !== null && usage !== null && usage >= limit;

  async function handleGenerate() {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/hotels/${hotelId}/reviews/${reviewId}/generate`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ customMessage: customMessage || undefined }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onGenerated(data.responseText, data.usage);
      setShowCustom(false);
      setCustomMessage("");
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to generate");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <button
          onClick={showCustom ? handleGenerate : () => setShowCustom(true)}
          disabled={loading || atLimit}
          className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all disabled:opacity-40"
          style={{
            background: atLimit
              ? "var(--input-bg)"
              : "linear-gradient(135deg, var(--gold) 0%, var(--gold-dark) 100%)",
            color: atLimit ? "var(--text-tertiary)" : "var(--navy-1)",
          }}
        >
          {loading ? (
            <span className="flex items-center gap-1.5">
              <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Generating...
            </span>
          ) : hasResponse ? (
            "Regenerate"
          ) : (
            "Generate AI Response"
          )}
        </button>

        {showCustom && !loading && (
          <button
            onClick={() => { setShowCustom(false); setCustomMessage(""); }}
            className="text-xs text-muted hover:text-foreground transition-colors"
          >
            Cancel
          </button>
        )}

        {limit !== null && usage !== null && (
          <span className="text-xs text-muted">
            {Math.max(0, limit - usage)} of {limit} remaining
          </span>
        )}
      </div>

      {showCustom && !loading && (
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Custom opening message (optional)"
            value={customMessage}
            onChange={(e) => setCustomMessage(e.target.value)}
            className="flex-1 px-3 py-1.5 rounded-lg text-xs bg-[var(--input-bg)] border border-[var(--subtle-border)] text-foreground placeholder:text-muted focus:outline-none focus:border-gold/30"
          />
          <button
            onClick={handleGenerate}
            className="px-3 py-1.5 rounded-lg text-xs font-medium text-navy-1"
            style={{ background: "linear-gradient(135deg, var(--gold) 0%, var(--gold-dark) 100%)" }}
          >
            Generate
          </button>
        </div>
      )}
    </div>
  );
}
