"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, useInView, AnimatePresence } from "framer-motion";
import { useTheme } from "next-themes";
import ThemeToggle from "@/components/ui/theme-toggle";
import SignupModal, { pushLeadToCRM } from "@/app/components/SignupModal";

/* ─────────────── constants ─────────────── */

const NAV_LINKS = [
  { label: "Why RatingIQ", href: "#why" },
  { label: "How It Works", href: "#how-it-works" },
  { label: "Pricing", href: "/pricing" },
  { label: "FAQ", href: "#faq" },
];

const PLATFORMS = [
  { label: "Booking.com", color: "#003580" },
  { label: "Google", color: "#4285F4" },
  { label: "TripAdvisor", color: "#00AA6C" },
  { label: "Expedia", color: "#D4A017" },
];

const PROBLEMS = [
  {
    title: "Scattered Reviews",
    desc: "Reviews spread across 4+ platforms. No single source of truth. Critical feedback slips through the cracks.",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
      </svg>
    ),
  },
  {
    title: "Manual Responses",
    desc: "Hours spent crafting individual replies. Inconsistent tone and quality across your team.",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    title: "Missed Insights",
    desc: "Critical patterns buried in thousands of reviews. Problems repeat month after month, unsolved.",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12c1.292 4.338 5.31 7.5 10.066 7.5.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
      </svg>
    ),
  },
];

const SOLUTIONS = [
  {
    title: "Unified Dashboard",
    desc: "Every review from every platform in one dashboard. A single source of truth for your entire team.",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
      </svg>
    ),
  },
  {
    title: "AI-Crafted Responses",
    desc: "On-brand responses generated in seconds. Refine with multi-turn AI until they match your voice exactly.",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
      </svg>
    ),
  },
  {
    title: "Actionable Intelligence",
    desc: "A 7-stage AI pipeline surfaces what matters most. Trends, sentiment shifts, and root causes - fully automated.",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5M9 11.25v-5.5m3 5.5v-3.5m3 3.5v-1.5" />
      </svg>
    ),
  },
];

const STEPS = [
  {
    title: "Connect",
    desc: "Paste your review page URLs. RatingIQ pulls every review across all platforms - under 5 minutes, no IT required.",
    flipClass: "animate-flip-1",
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
      </svg>
    ),
  },
  {
    title: "See",
    desc: "Get the full picture your GMs can't provide - recurring issues, underperforming properties, and exactly what's moving each rating.",
    flipClass: "animate-flip-2",
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 14.5M14.25 3.104c.251.023.501.05.75.082M19.8 14.5l-1.044.333a2.207 2.207 0 00-1.152.886 2.235 2.235 0 01-1.516.994c-.653.1-1.323.076-1.952-.07a2.244 2.244 0 00-1.753.283l-.237.142a2.244 2.244 0 01-2.392 0l-.237-.142a2.244 2.244 0 00-1.753-.283 4.354 4.354 0 01-1.952.07 2.235 2.235 0 01-1.516-.994 2.207 2.207 0 00-1.152-.886L5 14.5m14.8 0l.6 1.903a.75.75 0 01-.482.876l-2.467.822a.75.75 0 01-.676-.082l-.78-.52a.75.75 0 00-.83 0l-.78.52a.75.75 0 01-.676.082l-2.467-.822a.75.75 0 01-.482-.876L5 14.5" />
      </svg>
    ),
  },
  {
    title: "Grow",
    desc: "Act on what actually moves ratings. Watch your scores climb - and your RevPAR follow.",
    flipClass: "animate-flip-3",
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
      </svg>
    ),
  },
];

const FEATURES = [
  {
    title: "See exactly what's hurting your rating",
    desc: "Exactly which factors are moving your ratings - across every property.",
    href: "/capabilities/premium#insights",
    topFeature: true,
    glow: "rgba(201,168,106,0.5)",
    glowBorder: "rgba(201,168,106,0.3)",
    iconBg: "rgba(201,168,106,0.08)",
    iconColor: "var(--gold)",
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
      </svg>
    ),
  },
  {
    title: "Fix less. Improve more.",
    desc: "80% of complaints come from 20% of issues. We show you which 20%.",
    href: "/capabilities/premium#actions",
    glow: "rgba(184,80,80,0.5)",
    glowBorder: "rgba(184,80,80,0.3)",
    iconBg: "rgba(184,80,80,0.08)",
    iconColor: "var(--danger)",
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5" />
      </svg>
    ),
  },
  {
    title: "Your rating, explained.",
    desc: "Platform by platform. Segment by segment. Month by month. The full picture of where your chain actually stands - and why.",
    href: "/capabilities/premium#benchmark",
    glow: "rgba(81,107,132,0.6)",
    glowBorder: "rgba(81,107,132,0.35)",
    iconBg: "rgba(81,107,132,0.08)",
    iconColor: "var(--cyan)",
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 14.25v2.25m3-4.5v4.5m3-6.75v6.75m3-9v9M6 20.25h12A2.25 2.25 0 0020.25 18V6A2.25 2.25 0 0018 3.75H6A2.25 2.25 0 003.75 6v12A2.25 2.25 0 006 20.25z" />
      </svg>
    ),
  },
  {
    title: "An analyst who never sleeps",
    desc: "Ask anything about your chain. Get answers in seconds.",
    href: "/capabilities/premium#elaine",
    glow: "rgba(74,143,107,0.5)",
    glowBorder: "rgba(74,143,107,0.3)",
    iconBg: "rgba(74,143,107,0.08)",
    iconColor: "var(--success)",
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
      </svg>
    ),
  },
  {
    title: "No review goes unanswered",
    desc: "Every review, every platform, right language - automatically. GMs stay focused.",
    href: "/capabilities/premium#ai-responses",
    topFeature: true,
    glow: "rgba(120,100,200,0.5)",
    glowBorder: "rgba(120,100,200,0.3)",
    iconBg: "rgba(120,100,200,0.08)",
    iconColor: "#9b87d4",
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
      </svg>
    ),
  },
  {
    title: "Monday morning, already informed",
    desc: "The numbers that matter, before your Monday meeting.",
    href: "/capabilities/premium#digest",
    glow: "rgba(201,168,106,0.4)",
    glowBorder: "rgba(201,168,106,0.25)",
    iconBg: "rgba(201,168,106,0.06)",
    iconColor: "var(--gold)",
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
      </svg>
    ),
  },
  {
    title: "Find patterns no GM can see",
    desc: "Slice by origin, room type, traveller type. The view only visible from the top.",
    href: "/capabilities/ratings#segments",
    glow: "rgba(81,107,132,0.5)",
    glowBorder: "rgba(81,107,132,0.3)",
    iconBg: "rgba(81,107,132,0.08)",
    iconColor: "var(--cyan)",
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 01-.659 1.591l-5.432 5.432a2.25 2.25 0 00-.659 1.591v2.927a2.25 2.25 0 01-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 00-.659-1.591L3.659 7.409A2.25 2.25 0 013 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0112 3z" />
      </svg>
    ),
  },
  {
    title: "Past the symptoms. Into the fix.",
    desc: "Root causes and fixes for every issue category - chain-wide.",
    href: "/capabilities/premium#insights",
    glow: "rgba(184,80,80,0.4)",
    glowBorder: "rgba(184,80,80,0.25)",
    iconBg: "rgba(184,80,80,0.06)",
    iconColor: "var(--danger)",
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
      </svg>
    ),
  },
];

const STATS = [
  { value: 500000, suffix: "+", label: "Reviews analyzed across chains", prefix: "" },
  { value: 0.4, suffix: " pts", label: "Avg chain rating lift in 90 days", prefix: "+" },
  { value: 90, suffix: "%", label: "Time saved on reviews, per property", prefix: "" },
  { value: 14, suffix: "%", label: "RevPAR uplift from reputation gains", prefix: "+" },
];

const TESTIMONIALS = [
  {
    quote: "For the first time I had a clear view of what was actually driving ratings across all 14 properties - not just the number, but the reasons behind it. We moved our portfolio average from 8.4 to 8.7 in one quarter.",
    name: "James R.",
    title: "CEO",
    hotel: "Premier Hotel Group - 14 properties",
  },
  {
    quote: "RatingIQ flagged the same check-in issue across 9 of our properties before it showed up in our Q3 numbers. That kind of early warning is worth more than any report I used to get from my GMs.",
    name: "Michelle T.",
    title: "CEO",
    hotel: "Horizon Hospitality Group - 22 properties",
  },
  {
    quote: "We were skeptical. Three months in, RevPAR across our US portfolio was up 11%. The team spends a fraction of the time they used to on reviews - and the ratings actually show it.",
    name: "Robert A.",
    title: "CEO",
    hotel: "Crestline Collection - 8 properties",
  },
  {
    quote: "I used to rely on monthly reports from GMs that were already two weeks old by the time I read them. RatingIQ gives me a live view across every property. I can see a problem forming before it becomes a headline.",
    name: "Sandra K.",
    title: "CEO",
    hotel: "Keystone Lodging Group - 17 properties",
  },
];

const PRICING_CARDS = [
  {
    name: "Free",
    price: "$0",
    period: "/property/mo",
    features: ["Review volume, trend & response rate", "Platform mix breakdown", "Guest demographics and origins", "Seasonality heatmap"],
    cta: "Start Free",
    href: "/signup",
    highlight: false,
  },
  {
    name: "Ratings",
    price: "$99",
    period: "/property/mo",
    features: ["Everything in Free", "Avg, median & monthly rating trend", "Rating breakdown per platform", "Cross-segment drill-downs by origin, room type & guest type"],
    cta: "Start Free Trial",
    href: "/signup",
    highlight: false,
  },
  {
    name: "Insight",
    price: "",
    period: "",
    badge: "CHAIN READY",
    features: ["Everything in Ratings", "AI issue prioritization + root causes", "Competitor benchmarking", "Elaine AI analyst + Auto-Respond", "Automated weekly chain digest"],
    cta: "Book a Demo",
    href: "https://calendar.app.google/QywtyvvCugBR5U4n8",
    highlight: true,
  },
];

const FAQS = [
  {
    q: "How long does it take to see a rating improvement?",
    a: "Depends on the property and what's driving the gap. Most chains start seeing clearer priorities within the first week. Rating movement typically follows in 30–60 days as operational fixes take hold. We show you the shortest path - the execution is yours.",
  },
  {
    q: "How fast can my whole chain go live?",
    a: "Same day. Each property takes under 5 minutes - paste the review page URLs and our pipeline ingests everything automatically. No IT involvement, no API keys, no integrations. Most chains are fully live within hours.",
  },
  {
    q: "Do my GMs need to change anything?",
    a: "Nothing. Auto-Respond handles every review on every platform in the right language - automatically. GMs keep running their property. You get the portfolio view. Their workflow doesn't change at all.",
  },
  {
    q: "How does pricing work at chain scale?",
    a: "Each property is priced individually. The more properties you add, the more your chain intelligence compounds. Book a demo and we'll walk through volume options for your specific chain size.",
  },
  {
    q: "How is this different from what my revenue manager uses?",
    a: "Revenue managers work with rates and occupancy. RatingIQ works with the guest feedback that drives those numbers. We surface which operational issues are suppressing your ratings - and your rates. The two work together.",
  },
  {
    q: "Is our chain's data isolated from competitors?",
    a: "Completely. Each chain's data is fully isolated. Your review data is never shared, sold, or used to train models on behalf of anyone else. Full encryption in transit and at rest.",
  },
];

/* ─────────────── hooks ─────────────── */

function useCountUp(target: number, duration: number, inView: boolean, decimals = 0) {
  const [value, setValue] = useState(0);
  const started = useRef(false);

  useEffect(() => {
    if (!inView || started.current) return;
    started.current = true;

    const start = performance.now();
    const step = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      setValue(parseFloat((eased * target).toFixed(decimals)));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [inView, target, duration, decimals]);

  return value;
}

/* ─────────────── sub-components ─────────────── */


function GoldStars() {
  return (
    <div className="flex gap-0.5">
      {[...Array(5)].map((_, i) => (
        <svg key={i} className="w-3 h-3" fill="#1C2A39" viewBox="0 0 24 24">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      ))}
    </div>
  );
}

export function RatingHeroVisual() {
  const [stage, setStage] = useState(0);
  const [ratingDisplay, setRatingDisplay] = useState(8.4);
  const [reviewCount, setReviewCount] = useState(0);
  const [typedText, setTypedText] = useState("");
  const [phoneStage, setPhoneStage] = useState(0);

  const PUSH_MSG = "3 new reviews flagged late check-in times at Grand Plaza in the last 2 hours. Total this month: 37. Up 68% vs last month. This issue requires a fix.";

  const seqRef = useRef(0);
  const activeIvRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const runFromStage = useCallback((startIdx: number) => {
    // Bump sequence - any older callbacks will see a mismatch and no-op
    const mySeq = ++seqRef.current;
    // Kill any live typewriter interval immediately
    if (activeIvRef.current) { clearInterval(activeIvRef.current); activeIvRef.current = null; }

    const alive = () => seqRef.current === mySeq;

    const after = (fn: () => void, delay: number) => {
      setTimeout(() => { if (alive()) fn(); }, delay);
    };

    const runStage = (s: number) => {
      if (!alive()) return;

      if (s === 0) {
        setStage(0); setRatingDisplay(8.4); setReviewCount(0); setTypedText(""); setPhoneStage(0);
        after(() => setReviewCount(1), 1200);
        after(() => setReviewCount(2), 4000);
        after(() => setReviewCount(3), 6800);
        after(() => runStage(1), 9500);

      } else if (s === 1) {
        setStage(1); setReviewCount(3); setTypedText(""); setPhoneStage(0);
        [8.3, 8.2, 8.1, 8.0, 7.9].forEach((val, i) => {
          after(() => setRatingDisplay(val), 1200 + i * 700);
        });
        after(() => runStage(2), 7000);

      } else if (s === 2) {
        setStage(2); setRatingDisplay(7.9); setReviewCount(3); setTypedText(""); setPhoneStage(0);
        after(() => runStage(3), 7000);

      } else if (s === 3) {
        setStage(3); setRatingDisplay(7.9); setReviewCount(3); setTypedText(""); setPhoneStage(0);
        after(() => runStage(4), 7000);

      } else if (s === 4) {
        setStage(4); setTypedText(""); setPhoneStage(0);
        after(() => setPhoneStage(1), 1000);
        after(() => setPhoneStage(2), 4000);
        after(() => {
          if (!alive()) return;
          setPhoneStage(3);
          let i = 0;
          const iv = setInterval(() => {
            if (!alive()) { clearInterval(iv); activeIvRef.current = null; return; }
            i++;
            setTypedText(PUSH_MSG.slice(0, i));
            if (i >= PUSH_MSG.length) { clearInterval(iv); activeIvRef.current = null; }
          }, 70);
          activeIvRef.current = iv;
        }, 5200);
        after(() => runStage(5), 19000);

      } else if (s === 5) {
        setStage(5); setRatingDisplay(7.9);
        [8.0, 8.1, 8.2, 8.3].forEach((val, i) => {
          after(() => setRatingDisplay(val), 900 + i * 700);
        });
        after(() => runStage(0), 10000);
      }
    };

    runStage(startIdx);
  }, [PUSH_MSG]);

  const jumpToStage = useCallback((idx: number) => {
    runFromStage(idx);
  }, [runFromStage]);

  const renderTypedText = (text: string) => {
    const B1S = 22, B1E = 41, B2S = 122;
    const len = text.length;
    return (
      <>
        {text.slice(0, Math.min(len, B1S))}
        {len > B1S && <strong>{text.slice(B1S, Math.min(len, B1E))}</strong>}
        {len > B1E && text.slice(B1E, Math.min(len, B2S))}
        {len > B2S && <strong>{text.slice(B2S)}</strong>}
      </>
    );
  };

  useEffect(() => {
    const t = setTimeout(() => runFromStage(0), 900);
    return () => {
      clearTimeout(t);
      seqRef.current++; // invalidate any running sequence on unmount
      if (activeIvRef.current) { clearInterval(activeIvRef.current); activeIvRef.current = null; }
    };
  }, [runFromStage]);

  const isRising = stage === 5;
  const dropLine = "0,6 20,10 40,16 60,24 80,30 100,36";
  const riseLine = "0,36 20,30 40,24 60,16 80,10 100,6";
  const stageLabels = ["Reviews", "Rating drop", "Root cause", "Alert", "Pushed", "Recovered"];

  const reviews = [
    {
      text: "Waited 40 minutes to check in. Room was fine but the arrival was exhausting.",
      source: "Booking.com",
      color: "#0057b8",
      rating: { type: "number" as const, value: 6.2, max: 10 },
    },
    {
      text: "No one at the front desk when we arrived. Had to wait. Won't be coming back.",
      source: "Google",
      color: "#4285F4",
      rating: { type: "stars" as const, value: 2, max: 5 },
    },
    {
      text: "Check-in chaos. Three families, one agent. Ruins the first impression completely.",
      source: "TripAdvisor",
      color: "#00AA6C",
      rating: { type: "bubbles" as const, value: 2, max: 5 },
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.7, delay: 0.5 }}
      className="w-full max-w-md"
    >
      <AnimatePresence mode="wait">

        {/* Stage 0: Guest reviews */}
        {stage === 0 && (
          <motion.div
            key="reviews"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.4 }}
            className="rounded-2xl p-5"
            style={glass}
          >
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted mb-4">The Grand Plaza · incoming reviews</p>
            <div className="flex flex-col gap-3">
              {reviews.map((r, i) => (
                <AnimatePresence key={i}>
                  {reviewCount > i && (
                    <motion.div
                      initial={{ opacity: 0, x: -14, scale: 0.97 }}
                      animate={{ opacity: 1, x: 0, scale: 1 }}
                      transition={{ duration: 0.4, ease: "easeOut" }}
                      className="rounded-xl rounded-tl-sm px-3 py-2.5 max-w-[92%]"
                      style={{ background: "var(--input-bg)", border: "1px solid var(--glass-border)" }}
                    >
                      <p className="text-xs leading-relaxed mb-2" style={{ color: "var(--foreground)" }}>
                        &ldquo;{r.text}&rdquo;
                      </p>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1">
                          {r.rating.type === "number" && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: `${r.color}18`, color: r.color }}>
                              {r.rating.value} / {r.rating.max}
                            </span>
                          )}
                          {r.rating.type === "stars" && (
                            <div className="flex gap-0.5">
                              {Array.from({ length: r.rating.max }).map((_, s) => (
                                <svg key={s} className="w-2.5 h-2.5" fill={s < r.rating.value ? r.color : "none"} stroke={r.color} strokeWidth={1.5} viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.562.562 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
                                </svg>
                              ))}
                            </div>
                          )}
                          {r.rating.type === "bubbles" && (
                            <div className="flex gap-0.5">
                              {Array.from({ length: r.rating.max }).map((_, s) => (
                                <div key={s} className="w-2.5 h-2.5 rounded-full" style={{ background: s < r.rating.value ? r.color : "var(--glass-border)" }} />
                              ))}
                            </div>
                          )}
                        </div>
                        <span className="text-[9px] font-medium" style={{ color: "var(--muted)" }}>{r.source}</span>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              ))}
            </div>
          </motion.div>
        )}

        {/* Stage 1 & 5: Rating card */}
        {(stage === 1 || stage === 5) && (
          <motion.div
            key={stage === 1 ? "drop" : "rise"}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.4 }}
            className="rounded-2xl p-5"
            style={glass}
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-xs font-semibold" style={{ color: "var(--foreground)" }}>The Grand Plaza</p>
                <p className="text-[10px] text-muted">Miami Beach</p>
              </div>
              <span className="text-[10px] px-2.5 py-1 rounded-full font-semibold" style={{
                background: isRising ? "rgba(74,143,107,0.12)" : "rgba(220,80,80,0.1)",
                color: isRising ? "var(--success)" : "#e05555",
              }}>
                {isRising ? "↑ Recovering" : "↓ Dropping"}
              </span>
            </div>
            <div className="flex items-end gap-3 mb-3">
              <span className="text-6xl font-bold leading-none" style={{ fontFamily: "var(--font-manrope)", color: "var(--foreground)" }}>
                {ratingDisplay.toFixed(1)}
              </span>
              <div className="mb-1.5">
                <p className="text-sm font-bold" style={{ color: isRising ? "var(--success)" : "#e05555" }}>
                  {isRising ? "↑ +0.4" : "↓ −0.5"}
                </p>
                <p className="text-[10px] text-muted">vs. last month</p>
              </div>
            </div>
            <div className="mb-3 rounded-lg overflow-hidden" style={{ background: "var(--input-bg)" }}>
              <svg width="100%" height="44" viewBox="0 0 100 44" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="dropGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#e05555" stopOpacity="0.15" />
                    <stop offset="100%" stopColor="#e05555" stopOpacity="0" />
                  </linearGradient>
                  <linearGradient id="riseGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--success)" stopOpacity="0.15" />
                    <stop offset="100%" stopColor="var(--success)" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <polygon points={isRising ? `${riseLine} 100,44 0,44` : `${dropLine} 100,44 0,44`} fill={isRising ? "url(#riseGrad)" : "url(#dropGrad)"} />
                <polyline points={isRising ? riseLine : dropLine} fill="none" stroke={isRising ? "var(--success)" : "#e05555"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            {isRising && (
              <p className="text-[10px] text-muted">Check-in speed improved - cited in 47 reviews this month</p>
            )}
          </motion.div>
        )}

        {/* Stage 2: Root cause - check-in only */}
        {stage === 2 && (
          <motion.div
            key="cause"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.4 }}
            className="rounded-2xl p-5"
            style={glass}
          >
            <div className="flex items-center gap-2.5 mb-5">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-base shrink-0" style={{ background: "rgba(220,80,80,0.1)" }}>⚡</div>
              <div>
                <p className="text-xs font-semibold" style={{ color: "var(--foreground)" }}>RatingIQ identified the issue</p>
                <p className="text-[10px] text-muted">From 94 recent reviews · The Grand Plaza</p>
              </div>
            </div>
            <div className="rounded-xl p-4 mb-4" style={{ background: "rgba(220,80,80,0.06)", border: "1px solid rgba(220,80,80,0.18)" }}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-bold" style={{ color: "var(--foreground)" }}>Check-in wait time</span>
                <span className="text-sm font-bold" style={{ color: "#e05555" }}>78%</span>
              </div>
              <div className="h-2 rounded-full mb-3" style={{ background: "var(--input-bg)" }}>
                <motion.div
                  className="h-2 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: "78%" }}
                  transition={{ duration: 1.0, delay: 0.2, ease: "easeOut" }}
                  style={{ background: "linear-gradient(to right, #e05555, #c94444)" }}
                />
              </div>
              <p className="text-[10px] leading-relaxed" style={{ color: "var(--muted)" }}>
                Mentioned in 74 of 94 recent reviews.
              </p>
            </div>
          </motion.div>
        )}

        {/* Stage 3: Alert */}
        {stage === 3 && (
          <motion.div
            key="action"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.4 }}
            className="rounded-2xl p-5"
            style={glass}
          >
            <div className="flex items-center gap-2.5 mb-5">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-base shrink-0" style={{ background: "rgba(220,80,80,0.1)" }}>🔔</div>
              <div>
                <p className="text-xs font-semibold" style={{ color: "var(--foreground)" }}>RatingIQ · new alert</p>
                <p className="text-[10px] text-muted">The Grand Plaza · just now</p>
              </div>
            </div>
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.2 }}
              className="rounded-xl p-4"
              style={{ background: "rgba(220,80,80,0.06)", border: "2px solid rgba(220,80,80,0.25)" }}
            >
              <p className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: "#e05555" }}>Late check-in times</p>
              <p className="font-bold mb-3 leading-snug" style={{ color: "var(--foreground)", fontSize: "17px", fontFamily: "var(--font-manrope)" }}>
                3 new complaints published in the last 2 hours.
              </p>
              <div className="flex items-center gap-5 pt-3" style={{ borderTop: "1px solid rgba(220,80,80,0.15)" }}>
                <div>
                  <p className="text-[9px] text-muted uppercase tracking-wider mb-0.5">This month</p>
                  <p className="text-sm font-bold" style={{ color: "#e05555" }}>37 reviews</p>
                </div>
                <div>
                  <p className="text-[9px] text-muted uppercase tracking-wider mb-0.5">vs last month</p>
                  <p className="text-sm font-bold" style={{ color: "#e05555" }}>↑ 68%</p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Stage 4: Phone push sequence */}
        {stage === 4 && (
          <motion.div
            key="push"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.4 }}
            className="flex flex-col items-center"
          >
            {/* Phone crop - show full screen, clip bottom bezel only */}
            <div style={{ position: "relative", overflow: "hidden", height: "360px", width: "260px" }}>

            {/* Phone frame */}
            <div className="relative" style={{
              width: "260px",
              background: "#1c1c1e",
              borderRadius: "54px",
              padding: "12px",
              boxShadow: "0 0 0 1px rgba(255,255,255,0.08), inset 0 0 0 1px rgba(255,255,255,0.04), 0 24px 64px rgba(0,0,0,0.35)",
            }}>
              {/* Side buttons */}
              <div className="absolute rounded-r-sm" style={{ right: "-3px", top: "88px", width: "3px", height: "34px", background: "#3a3a3c" }} />
              <div className="absolute rounded-l-sm" style={{ left: "-3px", top: "74px", width: "3px", height: "27px", background: "#3a3a3c" }} />
              <div className="absolute rounded-l-sm" style={{ left: "-3px", top: "111px", width: "3px", height: "47px", background: "#3a3a3c" }} />
              <div className="absolute rounded-l-sm" style={{ left: "-3px", top: "167px", width: "3px", height: "47px", background: "#3a3a3c" }} />

              {/* Screen */}
              <div className="overflow-hidden" style={{ borderRadius: "44px", height: "520px", position: "relative" }}>

                {/* Dynamic Island - small pill */}
                <div className="absolute z-20 left-1/2 -translate-x-1/2" style={{ top: "10px", width: "80px", height: "22px", background: "#000", borderRadius: "20px" }} />

                <AnimatePresence mode="wait">

                  {/* Lock screen */}
                  {phoneStage < 3 && (
                    <motion.div
                      key="lock"
                      className="w-full h-full flex flex-col"
                      style={{ background: "linear-gradient(170deg, #e8edf4 0%, #dce4f0 50%, #d4dcea 100%)" }}
                    >
                      {/* Status bar - time left, icons right, pill centred between */}
                      <div className="flex justify-between items-center px-4" style={{ paddingTop: "10px" }}>
                        <span className="font-semibold" style={{ fontSize: "11px", color: "#1C2A39" }}>9:41</span>
                        <div className="flex items-center gap-1">
                          <svg width="11" height="8" viewBox="0 0 18 14" fill="#1C2A39" fillOpacity="0.7">
                            <path d="M9 2.5C6.2 2.5 3.7 3.6 1.9 5.4L0 3.5C2.3 1.3 5.5 0 9 0s6.7 1.3 9.1 3.5L16.1 5.4C14.3 3.6 11.8 2.5 9 2.5zm0 4c-1.8 0-3.4.7-4.6 1.8L2.7 6.6C4.3 5.1 6.5 4.2 9 4.2s4.7.9 6.3 2.4l-1.7 1.7C12.4 7.2 10.8 6.5 9 6.5zm0 4c-.9 0-1.7.4-2.3.9L9 14l2.3-2.6c-.6-.5-1.4-.9-2.3-.9z"/>
                          </svg>
                          <svg width="19" height="9" viewBox="0 0 30 14" fill="none">
                            <rect x="0.5" y="0.5" width="24" height="13" rx="3.5" stroke="#1C2A39" strokeOpacity="0.4"/>
                            <rect x="25" y="4" width="4" height="6" rx="1.5" fill="#1C2A39" fillOpacity="0.3"/>
                            <rect x="2" y="2" width="18" height="10" rx="2" fill="#1C2A39" fillOpacity="0.75"/>
                          </svg>
                        </div>
                      </div>

                      {/* Clock */}
                      <div className="text-center mt-7 mb-5">
                        <p className="font-extralight" style={{ fontSize: "64px", lineHeight: 1, letterSpacing: "-2px", fontFamily: "var(--font-manrope)", color: "#1C2A39" }}>9:41</p>
                        <p className="mt-2 font-light" style={{ fontSize: "12px", color: "rgba(28,42,57,0.55)", letterSpacing: "0.5px" }}>Monday, March 30</p>
                      </div>

                      {/* Notification */}
                      <div className="px-3">
                        <AnimatePresence>
                          {phoneStage >= 1 && (
                            <motion.div
                              initial={{ opacity: 0, y: -16, scale: 0.96 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                              className="rounded-2xl px-3 py-2.5"
                              style={{
                                background: "rgba(255,255,255,0.72)",
                                backdropFilter: "blur(24px)",
                                border: "1px solid rgba(255,255,255,0.6)",
                              }}
                            >
                              <div className="flex items-center gap-2 mb-1.5">
                                <div className="rounded-md overflow-hidden shrink-0 flex items-center justify-center px-1.5" style={{ background: "#1C2A39", height: "22px" }}>
                                  <img src="/logo-white.svg" alt="RatingIQ" style={{ height: "13px", width: "auto" }} />
                                </div>
                                <span className="ml-auto" style={{ color: "rgba(28,42,57,0.4)", fontSize: "11px" }}>now</span>
                              </div>
                              <p className="font-semibold mb-0.5" style={{ fontSize: "12px", color: "#1C2A39" }}>New alert · Grand Plaza</p>
                              <p style={{ color: "rgba(28,42,57,0.6)", fontSize: "11px" }}>⚠ Trend accelerating - 3 new late check-in complaints</p>
                            </motion.div>
                          )}
                        </AnimatePresence>

                        {/* Tap ripple */}
                        {phoneStage === 2 && (
                          <div className="flex justify-center mt-4">
                            <motion.div
                              initial={{ scale: 0.3, opacity: 0.7 }}
                              animate={{ scale: 3, opacity: 0 }}
                              transition={{ duration: 0.7, ease: "easeOut" }}
                              style={{ width: "32px", height: "32px", borderRadius: "50%", background: "rgba(255,255,255,0.35)" }}
                            />
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}

                  {/* Chat screen */}
                  {phoneStage >= 3 && (
                    <motion.div
                      key="chat"
                      initial={{ opacity: 0, x: 30 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                      className="w-full h-full flex flex-col"
                      style={{ background: "#e8ddd4" }}
                    >
                      {/* WhatsApp header */}
                      <div className="flex items-center gap-2 px-3 pt-10 pb-2.5" style={{ background: "#1f7a5c" }}>
                        <svg width="8" height="14" viewBox="0 0 10 18" fill="none">
                          <path d="M9 1L1 9l8 8" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        <div className="rounded-lg overflow-hidden shrink-0 flex items-center justify-center px-2" style={{ background: "#1C2A39", height: "28px" }}>
                          <img src="/logo-white.svg" alt="RatingIQ" style={{ height: "15px", width: "auto" }} />
                        </div>
                        <div className="flex-1">
                          <p style={{ color: "rgba(255,255,255,0.75)", fontSize: "11px" }}>online</p>
                        </div>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" opacity="0.7">
                          <circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/>
                        </svg>
                      </div>

                      {/* Chat body */}
                      <div className="flex-1 px-3 pt-3 overflow-hidden">
                        <motion.div
                          initial={{ opacity: 0, y: 8, scale: 0.97 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          transition={{ duration: 0.3, delay: 0.15 }}
                          className="rounded-2xl rounded-tl-sm px-3 py-2.5 max-w-[90%]"
                          style={{
                            background: "white",
                            boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                          }}
                        >
                          <div className="mb-2 pb-2" style={{ borderBottom: "1px solid #f0ebe5" }}>
                            <p style={{ fontSize: "11px", fontWeight: 600, color: "#e05555" }}>⚠ Trend accelerating - 3rd alert this week</p>
                          </div>
                          <p className="leading-relaxed min-h-[2.5rem]" style={{ fontSize: "12px", color: "#111", whiteSpace: "pre-wrap" }}>
                            {renderTypedText(typedText)}
                            {typedText.length < PUSH_MSG.length && (
                              <motion.span
                                animate={{ opacity: [1, 0] }}
                                transition={{ repeat: Infinity, duration: 0.5 }}
                                style={{ display: "inline-block", width: "1.5px", height: "11px", marginLeft: "1px", verticalAlign: "middle", borderRadius: "1px", background: "#1f7a5c" }}
                              />
                            )}
                          </p>
                          <p className="text-right mt-1" style={{ fontSize: "10px", color: "#a0a0a0" }}>9:41 ✓✓</p>
                        </motion.div>
                      </div>

                      {/* Input bar */}
                      <div className="flex items-center gap-2 px-3 py-2 mx-2 mb-3 rounded-full" style={{ background: "white" }}>
                        <p style={{ fontSize: "11px", color: "#a0a0a0", flex: 1 }}>Message</p>
                        <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: "#1f7a5c" }}>
                          <svg width="8" height="8" viewBox="0 0 12 12" fill="white">
                            <path d="M2 6h8M6 2l4 4-4 4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                          </svg>
                        </div>
                      </div>
                    </motion.div>
                  )}

                </AnimatePresence>
              </div>
            </div>
            </div>{/* end half-phone crop */}
          </motion.div>
        )}

      </AnimatePresence>

      {/* Progress dots */}
      <div className="flex justify-center items-center gap-4 mt-4">
        {stageLabels.map((label, i) => (
          <div key={i} className="flex flex-col items-center gap-1.5 cursor-pointer select-none" onClick={() => jumpToStage(i)}>
            <motion.div
              animate={{
                background: stage === i ? "var(--gold)" : "var(--glass-border)",
                scale: stage === i ? 1.3 : 1,
              }}
              transition={{ duration: 0.3 }}
              className="w-2.5 h-2.5 rounded-full"
            />
            <span className="text-[10px]" style={{ color: stage === i ? "var(--gold)" : "var(--muted)", fontWeight: stage === i ? 600 : 400 }}>
              {label}
            </span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

/* ═══════════════ HERO VISUAL V2 ═══════════════ */

type ReviewItem = {
  kind: "booking" | "tripadvisor" | "google" | "expedia";
  reviewer: string;
  meta?: string;
  score?: number;
  bubbles?: number;
  stars?: number;
  title?: string;
  text: string;
  date: string;
};

const HERO_REVIEWS: ReviewItem[] = [
  { kind: "booking",     reviewer: "Sarah M.",        meta: "United States · 2 nights",  score: 5.8, text: "Waited 45 minutes to check in. Nobody at the front desk.",    date: "March 2026" },
  { kind: "tripadvisor", reviewer: "Mark_Travels",                                        bubbles: 2, text: "Three families. One agent. Ruined our first impression.",      date: "March 2026", title: "Terrible check-in experience" },
  { kind: "google",      reviewer: "James T.",                                            stars: 2,   text: "No one at reception when we arrived. Waited almost an hour.", date: "2 weeks ago" },
  { kind: "expedia",     reviewer: "Hotel guest",                                         stars: 1,   text: "Slow check-in process. Staff completely overwhelmed.",         date: "March 2026" },
  { kind: "booking",     reviewer: "David K.",        meta: "United Kingdom · 3 nights",  score: 4.2, text: "Check-in chaos. Long queue, understaffed desk.",              date: "April 2026" },
  { kind: "tripadvisor", reviewer: "LuxuryTraveler22",                                   bubbles: 1, text: "45-minute wait at check-in. Unacceptable for a 4-star.",       date: "April 2026", title: "Unacceptable" },
];

const HERO_DEPTHS = [
  { x: 0,  y: 0,  r: 0,    z: 10, o: 1    },
  { x: -5, y: 10, r: -2,   z: 9,  o: 0.92 },
  { x: 6,  y: 18, r: 2.5,  z: 8,  o: 0.85 },
  { x: -4, y: 25, r: -1.5, z: 7,  o: 0.78 },
  { x: 7,  y: 31, r: 3,    z: 6,  o: 0.72 },
  { x: -6, y: 36, r: -2,   z: 5,  o: 0.65 },
];

function bookingScoreColor(s: number) {
  if (s >= 7) return "#4CAF50";
  if (s >= 6) return "#FFA000";
  if (s >= 5) return "#E64A19";
  return "#C62828";
}
function bookingScoreLabel(s: number) {
  if (s >= 9) return "Exceptional";
  if (s >= 8) return "Superb";
  if (s >= 7) return "Very good";
  if (s >= 6) return "Okay";
  if (s >= 5) return "Disappointing";
  return "Poor";
}

function HeroReviewCard({ r }: { r: ReviewItem }) {
  const cardBase: React.CSSProperties = {
    background: "#fff",
    borderRadius: "12px",
    overflow: "hidden",
    border: "1px solid rgba(0,0,0,0.1)",
    boxShadow: "0 4px 18px rgba(0,0,0,0.13)",
  };

  if (r.kind === "booking") {
    const col = bookingScoreColor(r.score!);
    return (
      <div style={cardBase}>
        <div style={{ background: "#003580", padding: "8px 16px" }}>
          <span style={{ color: "white", fontSize: "11px", fontWeight: 700, letterSpacing: "-0.2px" }}>booking.com</span>
        </div>
        <div style={{ padding: "12px 16px 16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
            <div>
              <p style={{ fontSize: "11px", fontWeight: 600, color: "#1a1a1a", marginBottom: "2px" }}>{r.reviewer}</p>
              {r.meta && <p style={{ fontSize: "10px", color: "#888" }}>{r.meta}</p>}
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ background: col, borderRadius: "6px", padding: "3px 8px", display: "inline-block" }}>
                <span style={{ color: "white", fontSize: "15px", fontWeight: 800, lineHeight: 1 }}>{r.score!.toFixed(1)}</span>
              </div>
              <p style={{ fontSize: "9px", color: col, fontWeight: 600, marginTop: "2px" }}>{bookingScoreLabel(r.score!)}</p>
            </div>
          </div>
          <p style={{ fontSize: "19px", color: "#222", lineHeight: 1.6, fontWeight: 500 }}>&ldquo;{r.text}&rdquo;</p>
          <p style={{ fontSize: "10px", color: "#bbb", marginTop: "6px" }}>{r.date}</p>
        </div>
      </div>
    );
  }

  if (r.kind === "tripadvisor") {
    return (
      <div style={cardBase}>
        <div style={{ background: "#00AA6C", padding: "7px 12px", display: "flex", alignItems: "center", gap: "6px" }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="white">
            <circle cx="7" cy="13" r="4"/><circle cx="17" cy="13" r="4"/>
            <circle cx="7" cy="12" r="1.8" fill="#00AA6C"/><circle cx="17" cy="12" r="1.8" fill="#00AA6C"/>
            <path d="M4 9 C4 5 8 3 12 3 C16 3 20 5 20 9" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
          </svg>
          <span style={{ color: "white", fontSize: "11px", fontWeight: 700 }}>Tripadvisor</span>
        </div>
        <div style={{ padding: "12px 16px 16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
            <p style={{ fontSize: "11px", fontWeight: 600, color: "#1a1a1a" }}>{r.reviewer}</p>
            <div style={{ display: "flex", gap: "3px" }}>
              {[1,2,3,4,5].map(n => (
                <div key={n} style={{ width: "11px", height: "11px", borderRadius: "50%", background: n <= r.bubbles! ? "#00AA6C" : "rgba(0,170,108,0.18)" }} />
              ))}
            </div>
          </div>
          {r.title && <p style={{ fontSize: "12px", fontWeight: 700, color: "#1a1a1a", marginBottom: "4px" }}>{r.title}</p>}
          <p style={{ fontSize: "19px", color: "#222", lineHeight: 1.6, fontWeight: 500 }}>&ldquo;{r.text}&rdquo;</p>
          <p style={{ fontSize: "10px", color: "#bbb", marginTop: "6px" }}>{r.date}</p>
        </div>
      </div>
    );
  }

  if (r.kind === "google") {
    return (
      <div style={cardBase}>
        <div style={{ padding: "12px 16px 16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
            <svg width="16" height="16" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            <div>
              <p style={{ fontSize: "11px", fontWeight: 600, color: "#1a1a1a", lineHeight: 1 }}>{r.reviewer}</p>
              <p style={{ fontSize: "10px", color: "#888", marginTop: "2px" }}>{r.date}</p>
            </div>
          </div>
          <div style={{ display: "flex", gap: "2px", marginBottom: "8px" }}>
            {[1,2,3,4,5].map(n => (
              <svg key={n} width="13" height="13" viewBox="0 0 24 24" fill={n <= r.stars! ? "#FBBC04" : "#e0e0e0"}>
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
              </svg>
            ))}
          </div>
          <p style={{ fontSize: "19px", color: "#222", lineHeight: 1.6, fontWeight: 500 }}>&ldquo;{r.text}&rdquo;</p>
        </div>
      </div>
    );
  }

  // Expedia
  return (
    <div style={cardBase}>
      <div style={{ background: "#00355F", padding: "8px 16px" }}>
        <span style={{ color: "#FFC72C", fontSize: "13px", fontWeight: 900, letterSpacing: "-0.3px" }}>expedia</span>
      </div>
      <div style={{ padding: "12px 16px 16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
          <p style={{ fontSize: "11px", fontWeight: 600, color: "#1a1a1a" }}>{r.reviewer}</p>
          <div style={{ display: "flex", gap: "2px" }}>
            {[1,2,3,4,5].map(n => (
              <svg key={n} width="12" height="12" viewBox="0 0 24 24" fill={n <= r.stars! ? "#FFC72C" : "#e0e0e0"}>
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
              </svg>
            ))}
          </div>
        </div>
        <p style={{ fontSize: "19px", color: "#222", lineHeight: 1.6, fontWeight: 500 }}>&ldquo;{r.text}&rdquo;</p>
        <p style={{ fontSize: "10px", color: "#bbb", marginTop: "6px" }}>{r.date}</p>
      </div>
    </div>
  );
}

function HeroVisualNew() {
  const [visibleCount, setVisibleCount] = useState(0);
  const [phase, setPhase] = useState<"reviews" | "stat" | "question">("reviews");

  useEffect(() => {
    const tids: ReturnType<typeof setTimeout>[] = [];
    function run() {
      setVisibleCount(0);
      setPhase("reviews");
      tids.push(setTimeout(() => setVisibleCount(1), 400));
      tids.push(setTimeout(() => setVisibleCount(2), 2100));
      tids.push(setTimeout(() => setVisibleCount(3), 3700));
      tids.push(setTimeout(() => setVisibleCount(4), 4100));
      tids.push(setTimeout(() => setVisibleCount(5), 4500));
      tids.push(setTimeout(() => setVisibleCount(6), 4900));
      tids.push(setTimeout(() => setPhase("stat"), 6300));
      tids.push(setTimeout(() => setPhase("question"), 9000));
      tids.push(setTimeout(run, 12500));
    }
    const init = setTimeout(run, 600);
    return () => { clearTimeout(init); tids.forEach(clearTimeout); };
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.7, delay: 0.5 }}
      className="shrink-0"
      style={{ width: "320px", overflow: "visible" }}
    >
      <AnimatePresence mode="wait">

        {phase === "reviews" && (
          <motion.div
            key="reviews"
            exit={{ opacity: 0, scale: 0.96, y: -6 }}
            transition={{ duration: 0.35 }}
            style={{ position: "relative", height: "440px", overflow: "visible" }}
          >
            {HERO_REVIEWS.map((r, i) => {
              if (i >= visibleCount) return null;
              const depth = visibleCount - 1 - i;
              const d = HERO_DEPTHS[depth] ?? HERO_DEPTHS[HERO_DEPTHS.length - 1];
              const isFast = visibleCount > 2 && depth === 0;
              return (
                <motion.div
                  key={i}
                  initial={{ x: 50, opacity: 0, rotate: d.r + 6 }}
                  animate={{ x: d.x, y: d.y, opacity: d.o, rotate: d.r, zIndex: d.z }}
                  transition={{ duration: isFast ? 0.3 : 0.5, ease: [0.22, 1, 0.36, 1] }}
                  style={{ position: "absolute", width: "320px", top: 0, overflow: "visible" }}
                >
                  <HeroReviewCard r={r} />
                </motion.div>
              );
            })}
          </motion.div>
        )}

        {phase === "stat" && (
          <motion.div
            key="stat"
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.5 }}
            className="px-2"
          >
            <motion.p
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
              style={{ fontFamily: "var(--font-manrope)", fontSize: "clamp(48px, 10vw, 68px)", fontWeight: 900, lineHeight: 1.0, color: "var(--foreground)" }}
            >
              47 reviews.
            </motion.p>
            <motion.p
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.25 }}
              style={{ fontFamily: "var(--font-manrope)", fontSize: "clamp(48px, 10vw, 68px)", fontWeight: 900, lineHeight: 1.0, color: "#e05555", marginTop: "10px" }}
            >
              Same issue.
            </motion.p>
          </motion.div>
        )}

        {phase === "question" && (
          <motion.div
            key="question"
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="px-2"
          >
            <motion.p
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
              style={{ fontFamily: "var(--font-manrope)", fontSize: "clamp(34px, 7.5vw, 50px)", fontWeight: 800, lineHeight: 1.15, color: "var(--foreground)" }}
            >
              Your guests know.
            </motion.p>
            <motion.p
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
              style={{ fontFamily: "var(--font-manrope)", fontSize: "clamp(52px, 11vw, 76px)", fontWeight: 900, lineHeight: 1.0, color: "var(--gold)", marginTop: "12px" }}
            >
              Do you?
            </motion.p>
          </motion.div>
        )}

      </AnimatePresence>
    </motion.div>
  );
}

function StatCounter({ stat, inView }: { stat: typeof STATS[number]; inView: boolean }) {
  const count = useCountUp(stat.value, 2000, inView, stat.value < 1 ? 1 : 0);
  const display = stat.value >= 1000 ? count.toLocaleString() : count;
  return (
    <div className="text-center">
      <div className="text-3xl md:text-4xl font-bold text-foreground">
        {stat.prefix}{display}{stat.suffix}
      </div>
      <div className="text-muted text-base mt-1">{stat.label}</div>
    </div>
  );
}

/* ─────────────── rev brand moment ─────────────── */

function RevMoment() {
  const [toRevenue, setToRevenue] = useState(false);
  useEffect(() => {
    const id = setInterval(() => setToRevenue(v => !v), 2400);
    return () => clearInterval(id);
  }, []);

  return (
    <motion.div
      variants={{ hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0 } }}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
      transition={{ duration: 0.7 }}
      className="text-center"
    >
      <div className="select-none" style={{ fontFamily: "var(--font-manrope)", fontSize: "clamp(72px, 12vw, 160px)", fontWeight: 900, lineHeight: 1, display: "inline-flex", alignItems: "flex-start", gap: 0 }}>
        <span style={{ color: "var(--gold)", flexShrink: 0 }}>Rev</span><span style={{ position: "relative", display: "inline-block" }}>{/* invisible sizer */}<span style={{ visibility: "hidden", display: "block" }}>enue</span><span style={{ position: "absolute", top: 0, left: 0, transition: "opacity 500ms, transform 500ms", opacity: toRevenue ? 0 : 1, transform: toRevenue ? "translateY(-16px)" : "translateY(0)" }}>iew</span><span style={{ position: "absolute", top: 0, left: 0, transition: "opacity 500ms, transform 500ms", opacity: toRevenue ? 1 : 0, transform: toRevenue ? "translateY(0)" : "translateY(16px)" }}>enue</span></span>
      </div>

      <p className="text-base text-muted mt-6 max-w-lg mx-auto leading-relaxed">
        From <span className="text-foreground font-medium">Review</span> to{" "}
        <span className="text-foreground font-medium">Revenue</span>. The word behind everything we do.
      </p>
    </motion.div>
  );
}


/* ─────────────── animations ─────────────── */

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0 },
};

const stagger = {
  visible: { transition: { staggerChildren: 0.1 } },
};

/* ─────────────── glass style ─────────────── */

const glass = {
  background: "var(--input-bg)",
  border: "1px solid var(--glass-border)",
  backdropFilter: "blur(12px)",
  boxShadow: "var(--card-shadow)",
};

/* ═══════════════ PAIN CHAIN SCENES ═══════════════ */

const CHAIN_SCENES = [
  { num: "01", label: "Bad review", color: "#B85050" },
  { num: "02", label: "Rating drops", color: "#C9A86A" },
  { num: "03", label: "Less visibility and occupancy", color: "#516B84" },
  { num: "04", label: "Revenue hit", color: "#4a8f6b" },
];

function SceneBadReview() {
  const cards = [
    { platform: "Google", bg: "#4285F4", rating: <><span style={{color:"#B85050"}}>★★</span><span style={{color:"rgba(0,0,0,0.12)"}}>★★★</span></>, delay: 0,    x: -56, y: -18, r: -5,  z: 1 },
    { platform: "Booking.com", bg: "#0057b8", rating: <span style={{color:"#B85050",fontWeight:700}}>3.8<span style={{color:"rgba(0,0,0,0.2)",fontWeight:400}}> / 10</span></span>, delay: 0.18, x: 52,  y: -24, r: 4,   z: 2 },
    { platform: "TripAdvisor", bg: "#00AA6C", rating: <><span style={{color:"#B85050"}}>●●</span><span style={{color:"rgba(0,0,0,0.12)"}}>●●●</span></>, delay: 0.34, x: -20, y: 30,  r: -2,  z: 3 },
    { platform: "Expedia",     bg: "#ffc72c", rating: <><span style={{color:"#B85050"}}>★★</span><span style={{color:"rgba(0,0,0,0.12)"}}>★★★</span></>, delay: 0.5,  x: 48,  y: 28,  r: 6,   z: 4 },
  ];
  return (
    <div className="relative flex items-center justify-center" style={{ height: "220px" }}>
      <div className="relative" style={{ width: 240, height: 180 }}>
        {cards.map((c, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 50, rotate: c.r - 10, scale: 0.85 }}
            animate={{ opacity: 1, y: 0, rotate: c.r, scale: 1 }}
            transition={{ delay: c.delay, duration: 0.45, type: "spring", bounce: 0.25 }}
            className="absolute rounded-xl p-3"
            style={{
              width: 148,
              left: `calc(50% + ${c.x}px - 74px)`,
              top: `calc(50% + ${c.y}px - 40px)`,
              background: "var(--background, #FAF9F7)",
              border: "1px solid rgba(0,0,0,0.09)",
              boxShadow: "0 4px 14px rgba(0,0,0,0.10)",
              zIndex: c.z,
            }}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="px-1.5 py-0.5 rounded text-[9px] font-bold text-white leading-none" style={{ background: c.bg }}>{c.platform}</div>
              <div className="text-[11px] leading-none">{c.rating}</div>
            </div>
            <div className="space-y-1.5">
              <div className="h-1.5 rounded-full" style={{ background: "rgba(0,0,0,0.07)", width: "88%" }} />
              <div className="h-1.5 rounded-full" style={{ background: "rgba(0,0,0,0.05)", width: "68%" }} />
              <div className="h-1.5 rounded-full" style={{ background: "rgba(0,0,0,0.04)", width: "76%" }} />
            </div>
          </motion.div>
        ))}
      </div>
      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.1 }} className="absolute bottom-1 text-xs" style={{ color: "var(--muted)" }}>
        +47 more this week
      </motion.p>
    </div>
  );
}

function SceneRatingDrop() {
  const [rating, setRating] = useState(8.6);
  const targetRef = useRef(8.6);
  useEffect(() => {
    const start = Date.now();
    const from = 8.6, to = 7.9, dur = 2800;
    const id = setInterval(() => {
      const p = Math.min((Date.now() - start) / dur, 1);
      const eased = 1 - Math.pow(1 - p, 2.5);
      const v = Math.round((from - (from - to) * eased) * 10) / 10;
      targetRef.current = v;
      setRating(v);
      if (p >= 1) clearInterval(id);
    }, 40);
    return () => clearInterval(id);
  }, []);

  const pct = (8.6 - rating) / 0.7;
  const col = `rgba(${Math.round(74 + (184 - 74) * pct)},${Math.round(143 - 143 * pct)},${Math.round(107 - 107 * pct)},1)`;

  return (
    <div className="flex flex-col items-center justify-center gap-2" style={{ height: "220px" }}>
      <div className="text-[9px] font-bold tracking-widest" style={{ color: "var(--muted)" }}>BOOKING.COM · PROPERTY SCORE</div>
      <div className="text-[80px] font-black tabular-nums leading-none" style={{ color: col, fontFamily: "var(--font-manrope)", transition: "color 0.15s" }}>
        {rating.toFixed(1)}
      </div>
      <div className="flex items-center gap-2">
        <svg width="120" height="36" viewBox="0 0 120 36" fill="none">
          <motion.path
            d="M0 6 C20 6 30 8 40 10 C55 13 60 16 75 24 C90 32 105 34 120 35"
            fill="none" stroke="#B85050" strokeWidth="2.5" strokeLinecap="round"
            initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
            transition={{ duration: 2.5, ease: "easeInOut" }}
          />
          <motion.circle cx="120" cy="35" r="3.5" fill="#B85050"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2.3 }} />
        </svg>
        <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2 }}
          className="text-sm font-bold" style={{ color: "#B85050" }}>−0.7 pts</motion.span>
      </div>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2.4 }}
        className="text-xs font-semibold px-3 py-1 rounded-full" style={{ background: "rgba(184,80,80,0.08)", color: "#B85050" }}>
        Drops below page-1 threshold
      </motion.div>
    </div>
  );
}

function SceneVisibility() {
  const [phase, setPhase] = useState<0 | 1 | 2>(0);
  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 1200);
    const t2 = setTimeout(() => setPhase(2), 2200);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  const competitors = [
    { name: "Grand Hyatt Downtown", score: "9.2" },
    { name: "Marriott City Center", score: "8.8" },
    { name: "Hilton Garden Inn", score: "8.5" },
  ];

  return (
    <div className="flex items-center justify-center" style={{ height: "220px" }}>
      <div className="w-full max-w-[300px]">
        <div className="text-[9px] font-bold tracking-widest text-center mb-2" style={{ color: "var(--muted)" }}>
          BOOKING.COM SEARCH RESULTS
        </div>
        <div className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(0,0,0,0.09)" }}>
          {/* Page 1 header */}
          <div className="px-3 py-1.5 text-[9px] font-bold tracking-widest" style={{ background: "rgba(0,0,0,0.03)", borderBottom: "1px solid rgba(0,0,0,0.06)", color: "var(--muted)" }}>PAGE 1</div>
          {/* Competitors */}
          {competitors.map((h, i) => (
            <motion.div key={i} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }}
              className="flex items-center gap-3 px-3 py-2" style={{ borderBottom: "1px solid rgba(0,0,0,0.05)" }}>
              <span className="text-xs text-muted w-3">{i + 1}</span>
              <span className="text-xs text-foreground flex-1">{h.name}</span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: "rgba(74,143,107,0.1)", color: "#4a8f6b" }}>{h.score}</span>
            </motion.div>
          ))}
          {/* Your hotel - moves from page 1 to page 2 */}
          <AnimatePresence mode="wait">
            {phase < 2 && (
              <motion.div key="hotel-p1"
                initial={{ opacity: phase === 0 ? 1 : 1 }}
                exit={{ opacity: 0, y: 16, transition: { duration: 0.5 } }}
                className="flex items-center gap-3 px-3 py-2"
                style={{ background: phase === 1 ? "rgba(184,80,80,0.04)" : "rgba(201,168,106,0.05)", borderBottom: "1px solid rgba(0,0,0,0.05)", transition: "background 0.4s" }}>
                <span className="text-xs w-3" style={{ color: phase === 1 ? "#B85050" : "var(--gold)" }}>4</span>
                <span className="text-xs font-semibold flex-1" style={{ color: phase === 1 ? "#B85050" : "var(--foreground)" }}>Your Hotel {phase === 0 ? "✦" : "↓"}</span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: phase === 1 ? "rgba(184,80,80,0.1)" : "rgba(201,168,106,0.1)", color: phase === 1 ? "#B85050" : "var(--gold)" }}>7.9</span>
              </motion.div>
            )}
          </AnimatePresence>
          {/* Page 2 */}
          <AnimatePresence>
            {phase === 2 && (
              <>
                <motion.div key="p2-sep" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} transition={{ duration: 0.35 }}
                  className="px-3 py-1.5 text-[9px] font-bold tracking-widest overflow-hidden"
                  style={{ background: "rgba(184,80,80,0.05)", borderTop: "2px solid rgba(184,80,80,0.25)", borderBottom: "1px solid rgba(184,80,80,0.1)", color: "#B85050" }}>
                  PAGE 2
                </motion.div>
                <motion.div key="hotel-p2" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
                  className="flex items-center gap-3 px-3 py-2" style={{ background: "rgba(184,80,80,0.04)" }}>
                  <span className="text-xs w-3" style={{ color: "#B85050" }}>7</span>
                  <span className="text-xs font-semibold flex-1" style={{ color: "#B85050" }}>Your Hotel</span>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: "rgba(184,80,80,0.12)", color: "#B85050" }}>7.9</span>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

function SceneRevenue() {
  const [revpar, setRevpar] = useState(147);
  const [showImpact, setShowImpact] = useState(false);
  useEffect(() => {
    const start = Date.now(), from = 147, to = 118, dur = 2600;
    const id = setInterval(() => {
      const p = Math.min((Date.now() - start) / dur, 1);
      const eased = 1 - Math.pow(1 - p, 2);
      setRevpar(Math.round(from - (from - to) * eased));
      if (p >= 1) { clearInterval(id); setShowImpact(true); }
    }, 40);
    return () => clearInterval(id);
  }, []);

  const dropped = 147 - revpar;
  const annualM = ((dropped * 100 * 365 * 30) / 1_000_000).toFixed(1);

  return (
    <div className="flex flex-col items-center justify-center gap-3" style={{ height: "220px" }}>
      <div className="text-[9px] font-bold tracking-widest" style={{ color: "var(--muted)" }}>REVPAR · LIVE</div>

      {/* Dropping counter */}
      <div className="flex items-start gap-1">
        <span className="text-3xl font-black mt-2" style={{ color: "#B85050", fontFamily: "var(--font-manrope)" }}>$</span>
        <span className="text-[72px] font-black tabular-nums leading-none" style={{ color: "#B85050", fontFamily: "var(--font-manrope)" }}>{revpar}</span>
        <motion.span className="text-xl font-black mt-3" initial={{ opacity: 0 }} animate={{ opacity: dropped > 2 ? 1 : 0 }} style={{ color: "#B85050" }}>↓</motion.span>
      </div>

      {/* Properties ticker */}
      <div className="flex gap-2">
        {["NYC", "CHI", "MIA", "ATX", "DEN"].map((city, i) => {
          const cityDrop = Math.round(dropped * (0.8 + i * 0.12));
          return (
            <div key={i} className="flex flex-col items-center">
              <span className="text-[8px] font-bold text-muted">{city}</span>
              <motion.span
                className="text-[11px] font-bold tabular-nums"
                style={{ color: cityDrop > 5 ? "#B85050" : "var(--muted)" }}
              >
                −${cityDrop}
              </motion.span>
            </div>
          );
        })}
      </div>

      {/* Annual impact reveal */}
      <AnimatePresence>
        {showImpact && (
          <motion.div initial={{ opacity: 0, scale: 0.92, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ type: "spring", bounce: 0.3 }}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold text-center"
            style={{ background: "rgba(184,80,80,0.08)", border: "1px solid rgba(184,80,80,0.22)", color: "#B85050" }}>
            −${annualM}M / year across 30 properties
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ═══════════════ FEATURE CARD ANIMATIONS ═══════════════ */

function TopIssuesAnim() {
  const [active, setActive] = useState(0);
  const issues = [
    { label: "WiFi connectivity", count: "74 mentions" },
    { label: "Check-in delays", count: "61 mentions" },
    { label: "Breakfast quality", count: "48 mentions" },
  ];
  useEffect(() => {
    const t = setInterval(() => setActive(a => (a + 1) % 3), 1100);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="space-y-1.5 pt-1">
      {issues.map((issue, i) => (
        <div key={i} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg transition-all duration-400" style={{ background: i === active ? "rgba(201,168,106,0.1)" : "transparent" }}>
          <div className="w-1.5 h-1.5 rounded-full shrink-0 transition-all duration-300" style={{ background: i === active ? "var(--gold)" : "rgba(0,0,0,0.15)" }} />
          <span className="text-[11px] flex-1 transition-all duration-300" style={{ color: i === active ? "var(--foreground)" : "var(--muted)", fontWeight: i === active ? 600 : 400 }}>{issue.label}</span>
          <span className="text-[9px] font-semibold transition-all duration-300" style={{ color: i === active ? "var(--gold)" : "transparent" }}>{issue.count}</span>
        </div>
      ))}
    </div>
  );
}

function AIResponseAnim() {
  const [phase, setPhase] = useState<0 | 1 | 2>(0);
  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 900);
    const t2 = setTimeout(() => setPhase(2), 1900);
    const t3 = setTimeout(() => { setPhase(0); }, 3600);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [phase]);
  return (
    <div className="space-y-2 pt-1">
      <div className="px-2.5 py-1.5 rounded-lg text-[10px] text-muted" style={{ background: "rgba(0,0,0,0.04)", border: "1px solid rgba(0,0,0,0.07)" }}>
        &ldquo;The check-in took forever. Very disappointing.&rdquo;
      </div>
      <AnimatePresence>
        {phase >= 1 && (
          <motion.div key="response" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="flex items-start gap-2 px-1">
            <div className="shrink-0 rounded-md flex items-center justify-center px-1.5 mt-0.5" style={{ background: "#1C2A39", height: "22px" }}>
              <img src="/logo-white.svg" alt="RatingIQ" style={{ height: "12px", width: "auto" }} />
            </div>
            {phase === 1 ? (
              <div className="flex items-center gap-1 mt-1.5">
                {[0, 1, 2].map(j => (
                  <motion.div key={j} className="w-1 h-1 rounded-full" style={{ background: "var(--gold)" }}
                    animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 0.7, delay: j * 0.2, repeat: Infinity }} />
                ))}
              </div>
            ) : (
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-[10px] text-foreground leading-relaxed">
                Thank you - we&apos;re sorry about the wait. We&apos;ve shared your feedback with our team and are addressing it directly.
              </motion.p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function StatsAnim() {
  const [view, setView] = useState(0);
  const views = [
    {
      label: "By platform",
      rows: [
        { label: "Google",     score: 7.8, color: "#4285F4" },
        { label: "Booking",    score: 6.9, color: "#0057b8" },
        { label: "TripAdvisor",score: 7.2, color: "#00AA6C" },
      ],
    },
    {
      label: "By category",
      rows: [
        { label: "Service",   score: 8.4, color: "#4a8f6b" },
        { label: "Breakfast", score: 6.1, color: "#B85050" },
        { label: "WiFi",      score: 5.8, color: "#B85050" },
      ],
    },
    {
      label: "By guest type",
      rows: [
        { label: "Business",  score: 8.1, color: "#4a8f6b" },
        { label: "Families",  score: 6.4, color: "#B85050" },
        { label: "Couples",   score: 7.9, color: "#4a8f6b" },
      ],
    },
  ];
  useEffect(() => {
    const t = setInterval(() => setView(v => (v + 1) % views.length), 1600);
    return () => clearInterval(t);
  }, []);

  const current = views[view];
  return (
    <div className="pt-1">
      <div className="flex items-center gap-2 mb-2">
        {views.map((v, i) => (
          <button key={i} onClick={() => setView(i)} className="text-[8px] font-semibold px-2 py-0.5 rounded-full transition-all duration-200" style={{ background: view === i ? "rgba(81,107,132,0.15)" : "transparent", color: view === i ? "var(--cyan)" : "var(--muted)", border: `1px solid ${view === i ? "rgba(81,107,132,0.3)" : "transparent"}` }}>
            {v.label}
          </button>
        ))}
      </div>
      <AnimatePresence mode="wait">
        <motion.div key={view} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.25 }} className="space-y-1.5">
          {current.rows.map((r, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-[9px] w-20 shrink-0" style={{ color: "var(--muted)" }}>{r.label}</span>
              <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(0,0,0,0.07)" }}>
                <motion.div className="h-1.5 rounded-full" initial={{ width: 0 }} animate={{ width: `${(r.score / 10) * 100}%` }} transition={{ duration: 0.5, delay: i * 0.08, ease: "easeOut" }} style={{ background: r.color }} />
              </div>
              <span className="text-[9px] font-bold w-6 text-right" style={{ color: r.color }}>{r.score}</span>
            </div>
          ))}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// filter([0,4,2]) preserves array order → renders as [0,2,4] = [topIssues, stats, aiResponse]
const FEATURE_ANIMS = [<TopIssuesAnim key="a" />, <StatsAnim key="b" />, <AIResponseAnim key="c" />];

/* ═══════════════ MAIN COMPONENT ═══════════════ */

export default function HomeClient() {
  const { resolvedTheme } = useTheme();
  const [scrolled, setScrolled] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const [capabilitiesOpen, setCapabilitiesOpen] = useState(false);
  const [capabilitiesMobileOpen, setCapabilitiesMobileOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [leadModal, setLeadModal] = useState<{
    open: boolean; source: string; variant?: "signup" | "elaine";
    title?: string; subtitle?: string; ctaLabel?: string;
  }>({ open: false, source: "" });
  const openLead = (source: string, opts?: { variant?: "signup" | "elaine"; title?: string; subtitle?: string; ctaLabel?: string }) =>
    setLeadModal({ open: true, source, ...opts });
  const closeLead = () => setLeadModal(m => ({ ...m, open: false }));
  const [faqForm, setFaqForm] = useState({ name: "", hotel: "", email: "", phone: "", question: "" });
  const [faqSent, setFaqSent] = useState(false);
  const [chainScene, setChainScene] = useState(0);
  const [properties, setProperties] = useState(10);
  const [testimonialSlide, setTestimonialSlide] = useState(0);
  const testimonialDir = useRef(1);
  const capCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const openCap = () => {
    if (capCloseTimer.current) clearTimeout(capCloseTimer.current);
    setCapabilitiesOpen(true);
  };
  const closeCap = () => {
    capCloseTimer.current = setTimeout(() => setCapabilitiesOpen(false), 150);
  };

  // Stats ref for count-up
  const statsRef = useRef<HTMLDivElement>(null);
  const statsInView = useInView(statsRef, { once: true, amount: 0.3 });

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const t = setInterval(() => setChainScene(s => (s + 1) % 4), 4000);
    return () => clearInterval(t);
  }, []);

  const closeMobileNav = useCallback(() => setMobileNav(false), []);

  return (
    <div className="min-h-screen" style={{ background: "var(--page-gradient)" }}>

      {/* ──── NAVBAR ──── */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? "border-b"
            : "border-b border-transparent"
        }`}
        style={scrolled ? {
          background: "var(--nav-scrolled-bg)",
          backdropFilter: "blur(12px)",
          borderColor: "var(--glass-border)",
        } : undefined}
      >
        <nav className="max-w-6xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
          <Link href="/">
            <img
              src={resolvedTheme === "dark" ? "/logo-white.svg" : "/logo.svg"}
              alt="RatingIQ"
              style={{ height: "48px", width: "auto", objectFit: "contain" }}
            />
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-8">
            {/* Capabilities dropdown */}
            <div className="relative" onMouseEnter={openCap} onMouseLeave={closeCap}>
              <button className="text-base text-muted hover:text-foreground transition-colors duration-200 flex items-center gap-1">
                What We Do
                <svg className={`w-3 h-3 transition-transform duration-200 ${capabilitiesOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                </svg>
              </button>
              {capabilitiesOpen && (
                <div className="absolute top-full left-1/2 -translate-x-1/2 pt-3 z-50" style={{ minWidth: "260px" }} onMouseEnter={openCap} onMouseLeave={closeCap}>
                  <div className="rounded-2xl py-2" style={{ background: "var(--nav-scrolled-bg)", backdropFilter: "blur(16px)", border: "1px solid var(--glass-border)", boxShadow: "0 20px 40px rgba(0,0,0,0.25)" }}>
                    <a href="/capabilities/statistics" className="block px-4 py-3 rounded-xl mx-1 hover:bg-white/5 transition-colors group">
                      <div className="flex items-center gap-2 mb-0.5 flex-nowrap">
                        <span className="text-[10px] font-bold tracking-widest uppercase px-2 py-0.5 rounded-full shrink-0 whitespace-nowrap" style={{ color: "var(--muted)", background: "var(--input-bg)" }}>Free</span>
                        <span className="text-sm font-semibold text-foreground">Know Your Guests</span>
                      </div>
                      <p className="text-xs text-muted">All platforms, all data, one place</p>
                    </a>
                    <a href="/capabilities/ratings" className="block px-4 py-3 rounded-xl mx-1 hover:bg-white/5 transition-colors group">
                      <div className="flex items-center gap-2 mb-0.5 flex-nowrap">
                        <span className="text-[10px] font-bold tracking-widest uppercase px-2 py-0.5 rounded-full shrink-0 whitespace-nowrap" style={{ color: "var(--gold)", background: "rgba(201,168,106,0.1)" }}>Tier 1</span>
                        <span className="text-sm font-semibold text-foreground">Own Your Rating</span>
                      </div>
                      <p className="text-xs text-muted">See exactly where your rating stands and why</p>
                    </a>
                    <div className="my-1 mx-4 h-px" style={{ background: "var(--glass-border)" }} />
                    <a href="/capabilities/premium" className="block px-4 py-3 rounded-xl mx-1 hover:bg-white/5 transition-colors group">
                      <div className="flex items-center gap-2 mb-0.5 flex-nowrap">
                        <span className="text-[10px] font-bold tracking-widest uppercase px-2 py-0.5 rounded-full shrink-0 whitespace-nowrap" style={{ color: "var(--navy-1, #1C2A39)", background: "var(--gold)" }}>Premium</span>
                        <span className="text-sm font-semibold text-foreground">Drive Your Revenue</span>
                      </div>
                      <p className="text-xs text-muted">Insights, actions, reviews & Elaine</p>
                    </a>
                  </div>
                </div>
              )}
            </div>
            {NAV_LINKS.map((l) => (
              <a key={l.href} href={l.href} className="text-base text-muted hover:text-foreground transition-colors duration-200">{l.label}</a>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-3">
            <ThemeToggle />
            <Link href="/login" className="text-sm font-semibold transition-colors duration-200 px-4 py-2" style={{ color: "#1C2A39" }}>Log In</Link>
            <button
              onClick={() => openLead("nav_book_demo", { title: "Book a demo.", subtitle: "Tell us about your chain and we'll set up a live session.", ctaLabel: "Book a Demo" })}
              className="text-sm font-semibold text-navy-1 rounded-xl px-5 py-2.5 transition-all duration-300 hover:opacity-90 hover:scale-[1.02]"
              style={{ background: "linear-gradient(to right, var(--gold), var(--gold-dark))" }}
            >
              Book a Demo
            </button>
          </div>

          {/* Mobile hamburger */}
          <button onClick={() => setMobileNav(!mobileNav)} className="md:hidden text-foreground p-2" aria-label="Toggle navigation">
            {mobileNav ? (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            ) : (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" /></svg>
            )}
          </button>
        </nav>

        {/* Mobile dropdown */}
        {mobileNav && (
          <div className="md:hidden border-t px-4 pb-4 pt-2" style={{ background: "var(--nav-scrolled-bg)", backdropFilter: "blur(12px)", borderColor: "var(--glass-border)", boxShadow: "0 15px 40px rgba(0,0,0,0.2)" }}>
            {/* Capabilities accordion */}
            <button onClick={() => setCapabilitiesMobileOpen(!capabilitiesMobileOpen)} className="w-full flex items-center justify-between py-2.5 text-muted hover:text-foreground transition-colors">
              <span>What We Do</span>
              <svg className={`w-3 h-3 transition-transform duration-200 ${capabilitiesMobileOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
              </svg>
            </button>
            {capabilitiesMobileOpen && (
              <div className="pl-4 pb-1 flex flex-col gap-1">
                <a href="/capabilities/statistics" onClick={closeMobileNav} className="py-2 text-sm text-muted hover:text-foreground transition-colors">Know Your Guests <span className="text-xs opacity-50">· Free</span></a>
                <a href="/capabilities/ratings" onClick={closeMobileNav} className="py-2 text-sm text-muted hover:text-foreground transition-colors">Own Your Rating <span className="text-xs opacity-50">· Tier 1</span></a>
                <a href="/capabilities/premium" onClick={closeMobileNav} className="py-2 text-sm text-muted hover:text-foreground transition-colors">Drive Your Revenue <span className="text-xs opacity-50">· Premium</span></a>
              </div>
            )}
            {NAV_LINKS.map((l) => (
              <a key={l.href} href={l.href} onClick={closeMobileNav} className="block py-2.5 text-muted hover:text-foreground transition-colors">{l.label}</a>
            ))}
            <div className="flex flex-col gap-2 mt-3 pt-3 border-t" style={{ borderColor: "var(--glass-border)" }}>
              <ThemeToggle className="self-start" />
              <Link href="/login" onClick={closeMobileNav} className="font-semibold transition-colors py-2" style={{ color: "#1C2A39" }}>Log In</Link>
              <button
                onClick={() => { closeMobileNav(); openLead("nav_book_demo", { title: "Book a demo.", subtitle: "Tell us about your chain and we'll set up a live session.", ctaLabel: "Book a Demo" }); }}
                className="text-center font-semibold text-navy-1 rounded-xl px-5 py-2.5"
                style={{ background: "linear-gradient(to right, var(--gold), var(--gold-dark))" }}
              >
                Book a Demo
              </button>
            </div>
          </div>
        )}
      </header>

      <main>

        {/* ──── HERO ──── */}
        <section id="hero" className="relative min-h-screen flex items-center px-4 md:px-8 pt-28 overflow-hidden">
          {/* Background orbs */}
          <div className="absolute top-20 right-[10%] w-[500px] h-[500px] rounded-full opacity-30 pointer-events-none" style={{ background: "radial-gradient(circle, rgba(201,168,106,0.08) 0%, transparent 70%)", animation: "float 6s ease-in-out infinite alternate" }} />
          <div className="absolute bottom-20 left-[5%] w-[400px] h-[400px] rounded-full opacity-20 pointer-events-none" style={{ background: "radial-gradient(circle, rgba(81,107,132,0.06) 0%, transparent 70%)", animation: "float-slow 8s ease-in-out infinite alternate" }} />

          <div className="max-w-6xl mx-auto w-full relative z-10">

            {/* Badge - spans full width above both columns */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="mb-8">
              <span className="inline-block text-xs font-medium tracking-wider uppercase px-4 py-1.5 rounded-full text-gold-light" style={{ ...glass }}>
                From Review to Revenue
              </span>
            </motion.div>

            <div className="grid md:grid-cols-2 gap-12 lg:gap-20 items-center">

            {/* Left: copy */}
            <div>
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.15 }}
                className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground leading-tight mb-4"
                style={{ fontFamily: "var(--font-manrope)" }}
              >
                <span className="text-foreground">Your rating is your revenue.</span>
                <br />
                <span className="bg-gradient-to-r from-gold via-gold-light to-gold-dark bg-clip-text text-transparent">Know what&apos;s driving it.</span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="text-xl md:text-2xl text-muted max-w-lg mb-10"
              >
                RatingIQ tells you exactly what your reviews reveal - and directs your team to act on it.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.45 }}
                className="flex flex-row flex-wrap gap-3 mb-12"
              >
                <Link
                  href="#contact"
                  className="px-5 py-2.5 rounded-xl font-semibold text-navy-1 text-sm transition-all duration-300 hover:scale-[1.02] hover:shadow-lg hover:shadow-gold/20"
                  style={{ background: "linear-gradient(to right, var(--gold), var(--gold-dark))" }}
                >
                  See What&apos;s Driving Your Rating
                </Link>
                <a
                  href="#how-it-works"
                  className="px-5 py-2.5 rounded-xl font-semibold text-foreground text-sm transition-all duration-300 hover:scale-[1.02] flex items-center gap-2"
                  style={{ background: "var(--input-bg)", border: "1px solid var(--glass-border)" }}
                >
                  How It Works
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 13.5L12 21m0 0l-7.5-7.5M12 21V3" /></svg>
                </a>
              </motion.div>

              {/* Brand pillars - HIDDEN (restore later) */}
            </div>

            {/* Right: animated rating visual */}
            <div className="flex justify-center items-center">
              <HeroVisualNew />
            </div>

            </div>{/* end grid */}
          </div>
        </section>

        {/* ──── CTA STRIP ──── */}
        <div className="py-5 px-4 md:px-8 border-y" style={{ borderColor: "var(--glass-border)" }}>
          <div className="max-w-5xl mx-auto flex justify-center">
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <p className="text-base font-medium text-muted">Your rating could be higher. Do you know what&apos;s holding it back?</p>
              <button
                onClick={() => openLead("cta_strip", { title: "Let us tell you.", subtitle: "We'll show you exactly what's holding your rating back.", ctaLabel: "Show Me" })}
                className="text-sm font-semibold px-4 py-2 rounded-lg transition-all hover:scale-[1.02] whitespace-nowrap"
                style={{ color: "var(--gold)", background: "rgba(201,168,106,0.08)", border: "1px solid rgba(201,168,106,0.2)" }}
              >
                We can tell you →
              </button>
            </div>
          </div>
        </div>

        {/* ──── THE PAIN ──── */}
        <section id="why" className="py-10 md:py-14 px-4 md:px-8">
          <div className="max-w-5xl mx-auto">

            {/* Header */}
            <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.3 }} transition={{ duration: 0.5 }} className="mb-14">
              <span className="inline-block text-xs font-semibold uppercase tracking-wider px-3 py-1 rounded-full mb-5" style={{ color: "var(--danger)", background: "rgba(184,80,80,0.07)", border: "1px solid rgba(184,80,80,0.18)" }}>
                Sound familiar?
              </span>
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4 max-w-2xl leading-tight" style={{ fontFamily: "var(--font-manrope)" }}>
                Your GMs see the review.{" "}
                <span className="bg-gradient-to-r from-gold via-gold-light to-gold-dark bg-clip-text text-transparent">Nobody sees the pattern.</span>
              </h2>
              <p className="text-lg text-muted">
                Every bad review starts a chain. Most chains have no way to stop it.
              </p>
            </motion.div>

            {/* Chain reaction - animated sequence player */}
            <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }} transition={{ duration: 0.5 }} className="mb-16 rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(0,0,0,0.07)", background: "rgba(0,0,0,0.015)" }}>
              {/* Step tabs */}
              <div className="flex items-stretch border-b" style={{ borderColor: "rgba(0,0,0,0.07)" }}>
                {CHAIN_SCENES.map((sc, i) => (
                  <div key={i} className="contents">
                    <button onClick={() => setChainScene(i)} className="relative flex-1 flex flex-col items-center gap-1 py-3 px-2 transition-colors duration-200 text-center cursor-pointer" style={{ background: chainScene === i ? `${sc.color}08` : "transparent" }}>
                      <span className="text-[9px] font-bold tracking-widest" style={{ color: chainScene === i ? sc.color : "rgba(0,0,0,0.25)" }}>{sc.num}</span>
                      <span className="text-xs font-semibold leading-tight" style={{ color: chainScene === i ? "var(--foreground)" : "var(--muted)" }}>{sc.label}</span>
                      <div className="absolute bottom-0 left-0 right-0 h-[2px]">
                        {chainScene === i && (
                          <motion.div key={`prog-${chainScene}`} initial={{ width: "0%" }} animate={{ width: "100%" }} transition={{ duration: 4, ease: "linear" }} style={{ height: "2px", background: sc.color }} />
                        )}
                      </div>
                    </button>
                    {i < CHAIN_SCENES.length - 1 && (
                      <div className="flex items-center justify-center shrink-0" style={{ padding: "0 2px" }}>
                        <svg width="18" height="18" viewBox="0 0 12 12" fill="none">
                          <path d="M3.5 2L8 6l-4.5 4" stroke="rgba(0,0,0,0.35)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              {/* Scene panel */}
              <div className="relative overflow-hidden" style={{ minHeight: "220px" }}>
                <AnimatePresence mode="wait">
                  {chainScene === 0 && (
                    <motion.div key="s0" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }} className="absolute inset-0">
                      <SceneBadReview />
                    </motion.div>
                  )}
                  {chainScene === 1 && (
                    <motion.div key="s1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }} className="absolute inset-0">
                      <SceneRatingDrop />
                    </motion.div>
                  )}
                  {chainScene === 2 && (
                    <motion.div key="s2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }} className="absolute inset-0">
                      <SceneVisibility />
                    </motion.div>
                  )}
                  {chainScene === 3 && (
                    <motion.div key="s3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }} className="absolute inset-0">
                      <SceneRevenue />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>

            {/* Bridge line */}
            <motion.p variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.5 }} transition={{ duration: 0.5 }} className="text-center mt-6 mb-16" style={{ fontFamily: "var(--font-manrope)", fontSize: "clamp(20px, 3vw, 28px)", fontWeight: 400, color: "var(--muted)" }}>
              Do you know what{" "}
              <span style={{ fontWeight: 800, color: "var(--foreground)" }}>one bad review</span>
              {" "}is actually{" "}
              <span style={{ fontWeight: 800, color: "var(--foreground)" }}>costing you?</span>
            </motion.p>

            {/* Cornell + Revenue calculator - combined */}
            <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.3 }} transition={{ duration: 0.5 }} className="rounded-2xl p-6 md:p-8" style={{ background: "rgba(201,168,106,0.05)", border: "1px solid rgba(201,168,106,0.18)" }}>

              {/* Cornell citation as section intro */}
              <div className="flex items-center gap-3 mb-5 pb-5 border-b" style={{ borderColor: "rgba(201,168,106,0.15)" }}>
                <span className="shrink-0" style={{ color: "var(--gold)" }}>★</span>
                <p className="text-sm font-medium text-foreground">
                  <em>Cornell Hospitality Research: &ldquo;A 1% reputation improvement leads to up to a <strong>1.42% increase in RevPAR.</strong>&rdquo;</em>
                </p>
              </div>

              <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--gold)" }}>Revenue opportunity calculator</p>
              <h3 className="text-lg md:text-xl font-bold text-foreground mb-5" style={{ fontFamily: "var(--font-manrope)" }}>
                How much revenue is sitting in your ratings, unclaimed?
              </h3>

              <div className="flex flex-col md:flex-row md:items-center gap-6">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm text-muted">Number of properties</label>
                    <span className="text-base font-bold" style={{ color: "var(--gold)" }}>{properties}</span>
                  </div>
                  <input type="range" min={1} max={100} value={properties} onChange={e => setProperties(Number(e.target.value))} className="w-full" style={{ accentColor: "var(--gold)" }} />
                  <div className="flex justify-between text-xs text-muted mt-1">
                    <span>1</span><span>100</span>
                  </div>
                </div>
                <div className="hidden md:block w-px h-12 opacity-20 bg-foreground" />
                <div className="text-center md:text-left">
                  <p className="text-xs text-muted mb-1">Annual Revenue Growth Opportunity</p>
                  <p className="text-3xl font-black" style={{ color: "var(--gold)", fontFamily: "var(--font-manrope)" }}>
                    ${Math.round(properties * 100 * 100 * 365 * 0.7257).toLocaleString()}
                  </p>
                  <p className="text-xs text-muted mt-1">Assumes 100 rooms · $100 avg RevPAR · rating increase from 7.9 to 10</p>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t" style={{ borderColor: "rgba(201,168,106,0.15)" }}>
                <button onClick={() => openLead("cornell_gap", { title: "See how RatingIQ closes this gap.", subtitle: "We'll show you live on your chain's actual data.", ctaLabel: "Book a Demo" })} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 hover:opacity-90" style={{ background: "var(--gold)", color: "#1C2A39" }}>
                  See how RatingIQ closes this gap
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" /></svg>
                </button>
              </div>
            </motion.div>

          </div>
        </section>

        {/* ──── REV BRAND MOMENT ──── */}
        <section className="py-6 md:py-10 px-4 md:px-8 overflow-hidden">
          <RevMoment />
        </section>

        {/* ──── HOW IT WORKS ──── */}
        <section id="how-it-works" className="py-14 md:py-16 px-4 md:px-8" style={{ borderTop: "1px solid rgba(0,0,0,0.06)" }}>
          <div className="max-w-5xl mx-auto">
            <motion.div variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true }} className="flex flex-col md:flex-row items-start md:items-center gap-8 md:gap-0">

              {[
                { n: "01", title: "Connect", desc: "Paste your review URLs. Live in 5 minutes." },
                { n: "02", title: "See", desc: "The full picture - surfaced automatically." },
                { n: "03", title: "Grow", desc: "Act on it. Watch ratings - and RevPAR - climb." },
              ].map((step, i) => (
                <div key={i} className="flex-1 flex items-center gap-0">
                  <motion.div variants={fadeUp} transition={{ duration: 0.5, delay: i * 0.15 }} className="flex-1">
                    <div className="text-[56px] md:text-[72px] font-black leading-none select-none mb-2" style={{ color: "rgba(201,168,106,0.18)", fontFamily: "var(--font-manrope)" }}>
                      {step.n}
                    </div>
                    <p className="text-base font-bold text-foreground mb-1" style={{ fontFamily: "var(--font-manrope)" }}>{step.title}</p>
                    <p className="text-sm text-muted">{step.desc}</p>
                  </motion.div>

                  {i < 2 && (
                    <motion.div variants={fadeUp} transition={{ duration: 0.4, delay: i * 0.15 + 0.2 }} className="hidden md:flex items-center px-6 self-center" style={{ color: "rgba(201,168,106,0.35)" }}>
                      <svg width="28" height="12" viewBox="0 0 28 12" fill="none">
                        <path d="M0 6 H22 M18 1 L26 6 L18 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </motion.div>
                  )}
                </div>
              ))}

            </motion.div>
          </div>
        </section>

        {/* ──── FEATURES ──── */}
        <section id="features" className="py-6 md:py-10 px-4 md:px-8">
          <div className="max-w-5xl mx-auto">
            <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} transition={{ duration: 0.5 }} className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4" style={{ fontFamily: "var(--font-manrope)" }}>
                What RatingIQ gives you.
              </h2>
            </motion.div>

            <motion.div variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true }} className="grid md:grid-cols-3 gap-5">
              {FEATURES.filter((_, i) => [0, 4, 2].includes(i)).map((f, i) => (
                <motion.a
                  key={i}
                  href={f.href}
                  variants={fadeUp}
                  transition={{ duration: 0.5 }}
                  className="group rounded-2xl p-6 transition-all duration-300 hover:scale-[1.02] cursor-pointer block"
                  style={{ ...glass, transition: "box-shadow 0.3s ease, transform 0.3s ease, border-color 0.3s ease" }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLAnchorElement).style.boxShadow = `0 0 30px ${f.glow}, 0 0 60px ${f.glow.replace("0.5", "0.15")}`;
                    (e.currentTarget as HTMLAnchorElement).style.borderColor = f.glowBorder;
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLAnchorElement).style.boxShadow = "var(--card-shadow)";
                    (e.currentTarget as HTMLAnchorElement).style.borderColor = "var(--glass-border)";
                  }}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: f.iconBg, color: f.iconColor }}>
                      {f.icon}
                    </div>
                    <svg className="w-3.5 h-3.5 mt-1 transition-all duration-300 group-hover:opacity-100 opacity-20" style={{ color: f.iconColor }} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 19.5l15-15m0 0H8.25m11.25 0v11.25" />
                    </svg>
                  </div>
                  <h3 className="font-semibold text-foreground mb-2 text-base leading-snug" style={{ fontFamily: "var(--font-manrope)" }}>{f.title}</h3>
                  <p className="text-muted text-sm leading-relaxed">{f.desc}</p>
                  {/* Hover animation panel */}
                  <div className="overflow-hidden transition-all duration-500 ease-in-out max-h-0 group-hover:max-h-40 opacity-0 group-hover:opacity-100" style={{ transitionProperty: "max-height, opacity" }}>
                    <div className="mt-4 pt-4 border-t" style={{ borderColor: "rgba(0,0,0,0.07)" }}>
                      {FEATURE_ANIMS[i]}
                    </div>
                  </div>
                </motion.a>
              ))}
            </motion.div>

            <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} transition={{ duration: 0.5, delay: 0.3 }} className="text-center mt-10">
              <p className="text-sm text-muted">
                There&apos;s a lot more under the hood.{" "}
                <a href="/capabilities" className="font-semibold underline-offset-2 hover:underline" style={{ color: "var(--gold)" }}>
                  See all capabilities →
                </a>
              </p>
            </motion.div>
          </div>
        </section>

        {/* ──── MEET ELAINE ──── HIDDEN (restore later) ──── */}
        {false && <section id="elaine" className="py-10 md:py-16 px-4 md:px-8 relative overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, rgba(201,168,106,0.04) 0%, transparent 70%)" }} />

          <div className="max-w-6xl mx-auto relative z-10">
            <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} transition={{ duration: 0.5 }} className="text-center mb-12">
              <span className="inline-block text-xs font-semibold uppercase tracking-wider px-3 py-1 rounded-full mb-4 text-gold" style={{ background: "rgba(201,168,106,0.1)" }}>
                AI Assistant
              </span>
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4" style={{ fontFamily: "var(--font-manrope)" }}>
                Meet{" "}
                <span className="bg-gradient-to-r from-gold via-gold-light to-gold-dark bg-clip-text text-transparent">Elaine.</span>
                {" "}She knows your hotel chain.
              </h2>
              <p className="text-base text-muted max-w-xl mx-auto">
                Every review, every property, every trend - ask her anything. Get answers in seconds, not reports.
              </p>
            </motion.div>

            <div className="grid lg:grid-cols-2 gap-10 items-center">
              {/* Left: Chat mockup */}
              <motion.div
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
                className="rounded-2xl overflow-hidden"
                style={{
                  background: "linear-gradient(135deg, var(--glass-bg) 0%, var(--glass-bg-end) 100%)",
                  border: "1px solid var(--glass-border)",
                  backdropFilter: "blur(12px)",
                  boxShadow: "0 0 40px rgba(201,168,106,0.08), var(--card-shadow)",
                }}
              >
                {/* Chat header */}
                <div className="px-5 py-3 flex items-center gap-3 border-b" style={{ borderColor: "var(--glass-border)", background: "rgba(201,168,106,0.03)" }}>
                  <div className="w-9 h-9 rounded-full overflow-hidden shrink-0" style={{ background: "linear-gradient(160deg, #C9A86A 0%, #8B6A3A 100%)", border: "2px solid rgba(201,168,106,0.4)" }}>
                    <svg viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M18 1 C11 1 6 6 6 13 L6 21 C6 25 10 28 18 28 C26 28 30 25 30 21 L30 13 C30 6 25 1 18 1Z" fill="#2C1A0E" />
                      <ellipse cx="18" cy="15" rx="6.5" ry="7.5" fill="#FDEBD0" />
                      <path d="M4 36 C4 27 10 28 18 28 C26 28 32 27 32 36" fill="#FDEBD0" />
                      <path d="M6 13 C6 7 10 2 18 1 C14 2 11 4 10 8 C8 6 6 9 6 13Z" fill="#1C0F06" />
                      <path d="M30 13 C30 9 28 6 26 8 C25 4 22 2 18 1 C26 2 30 7 30 13Z" fill="#1C0F06" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-foreground text-sm font-semibold">Elaine</div>
                    <div className="text-[10px] flex items-center gap-1" style={{ color: "var(--success)" }}>
                      <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: "var(--success)" }} />
                      Online
                    </div>
                  </div>
                </div>

                {/* Chat messages */}
                <div className="p-5 space-y-4">

                  {/* User message 1 */}
                  <div className="flex justify-end">
                    <div className="rounded-2xl rounded-tr-sm px-4 py-2.5 max-w-[78%] text-sm text-foreground" style={{ background: "rgba(201,168,106,0.15)", border: "1px solid rgba(201,168,106,0.2)" }}>
                      Which properties had the biggest rating drop this quarter?
                    </div>
                  </div>

                  {/* Elaine response 1 */}
                  <div className="flex justify-start gap-2.5 items-end">
                    <div className="w-6 h-6 rounded-full overflow-hidden shrink-0 mb-0.5" style={{ background: "linear-gradient(160deg, #C9A86A 0%, #8B6A3A 100%)", border: "1.5px solid rgba(201,168,106,0.4)" }}>
                      <svg viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M18 1 C11 1 6 6 6 13 L6 21 C6 25 10 28 18 28 C26 28 30 25 30 21 L30 13 C30 6 25 1 18 1Z" fill="#2C1A0E" />
                        <ellipse cx="18" cy="15" rx="6.5" ry="7.5" fill="#FDEBD0" />
                        <path d="M4 36 C4 27 10 28 18 28 C26 28 32 27 32 36" fill="#FDEBD0" />
                        <path d="M6 13 C6 7 10 2 18 1 C14 2 11 4 10 8 C8 6 6 9 6 13Z" fill="#1C0F06" />
                        <path d="M30 13 C30 9 28 6 26 8 C25 4 22 2 18 1 C26 2 30 7 30 13Z" fill="#1C0F06" />
                      </svg>
                    </div>
                    <div className="rounded-2xl rounded-tl-sm px-4 py-3 max-w-[82%] text-sm leading-relaxed" style={{ ...glass, color: "var(--foreground)" }}>
                      <p className="text-muted text-xs mb-2">Analyzed <span className="text-gold font-medium">3,240 reviews</span> across 18 properties</p>
                      <div className="space-y-2">
                        {[
                          { name: "Miami Beach", drop: "-0.4", color: "var(--danger)" },
                          { name: "Chicago Downtown", drop: "-0.3", color: "var(--gold)" },
                          { name: "Austin Central", drop: "-0.2", color: "var(--cyan)" },
                        ].map((p, i) => (
                          <div key={i} className="flex items-center justify-between gap-3">
                            <span className="text-foreground font-medium text-xs">{p.name}</span>
                            <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ color: p.color, background: `${p.color}18` }}>{p.drop} pts</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* User message 2 */}
                  <div className="flex justify-end">
                    <div className="rounded-2xl rounded-tr-sm px-4 py-2.5 max-w-[78%] text-sm text-foreground" style={{ background: "rgba(201,168,106,0.15)", border: "1px solid rgba(201,168,106,0.2)" }}>
                      What&apos;s driving the drop in Miami?
                    </div>
                  </div>

                  {/* Elaine response 2 */}
                  <div className="flex justify-start gap-2.5 items-end">
                    <div className="w-6 h-6 rounded-full overflow-hidden shrink-0 mb-0.5" style={{ background: "linear-gradient(160deg, #C9A86A 0%, #8B6A3A 100%)", border: "1.5px solid rgba(201,168,106,0.4)" }}>
                      <svg viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M18 1 C11 1 6 6 6 13 L6 21 C6 25 10 28 18 28 C26 28 30 25 30 21 L30 13 C30 6 25 1 18 1Z" fill="#2C1A0E" />
                        <ellipse cx="18" cy="15" rx="6.5" ry="7.5" fill="#FDEBD0" />
                        <path d="M4 36 C4 27 10 28 18 28 C26 28 32 27 32 36" fill="#FDEBD0" />
                        <path d="M6 13 C6 7 10 2 18 1 C14 2 11 4 10 8 C8 6 6 9 6 13Z" fill="#1C0F06" />
                        <path d="M30 13 C30 9 28 6 26 8 C25 4 22 2 18 1 C26 2 30 7 30 13Z" fill="#1C0F06" />
                      </svg>
                    </div>
                    <div className="rounded-2xl rounded-tl-sm px-4 py-3 max-w-[82%] text-sm" style={{ ...glass }}>
                      <p className="text-muted text-xs mb-3">Top issues in Miami Beach - last 90 days</p>
                      <div className="rounded-xl p-3 mb-2" style={{ background: "var(--navy-2)" }}>
                        <div className="flex items-end gap-1.5 justify-between px-1" style={{ height: "56px" }}>
                          {[72, 58, 44, 31, 20].map((h, i) => (
                            <div key={i} className="flex-1 rounded-sm" style={{ height: `${h}%`, background: i === 0 ? "linear-gradient(to top, var(--danger), rgba(184,80,80,0.6))" : "linear-gradient(to top, var(--gold), var(--gold-light))" }} />
                          ))}
                        </div>
                        <div className="flex justify-between mt-1.5 px-1">
                          {["Check-in", "Rooms", "Noise", "WiFi", "Food"].map((m) => (
                            <span key={m} className="text-[8px] text-muted flex-1 text-center">{m}</span>
                          ))}
                        </div>
                      </div>
                      <p className="text-xs" style={{ color: "var(--danger)" }}>Check-in delays up 38% vs last quarter.</p>
                    </div>
                  </div>
                </div>

                {/* Chat input */}
                <div className="px-5 py-3 border-t flex items-center gap-3" style={{ borderColor: "var(--glass-border)" }}>
                  <div className="flex-1 rounded-xl px-4 py-2.5 text-sm text-muted" style={{ background: "var(--input-bg)", border: "1px solid var(--glass-border)" }}>
                    Ask Elaine about your chain...
                  </div>
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: "linear-gradient(135deg, var(--gold), var(--gold-dark))" }}>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" style={{ color: "#1C2A39" }}><path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" /></svg>
                  </div>
                </div>
              </motion.div>

              {/* Right: Capabilities */}
              <motion.div variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true }}>
                <div className="space-y-4">
                  {[
                    {
                      icon: (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                        </svg>
                      ),
                      title: "Ask in plain language",
                      desc: "Type what you want to know. Get the answer.",
                    },
                    {
                      icon: (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5M9 11.25v-5.5m3 5.5v-3.5m3 3.5v-1.5" />
                        </svg>
                      ),
                      title: "Cross-property comparisons",
                      desc: "Which properties are pulling the chain up - and which are dragging it down.",
                    },
                    {
                      icon: (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6a7.5 7.5 0 107.5 7.5h-7.5V6z" /><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5H21A7.5 7.5 0 0013.5 3v7.5z" />
                        </svg>
                      ),
                      title: "Charts on demand",
                      desc: "Ask for a trend. Get a chart.",
                    },
                    {
                      icon: (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
                        </svg>
                      ),
                      title: "Surfaces what you didn't ask",
                      desc: "Flags what's changing before it shows up in the rating.",
                    },
                  ].map((cap, i) => (
                    <motion.div
                      key={i}
                      variants={fadeUp}
                      transition={{ duration: 0.5 }}
                      className="flex items-start gap-4 rounded-2xl p-4 transition-all duration-300 hover:scale-[1.01]"
                      style={glass}
                    >
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-gold" style={{ background: "rgba(201,168,106,0.1)" }}>
                        {cap.icon}
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground mb-0.5 text-sm" style={{ fontFamily: "var(--font-manrope)" }}>{cap.title}</h3>
                        <p className="text-muted text-sm leading-relaxed">{cap.desc}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>

                <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} transition={{ duration: 0.5, delay: 0.4 }} className="mt-6">
                  <button
                    onClick={() => openLead("elaine_feature", { variant: "elaine", ctaLabel: "See Elaine in Action" })}
                    className="px-7 py-3.5 rounded-xl font-semibold text-sm transition-all duration-300 hover:scale-[1.02] hover:shadow-lg hover:shadow-gold/30 flex items-center gap-2"
                    style={{ background: "linear-gradient(to right, var(--gold), var(--gold-dark))", color: "#1C2A39" }}
                  >
                    See Elaine in Action
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" /></svg>
                  </button>
                  <p className="text-muted text-xs mt-2">We&apos;ll show you your chain&apos;s data. Live.</p>
                </motion.div>
              </motion.div>
            </div>
          </div>

          <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} transition={{ duration: 0.5, delay: 0.2 }} className="text-center mt-12">
            <a href="/capabilities/statistics" className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl font-semibold text-sm transition-all duration-300 hover:opacity-90" style={{ background: "linear-gradient(to right, var(--gold), var(--gold-dark))", color: "#1C2A39" }}>
              Explore the Full Platform
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" /></svg>
            </a>
          </motion.div>
        </section>}

        {/* ──── ROI / IMPACT NUMBERS ──── HIDDEN (restore later) ──── */}

        {/* ──── TESTIMONIALS ──── */}
        <section className="py-8 md:py-12 px-4 md:px-8">
          <div className="max-w-5xl mx-auto">
            <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} transition={{ duration: 0.5 }} className="text-center mb-10">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground" style={{ fontFamily: "var(--font-manrope)" }}>
                The view from{" "}
                <span className="bg-gradient-to-r from-gold via-gold-light to-gold-dark bg-clip-text text-transparent">the top floor.</span>
              </h2>
            </motion.div>

            {/* 3-up carousel - shows 3 at a time, arrows slide by 1 */}
            <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} transition={{ duration: 0.5 }}>
              {/* Desktop: sliding window of 3 */}
              <div className="hidden md:block overflow-hidden" style={{ position: "relative", height: "340px" }}>
                <AnimatePresence initial={false} custom={testimonialDir.current}>
                  <motion.div
                    key={testimonialSlide}
                    custom={testimonialDir.current}
                    variants={{
                      enter: (dir: number) => ({ x: dir > 0 ? "100%" : "-100%" }),
                      center: { x: 0 },
                      exit: (dir: number) => ({ x: dir > 0 ? "-100%" : "100%" }),
                    }}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{ duration: 0.4, ease: "easeInOut" }}
                    className="grid grid-cols-3 gap-5"
                    style={{ position: "absolute", top: 0, left: 0, right: 0 }}
                  >
                    {[0, 1, 2].map(offset => {
                      const t = TESTIMONIALS[(testimonialSlide + offset) % TESTIMONIALS.length];
                      return (
                        <div key={offset} className="rounded-2xl p-5 flex flex-col" style={{ ...glass, height: "340px", overflow: "hidden" }}>
                          <svg className="w-5 h-5 mb-2 opacity-20" fill="currentColor" viewBox="0 0 24 24" style={{ color: "var(--gold)" }}>
                            <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10H14.017zm-14.017 0v-7.391c0-5.704 3.731-9.57 8.983-10.609l.998 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10H0z" />
                          </svg>
                          <p className="text-foreground italic text-sm leading-relaxed mb-3 flex-1">&ldquo;{t.quote}&rdquo;</p>
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0" style={{ background: "#1C2A39", color: "#ECE8E2" }}>
                              {t.name[0]}
                            </div>
                            <div>
                              <div className="text-foreground text-xs font-semibold">{t.name}</div>
                              <div className="text-muted text-xs">{t.title}</div>
                              <div className="text-muted text-xs">{t.hotel}</div>
                              <GoldStars />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Mobile: 1 card at a time */}
              <div className="md:hidden" style={{ position: "relative", height: "340px", overflow: "hidden" }}>
                <AnimatePresence initial={false} custom={testimonialDir.current}>
                  <motion.div
                    key={testimonialSlide}
                    custom={testimonialDir.current}
                    variants={{
                      enter: (dir: number) => ({ x: dir > 0 ? "100%" : "-100%" }),
                      center: { x: 0 },
                      exit: (dir: number) => ({ x: dir > 0 ? "-100%" : "100%" }),
                    }}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{ duration: 0.4, ease: "easeInOut" }}
                    className="rounded-2xl p-7"
                    style={{ ...glass, position: "absolute", inset: 0 }}
                  >
                    <svg className="w-7 h-7 absolute top-5 right-5 opacity-10" fill="currentColor" viewBox="0 0 24 24" style={{ color: "var(--gold)" }}>
                      <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10H14.017zm-14.017 0v-7.391c0-5.704 3.731-9.57 8.983-10.609l.998 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10H0z" />
                    </svg>
                    <div>
                      <p className="text-foreground italic text-base leading-relaxed mb-5">&ldquo;{TESTIMONIALS[testimonialSlide].quote}&rdquo;</p>
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0" style={{ background: "#1C2A39", color: "#ECE8E2" }}>
                          {TESTIMONIALS[testimonialSlide].name[0]}
                        </div>
                        <div>
                          <div className="text-foreground text-sm font-semibold">{TESTIMONIALS[testimonialSlide].name}</div>
                          <div className="text-muted text-xs">{TESTIMONIALS[testimonialSlide].title}</div>
                          <div className="text-muted text-xs">{TESTIMONIALS[testimonialSlide].hotel}</div>
                          <GoldStars />
                        </div>
                      </div>
                    </div>
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Controls */}
              <div className="flex items-center justify-center gap-4 mt-6">
                <button
                  onClick={() => { testimonialDir.current = -1; setTestimonialSlide(s => (s - 1 + TESTIMONIALS.length) % TESTIMONIALS.length); }}
                  className="w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110"
                  style={{ border: "1px solid rgba(0,0,0,0.1)", color: "var(--muted)" }}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
                </button>
                <div className="flex gap-2">
                  {TESTIMONIALS.map((_, i) => (
                    <button key={i} onClick={() => { testimonialDir.current = i > testimonialSlide ? 1 : -1; setTestimonialSlide(i); }} className="w-1.5 h-1.5 rounded-full transition-all duration-200" style={{ background: i === testimonialSlide ? "var(--gold)" : "rgba(0,0,0,0.15)", transform: i === testimonialSlide ? "scale(1.3)" : "scale(1)" }} />
                  ))}
                </div>
                <button
                  onClick={() => { testimonialDir.current = 1; setTestimonialSlide(s => (s + 1) % TESTIMONIALS.length); }}
                  className="w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110"
                  style={{ border: "1px solid rgba(0,0,0,0.1)", color: "var(--muted)" }}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                </button>
              </div>
            </motion.div>

            {/* Omri's quote */}
            <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} transition={{ duration: 0.5, delay: 0.3 }} className="mt-8 flex items-center gap-5 px-2">
              <div className="w-12 h-12 rounded-full overflow-hidden shrink-0">
                <img src="/omri-6.svg" alt="Omri Azulay" className="w-full h-full object-cover" style={{ objectPosition: "50% 50%" }} />
              </div>
              <p className="text-sm text-muted italic leading-relaxed">
                &ldquo;You&apos;re already managing enough. We built RatingIQ to take reviews off your plate - and hand you what actually matters.&rdquo;
                <br />
                <span className="not-italic font-semibold text-foreground mt-1 inline-block">- Omri Azulay, Founder &amp; CEO</span>
              </p>
            </motion.div>

          </div>
        </section>

        {/* ──── FINAL CTA ──── */}
        <section className="py-10 md:py-14 px-4 md:px-8">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="max-w-lg mx-auto text-center"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-3" style={{ fontFamily: "var(--font-manrope)" }}>
              See what your reviews are{" "}
              <span className="bg-gradient-to-r from-gold via-gold-light to-gold-dark bg-clip-text text-transparent">actually telling you.</span>
            </h2>
            <p className="text-base text-muted mb-7">Under 5 minutes. No IT. No setup calls.</p>
            <button
              onClick={() => openLead("final_book_demo", { title: "See what your reviews are actually telling you.", subtitle: "Under 5 minutes. No IT. No setup calls.", ctaLabel: "Book a Demo" })}
              className="inline-flex items-center gap-2 px-7 py-3 rounded-xl font-semibold text-sm transition-all duration-300 hover:opacity-90 hover:shadow-lg"
              style={{ background: "#1C2A39", color: "#ECE8E2" }}
            >
              Book a Demo
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" /></svg>
            </button>
          </motion.div>
        </section>

        {/* ──── FAQ ──── */}
        <section id="faq" className="py-6 md:py-10 px-4 md:px-8">
          <div className="max-w-5xl mx-auto">
            <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} transition={{ duration: 0.5 }} className="text-center mb-8">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
                Common{" "}
                <span className="bg-gradient-to-r from-gold via-gold-light to-gold-dark bg-clip-text text-transparent">Questions</span>
              </h2>
              <p className="text-muted text-sm">The ones chain CEOs ask us most.</p>
            </motion.div>

            <div className="grid md:grid-cols-2 gap-5 items-start">
              {/* Left - FAQ accordion */}
              <motion.div variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true }} className="space-y-1.5">
                {FAQS.map((faq, i) => (
                  <motion.div
                    key={i}
                    variants={fadeUp}
                    transition={{ duration: 0.4 }}
                    className="rounded-xl overflow-hidden transition-all duration-300"
                    style={glass}
                  >
                    <button
                      onClick={() => setOpenFaq(openFaq === i ? null : i)}
                      className="w-full flex items-center justify-between px-4 py-3 text-left"
                    >
                      <span className="font-semibold text-foreground text-base pr-4">{faq.q}</span>
                      <svg
                        className={`w-3.5 h-3.5 text-muted shrink-0 transition-transform duration-300 ${openFaq === i ? "rotate-180" : ""}`}
                        fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                      </svg>
                    </button>
                    <div
                      className="overflow-hidden transition-all duration-300"
                      style={{ maxHeight: openFaq === i ? "200px" : "0px", opacity: openFaq === i ? 1 : 0 }}
                    >
                      <p className="px-4 pb-4 text-muted text-base leading-relaxed">{faq.a}</p>
                    </div>
                  </motion.div>
                ))}
              </motion.div>

              {/* Right - Ask anything */}
              <motion.div
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="rounded-2xl p-5"
                style={glass}
              >
                {faqSent ? (
                  <div className="flex flex-col items-center justify-center h-full py-6 text-center gap-2">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "linear-gradient(to right, var(--gold), var(--gold-dark))" }}>
                      <svg className="w-4 h-4 text-navy-1" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                    </div>
                    <p className="font-semibold text-foreground text-sm">Got it. We'll get back to you shortly.</p>
                    <p className="text-muted text-xs">Usually within a few hours.</p>
                  </div>
                ) : (
                  <>
                    <h3 className="font-bold text-foreground text-base mb-1">Don't see your question?</h3>
                    <p className="text-muted text-sm mb-4">Ask us directly. We read every message.</p>
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <input
                          type="text"
                          placeholder="Your name"
                          value={faqForm.name}
                          onChange={e => setFaqForm(f => ({ ...f, name: e.target.value }))}
                          className="w-full rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted outline-none focus:ring-1 focus:ring-gold/40 transition"
                          style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)" }}
                        />
                        <input
                          type="text"
                          placeholder="Hotel / chain name"
                          value={faqForm.hotel}
                          onChange={e => setFaqForm(f => ({ ...f, hotel: e.target.value }))}
                          className="w-full rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted outline-none focus:ring-1 focus:ring-gold/40 transition"
                          style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)" }}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <input
                          type="email"
                          placeholder="Work email"
                          value={faqForm.email}
                          onChange={e => setFaqForm(f => ({ ...f, email: e.target.value }))}
                          className="w-full rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted outline-none focus:ring-1 focus:ring-gold/40 transition"
                          style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)" }}
                        />
                        <input
                          type="tel"
                          placeholder="Phone number"
                          value={faqForm.phone}
                          onChange={e => setFaqForm(f => ({ ...f, phone: e.target.value }))}
                          className="w-full rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted outline-none focus:ring-1 focus:ring-gold/40 transition"
                          style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)" }}
                        />
                      </div>
                      <textarea
                        rows={3}
                        placeholder="What would you like to know?"
                        value={faqForm.question}
                        onChange={e => setFaqForm(f => ({ ...f, question: e.target.value }))}
                        className="w-full rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted outline-none focus:ring-1 focus:ring-gold/40 transition resize-none"
                        style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)" }}
                      />
                      <button
                        onClick={() => { if (faqForm.name && faqForm.email && faqForm.question) { pushLeadToCRM({ name: faqForm.name, hotel: faqForm.hotel, email: faqForm.email, phone: faqForm.phone, ctaSource: "faq_question", question: faqForm.question }); setFaqSent(true); } }}
                        className="w-full font-semibold rounded-lg px-4 py-2.5 text-sm transition-all duration-300 hover:opacity-90"
                        style={{ background: "#1C2A39", color: "#ECE8E2" }}
                      >
                        Send
                      </button>
                    </div>
                  </>
                )}
              </motion.div>
            </div>
          </div>
        </section>
      </main>

      {/* ──── FOOTER ──── */}
      <footer className="border-t py-12 px-4 md:px-8" style={{ borderColor: "var(--subtle-border)" }}>
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
            {/* Brand */}
            <div className="col-span-2 md:col-span-1">
              <div className="mb-3">
                <img src="/logo.svg" alt="RatingIQ" style={{ height: "28px", width: "auto", objectFit: "contain" }} />
              </div>
              <p className="text-muted text-xs leading-relaxed">From Review to Revenue.</p>
            </div>

            {/* Product */}
            <div>
              <h4 className="text-foreground text-xs font-semibold uppercase tracking-wider mb-3">Product</h4>
              <div className="flex flex-col gap-2">
                <a href="#features" className="text-muted text-sm hover:text-foreground transition-colors">Features</a>
                <a href="#how-it-works" className="text-muted text-sm hover:text-foreground transition-colors">How It Works</a>
                <Link href="/pricing" className="text-muted text-sm hover:text-foreground transition-colors">Pricing</Link>
                <a href="#faq" className="text-muted text-sm hover:text-foreground transition-colors">FAQ</a>
              </div>
            </div>

            {/* Company */}
            <div>
              <h4 className="text-foreground text-xs font-semibold uppercase tracking-wider mb-3">Company</h4>
              <div className="flex flex-col gap-2">
                <a href="mailto:hello@upstar.ai" className="text-muted text-sm hover:text-foreground transition-colors">Contact</a>
              </div>
            </div>

            {/* Legal */}
            <div>
              <h4 className="text-foreground text-xs font-semibold uppercase tracking-wider mb-3">Legal</h4>
              <div className="flex flex-col gap-2">
                <Link href="/privacy" className="text-muted text-sm hover:text-foreground transition-colors">Privacy Policy</Link>
                <Link href="/terms" className="text-muted text-sm hover:text-foreground transition-colors">Terms of Service</Link>
              </div>
            </div>
          </div>

          <div className="border-t pt-6 flex items-center justify-center" style={{ borderColor: "var(--subtle-border)" }}>
            <p className="text-muted text-xs">&copy; 2026 RatingIQ. All rights reserved.</p>
          </div>
        </div>
      </footer>

      <SignupModal
        open={leadModal.open}
        onClose={closeLead}
        ctaSource={leadModal.source}
        variant={leadModal.variant}
        title={leadModal.title}
        subtitle={leadModal.subtitle}
        ctaLabel={leadModal.ctaLabel}
      />
    </div>
  );
}
