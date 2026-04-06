"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import GlassCard from "@/components/ui/glass-card";

interface GuestOriginsProps {
  data: { userLocation: string; count: number; avgRating: number }[];
  totalReviews: number;
  showRatings?: boolean;
}

const PIE_COLORS = ["#C9A86A", "#003b95", "#516B84", "#4A8F6B", "#B85050", "#7e93b2"];

function CustomTooltip({ active, payload, showRatings = true }: { active?: boolean; payload?: Array<{ payload: { name: string; percent: number; avgRating: number | null } }>; showRatings?: boolean }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-navy-2 border border-[var(--glass-border)] rounded-xl px-4 py-3 shadow-xl">
      <p className="text-foreground font-semibold text-sm">{d.name}</p>
      <p className="text-gold-light text-xs mt-1">{d.percent}% of guests</p>
      {showRatings && d.avgRating && <p className="text-cyan text-xs">Avg rating: {d.avgRating}</p>}
    </div>
  );
}

export default function GuestOrigins({ data, totalReviews, showRatings = true }: GuestOriginsProps) {
  // Top 5 + "Other"
  const top = data.slice(0, 5);
  const otherCount = data.slice(5).reduce((s, d) => s + d.count, 0);
  const chartData = [
    ...top.map((d, i) => ({
      name: d.userLocation,
      value: d.count,
      percent: totalReviews > 0 ? Math.round((d.count / totalReviews) * 100) : 0,
      avgRating: d.avgRating,
      color: PIE_COLORS[i % PIE_COLORS.length],
    })).filter((d) => d.percent > 0),
    ...(otherCount > 0
      ? [{
          name: "Other",
          value: otherCount,
          percent: totalReviews > 0 ? Math.round((otherCount / totalReviews) * 100) : 0,
          avgRating: null as number | null,
          color: "#7e93b2",
        }]
      : []),
  ];

  return (
    <GlassCard>
      <h3 className="text-foreground font-semibold text-base mb-4">{showRatings ? "Avg. Rating by Origin" : "Guest Origins"}</h3>
      <div className="flex flex-col items-center gap-6">
        <div className="w-56 h-56">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={chartData} cx="50%" cy="50%" outerRadius={90} dataKey="value" stroke="none" paddingAngle={2}>
                {chartData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip showRatings={showRatings} />} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="grid grid-cols-3 gap-3 w-full">
          {chartData.slice(0, 6).map((item) => (
            <div key={item.name} className="flex flex-col items-center gap-2 p-3 rounded-xl" style={{ background: `${item.color}10` }}>
              <div className="w-4 h-4 rounded-full" style={{ background: item.color }} />
              <span className="text-[var(--text-secondary)] text-xs text-center">{item.name}</span>
              <span className="text-foreground font-bold text-lg">{item.percent}%</span>
              {showRatings && item.avgRating && <span className="text-cyan text-xs">{"\u2605"} {item.avgRating.toFixed(2)}</span>}
            </div>
          ))}
        </div>
      </div>
    </GlassCard>
  );
}
