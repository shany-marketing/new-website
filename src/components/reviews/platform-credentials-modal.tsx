"use client";

import { useState } from "react";
import { PLATFORM_CONFIG } from "@/types/platform";
import type { ReviewSource } from "@/types/platform";

interface Props {
  hotelId: string;
  platform: ReviewSource;
  onClose: () => void;
  onConnected: () => void;
}

export default function PlatformCredentialsModal({
  hotelId,
  platform,
  onClose,
  onConnected,
}: Props) {
  const config = PLATFORM_CONFIG[platform];
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Booking.com fields
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  // Expedia fields
  const [apiKey, setApiKey] = useState("");
  const [secret, setSecret] = useState("");
  const [propertyId, setPropertyId] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const body: Record<string, string> = { platform };

      if (platform === "booking") {
        if (!username || !password) {
          setError("Username and password are required");
          setSaving(false);
          return;
        }
        body.username = username;
        body.password = password;
      } else if (platform === "expedia") {
        if (!apiKey || !secret || !propertyId) {
          setError("All fields are required");
          setSaving(false);
          return;
        }
        body.apiKey = apiKey;
        body.secret = secret;
        body.propertyId = propertyId;
      }

      const res = await fetch(`/api/hotels/${hotelId}/platform-connect`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to connect");
        return;
      }

      setSuccess(true);
      setTimeout(() => onConnected(), 1500);
    } catch {
      setError("Network error — try again");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />

      {/* Modal */}
      <div
        className="relative w-full max-w-md rounded-2xl p-6"
        style={{
          background: "linear-gradient(135deg, var(--navy-2) 0%, var(--navy-3) 100%)",
          border: "1px solid var(--glass-border)",
          boxShadow: "0 25px 50px rgba(0,0,0,0.3)",
        }}
      >
        <div className="flex items-center gap-3 mb-6">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm"
            style={{ background: config.color }}
          >
            {config.label[0]}
          </div>
          <div>
            <h3 className="text-foreground font-bold">Connect {config.label}</h3>
            <p className="text-muted text-xs">Enter your API credentials</p>
          </div>
        </div>

        {success ? (
          <div className="text-center py-8">
            <div className="text-success text-4xl mb-3">
              <svg className="w-12 h-12 mx-auto" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <p className="text-foreground font-medium">Connected successfully!</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {platform === "booking" && (
              <>
                <div>
                  <label className="block text-muted text-xs mb-1.5">Machine Account Username</label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Your Booking.com partner username"
                    className="w-full px-3 py-2.5 rounded-lg text-sm bg-[var(--input-bg)] border border-[var(--subtle-border)] text-foreground placeholder:text-muted/50 focus:outline-none focus:border-[var(--glass-border)]"
                  />
                </div>
                <div>
                  <label className="block text-muted text-xs mb-1.5">Machine Account Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Your Booking.com partner password"
                    className="w-full px-3 py-2.5 rounded-lg text-sm bg-[var(--input-bg)] border border-[var(--subtle-border)] text-foreground placeholder:text-muted/50 focus:outline-none focus:border-[var(--glass-border)]"
                  />
                </div>
                <p className="text-muted text-[11px]">
                  Requires Booking.com Connectivity Partner registration.
                  Credentials are encrypted at rest.
                </p>
              </>
            )}

            {platform === "expedia" && (
              <>
                <div>
                  <label className="block text-muted text-xs mb-1.5">API Key</label>
                  <input
                    type="text"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="Your Expedia API key"
                    className="w-full px-3 py-2.5 rounded-lg text-sm bg-[var(--input-bg)] border border-[var(--subtle-border)] text-foreground placeholder:text-muted/50 focus:outline-none focus:border-[var(--glass-border)]"
                  />
                </div>
                <div>
                  <label className="block text-muted text-xs mb-1.5">API Secret</label>
                  <input
                    type="password"
                    value={secret}
                    onChange={(e) => setSecret(e.target.value)}
                    placeholder="Your Expedia API secret"
                    className="w-full px-3 py-2.5 rounded-lg text-sm bg-[var(--input-bg)] border border-[var(--subtle-border)] text-foreground placeholder:text-muted/50 focus:outline-none focus:border-[var(--glass-border)]"
                  />
                </div>
                <div>
                  <label className="block text-muted text-xs mb-1.5">Property ID (EID)</label>
                  <input
                    type="text"
                    value={propertyId}
                    onChange={(e) => setPropertyId(e.target.value)}
                    placeholder="Your Expedia property ID"
                    className="w-full px-3 py-2.5 rounded-lg text-sm bg-[var(--input-bg)] border border-[var(--subtle-border)] text-foreground placeholder:text-muted/50 focus:outline-none focus:border-[var(--glass-border)]"
                  />
                </div>
                <p className="text-muted text-[11px]">
                  Requires Expedia Partner API access. Credentials are encrypted at rest.
                </p>
              </>
            )}

            {error && (
              <p className="text-red-400 text-xs">{error}</p>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 rounded-lg text-sm text-muted hover:text-foreground border border-[var(--subtle-border)] transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-white transition-all hover:opacity-80 disabled:opacity-40"
                style={{ background: config.color }}
              >
                {saving ? "Verifying..." : "Connect"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
