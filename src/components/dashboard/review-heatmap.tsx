"use client";

import { useState, useMemo } from "react";
import GlassCard from "@/components/ui/glass-card";
import type { HeatmapEntry } from "@/lib/stats";

interface ReviewHeatmapProps {
  data: HeatmapEntry[];
}

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function getIntensityColor(count: number, maxCount: number): string {
  if (count === 0 || maxCount === 0) return "rgba(252,219,55,0.04)";
  const ratio = count / maxCount;
  if (ratio < 0.25) return "rgba(252,219,55,0.12)";
  if (ratio < 0.5) return "rgba(252,219,55,0.25)";
  if (ratio < 0.75) return "rgba(252,219,55,0.45)";
  return "rgba(252,219,55,0.7)";
}

export default function ReviewHeatmap({ data }: ReviewHeatmapProps) {
  const [hoveredCell, setHoveredCell] = useState<{ day: number; month: number } | null>(null);

  const { grid, maxCount, totalReviews, peakDay, peakMonth } = useMemo(() => {
    // Build lookup: grid[day][month] = count
    const g: Record<string, number> = {};
    let max = 0;
    let total = 0;

    for (const entry of data) {
      const key = `${entry.dayOfWeek}-${entry.month}`;
      g[key] = (g[key] ?? 0) + entry.count;
      if (g[key] > max) max = g[key];
      total += entry.count;
    }

    // Find peak day and peak month
    const dayTotals = Array(7).fill(0) as number[];
    const monthTotals = Array(12).fill(0) as number[];
    for (const entry of data) {
      dayTotals[entry.dayOfWeek] += entry.count;
      monthTotals[entry.month - 1] += entry.count;
    }
    const peakDayIdx = dayTotals.indexOf(Math.max(...dayTotals));
    const peakMonIdx = monthTotals.indexOf(Math.max(...monthTotals));

    return {
      grid: g,
      maxCount: max,
      totalReviews: total,
      peakDay: DAY_LABELS[peakDayIdx],
      peakMonth: MONTH_LABELS[peakMonIdx],
    };
  }, [data]);

  if (data.length === 0) return null;

  const hoveredKey = hoveredCell ? `${hoveredCell.day}-${hoveredCell.month}` : null;
  const hoveredCount = hoveredKey ? (grid[hoveredKey] ?? 0) : 0;

  return (
    <GlassCard>
      <div className="flex items-center gap-2 mb-4">
        <svg className="w-5 h-5 text-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <h3 className="text-foreground font-semibold text-base">Review Seasonality</h3>
      </div>

      {/* Heatmap grid — compact */}
      <div className="overflow-x-auto">
        <div className="min-w-[400px] max-w-[560px] mx-auto">
          {/* Month headers */}
          <div className="grid grid-cols-[32px_repeat(12,1fr)] gap-0.5 mb-0.5">
            <div />
            {MONTH_LABELS.map((m) => (
              <div key={m} className="text-center text-[9px] text-muted font-medium">{m}</div>
            ))}
          </div>

          {/* Day rows */}
          {DAY_LABELS.map((dayLabel, dayIdx) => (
            <div key={dayLabel} className="grid grid-cols-[32px_repeat(12,1fr)] gap-0.5 mb-0.5">
              <div className="text-[9px] text-muted font-medium flex items-center">{dayLabel}</div>
              {Array.from({ length: 12 }, (_, monthIdx) => {
                const month = monthIdx + 1;
                const key = `${dayIdx}-${month}`;
                const count = grid[key] ?? 0;
                const isHovered = hoveredCell?.day === dayIdx && hoveredCell?.month === month;

                return (
                  <div
                    key={key}
                    className="h-5 rounded-sm cursor-pointer transition-all duration-200"
                    style={{
                      background: getIntensityColor(count, maxCount),
                      outline: isHovered ? "2px solid var(--gold)" : "none",
                      outlineOffset: "-1px",
                    }}
                    onMouseEnter={() => setHoveredCell({ day: dayIdx, month })}
                    onMouseLeave={() => setHoveredCell(null)}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Tooltip / hover info */}
      <div className="h-6 mt-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted">Less</span>
          {[0.04, 0.12, 0.25, 0.45, 0.7].map((opacity, i) => (
            <div
              key={i}
              className="w-3 h-3 rounded-sm"
              style={{ background: `rgba(252,219,55,${opacity})` }}
            />
          ))}
          <span className="text-[10px] text-muted">More</span>
        </div>
        {hoveredCell ? (
          <p className="text-xs text-[var(--text-secondary)]">
            <span className="text-foreground font-semibold">{hoveredCount}</span>{" "}
            reviews on {DAY_LABELS[hoveredCell.day]}s in {MONTH_LABELS[hoveredCell.month - 1]}
          </p>
        ) : (
          <p className="text-xs text-muted">{totalReviews.toLocaleString()} reviews mapped</p>
        )}
      </div>

      {/* Insight */}
      <div
        className="rounded-xl p-3 mt-3"
        style={{ background: "rgba(252,219,55,0.06)", border: "1px solid rgba(252,219,55,0.1)" }}
      >
        <p className="text-gold-light text-xs">
          <span className="font-semibold">Pattern:</span>{" "}
          Reviews peak on <span className="text-foreground font-semibold">{peakDay}s</span> and
          during <span className="text-foreground font-semibold">{peakMonth}</span>.
          Use this to time your response efforts and marketing campaigns.
        </p>
      </div>
    </GlassCard>
  );
}
