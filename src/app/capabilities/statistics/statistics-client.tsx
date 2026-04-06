"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import CapabilitiesNav from "../CapabilitiesNav";
import SignupModal from "../../components/SignupModal";

const glass = {
  background: "var(--input-bg)",
  border: "1px solid var(--glass-border)",
  backdropFilter: "blur(12px)",
  boxShadow: "var(--card-shadow)",
};

const fadeUp = { hidden: { opacity: 0, y: 24 }, visible: { opacity: 1, y: 0 } };

/* ── Mock visuals ── */

function PlatformMixVisual() {
  const platforms = [
    { label: "Google", pct: 42, color: "var(--chart-1)" },
    { label: "Booking.com", pct: 35, color: "var(--chart-2)" },
    { label: "TripAdvisor", pct: 15, color: "var(--chart-3)" },
    { label: "Expedia", pct: 8, color: "var(--chart-5)" },
  ];
  return (
    <div className="rounded-2xl p-5" style={glass}>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted mb-4">Platform Mix · 12 Properties</p>
      <div className="flex gap-4 items-center mb-4">
        <svg width="72" height="72" viewBox="0 0 72 72" className="shrink-0">
          <circle cx="36" cy="36" r="26" fill="none" stroke="var(--input-bg)" strokeWidth="13" />
          <circle cx="36" cy="36" r="26" fill="none" stroke="var(--chart-1)" strokeWidth="13" strokeDasharray="68.6 103.7" strokeDashoffset="0" transform="rotate(-90 36 36)" />
          <circle cx="36" cy="36" r="26" fill="none" stroke="var(--chart-2)" strokeWidth="13" strokeDasharray="57.2 115.1" strokeDashoffset="-68.6" transform="rotate(-90 36 36)" />
          <circle cx="36" cy="36" r="26" fill="none" stroke="var(--chart-3)" strokeWidth="13" strokeDasharray="24.5 147.8" strokeDashoffset="-125.8" transform="rotate(-90 36 36)" />
          <circle cx="36" cy="36" r="26" fill="none" stroke="var(--chart-5)" strokeWidth="13" strokeDasharray="13.1 159.2" strokeDashoffset="-150.3" transform="rotate(-90 36 36)" />
        </svg>
        <div className="flex flex-col gap-1.5">
          {platforms.map(p => (
            <div key={p.label} className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full shrink-0" style={{ background: p.color }} />
              <span className="text-xs text-muted">{p.label}</span>
              <span className="text-xs font-semibold ml-auto pl-3" style={{ color: p.color }}>{p.pct}%</span>
            </div>
          ))}
        </div>
      </div>
      <div className="pt-3 border-t flex gap-4" style={{ borderColor: "var(--glass-border)" }}>
        <div className="text-center flex-1">
          <div className="text-lg font-bold text-foreground">8,340</div>
          <div className="text-[10px] text-muted">Total reviews</div>
        </div>
        <div className="w-px" style={{ background: "var(--glass-border)" }} />
        <div className="text-center flex-1">
          <div className="text-lg font-bold" style={{ color: "var(--success)" }}>+12%</div>
          <div className="text-[10px] text-muted">vs last month</div>
        </div>
        <div className="w-px" style={{ background: "var(--glass-border)" }} />
        <div className="text-center flex-1">
          <div className="text-lg font-bold text-foreground">4</div>
          <div className="text-[10px] text-muted">Platforms</div>
        </div>
      </div>
    </div>
  );
}

function HeatmapVisual() {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const data: number[][] = [
    [2,3,4,5,6,8,7],[3,4,5,6,7,9,8],[4,5,6,7,8,10,9],
    [3,4,5,5,7,8,7],[5,6,7,8,9,10,9],[6,7,8,9,10,10,9],
    [7,8,9,10,10,10,9],[6,7,8,9,9,10,8],[5,6,7,8,8,9,7],
    [4,5,6,7,8,9,7],[3,4,5,6,7,8,6],[4,5,6,7,8,9,7],
  ];
  const getColor = (v: number) => {
    const opacity = 0.08 + (v / 10) * 0.55;
    return `rgba(201,168,106,${opacity.toFixed(2)})`;
  };
  return (
    <div className="rounded-2xl p-5 overflow-x-auto" style={glass}>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted mb-4">Review Volume Heatmap</p>
      <div className="min-w-[340px]">
        <div className="flex gap-1 mb-1 ml-8">
          {months.map(m => <div key={m} className="flex-1 text-[8px] text-muted text-center">{m}</div>)}
        </div>
        {days.map((day, di) => (
          <div key={day} className="flex gap-1 mb-1 items-center">
            <div className="text-[8px] text-muted w-7 shrink-0">{day}</div>
            {months.map((_, mi) => (
              <div key={mi} className="flex-1 h-4 rounded-sm" style={{ background: getColor(data[mi][di]) }} />
            ))}
          </div>
        ))}
        <div className="flex items-center gap-2 mt-3 justify-end">
          <span className="text-[8px] text-muted">Less</span>
          {[0.1,0.2,0.35,0.5,0.63].map((o, i) => <div key={i} className="w-3 h-3 rounded-sm" style={{ background: `rgba(201,168,106,${o})` }} />)}
          <span className="text-[8px] text-muted">More</span>
        </div>
      </div>
    </div>
  );
}

function DemographicsVisual() {
  const travelerTypes = [
    { label: "Couples", pct: 36, color: "var(--chart-1)" },
    { label: "Solo", pct: 23, color: "var(--chart-2)" },
    { label: "Families", pct: 20, color: "var(--chart-3)" },
    { label: "Business", pct: 14, color: "var(--chart-5)" },
    { label: "Groups", pct: 7, color: "var(--chart-6)" },
  ];
  const origins = ["Germany", "United States", "France", "Netherlands", "UK", "Israel"];
  return (
    <div className="rounded-2xl p-5" style={glass}>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted mb-4">Guest Demographics</p>
      <p className="text-[10px] text-muted mb-2 uppercase tracking-wider">Traveler type</p>
      <div className="flex flex-col gap-2 mb-4">
        {travelerTypes.map(t => (
          <div key={t.label}>
            <div className="flex justify-between mb-1">
              <span className="text-xs text-muted">{t.label}</span>
              <span className="text-xs font-semibold" style={{ color: t.color }}>{t.pct}%</span>
            </div>
            <div className="h-1.5 rounded-full" style={{ background: "var(--input-bg)" }}>
              <motion.div className="h-1.5 rounded-full" initial={{ width: 0 }} whileInView={{ width: `${t.pct}%` }} viewport={{ once: true }} transition={{ duration: 0.8, delay: 0.1 }} style={{ background: t.color }} />
            </div>
          </div>
        ))}
      </div>
      <div className="pt-3 border-t" style={{ borderColor: "var(--glass-border)" }}>
        <p className="text-[10px] text-muted uppercase tracking-wider mb-2">Top guest origins</p>
        <div className="flex flex-wrap gap-1.5">
          {origins.map((o, i) => (
            <span key={o} className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: "var(--input-bg)", color: "var(--foreground)", border: "1px solid var(--glass-border)", opacity: 1 - i * 0.1 }}>
              {o}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function ResponseRateVisual() {
  const platforms = [
    { label: "Booking.com", rate: 84, color: "var(--gold)" },
    { label: "Google", rate: 71, color: "var(--cyan)" },
    { label: "Expedia", rate: 62, color: "var(--success)" },
    { label: "TripAdvisor", rate: 45, color: "var(--chart-5)" },
  ];
  return (
    <div className="rounded-2xl p-5" style={glass}>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted mb-4">Response Rate</p>
      <div className="flex items-center justify-center">
        <svg width="80" height="80" viewBox="0 0 80 80">
          <circle cx="40" cy="40" r="30" fill="none" stroke="var(--input-bg)" strokeWidth="10" />
          <circle cx="40" cy="40" r="30" fill="none" stroke="var(--gold)" strokeWidth="10"
            strokeDasharray={`${0.71 * 188.5} ${188.5}`} strokeDashoffset="47" transform="rotate(-90 40 40)" strokeLinecap="round" />
          <text x="40" y="36" textAnchor="middle" fontSize="14" fontWeight="bold" fill="var(--foreground)">71%</text>
          <text x="40" y="50" textAnchor="middle" fontSize="8" fill="var(--muted)">avg rate</text>
        </svg>
      </div>
    </div>
  );
}

function PlatformHealthVisual() {
  const rows = [
    { platform: "Booking.com", count: "+124", trend: "up" },
    { platform: "Google", count: "+89", trend: "down" },
    { platform: "TripAdvisor", count: "+31", trend: "neutral" },
    { platform: "Expedia", count: "+18", trend: "up" },
  ];
  return (
    <div className="rounded-2xl p-5" style={glass}>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted mb-4">Platform Health · Volume</p>
      <div className="space-y-2">
        {rows.map(r => (
          <div key={r.platform} className="flex items-center justify-between py-2.5 border-b" style={{ borderColor: "var(--glass-border)" }}>
            <span className="text-xs font-medium text-foreground w-28">{r.platform}</span>
            <span className="text-xs" style={{ color: r.trend === "up" ? "var(--success)" : r.trend === "down" ? "var(--danger)" : "var(--muted)" }}>
              {r.trend === "up" ? "▲" : r.trend === "down" ? "▼" : "—"}
            </span>
            <span className="text-xs" style={{ color: "var(--success)" }}>{r.count} reviews</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ReviewVolumeVisual() {
  const months = ["Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar"];
  const counts = [480, 510, 560, 490, 440, 380, 520, 590, 650];
  const max = Math.max(...counts);
  return (
    <div className="rounded-2xl p-5" style={glass}>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted mb-1">Monthly Review Volume</p>
      <div className="flex items-end gap-1 mb-1" style={{ height: "70px" }}>
        {counts.map((c, i) => (
          <motion.div
            key={i}
            className="flex-1 rounded-t-sm"
            initial={{ height: 0 }}
            whileInView={{ height: `${(c / max) * 100}%` }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: i * 0.06 }}
            style={{ background: i === counts.length - 1 ? "var(--gold)" : "rgba(201,168,106,0.25)", minHeight: "4px" }}
          />
        ))}
      </div>
      <div className="flex gap-1">
        {months.map(m => <div key={m} className="flex-1 text-[8px] text-muted text-center">{m}</div>)}
      </div>
      <div className="mt-3 flex items-center gap-4 pt-3 border-t" style={{ borderColor: "var(--glass-border)" }}>
        <div>
          <p className="text-base font-bold text-foreground">650</p>
          <p className="text-[10px] text-muted">This month</p>
        </div>
        <div>
          <p className="text-base font-bold" style={{ color: "var(--success)" }}>+10.2%</p>
          <p className="text-[10px] text-muted">vs last month</p>
        </div>
        <div>
          <p className="text-base font-bold text-foreground">35%</p>
          <p className="text-[10px] text-muted">with text</p>
        </div>
      </div>
    </div>
  );
}

/* ── Features ── */
const FEATURES = [
  {
    id: "volume",
    label: "Review Volume & Trends",
    headline: "How much feedback is your chain generating — and is it growing?",
    body: "Total review count across all properties and platforms. Monthly velocity, current vs. prior period, and which properties are falling behind. A chain with declining review volume is flying blind — you can't fix what you're not seeing.",
    detail: "Total count, monthly trend, velocity (current vs. prior period), review depth (short / medium / long / detailed), text vs. non-text split.",
    visual: <ReviewVolumeVisual />,
  },
  {
    id: "platforms",
    label: "Platform Mix",
    headline: "Booking, Google, Expedia, TripAdvisor — where are your reviews actually coming from?",
    body: "Most chains are over-indexed on one platform and underexposed on others. Platform mix shows you exactly where your review activity sits — so you know where your rating is being built and where it's being ignored.",
    detail: "Review count and share % per platform, month-over-month volume change per platform.",
    visual: <PlatformMixVisual />,
  },
  {
    id: "demographics",
    label: "Guest Demographics",
    headline: "Know who's reviewing you before you try to improve what they think.",
    body: "Traveler type (couples, solo, families, business) and guest origin (country/region). If 38% of your reviewers are couples and your couples score is dragging, that's not a footnote — that's a portfolio problem with a specific fix.",
    detail: "Traveler type breakdown, guest origin by country, room type, nights stayed.",
    visual: <DemographicsVisual />,
  },
  {
    id: "heatmap",
    label: "Review Heatmap",
    headline: "When are guests leaving reviews — and when is your team most exposed?",
    body: "A day-of-week × month grid shows your peak review periods at a glance. Know when volume spikes, know when coverage is thin. Response timing matters — this is where you plan for it.",
    detail: "Day-of-week × 12-month grid, peak and low-volume period identification.",
    visual: <HeatmapVisual />,
  },
  {
    id: "responserate",
    label: "Response Rate",
    headline: "Response rate affects your platform ranking before a guest reads a single word.",
    body: "Booking.com and Google both factor response rate into visibility. A chain that's slow to respond loses positioning even when its rating is solid. Track response rate and see exactly where the gap is.",
    detail: "Overall response rate, responded vs. unresponded counts.",
    visual: <ResponseRateVisual />,
  },
  {
    id: "health",
    label: "Platform Health",
    headline: "Month-over-month changes per platform — nothing slips past without a number.",
    body: "Volume delta and trend direction — per platform, every month. Google dropping while Booking holds steady isn't noise. It's a signal. Platform health puts it in front of you.",
    detail: "Per-platform MoM volume change, trend direction.",
    visual: <PlatformHealthVisual />,
  },
];

/* ── Main ── */
export default function StatisticsClient() {
  const [signupOpen, setSignupOpen] = useState(false);

  return (
    <div className="min-h-screen" style={{ background: "var(--page-gradient)" }}>
      <CapabilitiesNav activeTier="statistics" cta={{ text: "Start Free", href: "/signup", onClick: () => setSignupOpen(true) }} />

      <main className="pt-28 pb-24 px-4 md:px-8">
        <div className="max-w-5xl mx-auto">

          {/* Hero */}
          <motion.div initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.1 } } }} className="mb-10">
            <motion.div variants={fadeUp} transition={{ duration: 0.5 }}>
              <div className="flex flex-wrap items-center gap-3 mb-6">
                <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full" style={{ color: "var(--muted)", background: "var(--input-bg)", border: "1px solid var(--glass-border)" }}>
                  Free · No credit card
                </span>
                <span className="text-xs text-muted">Part of the Capabilities suite →</span>
                <Link href="/capabilities/ratings" className="text-xs" style={{ color: "var(--gold)" }}>Ratings</Link>
                <span className="text-xs text-muted">·</span>
                <Link href="/capabilities/premium" className="text-xs" style={{ color: "var(--gold)" }}>Premium</Link>
              </div>
            </motion.div>

            <motion.h1 variants={fadeUp} transition={{ duration: 0.5 }} className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground leading-tight mb-5" style={{ fontFamily: "var(--font-manrope)" }}>
              Know Your Guests
            </motion.h1>

            <motion.p variants={fadeUp} transition={{ duration: 0.5 }} className="text-xl md:text-2xl text-muted max-w-2xl mb-6 leading-relaxed">
              Before you fix anything, you need to see everything. Free.
            </motion.p>

            <motion.p variants={fadeUp} transition={{ duration: 0.5 }} className="text-base text-muted max-w-2xl leading-relaxed mb-8">
              Your full review picture starts here. Where reviews are coming from, who&apos;s writing them, when volume peaks, and whether your team is keeping up with responses. No AI, no prioritisation — just the clean, accurate numbers behind your chain&apos;s review activity. Every property. Every platform.
            </motion.p>

            <motion.div variants={fadeUp} transition={{ duration: 0.5 }} className="flex flex-wrap gap-3">
              <button onClick={() => setSignupOpen(true)} className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-all hover:opacity-90" style={{ background: "linear-gradient(to right, var(--gold), var(--gold-dark))", color: "#1C2A39" }}>
                Start Free — No Credit Card
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" /></svg>
              </button>
              <Link href="/capabilities/ratings" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-all hover:text-foreground" style={{ ...glass, color: "var(--muted)" }}>
                See How to Own Your Rating →
              </Link>
            </motion.div>
          </motion.div>

          {/* Feature sections */}
          <div className="space-y-24">
            {FEATURES.map((f, i) => (
              <motion.div
                key={f.id}
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.5 }}
                className={`grid md:grid-cols-2 gap-10 md:gap-16 items-center ${i % 2 === 1 ? "md:[&>*:first-child]:order-2" : ""}`}
              >
                {/* Copy */}
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--gold)" }}>Statistics · {String(i + 1).padStart(2, "0")}</p>
                  <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4 leading-snug" style={{ fontFamily: "var(--font-manrope)" }}>
                    {f.label}
                  </h2>
                  <p className="text-lg font-medium text-foreground mb-3 leading-relaxed">{f.headline}</p>
                  <p className="text-muted leading-relaxed mb-5">{f.body}</p>
                  <div className="rounded-xl p-4" style={{ background: "rgba(201,168,106,0.05)", border: "1px solid rgba(201,168,106,0.12)" }}>
                    <p className="text-xs text-muted leading-relaxed"><span className="font-semibold" style={{ color: "var(--gold)" }}>What you see: </span>{f.detail}</p>
                  </div>
                </div>
                {/* Visual */}
                <div>{f.visual}</div>
              </motion.div>
            ))}
          </div>

          {/* Tier comparison */}
          <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} transition={{ duration: 0.5 }} className="mt-28 rounded-2xl overflow-hidden" style={{ border: "1px solid var(--glass-border)" }}>
            <div className="p-6 border-b" style={{ background: "rgba(201,168,106,0.04)", borderColor: "var(--glass-border)" }}>
              <p className="text-sm font-semibold text-foreground">Know Your Guests is your foundation. Here&apos;s what the full platform adds.</p>
            </div>
            <div className="grid grid-cols-3">
              {[
                { name: "Know Your Guests", price: "Free", color: "var(--muted)", items: ["Review volume", "Platform mix", "Guest demographics", "Heatmap", "Response rate", "Platform health"] },
                { name: "Own Your Rating", price: "$99/property/mo", color: "var(--gold)", items: ["+ Avg, median & latest score", "+ Per-platform rating", "+ Monthly rating trend", "+ Rating distribution", "+ Static breakdowns"] },
                { name: "Drive Your Revenue", price: "Custom", color: "var(--gold)", items: ["+ AI insights & root causes", "+ Elaine AI analyst", "+ AI Responses", "+ Weekly digest"] },
              ].map(tier => (
                <div key={tier.name} className="p-5 border-r last:border-r-0" style={{ borderColor: "var(--glass-border)" }}>
                  <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: tier.color }}>{tier.name}</p>
                  <p className="text-xs text-muted mb-4">{tier.price}</p>
                  <ul className="space-y-1.5">
                    {tier.items.map(item => (
                      <li key={item} className="text-xs text-muted flex items-start gap-1.5">
                        <span style={{ color: tier.color }} className="mt-0.5 shrink-0">✓</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </motion.div>

          {/* CTA */}
          <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} transition={{ duration: 0.5 }} className="mt-16 text-center">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4" style={{ fontFamily: "var(--font-manrope)" }}>Start with the full picture. It&apos;s free.</h2>
            <p className="text-muted mb-8 max-w-lg mx-auto">Connect your properties in under 5 minutes. No IT. No credit card. See your chain&apos;s review data exactly as it is.</p>
            <button onClick={() => setSignupOpen(true)} className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl font-semibold transition-all hover:opacity-90" style={{ background: "linear-gradient(to right, var(--gold), var(--gold-dark))", color: "#1C2A39" }}>
              Start Free
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" /></svg>
            </button>
          </motion.div>

        </div>
      </main>

      <SignupModal open={signupOpen} onClose={() => setSignupOpen(false)} ctaLabel="Start Free" />
    </div>
  );
}
