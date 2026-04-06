"use client";

import Link from "next/link";

interface UpgradeBannerProps {
  feature?: string;
}

export default function UpgradeBanner({ feature }: UpgradeBannerProps) {
  return (
    <div
      className="rounded-2xl p-8 text-center"
      style={{
        background: "linear-gradient(135deg, rgba(201,168,106,0.15) 0%, rgba(168,139,82,0.1) 100%)",
        border: "1px solid rgba(201,168,106,0.2)",
      }}
    >
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
        style={{
          background: "linear-gradient(135deg, rgba(201,168,106,0.2), rgba(168,139,82,0.15))",
          border: "1px solid rgba(201,168,106,0.2)",
        }}
      >
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="1.5">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      </div>
      <h3 className="text-foreground text-xl font-bold mb-2">
        Unlock This Feature
      </h3>
      <p className="text-muted text-sm mb-6 max-w-md mx-auto">
        {feature
          ? `${feature} requires an add-on subscription. Unlock the full power of UpStar analytics.`
          : "This feature requires an add-on subscription. Unlock the full power of UpStar analytics."}
      </p>
      <Link
        href="/pricing"
        className="inline-block px-6 py-3 rounded-xl text-sm font-semibold text-navy-1 transition-opacity hover:opacity-90"
        style={{ background: "linear-gradient(to right, var(--gold), var(--gold-dark))" }}
      >
        View Pricing
      </Link>
    </div>
  );
}
