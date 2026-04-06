"use client";

import { ScatterChart, Scatter, XAxis, YAxis, ZAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import GlassCard from "@/components/ui/glass-card";
import type { CategoryInsight } from "@/lib/insights";

interface ImpactParetoProps {
  insights: CategoryInsight[];
}

function getRatingColor(r: number) {
  if (r >= 8.0) return "#4A8F6B";
  if (r >= 7.0) return "#C9A86A";
  if (r >= 6.0) return "#ff8c42";
  return "#B85050";
}

function formatLabel(label: string) {
  return label.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: { name: string; avgRating: number; percent: number; impactScore: number; volume: number } }> }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-navy-2 border border-[var(--glass-border)] rounded-xl px-4 py-3 shadow-xl">
      <p className="text-foreground font-semibold text-sm">{d.name}</p>
      <p className="text-cyan text-xs mt-1">Avg Rating: {d.avgRating.toFixed(1)}</p>
      <p className="text-gold-light text-xs">{d.percent.toFixed(1)}% of complaints</p>
      <p className="text-gold text-xs">Volume: {d.volume} items</p>
      <p className="text-danger text-xs">Impact: {d.impactScore.toFixed(1)}</p>
    </div>
  );
}

export default function ImpactPareto({ insights }: ImpactParetoProps) {
  const negatives = insights.filter((i) => i.sentiment === "negative" && i.avgRating != null);
  if (negatives.length === 0) return null;

  const totalNeg = negatives.reduce((s, i) => s + i.itemCount, 0);

  const data = negatives.map((i) => {
    const percent = totalNeg > 0 ? (i.itemCount / totalNeg) * 100 : 0;
    const avgRating = i.avgRating!;
    const impactScore = (10 - avgRating) * percent / 10;
    return {
      name: formatLabel(i.category),
      avgRating,
      percent,
      volume: i.itemCount,
      impactScore: Math.round(impactScore * 100) / 100,
    };
  });

  const top5 = [...data].sort((a, b) => b.impactScore - a.impactScore).slice(0, 5);

  return (
    <GlassCard>
      <div className="flex items-center gap-2 mb-4">
        <svg className="w-6 h-6 text-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
        </svg>
        <h3 className="text-foreground font-semibold text-lg">Issue Prioritization Matrix</h3>
      </div>
      <p className="text-muted text-sm mb-6">
        Bubble size = complaint volume | Position = avg rating vs frequency
      </p>

      <div className="h-[380px] mb-6">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
            <XAxis
              type="number"
              dataKey="percent"
              name="Frequency"
              tick={{ fill: "var(--gold-light)", fontSize: 11 }}
              label={{ value: "% of Complaints", position: "insideBottom", offset: -10, fill: "#7e93b2" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              type="number"
              dataKey="avgRating"
              name="Rating"
              domain={[4, 10]}
              tick={{ fill: "#7e93b2", fontSize: 11 }}
              label={{ value: "Avg Rating", angle: -90, position: "insideLeft", fill: "#7e93b2" }}
              axisLine={false}
              tickLine={false}
            />
            <ZAxis type="number" dataKey="volume" range={[200, 2500]} />
            <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: "3 3", stroke: "#C9A86A30" }} />
            <Scatter data={data}>
              {data.map((entry, i) => (
                <Cell key={i} fill={getRatingColor(entry.avgRating)} />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      {top5.length > 0 && (
        <div className="space-y-2 pt-4 border-t border-[var(--glass-border)]">
          <p className="text-foreground text-sm font-semibold mb-3">
            Top <span className="text-gold font-bold">{top5.length}</span> highest-impact issues:
          </p>
          {top5.map((item, i) => (
            <div key={i} className="flex items-center justify-between p-2.5 rounded-xl" style={{ background: "rgba(238,224,157,0.06)" }}>
              <div className="flex items-center gap-3">
                <span className="text-gold font-bold text-sm">#{i + 1}</span>
                <span className="text-foreground text-sm font-medium">{item.name}</span>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <span className="text-cyan">Rating: {item.avgRating.toFixed(1)}</span>
                <span className="text-gold-light">{item.percent.toFixed(1)}%</span>
                <span className="text-danger font-semibold">Impact: {item.impactScore.toFixed(1)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </GlassCard>
  );
}
