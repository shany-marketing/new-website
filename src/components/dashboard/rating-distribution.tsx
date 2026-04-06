"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import GlassCard from "@/components/ui/glass-card";

interface RatingDistributionProps {
  ratingDistribution: { rating: number; count: number }[];
  totalReviews: number;
}

const BUCKET_COLORS = { High: "#4A8F6B", Medium: "#C9A86A", Low: "#B85050" };

function CustomTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: { name: string; value: number; percent: number } }> }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-navy-2 border border-[var(--glass-border)] rounded-xl px-4 py-3 shadow-xl">
      <p className="text-foreground font-semibold text-sm">{d.name}</p>
      <p className="text-gold-light text-xs mt-1">{d.value} reviews ({d.percent}%)</p>
    </div>
  );
}

export default function RatingDistribution({ ratingDistribution, totalReviews }: RatingDistributionProps) {
  const buckets = [
    {
      name: "High (8-10)",
      value: ratingDistribution.filter((r) => r.rating >= 8).reduce((s, r) => s + r.count, 0),
      color: BUCKET_COLORS.High,
    },
    {
      name: "Medium (6-7)",
      value: ratingDistribution.filter((r) => r.rating >= 6 && r.rating < 8).reduce((s, r) => s + r.count, 0),
      color: BUCKET_COLORS.Medium,
    },
    {
      name: "Low (\u22645)",
      value: ratingDistribution.filter((r) => r.rating < 6).reduce((s, r) => s + r.count, 0),
      color: BUCKET_COLORS.Low,
    },
  ].map((b) => ({ ...b, percent: totalReviews > 0 ? Math.round((b.value / totalReviews) * 100) : 0 }));

  return (
    <GlassCard>
      <h3 className="text-foreground font-semibold text-base mb-4">Rating Distribution</h3>
      <div className="flex flex-col items-center gap-6">
        <div className="w-64 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={buckets} cx="50%" cy="50%" innerRadius={65} outerRadius={95} paddingAngle={3} dataKey="value" stroke="none">
                {buckets.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="grid grid-cols-3 gap-4 w-full">
          {buckets.map((item) => (
            <div key={item.name} className="flex flex-col items-center gap-2 p-3 rounded-xl" style={{ background: `${item.color}10` }}>
              <div className="w-4 h-4 rounded-full" style={{ background: item.color }} />
              <span className="text-[var(--text-secondary)] text-xs text-center">{item.name}</span>
              <span className="text-foreground font-bold text-lg">{item.percent}%</span>
              <span className="text-muted text-xs">{item.value.toLocaleString()}</span>
            </div>
          ))}
        </div>
      </div>
    </GlassCard>
  );
}
