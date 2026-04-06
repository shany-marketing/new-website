"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import GlassCard from "@/components/ui/glass-card";

interface TravellerTypesProps {
  data: { travelerType: string; count: number; avgRating: number }[];
  totalReviews: number;
  showRatings?: boolean;
}

const COLORS = ["#4A8F6B", "#516B84", "#C9A86A", "#7e93b2", "#a8a38d"];

function CustomTooltip({ active, payload, showRatings = true }: { active?: boolean; payload?: Array<{ payload: { type: string; percent: number; avgRating: number } }>; showRatings?: boolean }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-navy-2 border border-[var(--glass-border)] rounded-xl px-4 py-3 shadow-xl">
      <p className="text-foreground font-semibold text-sm">{d.type}</p>
      <p className="text-gold-light text-xs mt-1">{d.percent}% of guests</p>
      {showRatings && <p className="text-cyan text-xs">Avg rating: {d.avgRating?.toFixed(2) ?? "N/A"}</p>}
    </div>
  );
}

export default function TravellerTypes({ data, totalReviews, showRatings = true }: TravellerTypesProps) {
  const chartData = data
    .filter((d) => d.count > 0 && (totalReviews > 0 ? Math.round((d.count / totalReviews) * 100) > 0 : false))
    .map((d, i) => ({
      type: d.travelerType,
      percent: Math.round((d.count / totalReviews) * 100),
      avgRating: d.avgRating,
      color: COLORS[i % COLORS.length],
    }));

  return (
    <GlassCard className="flex flex-col h-full">
      <h3 className="text-foreground font-semibold text-base mb-4">Traveller Types</h3>
      <div className="flex-1 min-h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} layout="vertical" margin={{ left: 10, right: 20, top: 10, bottom: 10 }}>
            <XAxis type="number" domain={[0, "auto"]} tick={{ fill: "#7e93b2", fontSize: 11 }} axisLine={false} tickLine={false} unit="%" />
            <YAxis type="category" dataKey="type" tick={{ fill: "var(--gold-light)", fontSize: 12 }} axisLine={false} tickLine={false} width={80} />
            <Tooltip content={<CustomTooltip showRatings={showRatings} />} cursor={false} />
            <Bar dataKey="percent" radius={[0, 8, 8, 0]} barSize={22}>
              {chartData.map((entry, i) => (
                <Cell key={i} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </GlassCard>
  );
}
