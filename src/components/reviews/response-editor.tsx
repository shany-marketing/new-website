"use client";

import { useState } from "react";

interface ResponseEditorProps {
  hotelId: string;
  reviewId: string;
  text: string;
  onSave: (text: string) => void;
  onCancel: () => void;
}

export default function ResponseEditor({
  hotelId,
  reviewId,
  text,
  onSave,
  onCancel,
}: ResponseEditorProps) {
  const [value, setValue] = useState(text);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(
        `/api/hotels/${hotelId}/reviews/${reviewId}/response`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ responseText: value }),
        }
      );
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }
      onSave(value);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-2">
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        rows={5}
        className="w-full px-3 py-2 rounded-lg text-sm bg-[var(--input-bg)] border border-[var(--subtle-border)] text-foreground placeholder:text-muted focus:outline-none focus:border-gold/30 resize-y"
      />
      <div className="flex gap-2">
        <button
          onClick={handleSave}
          disabled={saving || !value.trim()}
          className="px-3 py-1.5 rounded-lg text-xs font-medium text-navy-1 disabled:opacity-40"
          style={{ background: "linear-gradient(135deg, var(--gold) 0%, var(--gold-dark) 100%)" }}
        >
          {saving ? "Saving..." : "Save"}
        </button>
        <button
          onClick={onCancel}
          disabled={saving}
          className="px-3 py-1.5 rounded-lg text-xs font-medium text-muted hover:text-foreground border border-[var(--subtle-border)] transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
