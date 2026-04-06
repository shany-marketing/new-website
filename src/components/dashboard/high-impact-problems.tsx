"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import GlassCard from "@/components/ui/glass-card";
import type { CategoryChange } from "@/lib/since-upstar";

interface HighImpactProblemsProps {
  changes: CategoryChange[];
}

interface ProblemTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: { category: string; beforePct: number; afterPct: number; changePct: number } }>;
}

function ProblemTooltip({ active, payload }: ProblemTooltipProps) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-navy-2 border border-[var(--glass-border)] rounded-xl px-4 py-3 shadow-xl">
      <p className="text-foreground font-semibold text-sm">{d.category}</p>
      <p className="text-danger text-xs mt-1">Before: {d.beforePct.toFixed(1)}%</p>
      <p className="text-success text-xs">After: {d.afterPct.toFixed(1)}%</p>
      <p className={`text-xs font-bold mt-1 ${d.changePct < 0 ? "text-success" : "text-danger"}`}>
        Change: {d.changePct > 0 ? "+" : ""}{d.changePct.toFixed(1)}%
      </p>
    </div>
  );
}

export default function HighImpactProblems({ changes }: HighImpactProblemsProps) {
  // Only show issues that decreased (improved)
  const improved = changes
    .filter(c => c.changePct < 0)
    .sort((a, b) => a.changePct - b.changePct); // Most improved first

  if (improved.length === 0) return null;

  const chartData = improved.map(c => ({
    category: c.category.replace(/_/g, " ").replace(/\b\w/g, ch => ch.toUpperCase()),
    changePct: c.changePct,
    beforePct: c.beforePct,
    afterPct: c.afterPct,
  }));

  const chartHeight = Math.max(300, chartData.length * 45);

  return (
    <GlassCard>
      <div className="flex items-center gap-2 mb-4">
        <svg className="w-5 h-5 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
        </svg>
        <h3 className="text-foreground font-semibold text-lg">Issues That Decreased</h3>
      </div>
      <p className="text-muted text-sm mb-6">
        Complaint categories with reduced share — relative change shown
      </p>

      <div style={{ height: chartHeight }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 5, right: 30, bottom: 5, left: 140 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="var(--subtle-border)" horizontal={false} />
            <XAxis
              type="number"
              tick={{ fill: "#7e93b2", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v: number) => `${v}%`}
            />
            <YAxis
              type="category"
              dataKey="category"
              tick={{ fill: "var(--gold-light)", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={135}
            />
            <Tooltip content={<ProblemTooltip />} cursor={{ fill: "var(--input-bg)" }} />
            <Bar dataKey="changePct" radius={[6, 0, 0, 6]} maxBarSize={28}>
              {chartData.map((_, i) => (
                <Cell key={i} fill="#4A8F6B" />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Details table */}
      <div className="mt-4 space-y-2 pt-4 border-t border-[var(--glass-border)]">
        {chartData.map((item, i) => (
          <div key={i} className="flex items-center justify-between p-2.5 rounded-xl" style={{ background: "rgba(53,221,159,0.06)" }}>
            <span className="text-foreground text-sm font-medium">{item.category}</span>
            <div className="flex items-center gap-4 text-xs">
              <span className="text-danger">Before: {item.beforePct.toFixed(1)}%</span>
              <span className="text-success">After: {item.afterPct.toFixed(1)}%</span>
              <span className="text-success font-bold">{item.changePct.toFixed(1)}%</span>
            </div>
          </div>
        ))}
      </div>
    </GlassCard>
  );
}
