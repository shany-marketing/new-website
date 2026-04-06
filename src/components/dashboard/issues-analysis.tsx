"use client";

import { useState } from "react";
import GlassCard from "@/components/ui/glass-card";
import type { CategoryInsight } from "@/lib/insights";

interface IssuesAnalysisProps {
  insights: CategoryInsight[];
}

function getRatingColor(r: number) {
  if (r >= 6.5) return "#C9A86A";
  if (r >= 6.0) return "#ff8c42";
  if (r >= 5.5) return "#B85050";
  return "#ff4444";
}

function formatLabel(label: string) {
  return label
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function IssuesAnalysis({ insights }: IssuesAnalysisProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const negatives = insights.filter((i) => i.sentiment === "negative" && i.sharePct > 0).sort((a, b) => b.sharePct - a.sharePct);
  const maxPercent = Math.max(...negatives.map((d) => d.sharePct), 1);

  if (negatives.length === 0) return null;

  return (
    <GlassCard>
      <div className="flex items-center gap-2 mb-4">
        <svg className="w-6 h-6 text-danger" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
        </svg>
        <h3 className="text-foreground font-semibold text-lg">Issues & Pain Points</h3>
      </div>
      <p className="text-muted text-sm mb-4">Common Guest Complaints</p>
      <div className="flex flex-wrap gap-3">
        {negatives.map((item) => {
          const width = Math.max(125, (item.sharePct / maxPercent) * 375);
          const color = getRatingColor(item.avgRating ?? 6.0);
          const isSelected = selected === item.category;
          return (
            <div
              key={item.category}
              onClick={() => setSelected(isSelected ? null : item.category)}
              className="rounded-2xl flex flex-col items-center justify-center p-3 transition-all duration-300 hover:scale-105 cursor-pointer border-2"
              style={{
                width: `${width}px`,
                minHeight: "125px",
                background: `linear-gradient(135deg, ${color}dd, ${color}99)`,
                borderColor: isSelected ? "var(--foreground)" : "var(--glass-border)",
              }}
            >
              <p className="text-black text-sm font-bold text-center mb-1 leading-tight px-1">
                {formatLabel(item.category)}
              </p>
              <p className="text-black text-3xl font-extrabold">{item.sharePct.toFixed(1)}%</p>
              <div className="flex items-center gap-2 mt-0.5">
                {item.avgRating != null && (
                  <span className="text-black/80 text-xs font-semibold">Avg: {item.avgRating.toFixed(1)}</span>
                )}
                <span className="text-black/80 text-xs font-semibold">{item.itemCount} items</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Expanded detail panel below cards */}
      {selected && (() => {
        const item = negatives.find((i) => i.category === selected);
        if (!item?.rootCause) return null;
        const color = getRatingColor(item.avgRating ?? 6.0);
        return (
          <div
            className="mt-4 rounded-2xl p-4 border border-glass-border"
            style={{ background: `linear-gradient(135deg, ${color}22, ${color}11)` }}
          >
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-foreground font-bold text-sm">{formatLabel(item.category)}</h4>
              <button onClick={() => setSelected(null)} className="text-muted hover:text-foreground text-xs">✕</button>
            </div>
            <p className="text-muted text-sm leading-relaxed">{item.rootCause}</p>
          </div>
        );
      })()}
    </GlassCard>
  );
}
