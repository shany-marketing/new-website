"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import SignupModal from "../components/SignupModal";
import CapabilitiesNav from "../capabilities/CapabilitiesNav";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};

const glass = {
  background: "var(--nav-scrolled-bg)",
  backdropFilter: "blur(16px)",
  border: "1px solid var(--glass-border)",
};

const TIERS = [
  {
    name: "Free",
    price: "$0",
    period: "/property/mo",
    sub: "See your portfolio. Understand where you stand.",
    badge: null,
    features: [
      "Review volume, trend & response rate",
      "Platform mix breakdown",
      "Guest demographics and origins",
      "Seasonality heatmap",
    ],
    cta: "Start Free",
    href: "/signup",
    highlight: false,
  },
  {
    name: "Ratings",
    price: "$99",
    period: "/property/mo",
    sub: "Find out which properties are falling behind — and why.",
    badge: "Tier 1",
    features: [
      "Everything in Free",
      "Avg, median & monthly rating trend",
      "Rating breakdown per platform",
      "Static breakdowns by origin, room type & guest type",
    ],
    cta: "Try Ratings",
    href: "/signup",
    highlight: false,
  },
  {
    name: "Premium",
    price: "Custom",
    period: "",
    sub: "From data to decisions. For chains that move fast.",
    badge: "Chain Ready",
    features: [
      "Everything in Ratings",
      "AI issue prioritization & root cause analysis",
      "Elaine — your ChatGPT for hotels",
      "AI-drafted review responses",
      "Auto-Respond (on-demand)",
      "Staff action tracking",
      "Weekly digest (per-hotel)",
    ],
    cta: "Book a Demo",
    href: "https://calendar.app.google/QywtyvvCugBR5U4n8",
    external: true,
    highlight: true,
  },
];

const FAQS = [
  {
    q: "How long does it take to see a rating improvement?",
    a: "Most chains start seeing clearer priorities within the first week. Rating movement typically follows in 30–60 days as operational fixes take hold. We show you the shortest path — the execution is yours.",
  },
  {
    q: "How fast can my whole chain go live?",
    a: "Same day. Each property takes under 5 minutes — paste the review page URLs and our pipeline ingests everything automatically. No IT involvement, no API keys, no integrations.",
  },
  {
    q: "Do my GMs need to change anything?",
    a: "Nothing. Auto-Respond handles responses on demand — one-click approval posts directly to Booking.com and Google in the guest's language. GMs keep running their property. Their workflow doesn't change at all.",
  },
  {
    q: "How does pricing work at chain scale?",
    a: "Each property is priced individually. The more properties you add, the more your chain intelligence compounds. Book a demo and we'll walk through volume options for your specific chain size.",
  },
  {
    q: "Is our chain's data isolated from competitors?",
    a: "Completely. Each chain's data is fully isolated. Your review data is never shared, sold, or used to train models on behalf of anyone else. Full encryption in transit and at rest.",
  },
];

export default function PricingPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [signupOpen, setSignupOpen] = useState(false);
  const [signupLabel, setSignupLabel] = useState("Get Started");

  const openSignup = (label: string) => { setSignupLabel(label); setSignupOpen(true); };

  return (
    <div className="min-h-screen" style={{ background: "var(--page-gradient)" }}>

      <CapabilitiesNav
        activeTier={null}
        cta={{ text: "Book a Demo", href: "https://calendar.app.google/QywtyvvCugBR5U4n8", external: true }}
      />

      <div className="max-w-5xl mx-auto px-4 md:px-8 pt-40 pb-24">

        {/* Hero */}
        <motion.div variants={fadeUp} initial="hidden" animate="visible" transition={{ duration: 0.5 }} className="text-center mb-20">
          <p className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: "var(--gold)" }}>Pricing</p>
          <h1 className="text-4xl md:text-5xl font-black text-foreground mb-5" style={{ fontFamily: "var(--font-manrope)", lineHeight: 1.1 }}>
            Start with one property.{" "}
            <span className="bg-gradient-to-r from-gold via-gold-light to-gold-dark bg-clip-text text-transparent">
              Scale to your chain.
            </span>
          </h1>
          <p className="text-muted text-lg max-w-xl mx-auto">
            Every tier is priced per property. The more you add, the more your chain intelligence compounds.
          </p>
        </motion.div>

        {/* Tier Cards */}
        <motion.div variants={stagger} initial="hidden" animate="visible" className="grid md:grid-cols-3 gap-6 mb-20">
          {TIERS.map((tier, i) => (
            <motion.div
              key={i}
              variants={fadeUp}
              transition={{ duration: 0.5 }}
              className="rounded-2xl p-7 relative flex flex-col"
              style={{
                ...glass,
                ...(tier.highlight ? { border: "1px solid rgba(201,168,106,0.3)", background: "rgba(201,168,106,0.04)" } : {}),
              }}
            >
              {tier.badge && (
                <span
                  className="absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full"
                  style={
                    tier.highlight
                      ? { background: "linear-gradient(to right, var(--gold), var(--gold-dark))", color: "#1C2A39" }
                      : { background: "var(--input-bg)", color: "var(--gold)", border: "1px solid rgba(201,168,106,0.3)" }
                  }
                >
                  {tier.badge}
                </span>
              )}

              <div className="mb-1">
                <h3 className="text-xl font-bold text-foreground" style={{ fontFamily: "var(--font-manrope)" }}>{tier.name}</h3>
              </div>
              <p className="text-muted text-sm mb-5">{tier.sub}</p>

              <div className="mb-6">
                <span className="text-4xl font-black text-foreground" style={{ fontFamily: "var(--font-manrope)" }}>{tier.price}</span>
                <span className="text-muted text-sm ml-1">{tier.period}</span>
              </div>

              <ul className="space-y-2.5 mb-8">
                {tier.features.map((f, j) => (
                  <li key={j} className="flex items-start gap-2 text-sm text-muted">
                    <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" style={{ color: "var(--gold)" }}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>

              {/* Spacer pushes button to bottom */}
              <div className="flex-1" />

              <div>
                {tier.external ? (
                  <a
                    href={tier.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-center font-semibold rounded-xl px-5 py-3 transition-all duration-200 hover:opacity-90"
                    style={{ background: "linear-gradient(to right, var(--gold), var(--gold-dark))", color: "#1C2A39" }}
                  >
                    {tier.cta}
                  </a>
                ) : (
                  <button
                    onClick={() => openSignup(tier.cta)}
                    className="block w-full text-center font-semibold rounded-xl px-5 py-3 transition-all duration-200 hover:opacity-90"
                    style={
                      tier.name === "Free"
                        ? { background: "var(--input-bg)", border: "1px solid var(--glass-border)", color: "var(--foreground)" }
                        : { background: "linear-gradient(to right, var(--gold), var(--gold-dark))", color: "#1C2A39" }
                    }
                  >
                    {tier.cta}
                  </button>
                )}
                <p className="text-center text-xs mt-2" style={{ color: "var(--muted)", visibility: tier.highlight ? "visible" : "hidden" }}>we&apos;ll walk you through it live</p>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* FAQ */}
        <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} transition={{ duration: 0.5 }} className="max-w-2xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground text-center mb-2" style={{ fontFamily: "var(--font-manrope)" }}>
            Common{" "}
            <span className="bg-gradient-to-r from-gold via-gold-light to-gold-dark bg-clip-text text-transparent">Questions</span>
          </h2>
          <p className="text-muted text-sm text-center mb-10">The ones chain CEOs ask us most.</p>

          <div className="space-y-2">
            {FAQS.map((faq, i) => (
              <motion.div
                key={i}
                variants={fadeUp}
                transition={{ duration: 0.4 }}
                className="rounded-xl overflow-hidden"
                style={glass}
              >
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between px-5 py-4 text-left"
                >
                  <span className="font-semibold text-foreground text-sm pr-4">{faq.q}</span>
                  <svg
                    className={`w-4 h-4 text-muted shrink-0 transition-transform duration-300 ${openFaq === i ? "rotate-180" : ""}`}
                    fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                  </svg>
                </button>
                <div
                  className="overflow-hidden transition-all duration-300"
                  style={{ maxHeight: openFaq === i ? "200px" : "0px", opacity: openFaq === i ? 1 : 0 }}
                >
                  <p className="px-5 pb-5 text-muted text-sm leading-relaxed">{faq.a}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Bottom CTA */}
        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mt-20 rounded-2xl p-10 text-center"
          style={{ background: "rgba(201,168,106,0.06)", border: "1px solid rgba(201,168,106,0.2)" }}
        >
          <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--gold)" }}>Ready when you are</p>
          <h3 className="text-2xl md:text-3xl font-bold text-foreground mb-3" style={{ fontFamily: "var(--font-manrope)" }}>
            Turn your reviews into revenue.
          </h3>
          <p className="text-muted text-sm mb-8 max-w-md mx-auto">
            Start free. Upgrade as your chain grows. No contracts, no setup fees.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button onClick={() => openSignup("Start Free")} className="px-6 py-3 rounded-xl font-semibold text-sm transition-all hover:opacity-90" style={{ background: "var(--input-bg)", border: "1px solid var(--glass-border)", color: "var(--foreground)" }}>
              Start Free
            </button>
            <a href="https://calendar.app.google/QywtyvvCugBR5U4n8" target="_blank" rel="noopener noreferrer" className="px-6 py-3 rounded-xl font-semibold text-sm transition-all hover:opacity-90" style={{ background: "linear-gradient(to right, var(--gold), var(--gold-dark))", color: "#1C2A39" }}>
              Book a Demo →
            </a>
          </div>
        </motion.div>

      </div>

      <SignupModal open={signupOpen} onClose={() => setSignupOpen(false)} ctaSource="pricing_page" ctaLabel={signupLabel} />
    </div>
  );
}
