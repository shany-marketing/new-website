"use client";

import { useState, useEffect } from "react";
import { PLATFORM_CONFIG } from "@/types/platform";
import type { ReviewSource } from "@/types/platform";
import ScrapeProgress from "@/components/dashboard/scrape-progress";

interface SettingsClientProps {
  hotelId: string;
  hotelName: string;
  initialUrls: {
    bookingUrl: string | null;
    googleUrl: string | null;
    expediaUrl: string | null;
    tripadvisorUrl: string | null;
  };
}

const PLATFORMS: { key: ReviewSource; urlKey: keyof SettingsClientProps["initialUrls"]; placeholder: string }[] = [
  { key: "booking", urlKey: "bookingUrl", placeholder: "https://www.booking.com/hotel/..." },
  { key: "google", urlKey: "googleUrl", placeholder: "https://www.google.com/maps/place/..." },
  { key: "expedia", urlKey: "expediaUrl", placeholder: "https://www.expedia.com/..." },
  { key: "tripadvisor", urlKey: "tripadvisorUrl", placeholder: "https://www.tripadvisor.com/..." },
];

export default function SettingsClient({ hotelId, hotelName, initialUrls }: SettingsClientProps) {
  const [bookingUrl, setBookingUrl] = useState(initialUrls.bookingUrl ?? "");
  const [googleUrl, setGoogleUrl] = useState(initialUrls.googleUrl ?? "");
  const [expediaUrl, setExpediaUrl] = useState(initialUrls.expediaUrl ?? "");
  const [tripadvisorUrl, setTripadvisorUrl] = useState(initialUrls.tripadvisorUrl ?? "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [showScrapeProgress, setShowScrapeProgress] = useState(false);

  // Fetch fresh URLs on mount to avoid stale server-cached props
  useEffect(() => {
    fetch(`/api/hotels/${hotelId}/settings`)
      .then((r) => r.json())
      .then((data) => {
        if (data.booking_url !== undefined) setBookingUrl(data.booking_url ?? "");
        if (data.google_url !== undefined) setGoogleUrl(data.google_url ?? "");
        if (data.expedia_url !== undefined) setExpediaUrl(data.expedia_url ?? "");
        if (data.tripadvisor_url !== undefined) setTripadvisorUrl(data.tripadvisor_url ?? "");
      })
      .catch(() => {});
  }, [hotelId]);

  const urlState: Record<string, { value: string; setter: (v: string) => void }> = {
    bookingUrl: { value: bookingUrl, setter: setBookingUrl },
    googleUrl: { value: googleUrl, setter: setGoogleUrl },
    expediaUrl: { value: expediaUrl, setter: setExpediaUrl },
    tripadvisorUrl: { value: tripadvisorUrl, setter: setTripadvisorUrl },
  };

  async function handleSave() {
    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch(`/api/hotels/${hotelId}/settings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingUrl, googleUrl, expediaUrl, tripadvisorUrl }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage({ type: "error", text: data.error || "Failed to save" });
        setSaving(false);
        return;
      }

      const scraped = (data.scrapesStarted as string[]) ?? [];
      if (scraped.length > 0) {
        setShowScrapeProgress(true);
        setMessage({ type: "success", text: "Settings saved. Importing reviews..." });
      } else {
        setMessage({ type: "success", text: "Settings saved." });
      }
    } catch {
      setMessage({ type: "error", text: "Network error. Please try again." });
    }

    setSaving(false);
  }

  const connectedCount = [bookingUrl, googleUrl, expediaUrl, tripadvisorUrl].filter((u) => u.trim()).length;

  const inputClass =
    "w-full px-4 py-3 rounded-xl text-foreground placeholder:text-muted focus:outline-none focus:border-gold/50 transition-colors";

  const glassStyle = {
    background: "linear-gradient(135deg, var(--glass-bg) 0%, var(--glass-bg-end) 100%)",
    border: "1px solid var(--glass-border)",
    boxShadow: "var(--card-shadow)",
    backdropFilter: "blur(12px)",
  };

  return (
    <div className="max-w-2xl mx-auto py-4">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-foreground mb-1">{hotelName} — Settings</h2>
        <p className="text-muted text-sm">Manage your review platform connections</p>
      </div>

      <div className="rounded-3xl p-8" style={glassStyle}>
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-foreground mb-1">Review Sources</h3>
          <p className="text-muted text-sm">
            Add your listing URLs to import reviews. New platforms will be scraped automatically.
          </p>
        </div>

        <div className="space-y-5">
          {PLATFORMS.map(({ key, urlKey, placeholder }) => {
            const config = PLATFORM_CONFIG[key];
            const { value, setter } = urlState[urlKey];
            const isConnected = value.trim().length > 0;

            return (
              <div key={key}>
                <label className="flex items-center gap-2 text-sm font-medium mb-1.5">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ background: isConnected ? config.color : "var(--glass-border)" }}
                  />
                  <span style={{ color: isConnected ? config.color : "var(--text-secondary)" }}>
                    {config.label}
                  </span>
                  {isConnected && (
                    <span className="text-xs text-muted font-normal ml-auto">Connected</span>
                  )}
                </label>
                <input
                  type="url"
                  value={value}
                  onChange={(e) => setter(e.target.value)}
                  placeholder={placeholder}
                  className={inputClass}
                  style={{
                    background: "var(--input-bg)",
                    borderColor: isConnected ? `${config.color}40` : "var(--input-border)",
                    borderWidth: "1px",
                    borderStyle: "solid",
                  }}
                />
              </div>
            );
          })}
        </div>

        <div className="mt-4 flex items-center justify-between">
          <p className="text-muted text-xs">
            {connectedCount} platform{connectedCount !== 1 ? "s" : ""} connected
          </p>
        </div>

        {message && (
          <div
            className="mt-4 px-4 py-3 rounded-xl text-sm"
            style={{
              background: message.type === "success" ? "rgba(74,143,107,0.1)" : "rgba(184,80,80,0.1)",
              border: `1px solid ${message.type === "success" ? "rgba(74,143,107,0.25)" : "rgba(184,80,80,0.25)"}`,
              color: message.type === "success" ? "#4A8F6B" : "#B85050",
            }}
          >
            {message.text}
          </div>
        )}

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full mt-6 py-3 rounded-xl font-semibold text-navy-1 transition-opacity hover:opacity-90 disabled:opacity-50"
          style={{ background: "linear-gradient(to right, var(--gold-light), var(--gold-dark))" }}
        >
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </div>

      {showScrapeProgress && (
        <div className="mt-6">
          <ScrapeProgress hotelId={hotelId} />
        </div>
      )}
    </div>
  );
}
