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

/* ── Mock Visuals ── */

function RatingOverviewVisual() {
  return (
    <div className="rounded-2xl p-5" style={glass}>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted mb-4">Rating Summary · Chain Average</p>
      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          { label: "Average", value: "8.3", note: "Last 90 days" },
          { label: "Median", value: "8.5", note: "50th percentile" },
          { label: "Latest", value: "8.6", note: "Most recent" },
        ].map(s => (
          <div key={s.label} className="text-center p-3 rounded-xl" style={{ background: "rgba(201,168,106,0.06)", border: "1px solid rgba(201,168,106,0.12)" }}>
            <p className="text-2xl font-bold mb-0.5" style={{ color: "var(--gold)", fontFamily: "var(--font-manrope)" }}>{s.value}</p>
            <p className="text-[10px] font-semibold text-foreground">{s.label}</p>
            <p className="text-[9px] text-muted mt-0.5">{s.note}</p>
          </div>
        ))}
      </div>
      <div className="pt-3 border-t" style={{ borderColor: "var(--glass-border)" }}>
        <p className="text-[10px] text-muted mb-2">Rating distribution</p>
        <div className="flex items-end gap-1" style={{ height: "40px" }}>
          {[{ r: "5–6", h: 5 }, { r: "6–7", h: 10 }, { r: "7–8", h: 22 }, { r: "8–9", h: 38 }, { r: "9–10", h: 28 }].map(b => (
            <div key={b.r} className="flex-1 flex flex-col items-center gap-0.5">
              <motion.div className="w-full rounded-t-sm" initial={{ height: 0 }} whileInView={{ height: `${b.h * 1.05}px` }} viewport={{ once: true }} transition={{ duration: 0.6 }} style={{ background: "var(--gold)", opacity: 0.3 + (b.h / 38) * 0.7 }} />
              <span className="text-[7px] text-muted">{b.r}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function PlatformRatingsVisual() {
  const platforms = [
    { label: "Booking.com", rating: 8.6, reviews: 2920, color: "var(--chart-1)" },
    { label: "TripAdvisor", rating: 8.4, reviews: 1250, color: "var(--chart-3)" },
    { label: "Google", rating: 8.2, reviews: 3510, color: "var(--chart-2)" },
    { label: "Expedia", rating: 8.0, reviews: 660, color: "var(--chart-5)" },
  ];
  return (
    <div className="rounded-2xl p-5" style={glass}>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted mb-4">Rating by Platform</p>
      <div className="space-y-3">
        {platforms.map(p => (
          <div key={p.label}>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-medium text-foreground">{p.label}</span>
              <div className="flex items-center gap-3">
                <span className="text-[10px] text-muted">{p.reviews.toLocaleString()} reviews</span>
                <span className="text-sm font-bold" style={{ color: p.color }}>{p.rating}</span>
              </div>
            </div>
            <div className="h-1.5 rounded-full" style={{ background: "var(--input-bg)" }}>
              <motion.div className="h-1.5 rounded-full" initial={{ width: 0 }} whileInView={{ width: `${(p.rating / 10) * 100}%` }} viewport={{ once: true }} transition={{ duration: 0.8 }} style={{ background: p.color }} />
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 pt-3 border-t flex items-center justify-between" style={{ borderColor: "var(--glass-border)" }}>
        <p className="text-[10px] text-muted">Widest gap: 0.6 pts (Booking vs Expedia)</p>
        <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ color: "var(--danger)", background: "rgba(184,80,80,0.1)", border: "1px solid rgba(184,80,80,0.2)" }}>Watch Expedia</span>
      </div>
    </div>
  );
}

function TrendVisual() {
  const months = ["Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar"];
  const values = [7.9, 8.0, 8.0, 8.1, 8.0, 8.2, 8.1, 8.3, 8.2, 8.3, 8.4, 8.3];
  const min = 7.7; const max = 8.6;
  const w = 280; const h = 70;
  const toX = (i: number) => (i / (values.length - 1)) * w;
  const toY = (v: number) => h - ((v - min) / (max - min)) * h;
  const d = values.map((v, i) => `${i === 0 ? "M" : "L"}${toX(i)},${toY(v)}`).join(" ");
  const fill = `${d} L${toX(values.length - 1)},${h} L0,${h} Z`;
  return (
    <div className="rounded-2xl p-5" style={glass}>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted mb-1">12-Month Rating Trend · Chain Avg</p>
      <div className="flex items-center gap-3 mb-3">
        <span className="text-3xl font-bold" style={{ color: "var(--gold)", fontFamily: "var(--font-manrope)" }}>8.3</span>
        <span className="text-xs px-2 py-0.5 rounded-full" style={{ color: "var(--success)", background: "rgba(74,143,107,0.12)" }}>↑ +0.4 pts this year</span>
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} style={{ overflow: "visible" }}>
        <defs>
          <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--gold)" stopOpacity="0.15" />
            <stop offset="100%" stopColor="var(--gold)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={fill} fill="url(#trendFill)" />
        <path d={d} fill="none" stroke="var(--gold)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {values.map((v, i) => i === values.length - 1 ? (
          <circle key={i} cx={toX(i)} cy={toY(v)} r="3.5" fill="var(--gold)" />
        ) : null)}
      </svg>
      <div className="flex justify-between mt-2">
        {months.filter((_, i) => i % 3 === 0).map(m => (
          <span key={m} className="text-[8px] text-muted">{m}</span>
        ))}
      </div>
    </div>
  );
}

function SegmentDrillVisual() {
  const segments = [
    { label: "Couples · Germany", rating: 8.9, pct: 92 },
    { label: "Solo · France", rating: 8.6, pct: 86 },
    { label: "Business · US", rating: 8.2, pct: 79 },
    { label: "Families · UK", rating: 7.8, pct: 72 },
    { label: "Groups · Netherlands", rating: 7.4, pct: 65 },
  ];
  const getColor = (r: number) => r >= 8.5 ? "var(--success)" : r >= 8.0 ? "var(--gold)" : "var(--danger)";
  return (
    <div className="rounded-2xl p-5" style={glass}>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted mb-1">Segment Breakdown</p>
      <p className="text-[10px] text-muted mb-4">Guest origin × traveler type × satisfaction</p>
      <div className="space-y-2.5">
        {segments.map(s => (
          <div key={s.label}>
            <div className="flex justify-between mb-1">
              <span className="text-xs text-muted">{s.label}</span>
              <span className="text-xs font-bold" style={{ color: getColor(s.rating) }}>{s.rating}</span>
            </div>
            <div className="h-1.5 rounded-full" style={{ background: "var(--input-bg)" }}>
              <motion.div className="h-1.5 rounded-full" initial={{ width: 0 }} whileInView={{ width: `${s.pct}%` }} viewport={{ once: true }} transition={{ duration: 0.7 }} style={{ background: getColor(s.rating) }} />
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 pt-3 border-t" style={{ borderColor: "var(--glass-border)" }}>
        <p className="text-[10px]" style={{ color: "var(--danger)" }}>⚠ Families from UK scoring 1.5 pts below chain average — flagged</p>
      </div>
    </div>
  );
}

function GuestCombinationsVisual() {
  const rows = [
    { origin: "Germany", type: "Couple", rating: 8.9, count: 312, sentiment: "positive" },
    { origin: "United States", type: "Business", rating: 8.2, count: 198, sentiment: "neutral" },
    { origin: "UK", type: "Family", rating: 7.8, count: 145, sentiment: "negative" },
    { origin: "France", type: "Solo", rating: 8.6, count: 287, sentiment: "positive" },
    { origin: "Netherlands", type: "Group", rating: 7.4, count: 89, sentiment: "negative" },
  ];
  const colorFor = (s: string) => s === "positive" ? "var(--success)" : s === "negative" ? "var(--danger)" : "var(--gold)";
  return (
    <div className="rounded-2xl p-5" style={glass}>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted mb-4">Guest Combinations · Top Segments</p>
      <div className="space-y-1">
        <div className="flex gap-3 pb-2 border-b" style={{ borderColor: "var(--glass-border)" }}>
          <span className="text-[9px] text-muted flex-1">Origin</span>
          <span className="text-[9px] text-muted w-16">Type</span>
          <span className="text-[9px] text-muted w-12 text-right">Rating</span>
          <span className="text-[9px] text-muted w-10 text-right">Count</span>
        </div>
        {rows.map(r => (
          <div key={r.origin + r.type} className="flex gap-3 py-1.5 items-center">
            <span className="text-xs text-foreground flex-1">{r.origin}</span>
            <span className="text-xs text-muted w-16">{r.type}</span>
            <span className="text-xs font-bold w-12 text-right" style={{ color: colorFor(r.sentiment) }}>{r.rating}</span>
            <span className="text-[10px] text-muted w-10 text-right">{r.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const FEATURES = [
  {
    id: "overview",
    label: "Rating Overview",
    headline: "Avg, median, latest — three numbers that tell you where your chain actually stands.",
    body: "One number isn't enough. The average hides outliers. The median shows what most guests actually experience. The latest tells you which direction you're moving. Together, they give you something a single score never can: context.",
    detail: "Avg rating (last 90 days), median rating (50th percentile), latest review score, per-property.",
    visual: <RatingOverviewVisual />,
  },
  {
    id: "platforms",
    label: "Per-Platform Ratings",
    headline: "Your score on Booking, Google, Expedia, and TripAdvisor — side by side.",
    body: "You don't have one rating. You have four. And they're not the same. A chain scoring 8.6 on Booking and 8.0 on Expedia has a problem worth investigating. Platform-level data shows you which audiences have the highest expectations — and which platforms you're underperforming on.",
    detail: "Avg rating per platform, review count per platform, side-by-side gap analysis, trend per platform.",
    visual: <PlatformRatingsVisual />,
  },
  {
    id: "trend",
    label: "12-Month Rating Trend",
    headline: "Your current score means nothing without knowing which direction it's heading.",
    body: "Up from 7.9 twelve months ago, or down from 8.7? That difference determines your next move. The trend is what separates a chain gaining ground from one quietly losing it — and 8.3 looks very different depending on which one you are.",
    detail: "Monthly average rating chart (12-month lookback), month-over-month delta, trend direction.",
    visual: <TrendVisual />,
  },
  {
    id: "segments",
    label: "Static Breakdowns",
    headline: "Find the exact segment dragging your chain down.",
    body: "Your 8.3 average is a blended number. Couples from Germany might be scoring 8.9 while UK families score 7.8. That gap doesn't show up in your headline rating — but it's real, and it's costing you bookings from a specific, trackable segment. These breakdowns surface it.",
    detail: "Rating breakdowns by guest origin, traveler type, room type. Identify underperforming segments per property.",
    visual: <SegmentDrillVisual />,
  },
  {
    id: "combinations",
    label: "Guest Combinations",
    headline: "It's not just families scoring low. It's families from the UK. That specificity changes everything.",
    body: "Guest combinations put origin, traveler type, and satisfaction in one table. When you can see that UK families are your lowest-scoring segment at 89 reviews a month, that's a fixable problem — not a vague trend.",
    detail: "Origin + traveler type + rating + volume combinations. Ranked by rating and count. Per-property.",
    visual: <GuestCombinationsVisual />,
  },
];

export default function RatingsClient() {
  const [signupOpen, setSignupOpen] = useState(false);

  return (
    <div className="min-h-screen" style={{ background: "var(--page-gradient)" }}>
      <CapabilitiesNav activeTier="ratings" cta={{ text: "Try Ratings — $99/mo", href: "/signup", onClick: () => setSignupOpen(true) }} />

      <main className="pt-28 pb-24 px-4 md:px-8">
        <div className="max-w-5xl mx-auto">

          {/* Hero */}
          <motion.div initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.1 } } }} className="mb-10">
            <motion.div variants={fadeUp} transition={{ duration: 0.5 }}>
              <div className="flex flex-wrap items-center gap-3 mb-6">
                <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full" style={{ color: "var(--gold)", background: "rgba(201,168,106,0.1)", border: "1px solid rgba(201,168,106,0.2)" }}>
                  $99 · /property/month
                </span>
                <span className="text-xs text-muted">Part of the Capabilities suite →</span>
                <Link href="/capabilities/statistics" className="text-xs" style={{ color: "var(--gold)" }}>Know Your Guests</Link>
                <span className="text-xs text-muted">·</span>
                <Link href="/capabilities/premium" className="text-xs" style={{ color: "var(--gold)" }}>Drive Your Revenue</Link>
              </div>
            </motion.div>

            <motion.h1 variants={fadeUp} transition={{ duration: 0.5 }} className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground leading-tight mb-5" style={{ fontFamily: "var(--font-manrope)" }}>
              Own Your Rating
            </motion.h1>

            <motion.p variants={fadeUp} transition={{ duration: 0.5 }} className="text-xl md:text-2xl text-muted max-w-2xl mb-6 leading-relaxed">
              Know your rating. Know why it&apos;s there. Know which segment is holding it back.
            </motion.p>

            <motion.p variants={fadeUp} transition={{ duration: 0.5 }} className="text-base text-muted max-w-2xl leading-relaxed mb-8">
              Know Your Guests tells you what&apos;s happening. Own Your Rating tells you how good it actually is. Average, median, latest — broken down by platform and by segment. A 12-month trend line so you know if you&apos;re on the way up or the way down. And static breakdowns so you can find the specific guest profile that&apos;s dragging your chain average lower than it should be.
            </motion.p>

            <motion.div variants={fadeUp} transition={{ duration: 0.5 }} className="flex flex-wrap gap-3">
              <button onClick={() => setSignupOpen(true)} className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-all hover:opacity-90" style={{ background: "linear-gradient(to right, var(--gold), var(--gold-dark))", color: "#1C2A39" }}>
                Try Ratings — $99/property/mo
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" /></svg>
              </button>
              <Link href="/capabilities/premium" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-all hover:text-foreground" style={{ ...glass, color: "var(--muted)" }}>
                Drive Your Revenue →
              </Link>
            </motion.div>
          </motion.div>

          {/* Feature sections */}
          <div className="space-y-24">
            {FEATURES.map((f, i) => (
              <motion.div
                key={f.id}
                id={f.id}
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.5 }}
                className={`grid md:grid-cols-2 gap-10 md:gap-16 items-center ${i % 2 === 1 ? "md:[&>*:first-child]:order-2" : ""}`}
              >
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--gold)" }}>Ratings · {String(i + 1).padStart(2, "0")}</p>
                  <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4 leading-snug" style={{ fontFamily: "var(--font-manrope)" }}>{f.label}</h2>
                  <p className="text-lg font-medium text-foreground mb-3 leading-relaxed">{f.headline}</p>
                  <p className="text-muted leading-relaxed mb-5">{f.body}</p>
                  <div className="rounded-xl p-4" style={{ background: "rgba(201,168,106,0.05)", border: "1px solid rgba(201,168,106,0.12)" }}>
                    <p className="text-xs text-muted leading-relaxed"><span className="font-semibold" style={{ color: "var(--gold)" }}>What you see: </span>{f.detail}</p>
                  </div>
                </div>
                <div>{f.visual}</div>
              </motion.div>
            ))}
          </div>

          {/* Why it matters callout */}
          <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} transition={{ duration: 0.5 }} className="mt-24 rounded-2xl p-8 md:p-10" style={{ background: "var(--navy-1)", backgroundColor: "#1C2A39" }}>
            <p className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: "var(--gold)" }}>Why ratings data changes what you do</p>
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-xl font-bold text-white mb-3" style={{ fontFamily: "var(--font-manrope)" }}>Without Own Your Rating</h3>
                <ul className="space-y-2 text-sm" style={{ color: "rgba(250,249,247,0.6)" }}>
                  <li>You know you have 8,340 reviews.</li>
                  <li>You don&apos;t know if your average is going up or down.</li>
                  <li>You don&apos;t know if Booking is outperforming Google.</li>
                  <li>You don&apos;t know which guest segment is scoring lowest.</li>
                </ul>
              </div>
              <div>
                <h3 className="text-xl font-bold text-white mb-3" style={{ fontFamily: "var(--font-manrope)" }}>With Own Your Rating</h3>
                <ul className="space-y-2 text-sm" style={{ color: "rgba(250,249,247,0.8)" }}>
                  <li style={{ color: "rgba(201,168,106,0.9)" }}>✓ Your avg is 8.3 — up from 7.9 a year ago.</li>
                  <li style={{ color: "rgba(201,168,106,0.9)" }}>✓ Booking is at 8.6. Expedia is at 8.0 and falling.</li>
                  <li style={{ color: "rgba(201,168,106,0.9)" }}>✓ UK families are scoring 7.8 — 0.5 pts below the chain.</li>
                  <li style={{ color: "rgba(201,168,106,0.9)" }}>✓ You know where to focus this quarter.</li>
                </ul>
              </div>
            </div>
          </motion.div>

          {/* CTA */}
          <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} transition={{ duration: 0.5 }} className="mt-16 text-center">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4" style={{ fontFamily: "var(--font-manrope)" }}>Know your rating. Down to the segment.</h2>
            <p className="text-muted mb-8 max-w-lg mx-auto">Start a free trial. No credit card. Cancel any time. See your chain&apos;s rating data the way it should be seen.</p>
            <div className="flex flex-wrap justify-center gap-3">
              <button onClick={() => setSignupOpen(true)} className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl font-semibold transition-all hover:opacity-90" style={{ background: "linear-gradient(to right, var(--gold), var(--gold-dark))", color: "#1C2A39" }}>
                Try Ratings — $99/property/mo
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" /></svg>
              </button>
              <Link href="/capabilities/premium" className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl font-semibold transition-all hover:text-foreground" style={{ ...glass, color: "var(--muted)" }}>
                Explore Premium →
              </Link>
            </div>
          </motion.div>

        </div>
      </main>

      <SignupModal open={signupOpen} onClose={() => setSignupOpen(false)} title="Try Ratings." subtitle="$99/property/mo. Tell us about your chain and we'll set you up." ctaLabel="Try Ratings — $99/property/mo" />
    </div>
  );
}
