"use client";

import { useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import GlassCard from "@/components/ui/glass-card";

interface RoomTypesProps {
  data: { roomInfo: string; count: number; avgRating: number }[];
  totalReviews: number;
  showRatings?: boolean;
}

function getRatingColor(r: number) {
  if (r >= 8.5) return "#4A8F6B";
  if (r >= 8.0) return "#bfebdb";
  if (r >= 7.5) return "#C9A86A";
  return "#ff8c42";
}

function CustomTooltip({ active, payload, showRatings = true }: { active?: boolean; payload?: Array<{ payload: { name: string; percent: number; avgRating: number } }>; showRatings?: boolean }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-navy-2 border border-[var(--glass-border)] rounded-xl px-4 py-3 shadow-xl">
      <p className="text-foreground font-semibold text-sm">{d.name}</p>
      <p className="text-gold-light text-xs mt-1">{d.percent}% of bookings</p>
      {showRatings && <p className="text-cyan text-xs">Avg rating: {d.avgRating}</p>}
    </div>
  );
}

export default function RoomTypes({ data, totalReviews, showRatings = true }: RoomTypesProps) {
  const [expanded, setExpanded] = useState(false);

  const chartData = data.map((d) => ({
    name: d.roomInfo,
    percent: totalReviews > 0 ? Math.round((d.count / totalReviews) * 100) : 0,
    avgRating: d.avgRating,
  })).filter((d) => d.percent >= 5);

  const displayData = expanded ? chartData : chartData.slice(0, 5);

  return (
    <GlassCard>
      <h3 className="text-foreground font-semibold text-base mb-4">Room Types</h3>
      <div style={{ height: expanded ? Math.max(300, displayData.length * 35) : 300 }} className="transition-all duration-500">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={displayData} layout="vertical" margin={{ left: 10, right: 20 }}>
            <XAxis type="number" domain={[0, "auto"]} tick={{ fill: "#7e93b2", fontSize: 10 }} axisLine={false} tickLine={false} unit="%" />
            <YAxis type="category" dataKey="name" tick={{ fill: "var(--gold-light)", fontSize: 12, fontWeight: 700 }} axisLine={false} tickLine={false} width={120} />
            <Tooltip content={<CustomTooltip showRatings={showRatings} />} cursor={false} />
            <Bar dataKey="percent" radius={[0, 6, 6, 0]} barSize={14}>
              {displayData.map((entry, i) => (
                <Cell key={i} fill={showRatings ? getRatingColor(entry.avgRating) : "#516B84"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      {chartData.length > 5 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-3 flex items-center gap-1 text-gold-light text-xs hover:text-gold transition-colors mx-auto"
        >
          {expanded ? "\u25B2 Show less" : "\u25BC Show all room types"}
        </button>
      )}
    </GlassCard>
  );
}
