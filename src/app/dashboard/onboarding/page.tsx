"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const STEPS = ["Hotel Details", "Review Sources", "Confirmation"];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [hotelName, setHotelName] = useState("");
  const [bookingUrl, setBookingUrl] = useState("");
  const [googleUrl, setGoogleUrl] = useState("");
  const [expediaUrl, setExpediaUrl] = useState("");
  const [tripadvisorUrl, setTripadvisorUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleComplete() {
    if (!hotelName.trim()) {
      setError("Hotel name is required");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hotelName,
          bookingUrl,
          googleUrl,
          expediaUrl,
          tripadvisorUrl,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong");
        setLoading(false);
        return;
      }

      router.push(`/dashboard/${data.hotelId}`);
    } catch {
      setError("Failed to create hotel. Please try again.");
      setLoading(false);
    }
  }

  const glassStyle = {
    background: "linear-gradient(135deg, var(--glass-bg) 0%, var(--glass-bg-end) 100%)",
    border: "1px solid var(--glass-border)",
    boxShadow: "var(--card-shadow)",
    backdropFilter: "blur(12px)",
  };

  const inputClass =
    "w-full px-4 py-3 rounded-xl text-foreground placeholder:text-muted focus:outline-none focus:border-gold/50 transition-colors";

  const urlCount = [bookingUrl, googleUrl, expediaUrl, tripadvisorUrl].filter((u) => u.trim()).length;

  return (
    <div className="max-w-xl mx-auto py-8">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-foreground mb-2">Welcome to UpStar</h2>
        <p className="text-muted text-sm">Let&apos;s set up your hotel in a few quick steps</p>
      </div>

      {/* Progress Steps */}
      <div className="flex justify-center gap-2 mb-8">
        {STEPS.map((label, i) => (
          <div key={label} className="flex items-center gap-2">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                i <= step
                  ? "bg-gradient-to-r from-gold-light to-gold-dark text-navy-1"
                  : "bg-[var(--input-bg)] text-muted"
              }`}
            >
              {i + 1}
            </div>
            <span className={`text-xs hidden sm:inline ${i <= step ? "text-gold-light" : "text-muted"}`}>
              {label}
            </span>
            {i < STEPS.length - 1 && (
              <div className={`w-8 h-0.5 ${i < step ? "bg-gold-light/50" : "bg-[var(--input-bg)]"}`} />
            )}
          </div>
        ))}
      </div>

      <div className="rounded-3xl p-8" style={glassStyle}>
        {/* Step 1: Hotel Details */}
        {step === 0 && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-1">Hotel Details</h3>
              <p className="text-muted text-sm">Enter your hotel&apos;s information</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-muted mb-1.5">Hotel Name *</label>
              <input
                type="text"
                value={hotelName}
                onChange={(e) => setHotelName(e.target.value)}
                placeholder="e.g. Grand Hotel Barcelona"
                className={inputClass}
                style={{ background: "var(--input-bg)", borderColor: "var(--input-border)", borderWidth: "1px", borderStyle: "solid" }}
              />
            </div>
            <button
              onClick={() => hotelName.trim() ? setStep(1) : setError("Hotel name is required")}
              className="w-full py-3 rounded-xl font-semibold text-navy-1 transition-opacity hover:opacity-90"
              style={{ background: "linear-gradient(to right, var(--gold-light), var(--gold-dark))" }}
            >
              Continue
            </button>
          </div>
        )}

        {/* Step 2: Review Sources */}
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-1">Review Sources</h3>
              <p className="text-muted text-sm">
                Add your listing URLs to automatically import reviews. All fields are optional.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: "#003580" }}>
                  Booking.com URL
                </label>
                <input
                  type="url"
                  value={bookingUrl}
                  onChange={(e) => setBookingUrl(e.target.value)}
                  placeholder="https://www.booking.com/hotel/..."
                  className={inputClass}
                  style={{ background: "var(--input-bg)", borderColor: "var(--input-border)", borderWidth: "1px", borderStyle: "solid" }}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: "#4285F4" }}>
                  Google Maps URL
                </label>
                <input
                  type="url"
                  value={googleUrl}
                  onChange={(e) => setGoogleUrl(e.target.value)}
                  placeholder="https://www.google.com/maps/place/..."
                  className={inputClass}
                  style={{ background: "var(--input-bg)", borderColor: "var(--input-border)", borderWidth: "1px", borderStyle: "solid" }}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: "#FBCE00" }}>
                  Expedia URL
                </label>
                <input
                  type="url"
                  value={expediaUrl}
                  onChange={(e) => setExpediaUrl(e.target.value)}
                  placeholder="https://www.expedia.com/..."
                  className={inputClass}
                  style={{ background: "var(--input-bg)", borderColor: "var(--input-border)", borderWidth: "1px", borderStyle: "solid" }}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: "#34E0A1" }}>
                  TripAdvisor URL
                </label>
                <input
                  type="url"
                  value={tripadvisorUrl}
                  onChange={(e) => setTripadvisorUrl(e.target.value)}
                  placeholder="https://www.tripadvisor.com/..."
                  className={inputClass}
                  style={{ background: "var(--input-bg)", borderColor: "var(--input-border)", borderWidth: "1px", borderStyle: "solid" }}
                />
              </div>
            </div>

            <p className="text-muted text-xs">
              We&apos;ll automatically import and analyze reviews from each platform you provide. You can add or change these later.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setStep(0)}
                className="flex-1 py-3 rounded-xl font-semibold text-muted border border-[var(--subtle-border)] hover:border-[var(--glass-border)] transition-colors"
              >
                Back
              </button>
              <button
                onClick={() => setStep(2)}
                className="flex-1 py-3 rounded-xl font-semibold text-navy-1 transition-opacity hover:opacity-90"
                style={{ background: "linear-gradient(to right, var(--gold-light), var(--gold-dark))" }}
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Confirmation */}
        {step === 2 && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-1">Confirm Setup</h3>
              <p className="text-muted text-sm">Review your hotel details before we start importing reviews</p>
            </div>
            <div className="rounded-xl bg-[var(--input-bg)] p-4 space-y-3">
              <div className="flex justify-between">
                <span className="text-muted text-sm">Hotel Name</span>
                <span className="text-foreground text-sm font-medium">{hotelName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted text-sm">Review Sources</span>
                <span className="text-foreground text-sm font-medium">
                  {urlCount > 0 ? `${urlCount} platform${urlCount > 1 ? "s" : ""}` : "None yet"}
                </span>
              </div>
              {bookingUrl.trim() && (
                <div className="flex justify-between">
                  <span className="text-muted text-xs">Booking.com</span>
                  <span className="text-[var(--text-tertiary)] text-xs truncate ml-4 max-w-[220px]">{bookingUrl}</span>
                </div>
              )}
              {googleUrl.trim() && (
                <div className="flex justify-between">
                  <span className="text-muted text-xs">Google</span>
                  <span className="text-[var(--text-tertiary)] text-xs truncate ml-4 max-w-[220px]">{googleUrl}</span>
                </div>
              )}
              {expediaUrl.trim() && (
                <div className="flex justify-between">
                  <span className="text-muted text-xs">Expedia</span>
                  <span className="text-[var(--text-tertiary)] text-xs truncate ml-4 max-w-[220px]">{expediaUrl}</span>
                </div>
              )}
              {tripadvisorUrl.trim() && (
                <div className="flex justify-between">
                  <span className="text-muted text-xs">TripAdvisor</span>
                  <span className="text-[var(--text-tertiary)] text-xs truncate ml-4 max-w-[220px]">{tripadvisorUrl}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted text-sm">Plan</span>
                <span className="text-foreground text-sm font-medium">Free</span>
              </div>
            </div>

            {error && <p className="text-danger text-sm text-center">{error}</p>}

            <div className="flex gap-3">
              <button
                onClick={() => setStep(1)}
                className="flex-1 py-3 rounded-xl font-semibold text-muted border border-[var(--subtle-border)] hover:border-[var(--glass-border)] transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleComplete}
                disabled={loading}
                className="flex-1 py-3 rounded-xl font-semibold text-navy-1 transition-opacity hover:opacity-90 disabled:opacity-50"
                style={{ background: "linear-gradient(to right, var(--gold-light), var(--gold-dark))" }}
              >
                {loading ? "Setting up..." : "Create Hotel"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
