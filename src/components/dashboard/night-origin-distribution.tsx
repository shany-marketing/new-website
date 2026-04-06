"use client";

import { useState, useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import GlassCard from "@/components/ui/glass-card";
import type { NightOriginEntry } from "@/lib/stats";

interface NightOriginDistributionProps {
  data: NightOriginEntry[];
  showRatings?: boolean;
}

function getRatingColor(r: number) {
  if (r >= 9.0) return "#4A8F6B";
  if (r >= 8.0) return "#516B84";
  if (r >= 7.0) return "#C9A86A";
  if (r >= 6.0) return "#ff8c42";
  return "#B85050";
}

interface OriginTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: { location: string; sharePct: number; avgRating: number; count: number } }>;
  showRatings?: boolean;
}

function OriginTooltip({ active, payload, showRatings = true }: OriginTooltipProps) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-navy-2 border border-[var(--glass-border)] rounded-xl px-4 py-3 shadow-xl">
      <p className="text-foreground font-semibold text-sm">{d.location}</p>
      <p className="text-gold-light text-xs mt-1">{d.sharePct.toFixed(1)}% of stays</p>
      {showRatings && <p className="text-cyan text-xs">Avg Rating: {d.avgRating.toFixed(1)}</p>}
      <p className="text-[var(--text-tertiary)] text-xs">{d.count} reviews</p>
    </div>
  );
}

export default function NightOriginDistribution({ data, showRatings = true }: NightOriginDistributionProps) {
  // Get unique nights sorted
  const nights = useMemo(() => {
    const set = new Set(data.map(d => d.nights));
    return Array.from(set).sort((a, b) => a - b);
  }, [data]);

  const [selectedNight, setSelectedNight] = useState<number>(nights[0] ?? 1);

  // Top 10 origins for selected night
  const chartData = useMemo(() => {
    return data
      .filter(d => d.nights === selectedNight && d.sharePct > 0)
      .sort((a, b) => b.sharePct - a.sharePct)
      .slice(0, 10);
  }, [data, selectedNight]);

  if (data.length === 0 || nights.length === 0) return null;

  const chartHeight = Math.max(300, chartData.length * 40);

  return (
    <GlassCard>
      <div className="flex items-center gap-2 mb-1">
        <svg className="w-5 h-5 text-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        <h3 className="text-foreground font-semibold text-base">Guest Origin by Length of Stay</h3>
      </div>
      <p className="text-muted text-xs mb-4">Where do guests come from based on how many nights they stay?</p>

      {/* Night selector */}
      <div className="flex flex-wrap gap-2 mb-5">
        {nights.map(n => {
          const isActive = selectedNight === n;
          return (
            <button
              key={n}
              onClick={() => setSelectedNight(n)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200"
              style={{
                background: isActive
                  ? "linear-gradient(135deg, var(--gold), var(--gold-dark))"
                  : "var(--input-bg)",
                color: isActive ? "var(--navy-1)" : "var(--gold-light)",
                border: `1px solid ${isActive ? "var(--gold)" : "var(--glass-border)"}`,
              }}
            >
              {n} Night{n !== 1 ? "s" : ""}
            </button>
          );
        })}
      </div>

      {/* Horizontal bar chart */}
      {chartData.length > 0 && (
        <div style={{ height: chartHeight }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 5, right: 30, bottom: 5, left: 110 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="var(--subtle-border)" horizontal={false} />
              <XAxis
                type="number"
                tick={{ fill: "#7e93b2", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                label={{ value: "% of stays", position: "insideBottom", offset: -5, fill: "#7e93b2", fontSize: 11 }}
              />
              <YAxis
                type="category"
                dataKey="location"
                tick={{ fill: "var(--gold-light)", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                width={105}
              />
              <Tooltip content={<OriginTooltip showRatings={showRatings} />} cursor={{ fill: "var(--input-bg)" }} />
              <Bar dataKey="sharePct" radius={[0, 6, 6, 0]} maxBarSize={28}>
                {chartData.map((entry, i) => (
                  <Cell key={i} fill={showRatings ? getRatingColor(entry.avgRating) : "#516B84"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Legend */}
      {showRatings && (
        <div className="flex flex-wrap gap-3 mt-4 pt-3 border-t border-[var(--glass-border)]">
          {[
            { color: "#4A8F6B", label: "9+" },
            { color: "#516B84", label: "8-9" },
            { color: "#C9A86A", label: "7-8" },
            { color: "#ff8c42", label: "6-7" },
            { color: "#B85050", label: "<6" },
          ].map(l => (
            <div key={l.label} className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm" style={{ background: l.color }} />
              <span className="text-[var(--text-tertiary)] text-[10px]">{l.label}</span>
            </div>
          ))}
          <span className="text-[var(--text-tertiary)] text-[10px] ml-auto">Color = Avg Rating</span>
        </div>
      )}
    </GlassCard>
  );
}
