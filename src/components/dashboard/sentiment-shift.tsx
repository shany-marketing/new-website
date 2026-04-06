"use client";

import GlassCard from "@/components/ui/glass-card";
import type { PeriodMetrics } from "@/lib/since-upstar";

interface SentimentShiftProps {
  before: PeriodMetrics;
  after: PeriodMetrics;
}

function formatMonth(m: string) {
  const [y, mo] = m.split("-");
  return `${mo}/${y.slice(2)}`;
}

export default function SentimentShift({ before, after }: SentimentShiftProps) {
  const ratioChange = before.complimentsPerComplaint > 0
    ? Math.round(((after.complimentsPerComplaint - before.complimentsPerComplaint) / before.complimentsPerComplaint) * 100)
    : 0;
  const shareChange = Math.round((after.positiveShare - before.positiveShare) * 10) / 10;

  return (
    <GlassCard>
      <div className="flex items-center gap-2 mb-5">
        <svg className="w-5 h-5 text-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
        <h3 className="text-foreground font-semibold text-lg">Sentiment Shift</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Before card */}
        <div
          className="rounded-xl p-4"
          style={{ background: "rgba(255,107,107,0.08)", border: "1px solid rgba(255,107,107,0.15)" }}
        >
          <p className="text-danger text-xs uppercase tracking-wider font-semibold mb-3">{before.label}</p>
          <p className="text-muted text-[10px] mb-3">
            {formatMonth(before.startMonth)} {"\u2013"} {formatMonth(before.endMonth)}
          </p>
          <div className="space-y-2">
            <div>
              <p className="text-[var(--text-tertiary)] text-xs">Compliments per Complaint</p>
              <p className="text-foreground text-xl font-bold">{before.complimentsPerComplaint.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-[var(--text-tertiary)] text-xs">Positive Share</p>
              <p className="text-foreground text-xl font-bold">{before.positiveShare.toFixed(1)}%</p>
            </div>
          </div>
        </div>

        {/* Arrow */}
        <div className="flex items-center justify-center">
          <div className="flex flex-col items-center gap-2">
            <svg className="w-10 h-10 text-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
            <div className="text-center">
              {ratioChange !== 0 && (
                <p className={`text-sm font-bold ${ratioChange > 0 ? "text-success" : "text-danger"}`}>
                  {ratioChange > 0 ? "+" : ""}{ratioChange}% ratio
                </p>
              )}
              {shareChange !== 0 && (
                <p className={`text-sm font-bold ${shareChange > 0 ? "text-success" : "text-danger"}`}>
                  {shareChange > 0 ? "+" : ""}{shareChange}% share
                </p>
              )}
            </div>
          </div>
        </div>

        {/* After card */}
        <div
          className="rounded-xl p-4"
          style={{ background: "rgba(53,221,159,0.08)", border: "1px solid rgba(53,221,159,0.15)" }}
        >
          <p className="text-success text-xs uppercase tracking-wider font-semibold mb-3">{after.label}</p>
          <p className="text-muted text-[10px] mb-3">
            {formatMonth(after.startMonth)} {"\u2013"} {formatMonth(after.endMonth)}
          </p>
          <div className="space-y-2">
            <div>
              <p className="text-[var(--text-tertiary)] text-xs">Compliments per Complaint</p>
              <p className="text-foreground text-xl font-bold">{after.complimentsPerComplaint.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-[var(--text-tertiary)] text-xs">Positive Share</p>
              <p className="text-foreground text-xl font-bold">{after.positiveShare.toFixed(1)}%</p>
            </div>
          </div>
        </div>
      </div>
    </GlassCard>
  );
}
