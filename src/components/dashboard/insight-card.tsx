"use client";

import { useState } from "react";
import GlassCard from "@/components/ui/glass-card";
import TrendBadge from "@/components/ui/trend-badge";
import type { CategoryInsight } from "@/lib/insights";

interface InsightCardProps {
  insight: CategoryInsight;
}

function formatLabel(label: string) {
  return label.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function InsightCard({ insight }: InsightCardProps) {
  const [expanded, setExpanded] = useState(false);

  const borderColor = insight.sentiment === "positive" ? "#4A8F6B" : "#B85050";

  return (
    <GlassCard>
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <h4 className="text-foreground font-semibold text-base">{formatLabel(insight.category)}</h4>
            <div className="flex items-center gap-2 mt-1">
              <span
                className="px-2 py-0.5 rounded-full text-xs font-medium"
                style={{ background: `${borderColor}59`, color: borderColor }}
              >
                {insight.sentiment.charAt(0).toUpperCase() + insight.sentiment.slice(1)}
              </span>
              <TrendBadge trend={insight.trend} />
              <span className="text-muted text-xs">{insight.itemCount} items ({insight.sharePct}%)</span>
            </div>
          </div>
          {insight.momDelta !== 0 && (
            <span className="text-xs font-semibold" style={{ color: insight.momDelta > 0 ? "#B85050" : "#4A8F6B" }}>
              {insight.momDelta > 0 ? "+" : ""}{insight.momDelta}% MoM
            </span>
          )}
        </div>

        {/* Root Cause */}
        <div className="rounded-xl p-3" style={{ background: "var(--input-bg)" }}>
          <p className="text-muted text-xs uppercase tracking-wider mb-1">Root Cause</p>
          <p className="text-[var(--text-secondary)] text-sm">{insight.rootCause}</p>
        </div>

        {/* Action Items */}
        {insight.actionItems.length > 0 && (
          <div>
            <p className="text-muted text-xs uppercase tracking-wider mb-2">Action Items</p>
            <ul className="space-y-1.5">
              {insight.actionItems.map((action, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-gold text-xs mt-0.5">{"\u25B6"}</span>
                  <span className="text-[var(--text-secondary)] text-sm">{action}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Example Items (collapsible) */}
        {(() => {
          const uniqueExamples = [...new Set(insight.exampleItems)];
          return uniqueExamples.length > 0 && (
            <div>
              <button
                onClick={() => setExpanded(!expanded)}
                className="text-gold-light text-xs hover:text-gold transition-colors"
              >
                {expanded ? "\u25B2 Hide examples" : `\u25BC Show ${uniqueExamples.length} example${uniqueExamples.length > 1 ? "s" : ""}`}
              </button>
              {expanded && (
                <div className="mt-2 space-y-1.5">
                  {uniqueExamples.map((ex, i) => (
                    <p key={i} className="text-[var(--text-tertiary)] text-xs italic pl-3 border-l border-[var(--glass-border)]">
                      &quot;{ex}&quot;
                    </p>
                  ))}
                </div>
              )}
            </div>
          );
        })()}
      </div>
    </GlassCard>
  );
}
