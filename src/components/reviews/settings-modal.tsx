"use client";

import { useState, useEffect } from "react";
import DigestSettings from "./digest-settings";

interface SettingsModalProps {
  hotelId: string;
  onClose: () => void;
}

export default function SettingsModal({ hotelId, onClose }: SettingsModalProps) {
  const [name, setName] = useState("");
  const [role, setRole] = useState("Hotel Manager");
  const [prompt, setPrompt] = useState("");
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch(`/api/hotels/${hotelId}/response-settings`)
      .then((r) => r.json())
      .then((d) => {
        setName(d.hotelierName || "");
        setRole(d.hotelierRole || "Hotel Manager");
        setPrompt(d.customResponsePrompt || "");
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, [hotelId]);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(`/api/hotels/${hotelId}/response-settings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hotelierName: name || null,
          hotelierRole: role,
          customResponsePrompt: prompt || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }
      onClose();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div
        className="w-full max-w-md rounded-2xl p-6"
        style={{
          background: "linear-gradient(135deg, var(--navy-2) 0%, var(--navy-3) 100%)",
          border: "1px solid var(--glass-border)",
          boxShadow: "0 25px 50px rgba(0,0,0,0.3)",
        }}
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-foreground font-semibold">Response Settings</h3>
          <button onClick={onClose} className="text-muted hover:text-foreground transition-colors">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {!loaded ? (
          <p className="text-muted text-sm">Loading...</p>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="text-xs text-muted block mb-1">Hotelier Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. John Smith"
                className="w-full px-3 py-2 rounded-lg text-sm bg-[var(--input-bg)] border border-[var(--subtle-border)] text-foreground placeholder:text-muted focus:outline-none focus:border-gold/30"
              />
            </div>
            <div>
              <label className="text-xs text-muted block mb-1">Role / Title</label>
              <input
                type="text"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="e.g. Hotel Manager"
                className="w-full px-3 py-2 rounded-lg text-sm bg-[var(--input-bg)] border border-[var(--subtle-border)] text-foreground placeholder:text-muted focus:outline-none focus:border-gold/30"
              />
            </div>
            <div>
              <label className="text-xs text-muted block mb-1">Custom Prompt (added to AI instructions)</label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={4}
                placeholder="e.g. Always mention our new spa facility opening in March..."
                className="w-full px-3 py-2 rounded-lg text-sm bg-[var(--input-bg)] border border-[var(--subtle-border)] text-foreground placeholder:text-muted focus:outline-none focus:border-gold/30 resize-y"
              />
            </div>
            {/* Email Digest Section */}
            <div className="pt-3 mt-3 border-t border-[var(--subtle-border)]">
              <DigestSettings hotelId={hotelId} />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-lg text-sm text-muted hover:text-foreground border border-[var(--subtle-border)] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 rounded-lg text-sm font-medium text-navy-1 disabled:opacity-40"
                style={{ background: "linear-gradient(135deg, var(--gold) 0%, var(--gold-dark) 100%)" }}
              >
                {saving ? "Saving..." : "Save Settings"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
