"use client";

import { useState } from "react";
import Link from "next/link";
import { pushLeadToCRM } from "@/app/components/SignupModal";


type State = "idle" | "loading" | "done" | "error";

export default function TalkNowPage() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [hotel, setHotel] = useState("");
  const [state, setState] = useState<State>("idle");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setState("loading");

    try {
      const res = await fetch("/api/talk-now", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, hotel }),
      });

      if (!res.ok) throw new Error();
      pushLeadToCRM({ name, phone, hotel, email: "", ctaSource: "talk_now_cta" });
      setState("done");
    } catch {
      setState("error");
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#F7F6F3",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 20px",
        fontFamily: "Inter, sans-serif",
      }}
    >
      {/* Logo */}
      <Link href="/" style={{ marginBottom: 48, display: "block" }}>
        <img src="/logo.svg" alt="RatingIQ" style={{ height: 56, width: "auto" }} />
      </Link>

      <div
        style={{
          background: "#fff",
          borderRadius: 12,
          border: "1px solid #E8E4DE",
          padding: "48px 44px",
          width: "100%",
          maxWidth: 460,
          boxShadow: "0 2px 16px rgba(28,42,57,0.06)",
        }}
      >
        {state === "done" ? (
          <Confirmation name={name} />
        ) : (
          <>
            <div
              style={{
                display: "inline-block",
                background: "#FDF6EB",
                border: "1px solid #E8D9B5",
                borderRadius: 20,
                padding: "4px 12px",
                fontSize: 12,
                fontWeight: 600,
                color: "#C9A86A",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                marginBottom: 20,
              }}
            >
              Available Now
            </div>

            <h1
              style={{
                margin: "0 0 10px",
                fontSize: 26,
                fontWeight: 800,
                color: "#1C2A39",
                fontFamily: "Manrope, Inter, sans-serif",
                lineHeight: 1.25,
              }}
            >
              Let's talk now.
            </h1>

            <p
              style={{
                margin: "0 0 32px",
                fontSize: 15,
                color: "#516B84",
                lineHeight: 1.6,
              }}
            >
              Leave your number and we'll call you within the hour.
            </p>

            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={labelStyle}>Your name *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="John Smith"
                  required
                  style={inputStyle}
                />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={labelStyle}>Phone number *</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1 (555) 000-0000"
                  required
                  style={inputStyle}
                />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={labelStyle}>
                  Hotel / Chain{" "}
                  <span style={{ color: "#A0A0A0", fontWeight: 400 }}>(optional)</span>
                </label>
                <input
                  type="text"
                  value={hotel}
                  onChange={(e) => setHotel(e.target.value)}
                  placeholder="Marriott International"
                  style={inputStyle}
                />
              </div>

              {state === "error" && (
                <p style={{ margin: 0, fontSize: 13, color: "#C0392B" }}>
                  Something went wrong. Please try again or email us directly at{" "}
                  <a href="mailto:omri@rating-iq.com" style={{ color: "#C0392B" }}>
                    omri@rating-iq.com
                  </a>
                  .
                </p>
              )}

              <button
                type="submit"
                disabled={state === "loading"}
                style={{
                  marginTop: 8,
                  background: state === "loading" ? "#516B84" : "#1C2A39",
                  color: "#fff",
                  border: "none",
                  borderRadius: 8,
                  padding: "14px 24px",
                  fontSize: 15,
                  fontWeight: 700,
                  fontFamily: "Manrope, Inter, sans-serif",
                  cursor: state === "loading" ? "not-allowed" : "pointer",
                  transition: "background 0.15s",
                  letterSpacing: "0.01em",
                }}
              >
                {state === "loading" ? "Sending..." : "Call me back now →"}
              </button>
            </form>
          </>
        )}
      </div>

      <p style={{ marginTop: 28, fontSize: 12, color: "#A0A0A0" }}>
        RatingIQ · <a href="https://rating-iq.com" style={{ color: "#A0A0A0" }}>rating-iq.com</a>
      </p>
    </main>
  );
}

function Confirmation({ name }: { name: string }) {
  const firstName = name.split(" ")[0];
  return (
    <div style={{ textAlign: "center", padding: "16px 0" }}>
      <div
        style={{
          width: 52,
          height: 52,
          borderRadius: "50%",
          background: "#FDF6EB",
          border: "1px solid #E8D9B5",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: "0 auto 24px",
          fontSize: 22,
        }}
      >
        ✓
      </div>
      <h2
        style={{
          margin: "0 0 10px",
          fontSize: 22,
          fontWeight: 800,
          color: "#1C2A39",
          fontFamily: "Manrope, Inter, sans-serif",
        }}
      >
        Got it, {firstName}.
      </h2>
      <p
        style={{
          margin: "0 0 24px",
          fontSize: 15,
          color: "#516B84",
          lineHeight: 1.65,
        }}
      >
        We're checking who's available right now and will call you shortly.
      </p>
      <p style={{ margin: 0, fontSize: 13, color: "#A0A0A0" }}>
        Prefer email?{" "}
        <a href="mailto:omri@rating-iq.com" style={{ color: "#516B84" }}>
          omri@rating-iq.com
        </a>
      </p>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 600,
  color: "#1C2A39",
  letterSpacing: "0.01em",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "11px 14px",
  borderRadius: 7,
  border: "1px solid #DDD9D3",
  fontSize: 15,
  color: "#1C2A39",
  background: "#FAFAF9",
  outline: "none",
  fontFamily: "Inter, sans-serif",
  boxSizing: "border-box",
};
