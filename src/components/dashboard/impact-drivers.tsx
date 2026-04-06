"use client";

import { ScatterChart, Scatter, XAxis, YAxis, ZAxis, Tooltip, ResponsiveContainer, ReferenceLine, Cell } from "recharts";
import GlassCard from "@/components/ui/glass-card";
import type { CategoryInsight } from "@/lib/insights";

interface ImpactDriversProps {
  insights: CategoryInsight[];
}

function getRatingColor(r: number, sentiment: string) {
  if (sentiment === "positive") {
    if (r >= 8.5) return "#4A8F6B";
    if (r >= 8.0) return "#bfebdb";
    return "#516B84";
  }
  if (r >= 7.0) return "#C9A86A";
  if (r >= 6.5) return "#ff8c42";
  if (r >= 6.0) return "#B85050";
  return "#ff4444";
}

function getImpactLevel(impact: number) {
  if (impact >= 30) return "High";
  if (impact >= 20) return "Medium";
  return "Low";
}

function formatLabel(label: string) {
  return label.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: { name: string; avgRating: number; percent: number; impact: number; sentiment: string } }> }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-navy-2 border border-[var(--glass-border)] rounded-xl px-4 py-3 shadow-xl">
      <p className="text-foreground font-semibold text-sm">{d.name}</p>
      <p className="text-xs mt-1" style={{ color: d.sentiment === "positive" ? "#4A8F6B" : "#B85050" }}>
        {d.sentiment === "positive" ? "Positive" : "Negative"}
      </p>
      <p className="text-gold text-xs mt-1">Impact: {getImpactLevel(d.impact)} ({d.impact.toFixed(1)})</p>
      <p className="text-cyan text-xs">Avg Rating: {d.avgRating.toFixed(2)}</p>
      <p className="text-gold-light text-xs">{d.percent.toFixed(1)}% share</p>
    </div>
  );
}

export default function ImpactDrivers({ insights }: ImpactDriversProps) {
  const withRating = insights.filter((i) => i.avgRating != null);
  if (withRating.length === 0) return null;

  const totalItems = withRating.reduce((s, i) => s + i.itemCount, 0);

  const impactData = withRating.map((i) => {
    const percent = totalItems > 0 ? (i.itemCount / totalItems) * 100 : 0;
    const avgRating = i.avgRating!;
    const impact = i.sentiment === "negative"
      ? (10 - avgRating) * percent / 10
      : avgRating * percent / 10;
    return {
      name: formatLabel(i.category),
      avgRating,
      percent,
      impact: Math.round(impact * 100) / 100,
      sentiment: i.sentiment,
    };
  });

  const topImpact = [...impactData]
    .filter((d) => d.sentiment === "negative")
    .sort((a, b) => b.impact - a.impact)
    .slice(0, 3);

  return (
    <GlassCard>
      <div className="flex items-center gap-2 mb-4">
        <svg className="w-6 h-6 text-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
        <h3 className="text-foreground font-semibold text-lg">Key Impact Drivers</h3>
      </div>
      <p className="text-muted text-sm mb-2">All categories by impact on guest satisfaction</p>
      <div className="flex items-center gap-4 mb-6">
        <span className="flex items-center gap-1.5 text-xs text-muted">
          <span className="inline-block w-3 h-3 rounded-full bg-[#B85050]" /> Negative
        </span>
        <span className="flex items-center gap-1.5 text-xs text-muted">
          <span className="inline-block w-3 h-3 rounded-full bg-[#4A8F6B]" /> Positive
        </span>
      </div>

      <div className="h-[400px] mb-6">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
            <XAxis
              type="number"
              dataKey="impact"
              name="Impact"
              tick={{ fill: "var(--gold-light)", fontSize: 11 }}
              label={{ value: "Impact Score", position: "insideBottom", offset: -10, fill: "#7e93b2" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              type="number"
              dataKey="avgRating"
              name="Avg Rating"
              domain={[4, 10]}
              tick={{ fill: "#7e93b2", fontSize: 11 }}
              label={{ value: "Avg Rating", angle: -90, position: "insideLeft", fill: "#7e93b2" }}
              axisLine={false}
              tickLine={false}
            />
            <ZAxis type="number" dataKey="percent" range={[200, 3000]} />
            <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: "3 3", stroke: "#C9A86A30" }} />
            <ReferenceLine y={6.5} stroke="#ff8c42" strokeDasharray="3 3" strokeOpacity={0.3} />
            <Scatter data={impactData}>
              {impactData.map((entry, i) => (
                <Cell key={i} fill={getRatingColor(entry.avgRating, entry.sentiment)} />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      {topImpact.length > 0 && (
        <div className="space-y-3 pt-4 border-t border-[var(--glass-border)]">
          <p className="text-foreground text-base font-semibold mb-4">
            Top <span className="text-gold text-xl font-bold">{topImpact.length}</span> highest-impact issues:
          </p>
          {topImpact.map((item, i) => (
            <div key={i} className="flex items-center justify-between p-3 rounded-xl" style={{ background: "rgba(238,224,157,0.08)" }}>
              <div className="flex items-center gap-3">
                <span className="text-gold text-xl font-bold">#{i + 1}</span>
                <span className="text-foreground font-semibold">{item.name}</span>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <span className="text-cyan text-xs">Rating: {item.avgRating.toFixed(1)}</span>
                <span className="text-gold-light">{item.percent.toFixed(1)}%</span>
                <span className="text-gold font-bold">Impact: {getImpactLevel(item.impact)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </GlassCard>
  );
}
