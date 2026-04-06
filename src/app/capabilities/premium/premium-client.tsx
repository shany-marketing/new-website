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

function InsightCardVisual() {
  return (
    <div className="rounded-2xl p-5" style={glass}>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted mb-4">AI Insight · Check-In Speed</p>

      <div className="flex items-center gap-3 mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold text-foreground">Check-In Speed</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ color: "var(--danger)", background: "rgba(184,80,80,0.1)", border: "1px solid rgba(184,80,80,0.2)" }}>Declining</span>
          </div>
          <div className="flex gap-4">
            <div><p className="text-xs text-muted">Mentions</p><p className="text-sm font-bold text-foreground">28%</p></div>
            <div><p className="text-xs text-muted">Avg rating</p><p className="text-sm font-bold" style={{ color: "var(--danger)" }}>7.4</p></div>
            <div><p className="text-xs text-muted">MoM</p><p className="text-sm font-bold" style={{ color: "var(--danger)" }}>+4%</p></div>
          </div>
        </div>
      </div>

      <div className="rounded-xl p-3 mb-3" style={{ background: "rgba(184,80,80,0.06)", border: "1px solid rgba(184,80,80,0.15)" }}>
        <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--danger)" }}>Root Cause</p>
        <p className="text-xs text-muted leading-relaxed">Front desk staffing falls below demand during peak check-in windows (3–6pm). Guests consistently report waits of 15–20 minutes. Issue concentrated in your 4 city-centre properties.</p>
      </div>

      <div className="rounded-xl p-3 mb-3" style={{ background: "rgba(201,168,106,0.06)", border: "1px solid rgba(201,168,106,0.15)" }}>
        <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--gold)" }}>Action Items</p>
        <ul className="text-xs text-muted space-y-1">
          <li>• Add 1 front desk staff member on Mon–Fri 2:30–6pm at city-centre properties</li>
          <li>• Pilot mobile check-in at Prague and Vienna before rolling out chain-wide</li>
          <li>• Audit room-ready timing — delays may originate with housekeeping, not front desk</li>
        </ul>
      </div>

      <div className="rounded-xl p-3" style={{ background: "var(--input-bg)", border: "1px solid var(--glass-border)" }}>
        <p className="text-[10px] font-semibold uppercase tracking-wider mb-1 text-muted">Guest quotes</p>
        <p className="text-xs italic" style={{ color: "var(--muted)" }}>&ldquo;Waited 20 minutes to check in despite arriving during a quiet period. Staff seemed overwhelmed.&rdquo;</p>
      </div>
    </div>
  );
}

function ElaineChatVisual() {
  const messages = [
    { role: "user", text: "What's our biggest complaint across the chain this month?" },
    { role: "elaine", text: "Check-in speed is your #1 issue — mentioned in 28% of reviews this month, up 4% vs last month. It's concentrated in your 4 city-centre properties. Average rating when this is mentioned: 7.4 vs your chain avg of 8.3." },
    { role: "user", text: "Which property has it worst?" },
    { role: "elaine", text: "Vienna Central has the highest concentration — 41% of its reviews mention check-in delays. Prague Old Town is second at 37%. Both show the same pattern: peak hours 3–6pm, weekdays." },
  ];
  return (
    <div className="rounded-2xl p-5" style={glass}>
      <div className="flex items-center gap-2 mb-4">
        <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: "rgba(201,168,106,0.15)", color: "var(--gold)" }}>E</div>
        <div>
          <p className="text-xs font-semibold text-foreground">Elaine</p>
          <p className="text-[9px] text-muted">AI Analyst · Your chain data</p>
        </div>
        <div className="ml-auto flex items-center gap-1">
          <div className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--success)" }} />
          <span className="text-[9px] text-muted">Online</span>
        </div>
      </div>
      <div className="space-y-3">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className="max-w-[85%] rounded-xl px-3 py-2" style={m.role === "user"
              ? { background: "rgba(201,168,106,0.12)", border: "1px solid rgba(201,168,106,0.2)" }
              : { background: "var(--input-bg)", border: "1px solid var(--glass-border)" }
            }>
              <p className="text-xs leading-relaxed" style={{ color: m.role === "user" ? "var(--gold)" : "var(--foreground)" }}>{m.text}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center gap-2 rounded-lg px-3 py-2" style={{ background: "var(--input-bg)", border: "1px solid var(--glass-border)" }}>
        <span className="text-xs text-muted flex-1">Ask Elaine anything...</span>
        <svg className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--gold)" }} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" /></svg>
      </div>
    </div>
  );
}

function ReviewResponseVisual() {
  return (
    <div className="rounded-2xl p-5" style={glass}>
      <div className="mb-4 pb-4 border-b" style={{ borderColor: "var(--glass-border)" }}>
        <div className="flex items-start justify-between mb-2">
          <div>
            <p className="text-xs font-semibold text-foreground">Maria S. · Booking.com</p>
            <p className="text-[10px] text-muted">8.0 · Couple · Germany · Feb 14, 2026</p>
          </div>
          <div className="flex gap-0.5">
            {[1,2,3,4].map(i => <svg key={i} className="w-3 h-3" fill="var(--gold)" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>)}
            <svg className="w-3 h-3" fill="none" stroke="var(--gold)" strokeWidth={1.5} viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
          </div>
        </div>
        <p className="text-xs text-muted leading-relaxed">&ldquo;Lovely room and great breakfast. Check-in took much longer than expected — had to wait 20 minutes despite a pre-booked reservation.&rdquo;</p>
      </div>

      <div className="mb-3">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold" style={{ background: "rgba(201,168,106,0.15)", color: "var(--gold)" }}>AI</div>
          <p className="text-[10px] font-semibold text-foreground">AI-Generated Response</p>
          <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full" style={{ color: "var(--success)", background: "rgba(74,143,107,0.1)" }}>Score: 91/100</span>
        </div>
        <div className="rounded-xl p-3" style={{ background: "rgba(74,143,107,0.05)", border: "1px solid rgba(74,143,107,0.15)" }}>
          <p className="text-xs text-muted leading-relaxed">Dear Maria, thank you for staying with us and for your kind words about the room and breakfast — we&apos;re delighted you enjoyed them. We sincerely apologise for the wait at check-in; this fell short of our standard and we&apos;re addressing it directly. We hope to welcome you back soon. Warm regards, Thomas (General Manager)</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-1">
        {[
          { label: "Right language", ok: true }, { label: "Addresses positive", ok: true },
          { label: "Addresses negative", ok: true }, { label: "Guest name", ok: true },
          { label: "Hotelier name", ok: true }, { label: "Asks return visit", ok: true },
        ].map(q => (
          <span key={q.label} className="text-[9px] px-2 py-0.5 rounded-full" style={{ color: q.ok ? "var(--success)" : "var(--danger)", background: q.ok ? "rgba(74,143,107,0.1)" : "rgba(184,80,80,0.1)" }}>
            {q.ok ? "✓" : "✗"} {q.label}
          </span>
        ))}
      </div>
    </div>
  );
}


function ActionsVisual() {
  const actions = [
    { category: "Check-In Speed", action: "Added 2 front desk staff on peak hours", person: "Thomas K.", date: "Mar 14", color: "var(--danger)" },
    { category: "Cleanliness", action: "New housekeeping checklist rolled out to all properties", person: "Sarah M.", date: "Mar 2", color: "var(--gold)" },
    { category: "Breakfast", action: "Expanded breakfast menu at Berlin & Munich properties", person: "Klaus B.", date: "Feb 22", color: "var(--success)" },
    { category: "WiFi", action: "Network upgrade completed at 6 city-centre properties", person: "David R.", date: "Feb 10", color: "var(--cyan)" },
  ];
  return (
    <div className="rounded-2xl p-5" style={glass}>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted mb-4">Staff Actions · Tied to Insight Categories</p>
      <div className="space-y-3">
        {actions.map(a => (
          <div key={a.action} className="flex gap-3 items-start">
            <div className="w-1 h-full rounded-full shrink-0 mt-1.5" style={{ background: a.color, minHeight: "32px" }} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-[10px] font-semibold" style={{ color: a.color }}>{a.category}</span>
                <span className="text-[9px] text-muted ml-auto">{a.date}</span>
              </div>
              <p className="text-xs text-foreground leading-relaxed">{a.action}</p>
              <p className="text-[10px] text-muted mt-0.5">{a.person}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function DigestVisual() {
  return (
    <div className="rounded-2xl p-5" style={glass}>
      <div className="flex items-center gap-2 mb-4">
        <div className="w-7 h-7 rounded flex items-center justify-center" style={{ background: "rgba(201,168,106,0.1)", border: "1px solid rgba(201,168,106,0.2)" }}>
          <svg className="w-4 h-4" fill="none" stroke="var(--gold)" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" /></svg>
        </div>
        <div>
          <p className="text-xs font-semibold text-foreground">Weekly Digest</p>
          <p className="text-[9px] text-muted">Monday, 8:00am · Per property</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 mb-4">
        {[
          { label: "New reviews", value: "184", delta: "+12%", up: true },
          { label: "Avg rating", value: "8.3", delta: "+0.1", up: true },
          { label: "Unresponded", value: "23", delta: "-31%", up: false },
          { label: "Response rate", value: "87%", delta: "+6%", up: true },
        ].map(s => (
          <div key={s.label} className="rounded-xl p-2.5" style={{ background: "rgba(201,168,106,0.05)", border: "1px solid rgba(201,168,106,0.12)" }}>
            <p className="text-[9px] text-muted mb-0.5">{s.label}</p>
            <p className="text-base font-bold text-foreground">{s.value}</p>
            <p className="text-[9px]" style={{ color: s.up ? "var(--success)" : "var(--danger)" }}>{s.delta} vs last week</p>
          </div>
        ))}
      </div>
      <div className="rounded-xl p-3" style={{ background: "rgba(184,80,80,0.05)", border: "1px solid rgba(184,80,80,0.12)" }}>
        <p className="text-[10px] font-semibold mb-1" style={{ color: "var(--danger)" }}>Needs attention this week</p>
        <p className="text-xs text-muted">Vienna Central: check-in complaints up 4pts. Prague Old Town: 9 unresponded reviews from last 7 days.</p>
      </div>
    </div>
  );
}


const FEATURES = [
  {
    id: "ai-responses",
    label: "AI Responses",
    badge: "Top feature",
    headline: "A quality response for every review. You choose how hands-on to be.",
    body: "For every review, RatingIQ generates a response in the guest's language — addressing what they praised, what they complained about, signed with your hotelier's name. A 12-point quality check runs automatically before anything goes out. Then you choose your mode: copy-paste it yourself, or let Auto-Respond post directly to Booking.com and Google with a single approval click. Same quality engine, two levels of control.",
    detail: "Response generation per review, 12-point quality scoring, multi-turn refinement. Two modes — Copy-paste (manual control) or Auto-Respond (on-demand — one-click approval posts directly to Booking.com + Google).",
    visual: <ReviewResponseVisual />,
  },
  {
    id: "insights",
    label: "Insights",
    badge: "Top feature",
    headline: "Not just what guests said. What it means — and what to fix first.",
    body: "RatingIQ reads every review across your chain, groups feedback into operational categories — Check-In Speed, Cleanliness, Staff, Value — and surfaces the root cause behind each one, with specific fixes attached. Not a sentiment score. An actual priority list, built from your data.",
    detail: "Category breakdown (share %, avg rating, MoM trend), top issues by ranking, executive summary, root cause per category, action items, time-series view, example guest quotes.",
    visual: <InsightCardVisual />,
  },
  {
    id: "elaine",
    label: "Elaine",
    badge: "Your ChatGPT for hotels",
    headline: "Every question you have about your chain. Answered.",
    body: "Elaine is a dedicated AI analyst that only knows one thing: your hotels. Every review, every platform, every property — she's read it all. Ask in plain language: 'What's hurting our Vienna properties?', 'Which guest type scores us lowest on Booking?', 'Show me all WiFi complaints from the last 90 days'. She doesn't give generic hospitality advice. She gives answers from your data, your guests, your chain.",
    detail: "Natural language queries over all review data, semantic search by topic, data aggregations, dynamic chart generation (bar, line, pie, scatter), scoped exclusively to your chain.",
    visual: <ElaineChatVisual />,
  },
  {
    id: "reviews",
    label: "Reviews",
    badge: null,
    headline: "Every review your chain has ever received. All in one place.",
    body: "Every review from Booking.com, Google, Expedia, and TripAdvisor — searchable, filterable, sortable. By platform, by rating, by response status, by date. No more switching tabs. No more missing a review from a platform you forgot to check. One view, every property.",
    detail: "Full review access across all platforms, search and filter by platform / rating / response status / date, sort by rating or date, per-property and chain-wide.",
    visual: null,
  },
  {
    id: "actions",
    label: "Staff Actions",
    badge: null,
    headline: "Log what your team fixed. See whether it moved the rating.",
    body: "When check-in speed is flagged, someone needs to act on it. Log who did what, when, and against which category. Over time, you can see which operational changes actually moved the needle — and which didn't. Priorities without accountability don't stick.",
    detail: "Create actions per category, assign staff member, set date, view action history per category, cross-reference with insight trends.",
    visual: <ActionsVisual />,
  },
  {
    id: "digest",
    label: "Weekly Digest",
    badge: "Every Monday",
    headline: "Your property's performance summary, before your week starts.",
    body: "Every Monday morning, a digest lands in your inbox with what matters: new review count, avg rating vs. last week, unresponded reviews, response rate, and the specific issues that need your attention. No login required to stay informed.",
    detail: "Configurable frequency (daily/weekly), configurable email recipient, new reviews, rating delta, unresponded count, top complaint categories.",
    visual: <DigestVisual />,
  },
];

export default function PremiumClient() {
  const [demoOpen, setDemoOpen] = useState(false);

  return (
    <div className="min-h-screen" style={{ background: "var(--page-gradient)" }}>
      <CapabilitiesNav activeTier="premium" cta={{ text: "Book a Demo", href: "https://calendar.app.google/QywtyvvCugBR5U4n8", onClick: () => setDemoOpen(true) }} />

      <main className="pt-28 pb-24 px-4 md:px-8">
        <div className="max-w-5xl mx-auto">

          {/* Hero */}
          <motion.div initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.1 } } }} className="mb-10">
            <motion.div variants={fadeUp} transition={{ duration: 0.5 }}>
              <div className="flex flex-wrap items-center gap-3 mb-6">
                <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full" style={{ color: "#1C2A39", background: "var(--gold)" }}>
                  Chain Ready
                </span>
              </div>
            </motion.div>

            <motion.h1 variants={fadeUp} transition={{ duration: 0.5 }} className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground leading-tight mb-5" style={{ fontFamily: "var(--font-manrope)" }}>
              Drive Your Revenue
            </motion.h1>

            <motion.p variants={fadeUp} transition={{ duration: 0.5 }} className="text-xl md:text-2xl text-muted max-w-2xl mb-6 leading-relaxed">
              This is where the work gets done.
            </motion.p>

            <motion.p variants={fadeUp} transition={{ duration: 0.5 }} className="text-base text-muted max-w-2xl leading-relaxed mb-8">
              Your rating, fully managed — this is the full operating layer. It reads every review, finds the patterns, and tells your team exactly what to fix. Responses go out without anyone lifting a finger. Staff actions get logged against the priorities that triggered them. Every Monday you get the numbers.
            </motion.p>

            <motion.div variants={fadeUp} transition={{ duration: 0.5 }} className="flex flex-wrap gap-3">
              <button onClick={() => setDemoOpen(true)} className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-all hover:opacity-90" style={{ background: "linear-gradient(to right, var(--gold), var(--gold-dark))", color: "#1C2A39" }}>
                Book a Demo
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" /></svg>
              </button>
            </motion.div>
          </motion.div>

          {/* Feature sections */}
          <div className="space-y-24">
            {FEATURES.filter(f => f.visual).map((f, i) => (
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
                  <div className="flex items-center gap-2 mb-3">
                    <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--gold)" }}>Premium · {String(i + 1).padStart(2, "0")}</p>
                    {f.badge && <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold" style={{ color: "#1C2A39", background: "var(--gold)" }}>{f.badge}</span>}
                  </div>
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

            {/* Auto-Respond — no visual, use a text-heavy card instead */}
            {FEATURES.filter(f => !f.visual).map(f => (
              <motion.div
                key={f.id}
                id={f.id}
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.5 }}
                className="rounded-2xl p-8 md:p-10"
                style={{ background: "rgba(201,168,106,0.05)", border: "1px solid rgba(201,168,106,0.18)" }}
              >
                <div className="flex items-center gap-2 mb-4">
                  <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--gold)" }}>Premium</p>
                  {f.badge && <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold" style={{ color: "#1C2A39", background: "var(--gold)" }}>{f.badge}</span>}
                </div>
                <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4" style={{ fontFamily: "var(--font-manrope)" }}>{f.label}</h2>
                <div className="grid md:grid-cols-2 gap-8">
                  <div>
                    <p className="text-lg font-medium text-foreground mb-3">{f.headline}</p>
                    <p className="text-muted leading-relaxed mb-5">{f.body}</p>
                    <div className="rounded-xl p-4" style={{ background: "rgba(201,168,106,0.05)", border: "1px solid rgba(201,168,106,0.12)" }}>
                      <p className="text-xs text-muted leading-relaxed"><span className="font-semibold" style={{ color: "var(--gold)" }}>What you see: </span>{f.detail}</p>
                    </div>
                  </div>
                  <div className="rounded-2xl p-6" style={glass}>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted mb-4">Auto-Respond settings</p>
                    {[
                      { label: "Status", value: "Enabled", color: "var(--success)" },
                      { label: "Min. rating threshold", value: "8.0 and above", color: "var(--foreground)" },
                      { label: "Skip reviews with complaints", value: "Yes", color: "var(--foreground)" },
                      { label: "Auto-post to platforms", value: "Booking · Google", color: "var(--gold)" },
                      { label: "Max per run", value: "25 responses", color: "var(--foreground)" },
                    ].map(s => (
                      <div key={s.label} className="flex justify-between py-2 border-b last:border-b-0" style={{ borderColor: "var(--glass-border)" }}>
                        <span className="text-xs text-muted">{s.label}</span>
                        <span className="text-xs font-semibold" style={{ color: s.color }}>{s.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Final CTA */}
          <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} transition={{ duration: 0.5 }} className="mt-24 rounded-2xl p-10 text-center" style={{ background: "var(--navy-1)", backgroundColor: "#1C2A39" }}>
            <p className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: "var(--gold)" }}>Chain Ready</p>
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-4" style={{ fontFamily: "var(--font-manrope)" }}>
              See it on your chain&apos;s actual data.
            </h2>
            <p className="mb-8 max-w-lg mx-auto text-sm" style={{ color: "rgba(250,249,247,0.6)" }}>
              We don&apos;t do generic demos. We connect to your chain&apos;s reviews live and show you your real insights, your real issues, and what the AI would recommend — before you commit to anything.
            </p>
            <button onClick={() => setDemoOpen(true)} className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl font-semibold transition-all hover:opacity-90" style={{ background: "var(--gold)", color: "#1C2A39" }}>
              Book a Demo
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" /></svg>
            </button>
            <p className="mt-4 text-xs" style={{ color: "rgba(250,249,247,0.4)" }}>We&apos;ll show you your chain&apos;s real data. Live.</p>
          </motion.div>

        </div>
      </main>

      <SignupModal
        open={demoOpen}
        onClose={() => setDemoOpen(false)}
        title="Book a demo."
        subtitle="We connect to your chain's actual data and show you your real insights — live."
        ctaLabel="Book a Demo"
        note="We'll show you your chain's real data. Live."
      />
    </div>
  );
}
