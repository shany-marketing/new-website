"use client";

import { useState, useEffect } from "react";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

interface DigestSettingsProps {
  hotelId: string;
}

interface Settings {
  enabled: boolean;
  emailAddress: string;
  frequency: "weekly" | "daily";
  dayOfWeek: number;
}

export default function DigestSettings({ hotelId }: DigestSettingsProps) {
  const [settings, setSettings] = useState<Settings>({
    enabled: false,
    emailAddress: "",
    frequency: "weekly",
    dayOfWeek: 1,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch(`/api/hotels/${hotelId}/digest`)
      .then((r) => r.json())
      .then((d) => {
        if (d && !d.error) setSettings(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [hotelId]);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch(`/api/hotels/${hotelId}/digest`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      if (res.ok) setSaved(true);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="text-muted text-xs">Loading digest settings...</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-foreground">Email Digest</p>
          <p className="text-xs text-muted mt-0.5">Get a summary of new reviews delivered to your inbox</p>
        </div>
        <button
          onClick={() => setSettings((s) => ({ ...s, enabled: !s.enabled }))}
          className={`relative w-11 h-6 rounded-full transition-colors ${settings.enabled ? "bg-green-500" : "bg-gray-600"}`}
        >
          <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${settings.enabled ? "translate-x-5" : ""}`} />
        </button>
      </div>

      {settings.enabled && (
        <>
          <div>
            <label className="text-xs text-muted block mb-1">Email Address</label>
            <input
              type="email"
              value={settings.emailAddress}
              onChange={(e) => setSettings((s) => ({ ...s, emailAddress: e.target.value }))}
              placeholder="manager@hotel.com"
              className="w-full px-3 py-2 rounded-lg text-sm bg-[var(--input-bg)] border border-[var(--subtle-border)] text-foreground placeholder:text-muted focus:outline-none focus:border-gold/30"
            />
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-xs text-muted block mb-1">Frequency</label>
              <select
                value={settings.frequency}
                onChange={(e) => setSettings((s) => ({ ...s, frequency: e.target.value as "weekly" | "daily" }))}
                className="w-full px-3 py-2 rounded-lg text-sm"
                style={{ background: "var(--input-bg)", border: "1px solid var(--glass-border)", color: "var(--foreground)" }}
              >
                <option value="weekly">Weekly</option>
                <option value="daily">Daily</option>
              </select>
            </div>

            {settings.frequency === "weekly" && (
              <div className="flex-1">
                <label className="text-xs text-muted block mb-1">Day</label>
                <select
                  value={settings.dayOfWeek}
                  onChange={(e) => setSettings((s) => ({ ...s, dayOfWeek: parseInt(e.target.value) }))}
                  className="w-full px-3 py-2 rounded-lg text-sm"
                  style={{ background: "var(--input-bg)", border: "1px solid var(--glass-border)", color: "var(--foreground)" }}
                >
                  {DAYS.map((d, i) => (
                    <option key={i} value={i}>{d}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-gradient-to-r from-gold-light to-gold-dark text-navy-1 hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save"}
            </button>
            {saved && <span className="text-green-400 text-xs">Saved!</span>}
            <a
              href={`/api/hotels/${hotelId}/digest/preview`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-2 rounded-lg text-xs text-gold-light hover:text-gold border border-gold/20 hover:border-gold/40 transition-colors"
            >
              Preview Email
            </a>
          </div>
        </>
      )}
    </div>
  );
}
