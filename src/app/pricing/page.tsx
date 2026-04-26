"use client";

import { useState } from "react";
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
    period: "",
    priceSub: "No credit card. No commitment.",
    sub: "See your full review picture, instantly.",
    badge: null,
    features: [
      "Review volume, trend & response rate",
      "Platform mix breakdown",
      "Guest demographics and origins",
      "Seasonality heatmap",
    ],
    cta: "Start Free",
    highlight: false,
    ctaSource: "pricing_start_free",
  },
  {
    name: "Premium",
    price: "Starting at $1",
    period: "/room/month",
    priceSub: "Custom pricing for your chain.",
    sub: "From data to decisions — fully tailored to your chain's size.",
    badge: "Custom",
    features: [
      "Everything in Free",
      "Avg, median & monthly rating trend",
      "Rating breakdown per platform",
      "Guest origin & traveler type breakdowns",
      "AI issue prioritization & root cause analysis",
      "Elaine — your ChatGPT for hotels",
      "AI-drafted review responses",
      "Auto-Respond (on-demand)",
      "Staff action tracking",
      "Weekly digest (per-hotel)",
    ],
    cta: "Book a Demo",
    highlight: true,
    ctaSource: "pricing_premium_demo",
  },
];

const FAQS = [
  {
    q: "How does the $1/room/month pricing work?",
    a: "That's the starting point. Pricing scales with your chain's size and which modules you activate — Insights, AI Responses, and more can be added à la carte. Book a demo and we'll build a custom quote for your exact setup.",
  },
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
    q: "Is our chain's data isolated from competitors?",
    a: "Completely. Each chain's data is fully isolated. Your review data is never shared, sold, or used to train models on behalf of anyone else. Full encryption in transit and at rest.",
  },
];

export default function PricingPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [signupOpen, setSignupOpen] = useState(false);
  const [signupLabel, setSignupLabel] = useState("Get Started");
  const [signupSource, setSignupSource] = useState("pricing_page");

  const openSignup = (label: string, source = "pricing_page") => {
    setSignupLabel(label);
    setSignupSource(source);
    setSignupOpen(true);
  };

  return (
    <div className="min-h-screen" style={{ background: "var(--page-gradient)" }}>

      <CapabilitiesNav
        activeTier={null}
        cta={{ text: "Book a Demo", href: "#", onClick: () => openSignup("Book a Demo", "pricing_nav_demo") }}
      />

      <div className="max-w-4xl mx-auto px-4 md:px-8 pt-40 pb-24">

        {/* Hero */}
        <motion.div variants={fadeUp} initial="hidden" animate="visible" transition={{ duration: 0.5 }} className="text-center mb-20">
          <p className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: "var(--gold)" }}>Pricing</p>
          <h1 className="text-4xl md:text-5xl font-black text-foreground mb-5" style={{ fontFamily: "var(--font-manrope)", lineHeight: 1.1 }}>
            Start free.{" "}
            <span className="bg-gradient-to-r from-gold via-gold-light to-gold-dark bg-clip-text text-transparent">
              Scale your chain.
            </span>
          </h1>
          <p className="text-muted text-lg max-w-xl mx-auto">
            Free for one property. Premium starts at $1 per room per month — custom-priced to your chain.
          </p>
        </motion.div>

        {/* Tier Cards */}
        <motion.div variants={stagger} initial="hidden" animate="visible" className="grid md:grid-cols-2 gap-6 mb-20">
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
                  style={{ background: "linear-gradient(to right, var(--gold), var(--gold-dark))", color: "#1C2A39" }}
                >
                  {tier.badge}
                </span>
              )}

              <div className="mb-1">
                <h3 className="text-xl font-bold text-foreground" style={{ fontFamily: "var(--font-manrope)" }}>{tier.name}</h3>
              </div>
              <p className="text-muted text-sm mb-5">{tier.sub}</p>

              <div className="mb-1">
                <span className="text-4xl font-black text-foreground" style={{ fontFamily: "var(--font-manrope)" }}>{tier.price}</span>
                {tier.period && (
                  <span className="text-muted text-sm ml-1">{tier.period}</span>
                )}
              </div>
              <p className="text-xs mb-6" style={{ color: "var(--muted)" }}>{tier.priceSub}</p>

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

              <div className="flex-1" />

              <button
                onClick={() => openSignup(tier.cta, tier.ctaSource)}
                className="block w-full text-center font-semibold rounded-xl px-5 py-3 transition-all duration-200 hover:opacity-90"
                style={
                  tier.highlight
                    ? { background: "linear-gradient(to right, var(--gold), var(--gold-dark))", color: "#1C2A39" }
                    : { background: "var(--input-bg)", border: "1px solid var(--glass-border)", color: "var(--foreground)" }
                }
              >
                {tier.cta}
              </button>
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
            <button
              onClick={() => openSignup("Start Free", "pricing_bottom_start_free")}
              className="px-6 py-3 rounded-xl font-semibold text-sm transition-all hover:opacity-90"
              style={{ background: "var(--input-bg)", border: "1px solid var(--glass-border)", color: "var(--foreground)" }}
            >
              Start Free
            </button>
            <button
              onClick={() => openSignup("Book a Demo", "pricing_bottom_demo")}
              className="px-6 py-3 rounded-xl font-semibold text-sm transition-all hover:opacity-90"
              style={{ background: "linear-gradient(to right, var(--gold), var(--gold-dark))", color: "#1C2A39" }}
            >
              Book a Demo →
            </button>
          </div>
        </motion.div>

      </div>

      <SignupModal open={signupOpen} onClose={() => setSignupOpen(false)} ctaSource={signupSource} ctaLabel={signupLabel} />
    </div>
  );
}
