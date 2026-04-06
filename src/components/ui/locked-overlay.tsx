"use client";

import Link from "next/link";
import type { ReactNode } from "react";

interface LockedOverlayProps {
  feature: string;
  plan: string;
  children: ReactNode;
}

const CTA_MAP: Record<string, { text: string; price: string }> = {
  ratings: { text: "Unlock rating breakdown", price: "$99/mo" },
  insights: { text: "Unlock AI insights", price: "$999/mo" },
};

function getCTA(feature: string, plan: string): { text: string; price: string } {
  if (CTA_MAP[feature]) return CTA_MAP[feature];
  if (plan === "free") return { text: "Unlock full analytics", price: "$99/mo" };
  return { text: "Unlock premium features", price: "$999/mo" };
}

export default function LockedOverlay({ feature, plan, children }: LockedOverlayProps) {
  const cta = getCTA(feature, plan);

  return (
    <div className="relative">
      <div className="pointer-events-none select-none" style={{ filter: "blur(6px)" }}>
        {children}
      </div>
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-navy-1/60 backdrop-blur-[2px] rounded-2xl">
        <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-3" style={{ background: "rgba(201,168,106,0.15)", border: "1px solid rgba(201,168,106,0.25)" }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="1.5" strokeLinecap="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0110 0v4" />
          </svg>
        </div>
        <p className="text-foreground font-semibold text-sm mb-1">{cta.text}</p>
        <p className="text-muted text-xs mb-4">Starting at {cta.price}</p>
        <Link
          href="/pricing"
          className="inline-block px-5 py-2.5 rounded-xl text-xs font-semibold text-navy-1 transition-opacity hover:opacity-90"
          style={{ background: "linear-gradient(to right, var(--gold), var(--gold-dark))" }}
        >
          View Plans
        </Link>
      </div>
    </div>
  );
}
