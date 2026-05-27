"use client";

import { useState, useRef } from "react";
import { useTheme } from "next-themes";
import Link from "next/link";

type Props = {
  cta: { text: string; href: string; external?: boolean; onClick?: () => void };
};

const glass = {
  background: "var(--nav-scrolled-bg)",
  backdropFilter: "blur(16px)",
  border: "1px solid var(--glass-border)",
};

export default function CapabilitiesNav({ cta }: Props) {
  const [capOpen, setCapOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { resolvedTheme } = useTheme();

  const openCap = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setCapOpen(true);
  };
  const closeCap = () => {
    closeTimer.current = setTimeout(() => setCapOpen(false), 150);
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b" style={{ ...glass, boxShadow: "0 1px 0 var(--glass-border)" }}>
      <nav className="max-w-6xl mx-auto px-4 md:px-8 h-20 flex items-center justify-between">

        {/* Logo */}
        <Link href="/" className="flex items-center shrink-0">
          <img src={resolvedTheme === "dark" ? "/logo-white.svg" : "/logo.svg"} alt="RatingIQ" style={{ height: "72px", width: "auto" }} />
        </Link>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-7">

          {/* Capabilities dropdown */}
          <div className="relative" onMouseEnter={openCap} onMouseLeave={closeCap}>
            <button className="flex items-center gap-1 text-sm text-muted hover:text-foreground transition-colors duration-200">
              What We Do
              <svg className={`w-3 h-3 transition-transform duration-200 ${capOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
              </svg>
            </button>

            {capOpen && (
              <div className="absolute top-full left-1/2 -translate-x-1/2 pt-3 z-50" style={{ minWidth: "260px" }} onMouseEnter={openCap} onMouseLeave={closeCap}>
                <div className="rounded-2xl py-2" style={{ ...glass, boxShadow: "0 20px 40px rgba(0,0,0,0.25)" }}>
                  <Link href="/capabilities/statistics" className="block px-4 py-3 rounded-xl mx-1 hover:bg-white/5 transition-colors group">
                    <div className="flex items-center gap-2 mb-0.5 flex-nowrap">
                      <span className="text-[10px] font-bold tracking-widest uppercase px-2 py-0.5 rounded-full shrink-0 whitespace-nowrap" style={{ color: "var(--muted)", background: "var(--input-bg)" }}>Free</span>
                      <span className="text-sm font-semibold text-foreground">Know Your Guests</span>
                    </div>
                    <p className="text-xs text-muted">All platforms, all data, one place</p>
                  </Link>
                  <Link href="/capabilities/ratings" className="block px-4 py-3 rounded-xl mx-1 hover:bg-white/5 transition-colors group">
                    <div className="flex items-center gap-2 mb-0.5 flex-nowrap">
                      <span className="text-[10px] font-bold tracking-widest uppercase px-2 py-0.5 rounded-full shrink-0 whitespace-nowrap" style={{ color: "var(--gold)", background: "rgba(201,168,106,0.1)" }}>Tier 1</span>
                      <span className="text-sm font-semibold text-foreground">Own Your Rating</span>
                    </div>
                    <p className="text-xs text-muted">See exactly where your rating stands and why</p>
                  </Link>
                  <div className="my-1 mx-4 h-px" style={{ background: "var(--glass-border)" }} />
                  <Link href="/capabilities/premium" className="block px-4 py-3 rounded-xl mx-1 hover:bg-white/5 transition-colors group">
                    <div className="flex items-center gap-2 mb-0.5 flex-nowrap">
                      <span className="text-[10px] font-bold tracking-widest uppercase px-2 py-0.5 rounded-full shrink-0 whitespace-nowrap" style={{ color: "#1C2A39", background: "var(--gold)" }}>Premium</span>
                      <span className="text-sm font-semibold text-foreground">Drive Your Revenue</span>
                    </div>
                    <p className="text-xs text-muted">Insights, actions, reviews & Elaine</p>
                  </Link>
                </div>
              </div>
            )}
          </div>

          <a href="/#how-it-works" className="text-sm text-muted hover:text-foreground transition-colors duration-200">How It Works</a>
          <a href="/pricing" className="text-sm text-muted hover:text-foreground transition-colors duration-200">Pricing</a>
        </div>

        {/* Right side */}
        <div className="hidden md:flex items-center gap-3">
          <Link href="/login" className="text-sm text-muted hover:text-foreground transition-colors duration-200 px-3 py-2">Log In</Link>
          {cta.onClick ? (
            <button onClick={cta.onClick} className="text-sm font-semibold px-5 py-2.5 rounded-xl transition-all hover:opacity-90" style={{ background: "linear-gradient(to right, var(--gold), var(--gold-dark))", color: "#1C2A39" }}>
              {cta.text}
            </button>
          ) : cta.external ? (
            <a href={cta.href} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold px-5 py-2.5 rounded-xl transition-all hover:opacity-90" style={{ background: "linear-gradient(to right, var(--gold), var(--gold-dark))", color: "#1C2A39" }}>
              {cta.text}
            </a>
          ) : (
            <Link href={cta.href} className="text-sm font-semibold px-5 py-2.5 rounded-xl transition-all hover:opacity-90" style={{ background: "linear-gradient(to right, var(--gold), var(--gold-dark))", color: "#1C2A39" }}>
              {cta.text}
            </Link>
          )}
        </div>

        {/* Mobile hamburger */}
        <button onClick={() => setMobileOpen(!mobileOpen)} className="md:hidden text-foreground p-2" aria-label="Toggle menu">
          {mobileOpen
            ? <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            : <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" /></svg>
          }
        </button>
      </nav>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t px-4 pb-5 pt-3" style={{ ...glass, borderColor: "var(--glass-border)" }}>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted mb-2">Capabilities</p>
          <Link href="/capabilities/statistics" onClick={() => setMobileOpen(false)} className="flex items-center gap-2 py-2.5 border-b" style={{ borderColor: "var(--glass-border)" }}>
            <span className="text-[10px] font-bold tracking-widest uppercase px-2 py-0.5 rounded-full" style={{ color: "var(--muted)", background: "var(--input-bg)" }}>Free</span>
            <span className="text-sm font-medium text-foreground">Know Your Guests</span>
          </Link>
          <Link href="/capabilities/ratings" onClick={() => setMobileOpen(false)} className="flex items-center gap-2 py-2.5 border-b" style={{ borderColor: "var(--glass-border)" }}>
            <span className="text-[10px] font-bold tracking-widest uppercase px-2 py-0.5 rounded-full" style={{ color: "var(--gold)", background: "rgba(201,168,106,0.1)" }}>Tier 1</span>
            <span className="text-sm font-medium text-foreground">Own Your Rating</span>
          </Link>
          <Link href="/capabilities/premium" onClick={() => setMobileOpen(false)} className="flex items-center gap-2 py-2.5 border-b" style={{ borderColor: "var(--glass-border)" }}>
            <span className="text-[10px] font-bold tracking-widest uppercase px-2 py-0.5 rounded-full" style={{ color: "#1C2A39", background: "var(--gold)" }}>Premium</span>
            <span className="text-sm font-medium text-foreground">Drive Your Revenue</span>
          </Link>
          <div className="flex flex-col gap-1 mt-3">
            <a href="/#how-it-works" onClick={() => setMobileOpen(false)} className="py-2.5 text-sm text-muted">How It Works</a>
            <a href="/pricing" onClick={() => setMobileOpen(false)} className="py-2.5 text-sm text-muted">Pricing</a>
            <Link href="/login" onClick={() => setMobileOpen(false)} className="py-2.5 text-sm text-muted">Log In</Link>
          </div>
          <div className="mt-3 pt-3 border-t" style={{ borderColor: "var(--glass-border)" }}>
            {cta.onClick ? (
              <button onClick={() => { setMobileOpen(false); cta.onClick!(); }} className="block w-full text-center py-3 rounded-xl font-semibold text-sm" style={{ background: "linear-gradient(to right, var(--gold), var(--gold-dark))", color: "#1C2A39" }}>{cta.text}</button>
            ) : cta.external ? (
              <a href={cta.href} target="_blank" rel="noopener noreferrer" className="block text-center py-3 rounded-xl font-semibold text-sm" style={{ background: "linear-gradient(to right, var(--gold), var(--gold-dark))", color: "#1C2A39" }}>{cta.text}</a>
            ) : (
              <Link href={cta.href} onClick={() => setMobileOpen(false)} className="block text-center py-3 rounded-xl font-semibold text-sm" style={{ background: "linear-gradient(to right, var(--gold), var(--gold-dark))", color: "#1C2A39" }}>{cta.text}</Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
