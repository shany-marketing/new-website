"use client";

import { useMemo } from "react";
import GlassCard from "@/components/ui/glass-card";
import type { ReviewDepthStats } from "@/lib/stats";

interface ReviewDepthProps {
  data: ReviewDepthStats;
  totalReviews: number;
}

const BUCKETS = [
  { key: "shortCount" as const,    label: "Brief",      desc: "Under 20 words",  color: "#516B84" },
  { key: "mediumCount" as const,   label: "Standard",   desc: "20–49 words",     color: "#4A8F6B" },
  { key: "longCount" as const,     label: "Thorough",   desc: "50–99 words",     color: "#C9A86A" },
  { key: "detailedCount" as const, label: "Detailed",   desc: "100+ words",      color: "#fcdb37" },
];

export default function ReviewDepth({ data, totalReviews }: ReviewDepthProps) {
  const stats = useMemo(() => {
    const actionable = data.longCount + data.detailedCount;
    const actionablePct = data.totalWithText > 0
      ? Math.round((actionable / data.totalWithText) * 100)
      : 0;
    const textCoveragePct = totalReviews > 0
      ? Math.round((data.totalWithText / totalReviews) * 100)
      : 0;

    return { actionable, actionablePct, textCoveragePct };
  }, [data, totalReviews]);

  return (
    <GlassCard>
      <div className="flex items-center gap-2 mb-4">
        <svg className="w-5 h-5 text-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h7" />
        </svg>
        <h3 className="text-foreground font-semibold text-base">Review Depth</h3>
      </div>

      {/* Hero stat */}
      <div className="text-center mb-5">
        <p className="text-4xl font-extrabold text-gold">{stats.actionablePct}%</p>
        <p className="text-[var(--text-secondary)] text-sm mt-1">
          of text reviews contain actionable detail
        </p>
        <p className="text-muted text-xs mt-0.5">
          {stats.actionable.toLocaleString()} of {data.totalWithText.toLocaleString()} reviews with 50+ words
        </p>
      </div>

      {/* Segmented bar */}
      <div className="h-4 rounded-full overflow-hidden flex mb-3" style={{ background: "rgba(255,255,255,0.05)" }}>
        {BUCKETS.map((bucket) => {
          const count = data[bucket.key];
          const widthPct = data.totalWithText > 0 ? (count / data.totalWithText) * 100 : 0;
          if (widthPct === 0) return null;
          return (
            <div
              key={bucket.key}
              className="h-full transition-all duration-700"
              style={{ width: `${widthPct}%`, background: bucket.color }}
              title={`${bucket.label}: ${count.toLocaleString()} (${Math.round(widthPct)}%)`}
            />
          );
        })}
      </div>

      {/* Legend */}
      <div className="grid grid-cols-2 gap-2">
        {BUCKETS.map((bucket) => {
          const count = data[bucket.key];
          const pct = data.totalWithText > 0 ? Math.round((count / data.totalWithText) * 100) : 0;
          return (
            <div
              key={bucket.key}
              className="flex items-center gap-2 rounded-lg px-3 py-2"
              style={{ background: `${bucket.color}10` }}
            >
              <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: bucket.color }} />
              <div className="flex-1 min-w-0">
                <p className="text-foreground text-xs font-medium">{bucket.label}</p>
                <p className="text-muted text-[10px]">{bucket.desc}</p>
              </div>
              <div className="text-right">
                <p className="text-foreground text-sm font-bold">{pct}%</p>
                <p className="text-muted text-[10px]">{count.toLocaleString()}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Avg word count + insight */}
      <div
        className="rounded-xl p-3 mt-4"
        style={{ background: "rgba(252,219,55,0.06)", border: "1px solid rgba(252,219,55,0.1)" }}
      >
        <p className="text-gold-light text-xs">
          <span className="font-semibold">Insight:</span>{" "}
          Average review length is <span className="text-foreground font-semibold">{data.avgWordCount} words</span>.
          {stats.actionablePct >= 40
            ? " Your guests provide rich, actionable feedback — use it to prioritize improvements."
            : " Most reviews are brief. Consider prompting guests for more detail in your post-stay messaging."}
          {" "}({stats.textCoveragePct}% of all reviews include text)
        </p>
      </div>
    </GlassCard>
  );
}
