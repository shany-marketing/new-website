"use client";

import { useState, useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import { motion, AnimatePresence } from "framer-motion";
import GlassCard from "@/components/ui/glass-card";
import type { GuestCombination } from "@/lib/stats";

interface GuestCombinationsProps {
  data: GuestCombination[];
  totalReviews: number;
}

function getRatingColor(r: number) {
  if (r >= 8.0) return "#4A8F6B";
  if (r >= 7.0) return "#C9A86A";
  if (r >= 6.0) return "#ff8c42";
  return "#B85050";
}

interface ComboTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: { name: string; count: number; avgRating: number; percent: number } }>;
}

function ComboTooltip({ active, payload }: ComboTooltipProps) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-navy-2 border border-[var(--glass-border)] rounded-xl px-4 py-3 shadow-xl">
      <p className="text-foreground font-semibold text-sm">{d.name}</p>
      <p className="text-gold-light text-xs mt-1">{d.percent.toFixed(1)}% of guests</p>
      <p className="text-cyan text-xs">{d.count} reviews</p>
      <p className="text-[var(--text-secondary)] text-xs">Avg Rating: {d.avgRating.toFixed(1)}</p>
    </div>
  );
}

export default function GuestCombinations({ data, totalReviews }: GuestCombinationsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);

  // Get top countries by review count
  const countries = useMemo(() => {
    const countByCountry: Record<string, number> = {};
    for (const d of data) {
      countByCountry[d.location] = (countByCountry[d.location] ?? 0) + d.count;
    }
    return Object.entries(countByCountry)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 6)
      .map(([name]) => name);
  }, [data]);

  // For selected country: breakdown by traveler type
  const countryData = useMemo(() => {
    if (!selectedCountry) return [];
    const filtered = data.filter(d => d.location === selectedCountry);
    const countryTotal = filtered.reduce((s, d) => s + d.count, 0);
    return filtered
      .sort((a, b) => b.count - a.count)
      .filter(d => d.count > 0)
      .map(d => ({
        name: d.travelerType,
        count: d.count,
        avgRating: d.avgRating,
        percent: countryTotal > 0 ? (d.count / countryTotal) * 100 : 0,
      }));
  }, [data, selectedCountry]);

  if (data.length === 0) return null;

  return (
    <GlassCard>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between"
      >
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <h3 className="text-foreground font-semibold text-base">Guest Cross-Insights</h3>
        </div>
        <svg
          className={`w-5 h-5 text-gold transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="mt-5 space-y-5">
              {/* Country selector */}
              <div>
                <p className="text-gold-light text-sm font-semibold mb-3">Select a country to drill down:</p>
                <div className="flex flex-wrap gap-2">
                  {countries.map(country => {
                    const isActive = selectedCountry === country;
                    return (
                      <button
                        key={country}
                        onClick={() => setSelectedCountry(isActive ? null : country)}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200"
                        style={{
                          background: isActive
                            ? "linear-gradient(135deg, var(--gold), var(--gold-dark))"
                            : "var(--input-bg)",
                          color: isActive ? "var(--navy-1)" : "var(--gold-light)",
                          border: `1px solid ${isActive ? "var(--gold)" : "var(--glass-border)"}`,
                        }}
                      >
                        {country}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Breakdown chart */}
              {selectedCountry && countryData.length > 0 && (
                <div>
                  <p className="text-foreground text-sm mb-3">
                    Guest Breakdown from <span className="text-gold font-semibold">{selectedCountry}</span> by Traveller Type
                  </p>
                  <div className="h-[280px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={countryData} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--subtle-border)" />
                        <XAxis
                          dataKey="name"
                          tick={{ fill: "var(--gold-light)", fontSize: 11 }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis
                          tick={{ fill: "#7e93b2", fontSize: 11 }}
                          axisLine={false}
                          tickLine={false}
                          label={{ value: "% of guests", angle: -90, position: "insideLeft", fill: "#7e93b2", fontSize: 11 }}
                        />
                        <Tooltip content={<ComboTooltip />} cursor={{ fill: "var(--input-bg)" }} />
                        <Bar dataKey="percent" radius={[6, 6, 0, 0]} maxBarSize={48}>
                          {countryData.map((entry, i) => (
                            <Cell key={i} fill={getRatingColor(entry.avgRating)} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Summary cards */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
                    {countryData.map(item => (
                      <div
                        key={item.name}
                        className="rounded-xl p-3 text-center"
                        style={{ background: `${getRatingColor(item.avgRating)}10`, border: `1px solid ${getRatingColor(item.avgRating)}20` }}
                      >
                        <p className="text-foreground text-sm font-semibold">{item.name}</p>
                        <p className="text-gold-light text-lg font-bold">{item.percent.toFixed(1)}%</p>
                        <p className="text-cyan text-xs">{item.count} reviews</p>
                        <p className="text-[var(--text-tertiary)] text-xs">Avg {item.avgRating.toFixed(1)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </GlassCard>
  );
}
