"use client";

import { useState, useEffect } from "react";
import { PLATFORMS } from "@/types/platform";

interface AutoRespondSettingsProps {
  hotelId: string;
  onClose: () => void;
}

interface Settings {
  enabled: boolean;
  minRating: number;
  skipWithComplaints: boolean;
  autoPost: boolean;
  platforms: string[];
  maxPerRun: number;
}

interface LogEntry {
  id: string;
  reviewId: string;
  action: string;
  skipReason: string | null;
  errorMessage: string | null;
  createdAt: string;
}

export default function AutoRespondSettings({ hotelId, onClose }: AutoRespondSettingsProps) {
  const [settings, setSettings] = useState<Settings>({
    enabled: false,
    minRating: 8.0,
    skipWithComplaints: true,
    autoPost: false,
    platforms: ["booking"],
    maxPerRun: 10,
  });
  const [log, setLog] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [running, setRunning] = useState(false);
  const [runResult, setRunResult] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch(`/api/hotels/${hotelId}/auto-respond`).then((r) => r.json()),
      fetch(`/api/hotels/${hotelId}/auto-respond/log?limit=10`).then((r) => r.json()),
    ]).then(([s, l]) => {
      if (s && !s.error) setSettings(s);
      if (Array.isArray(l)) setLog(l);
      setLoading(false);
    });
  }, [hotelId]);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch(`/api/hotels/${hotelId}/auto-respond`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      if (res.ok) setSaved(true);
    } finally {
      setSaving(false);
    }
  };

  const handleRunNow = async () => {
    setRunning(true);
    setRunResult(null);
    try {
      const res = await fetch(`/api/hotels/${hotelId}/auto-respond/run`, { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setRunResult(`Done: ${data.generated} generated, ${data.skipped} skipped out of ${data.processed} reviews`);
        // Refresh log
        fetch(`/api/hotels/${hotelId}/auto-respond/log?limit=10`)
          .then((r) => r.json())
          .then((l) => { if (Array.isArray(l)) setLog(l); });
      } else {
        setRunResult(data.error || "Failed");
      }
    } catch {
      setRunResult("Failed to run");
    } finally {
      setRunning(false);
    }
  };

  const togglePlatform = (platform: string) => {
    setSettings((s) => ({
      ...s,
      platforms: s.platforms.includes(platform)
        ? s.platforms.filter((p) => p !== platform)
        : [...s.platforms, platform],
    }));
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.6)" }}>
        <div className="rounded-2xl p-8 w-full max-w-lg" style={{ background: "var(--card-bg)", border: "1px solid var(--glass-border)" }}>
          <p className="text-center text-muted">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.6)" }} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div
        className="rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto"
        style={{ background: "var(--card-bg)", border: "1px solid var(--glass-border)" }}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-foreground">Auto-Respond Settings</h2>
          <button onClick={onClose} className="text-muted hover:text-foreground text-xl">&times;</button>
        </div>

        {/* Enable toggle */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="text-sm font-medium text-foreground">Enable Auto-Respond</p>
            <p className="text-xs text-muted mt-0.5">Automatically generate AI responses for new high-rated reviews</p>
          </div>
          <button
            onClick={() => setSettings((s) => ({ ...s, enabled: !s.enabled }))}
            className={`relative w-11 h-6 rounded-full transition-colors ${settings.enabled ? "bg-green-500" : "bg-gray-600"}`}
          >
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${settings.enabled ? "translate-x-5" : ""}`} />
          </button>
        </div>

        {/* Min rating */}
        <div className="mb-5">
          <label className="text-sm font-medium text-foreground block mb-1">
            Minimum Rating (1–10 scale): <span className="text-gold-light font-bold">{settings.minRating}</span>
          </label>
          <p className="text-xs text-muted mb-2">Only auto-respond to reviews rated at or above this threshold</p>
          <input
            type="range"
            min={1}
            max={10}
            step={0.5}
            value={settings.minRating}
            onChange={(e) => setSettings((s) => ({ ...s, minRating: parseFloat(e.target.value) }))}
            className="w-full accent-gold"
          />
          <div className="flex justify-between text-xs text-muted">
            <span>1</span>
            <span>5</span>
            <span>10</span>
          </div>
        </div>

        {/* Skip complaints */}
        <label className="flex items-center gap-3 mb-5 cursor-pointer">
          <input
            type="checkbox"
            checked={settings.skipWithComplaints}
            onChange={(e) => setSettings((s) => ({ ...s, skipWithComplaints: e.target.checked }))}
            className="w-4 h-4 rounded accent-gold"
          />
          <div>
            <p className="text-sm font-medium text-foreground">Skip reviews with complaints</p>
            <p className="text-xs text-muted">Don&apos;t auto-respond if the review has negative feedback</p>
          </div>
        </label>

        {/* Platforms */}
        <div className="mb-5">
          <p className="text-sm font-medium text-foreground mb-2">Platforms</p>
          <div className="flex flex-wrap gap-2">
            {PLATFORMS.map((p) => (
              <button
                key={p}
                onClick={() => togglePlatform(p)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                  settings.platforms.includes(p)
                    ? "border-gold bg-gold/10 text-gold-light"
                    : "border-white/10 text-muted hover:border-white/20"
                }`}
              >
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Max per run */}
        <div className="mb-5">
          <label className="text-sm font-medium text-foreground block mb-1">Max responses per scrape run</label>
          <input
            type="number"
            min={1}
            max={50}
            value={settings.maxPerRun}
            onChange={(e) => setSettings((s) => ({ ...s, maxPerRun: parseInt(e.target.value) || 10 }))}
            className="w-20 px-3 py-1.5 rounded-lg text-sm"
            style={{ background: "var(--input-bg)", border: "1px solid var(--glass-border)", color: "var(--foreground)" }}
          />
        </div>

        {/* Save + Run Now */}
        <div className="flex items-center gap-3 mb-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-gradient-to-r from-gold-light to-gold-dark text-navy-1 hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Settings"}
          </button>
          <button
            onClick={handleRunNow}
            disabled={running || !settings.enabled}
            className="px-4 py-2 rounded-lg text-sm font-medium border border-gold/30 text-gold-light hover:bg-gold/10 transition-colors disabled:opacity-50"
          >
            {running ? "Running..." : "Run Now"}
          </button>
          {saved && <span className="text-green-400 text-sm">Saved!</span>}
        </div>
        {runResult && (
          <p className="text-xs text-cyan mb-4">{runResult}</p>
        )}
        {!settings.enabled && (
          <p className="text-xs text-muted mb-4">Enable auto-respond and save before running.</p>
        )}

        {/* Recent log */}
        {log.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-foreground mb-2">Recent Activity</h3>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {log.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between text-xs px-3 py-2 rounded-lg"
                  style={{ background: "var(--input-bg)" }}
                >
                  <span className={
                    entry.action === "generated" ? "text-green-400" :
                    entry.action === "skipped" ? "text-muted" :
                    entry.action === "failed" ? "text-red-400" :
                    "text-blue-400"
                  }>
                    {entry.action}
                  </span>
                  <span className="text-muted">
                    {entry.skipReason || entry.errorMessage || ""}
                  </span>
                  <span className="text-muted">
                    {new Date(entry.createdAt).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
