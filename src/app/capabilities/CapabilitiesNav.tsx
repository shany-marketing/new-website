"use client";

import { useState, useRef, useEffect } from "react";
import { useTheme } from "next-themes";
import Link from "next/link";
import ThemeToggle from "@/components/ui/theme-toggle";

type Props = {
  cta: { text: string; href: string; external?: boolean; onClick?: () => void };
};

export default function CapabilitiesNav({ cta }: Props) {
  const [capOpen, setCapOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const openCap = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setCapOpen(true);
  };
  const closeCap = () => {
    closeTimer.current = setTimeout(() => setCapOpen(false), 150);
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? "border-b" : "border-b border-transparent"}`}
      style={scrolled ? { background: "var(--nav-scrolled-bg)", backdropFilter: "blur(12px)", borderColor: "var(--glass-border)" } : undefined}
    >
      <nav className="px-4 md:px-8">
        <div className="max-w-6xl mx-auto h-20 grid grid-cols-[1fr_auto_1fr] items-center">

          {/* Col 1 — Logo (left) */}
          <Link href="/">
            <img src={resolvedTheme === "dark" ? "/logo-white.svg" : "/logo.svg"} alt="RatingIQ" style={{ height: "72px", width: "auto", objectFit: "contain" }} />
          </Link>

          {/* Col 2 — Nav links (always centered, never shifts) */}
          <div className="hidden md:flex items-center gap-8">
            <div className="relative" onMouseEnter={openCap} onMouseLeave={closeCap}>
              <button className="flex items-center gap-1 text-base text-muted hover:text-foreground transition-colors duration-200">
                What We Do
                <svg className={`w-3 h-3 transition-transform duration-200 ${capOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                </svg>
              </button>
              {capOpen && (
                <div className="absolute top-full left-1/2 -translate-x-1/2 pt-3 z-50" style={{ minWidth: "260px" }} onMouseEnter={openCap} onMouseLeave={closeCap}>
                  <div className="rounded-2xl py-2" style={{ background: "var(--nav-scrolled-bg)", backdropFilter: "blur(12px)", boxShadow: "0 20px 40px rgba(0,0,0,0.25)" }}>
                    <Link href="/pulse" className="block px-4 py-3 rounded-xl mx-1 hover:bg-white/5 transition-colors group">
                      <div className="flex items-center gap-2 mb-0.5 flex-nowrap">
                        <span className="text-[10px] font-bold tracking-widest uppercase px-2 py-0.5 rounded-full shrink-0 whitespace-nowrap" style={{ color: "var(--gold)", background: "rgba(201,168,106,0.1)", border: "1px solid rgba(201,168,106,0.2)" }}>Pulse</span>
                        <span className="text-sm font-semibold text-foreground">Know Your Guests</span>
                      </div>
                      <p className="text-xs text-muted">All platforms, all data, one place</p>
                    </Link>
                    <Link href="/radar" className="block px-4 py-3 rounded-xl mx-1 hover:bg-white/5 transition-colors group">
                      <div className="flex items-center gap-2 mb-0.5 flex-nowrap">
                        <span className="text-[10px] font-bold tracking-widest uppercase px-2 py-0.5 rounded-full shrink-0 whitespace-nowrap" style={{ color: "var(--gold)", background: "rgba(201,168,106,0.1)", border: "1px solid rgba(201,168,106,0.2)" }}>Radar</span>
                        <span className="text-sm font-semibold text-foreground">Own Your Rating</span>
                      </div>
                      <p className="text-xs text-muted">See exactly where your rating stands and why</p>
                    </Link>
                    <div className="my-1 mx-4 h-px" style={{ background: "var(--glass-border)" }} />
                    <Link href="/premium" className="block px-4 py-3 rounded-xl mx-1 hover:bg-white/5 transition-colors group">
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
            <a href="/#why" className="text-base text-muted hover:text-foreground transition-colors duration-200">Why RatingIQ</a>
            <a href="/#how-it-works" className="text-base text-muted hover:text-foreground transition-colors duration-200">How It Works</a>
            <a href="/#faq" className="text-base text-muted hover:text-foreground transition-colors duration-200">FAQ</a>
          </div>

          {/* Col 3 — Right side (right-aligned) + mobile hamburger */}
          <div className="flex items-center justify-end gap-3">
            {/* Desktop */}
            <div className="hidden md:flex items-center gap-3">
              <ThemeToggle />
              <Link href="/login" className="text-sm font-semibold transition-colors duration-200 px-4 py-2" style={{ color: "#1C2A39" }}>Log In</Link>
              {cta.onClick ? (
                <button onClick={cta.onClick} className="text-sm font-semibold text-navy-1 rounded-xl px-5 py-2.5 transition-all duration-300 hover:opacity-90 hover:scale-[1.02]" style={{ background: "linear-gradient(to right, var(--gold), var(--gold-dark))" }}>
                  {cta.text}
                </button>
              ) : cta.external ? (
                <a href={cta.href} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-navy-1 rounded-xl px-5 py-2.5 transition-all duration-300 hover:opacity-90 hover:scale-[1.02]" style={{ background: "linear-gradient(to right, var(--gold), var(--gold-dark))" }}>
                  {cta.text}
                </a>
              ) : (
                <Link href={cta.href} className="text-sm font-semibold text-navy-1 rounded-xl px-5 py-2.5 transition-all duration-300 hover:opacity-90 hover:scale-[1.02]" style={{ background: "linear-gradient(to right, var(--gold), var(--gold-dark))" }}>
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
          </div>

        </div>
      </nav>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t px-4 pb-5 pt-3" style={{ background: "var(--nav-scrolled-bg)", backdropFilter: "blur(12px)", borderColor: "var(--glass-border)" }}>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted mb-2">Capabilities</p>
          <Link href="/pulse" onClick={() => setMobileOpen(false)} className="flex items-center gap-2 py-2.5 border-b" style={{ borderColor: "var(--glass-border)" }}>
            <span className="text-[10px] font-bold tracking-widest uppercase px-2 py-0.5 rounded-full" style={{ color: "var(--muted)", background: "var(--input-bg)" }}>Free</span>
            <span className="text-sm font-medium text-foreground">Know Your Guests</span>
          </Link>
          <Link href="/radar" onClick={() => setMobileOpen(false)} className="flex items-center gap-2 py-2.5 border-b" style={{ borderColor: "var(--glass-border)" }}>
            <span className="text-[10px] font-bold tracking-widest uppercase px-2 py-0.5 rounded-full" style={{ color: "var(--gold)", background: "rgba(201,168,106,0.1)" }}>Tier 1</span>
            <span className="text-sm font-medium text-foreground">Own Your Rating</span>
          </Link>
          <Link href="/premium" onClick={() => setMobileOpen(false)} className="flex items-center gap-2 py-2.5 border-b" style={{ borderColor: "var(--glass-border)" }}>
            <span className="text-[10px] font-bold tracking-widest uppercase px-2 py-0.5 rounded-full" style={{ color: "#1C2A39", background: "var(--gold)" }}>Premium</span>
            <span className="text-sm font-medium text-foreground">Drive Your Revenue</span>
          </Link>
          <div className="flex flex-col gap-1 mt-3">
            <a href="/#why" onClick={() => setMobileOpen(false)} className="py-2.5 text-sm text-muted">Why RatingIQ</a>
            <a href="/#how-it-works" onClick={() => setMobileOpen(false)} className="py-2.5 text-sm text-muted">How It Works</a>
            <a href="/#faq" onClick={() => setMobileOpen(false)} className="py-2.5 text-sm text-muted">FAQ</a>
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
