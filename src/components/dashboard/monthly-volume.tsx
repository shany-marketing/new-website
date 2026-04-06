"use client";

import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, Line, CartesianGrid, ComposedChart } from "recharts";
import GlassCard from "@/components/ui/glass-card";

interface MonthlyVolumeProps {
  data: { month: string; count: number; avgRating: number }[];
  showRatings?: boolean;
}

function CustomTooltip({ active, payload, label, showRatings = true }: { active?: boolean; payload?: Array<{ value: number; dataKey: string }>; label?: string; showRatings?: boolean }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-navy-2 border border-[var(--glass-border)] rounded-xl px-4 py-3 shadow-xl">
      <p className="text-foreground font-semibold text-sm">{label}</p>
      {payload.filter((p) => showRatings || p.dataKey === "count").map((p) => (
        <p key={p.dataKey} className="text-xs mt-1" style={{ color: p.dataKey === "count" ? "#516B84" : "var(--gold)" }}>
          {p.dataKey === "count" ? `Reviews: ${p.value}` : `Avg Rating: ${p.value}`}
        </p>
      ))}
    </div>
  );
}

export default function MonthlyVolume({ data, showRatings = true }: MonthlyVolumeProps) {
  return (
    <GlassCard>
      <h3 className="text-foreground font-semibold text-base mb-4">
        {showRatings ? "Monthly Review Volume & Rating" : "Monthly Review Volume"}
      </h3>
      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--subtle-border)" />
            <XAxis dataKey="month" tick={{ fill: "#7e93b2", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v: string) => `${v.slice(5, 7)}/${v.slice(2, 4)}`} />
            <YAxis yAxisId="left" tick={{ fill: "#516B84", fontSize: 11 }} axisLine={false} tickLine={false} />
            {showRatings && (
              <YAxis yAxisId="right" orientation="right" domain={[0, 10]} tick={{ fill: "var(--gold)", fontSize: 11 }} axisLine={false} tickLine={false} />
            )}
            <Tooltip content={<CustomTooltip showRatings={showRatings} />} />
            <Area yAxisId="left" type="monotone" dataKey="count" stroke="#516B84" fill="#516B84" fillOpacity={0.15} strokeWidth={2} />
            {showRatings && (
              <Line yAxisId="right" type="monotone" dataKey="avgRating" stroke="var(--gold)" strokeWidth={2} dot={{ fill: "var(--gold)", r: 3 }} />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <div className="flex items-center justify-center gap-6 mt-4">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-cyan" />
          <span className="text-muted text-xs">Review Count</span>
        </div>
        {showRatings && (
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-gold" />
            <span className="text-muted text-xs">Avg Rating</span>
          </div>
        )}
      </div>
    </GlassCard>
  );
}
