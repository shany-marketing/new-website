"use client";

import { useState, useCallback, useRef } from "react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import GlassCard from "@/components/ui/glass-card";
import SectionTitle from "@/components/ui/section-title";
import StaffActionForm from "@/components/dashboard/staff-action-form";
import type { CategoryTimeSeries, StaffActionEntry } from "@/lib/insights";

interface ComplaintHeatmapProps {
  hotelId: string;
  timeSeries: CategoryTimeSeries[];
  availableMonths: string[];
  categories: Array<{ id: string; label: string; sentiment: string }>;
}

function formatMonth(dateStr: string): string {
  const parts = dateStr.slice(0, 7).split("-");
  return `${parts[1]}/${parts[0].slice(2)}`;
}

function getRatingColor(r: number | null) {
  if (r === null) return "#7e93b2";
  if (r >= 8.0) return "#4A8F6B";
  if (r >= 7.0) return "#C9A86A";
  if (r >= 6.0) return "#ff8c42";
  return "#B85050";
}

// ── Custom Tooltip for Issue Trend (View 1) ──

interface TrendTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: { month: string; sharePct: number; avgRating: number | null; staffActions?: StaffActionEntry[] } }>;
}

function TrendTooltip({ active, payload }: TrendTooltipProps) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-navy-2 border border-[var(--glass-border)] rounded-xl px-4 py-3 shadow-xl max-w-xs">
      <p className="text-foreground font-semibold text-sm">{formatMonth(d.month)}</p>
      <p className="text-gold-light text-xs mt-1">Complaints: {d.sharePct.toFixed(1)}%</p>
      {d.avgRating !== null && (
        <p className="text-cyan text-xs">Avg Rating: {d.avgRating.toFixed(1)}</p>
      )}
      {d.staffActions && d.staffActions.length > 0 && (
        <div className="mt-2 pt-2 border-t border-[var(--glass-border)]">
          <p className="text-gold text-xs font-semibold mb-1">Staff Actions:</p>
          {d.staffActions.map((a) => (
            <div key={a.id} className="mb-1.5">
              <p className="text-[var(--text-secondary)] text-[10px]">
                <span className="text-gold">{a.staffName}</span> ({a.actionDate})
              </p>
              <p className="text-[var(--text-tertiary)] text-[10px]">{a.description}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Custom Tooltip for Month Ranking (View 2) ──

interface RankTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: { category: string; sharePct: number; avgRating: number | null } }>;
}

function RankTooltip({ active, payload }: RankTooltipProps) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-navy-2 border border-[var(--glass-border)] rounded-xl px-4 py-3 shadow-xl">
      <p className="text-foreground font-semibold text-sm">{d.category}</p>
      <p className="text-gold-light text-xs mt-1">{d.sharePct.toFixed(1)}% of complaints</p>
      {d.avgRating !== null && (
        <p className="text-cyan text-xs">Avg Rating: {d.avgRating.toFixed(1)}</p>
      )}
    </div>
  );
}

// ── Custom Dot for Line Chart ──

interface DotProps {
  cx?: number;
  cy?: number;
  payload?: { staffActions?: StaffActionEntry[] };
}

function ActionDot({ cx, cy, payload }: DotProps) {
  if (cx === undefined || cy === undefined) return null;
  const hasAction = (payload?.staffActions?.length ?? 0) > 0;
  return (
    <circle
      cx={cx}
      cy={cy}
      r={hasAction ? 7 : 4}
      fill={hasAction ? "var(--gold)" : "#516B84"}
      stroke={hasAction ? "var(--gold-dark)" : "none"}
      strokeWidth={hasAction ? 2 : 0}
      style={{ filter: hasAction ? "drop-shadow(0 0 4px rgba(252,219,55,0.6))" : undefined }}
    />
  );
}

// ── Main Component ──

export default function ComplaintHeatmap({
  hotelId,
  timeSeries: initialTimeSeries,
  availableMonths,
  categories,
}: ComplaintHeatmapProps) {
  const [timeSeries, setTimeSeries] = useState(initialTimeSeries);
  const [selectedIssue, setSelectedIssue] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [showActionForm, setShowActionForm] = useState(false);
  const chartKey = useRef(0);

  const negativeCategories = timeSeries.filter((ts) => ts.sentiment === "negative");

  // Refresh time series from API after staff action is added
  const refreshTimeSeries = useCallback(async () => {
    try {
      const res = await fetch(`/api/hotels/${hotelId}/time-series`);
      if (res.ok) {
        const data = await res.json();
        chartKey.current += 1; // force Recharts re-render
        setTimeSeries(data.timeSeries);
      }
    } catch {
      // silently fail, data will be stale until page refresh
    }
  }, [hotelId]);

  if (negativeCategories.length === 0) return null;

  // ── View 1 data: selected issue → monthly trend ──
  const selectedSeries = selectedIssue
    ? negativeCategories.find((ts) => ts.category === selectedIssue)
    : null;

  const trendData = selectedSeries
    ? selectedSeries.monthlyData.map((dp) => ({
        ...dp,
        monthLabel: formatMonth(dp.month),
        staffActions: selectedSeries.staffActions[dp.month] ?? [],
      }))
    : [];

  // ── View 2 data: selected month → all issues ranked ──
  const monthRankData = selectedMonth
    ? negativeCategories
        .map((ts) => {
          const dp = ts.monthlyData.find((d) => d.month === selectedMonth);
          return dp ? { category: ts.category, sharePct: dp.sharePct, avgRating: dp.avgRating } : null;
        })
        .filter(Boolean)
        .sort((a, b) => b!.sharePct - a!.sharePct) as Array<{ category: string; sharePct: number; avgRating: number | null }>
    : [];

  // Find categoryId for the selected issue (for staff action form)
  const selectedCategoryObj = selectedIssue
    ? categories.find((c) => c.label === selectedIssue)
    : null;

  return (
    <>
      <GlassCard>
        <SectionTitle
          title="Complaint Breakdown by Issue"
          subtitle="Data - Action - Follow-up"
        />

        {/* ── View 1: Issue → Trend ── */}
        <div className="mb-8">
          <p className="text-gold-light text-sm font-semibold mb-3">Select an issue to view its monthly trend:</p>
          <div className="flex flex-wrap gap-2 mb-4">
            {negativeCategories.map((ts) => {
              const isActive = selectedIssue === ts.category;
              return (
                <button
                  key={ts.category}
                  onClick={() => {
                    setSelectedIssue(isActive ? null : ts.category);
                    if (!isActive) setSelectedMonth(null);
                  }}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200"
                  style={{
                    background: isActive
                      ? "linear-gradient(135deg, var(--gold), var(--gold-dark))"
                      : "var(--input-bg)",
                    color: isActive ? "var(--navy-1)" : "var(--gold-light)",
                    border: `1px solid ${isActive ? "var(--gold)" : "var(--glass-border)"}`,
                  }}
                >
                  {ts.category}
                </button>
              );
            })}
          </div>

          {selectedSeries && trendData.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-foreground text-sm">
                  Monthly trend for <span className="text-gold font-semibold">{selectedIssue}</span>
                </p>
                <button
                  onClick={() => setShowActionForm(true)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                  style={{
                    background: "linear-gradient(135deg, var(--gold), var(--gold-dark))",
                    color: "var(--navy-1)",
                  }}
                >
                  + Add Staff Action
                </button>
              </div>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart key={chartKey.current} data={trendData} margin={{ top: 10, right: 20, bottom: 20, left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--subtle-border)" />
                    <XAxis
                      dataKey="monthLabel"
                      tick={{ fill: "var(--gold-light)", fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fill: "#7e93b2", fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      label={{ value: "% of complaints", angle: -90, position: "insideLeft", fill: "#7e93b2", fontSize: 11 }}
                    />
                    <Tooltip content={<TrendTooltip />} />
                    <Line
                      type="monotone"
                      dataKey="sharePct"
                      stroke="#516B84"
                      strokeWidth={2}
                      dot={(props: DotProps) => (
                        <ActionDot key={`dot-${props.cx}-${props.cy}`} cx={props.cx} cy={props.cy} payload={props.payload} />
                      )}
                      activeDot={{ r: 8, fill: "var(--gold)", stroke: "var(--gold-dark)", strokeWidth: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <p className="text-muted text-[10px] mt-1 text-center">
                Gold dots indicate months where staff actions were recorded
              </p>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="border-t border-[var(--glass-border)] my-6" />

        {/* ── View 2: Month → Ranking ── */}
        <div>
          <p className="text-gold-light text-sm font-semibold mb-3">
            Issue Ranking for{" "}
            {selectedMonth ? <span className="text-gold">{formatMonth(selectedMonth)}</span> : "..."}
            {" "}— select a month:
          </p>
          <div className="flex flex-wrap gap-2 mb-4">
            {availableMonths.map((m) => {
              const isActive = selectedMonth === m;
              return (
                <button
                  key={m}
                  onClick={() => {
                    setSelectedMonth(isActive ? null : m);
                    if (!isActive) setSelectedIssue(null);
                  }}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200"
                  style={{
                    background: isActive
                      ? "linear-gradient(135deg, var(--gold), var(--gold-dark))"
                      : "var(--input-bg)",
                    color: isActive ? "var(--navy-1)" : "var(--gold-light)",
                    border: `1px solid ${isActive ? "var(--gold)" : "var(--glass-border)"}`,
                  }}
                >
                  {formatMonth(m)}
                </button>
              );
            })}
          </div>

          {selectedMonth && monthRankData.length > 0 && (
            <div className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={monthRankData}
                  layout="vertical"
                  margin={{ top: 5, right: 30, bottom: 5, left: 140 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--subtle-border)" horizontal={false} />
                  <XAxis
                    type="number"
                    tick={{ fill: "#7e93b2", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    label={{ value: "% of complaints", position: "insideBottom", offset: -5, fill: "#7e93b2", fontSize: 11 }}
                  />
                  <YAxis
                    type="category"
                    dataKey="category"
                    tick={{ fill: "var(--gold-light)", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    width={135}
                  />
                  <Tooltip content={<RankTooltip />} cursor={{ fill: "var(--input-bg)" }} />
                  <Bar dataKey="sharePct" radius={[0, 6, 6, 0]} maxBarSize={28}>
                    {monthRankData.map((entry, i) => (
                      <Cell key={i} fill={getRatingColor(entry.avgRating)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </GlassCard>

      {/* Staff Action Form Modal */}
      {showActionForm && (
        <StaffActionForm
          hotelId={hotelId}
          categories={categories.filter((c) => c.sentiment === "negative")}
          availableMonths={availableMonths}
          preSelectedCategory={selectedCategoryObj?.id}
          preSelectedMonth={undefined}
          onActionCreated={async () => {
            await refreshTimeSeries();
            setShowActionForm(false);
          }}
          onClose={() => setShowActionForm(false)}
        />
      )}
    </>
  );
}
