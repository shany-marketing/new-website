"use client";

import GlassCard from "@/components/ui/glass-card";
import type { PeriodMetrics } from "@/lib/since-upstar";

interface GuestSatisfactionProps {
  before: PeriodMetrics;
  after: PeriodMetrics;
}

function getRatingColor(r: number) {
  if (r >= 8.0) return "#4A8F6B";
  if (r >= 7.0) return "#C9A86A";
  if (r >= 6.0) return "#ff8c42";
  return "#B85050";
}

export default function GuestSatisfaction({ before, after }: GuestSatisfactionProps) {
  if (before.avgRating == null || after.avgRating == null) return null;

  const ratingDiff = Math.round((after.avgRating - before.avgRating) * 100) / 100;
  const improved = ratingDiff > 0;

  return (
    <GlassCard>
      <div className="flex items-center gap-2 mb-5">
        <svg className="w-5 h-5 text-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <h3 className="text-foreground font-semibold text-lg">Overall Guest Satisfaction</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
        {/* Before */}
        <div className="text-center">
          <p className="text-[var(--text-tertiary)] text-xs uppercase tracking-wider mb-2">Before</p>
          <div
            className="inline-flex items-center justify-center w-24 h-24 rounded-full text-3xl font-bold"
            style={{
              background: `${getRatingColor(before.avgRating)}15`,
              border: `3px solid ${getRatingColor(before.avgRating)}`,
              color: getRatingColor(before.avgRating),
            }}
          >
            {before.avgRating.toFixed(1)}
          </div>
          <p className="text-muted text-xs mt-2">{before.totalReviews} reviews</p>
        </div>

        {/* Arrow & Change */}
        <div className="flex flex-col items-center gap-2">
          <svg className="w-12 h-12 text-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
          <p className={`text-2xl font-bold ${improved ? "text-success" : "text-danger"}`}>
            {improved ? "+" : ""}{ratingDiff.toFixed(2)}
          </p>
          <p className="text-muted text-xs">points</p>
        </div>

        {/* After */}
        <div className="text-center">
          <p className="text-[var(--text-tertiary)] text-xs uppercase tracking-wider mb-2">With UpStar</p>
          <div
            className="inline-flex items-center justify-center w-24 h-24 rounded-full text-3xl font-bold"
            style={{
              background: `${getRatingColor(after.avgRating)}15`,
              border: `3px solid ${getRatingColor(after.avgRating)}`,
              color: getRatingColor(after.avgRating),
            }}
          >
            {after.avgRating.toFixed(1)}
          </div>
          <p className="text-muted text-xs mt-2">{after.totalReviews} reviews</p>
        </div>
      </div>
    </GlassCard>
  );
}
