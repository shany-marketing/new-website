"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import GlassCard from "@/components/ui/glass-card";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  LineChart,
  Line,
  CartesianGrid,
} from "recharts";
import { PLATFORM_CONFIG, PLATFORMS } from "@/types/platform";
import type { ReviewSource } from "@/types/platform";

const fadeIn = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5 },
};

interface MonthlyDataPoint {
  month: string;
  count: number;
  avgRating: number | null;
  responseRate: number | null;
}

interface BenchmarkEntity {
  id: string;
  name: string;
  isYourHotel: boolean;
  avgRating: number | null;
  totalReviews: number;
  responseRate: number | null;
  ratingDistribution: Record<string, number>;
  monthlyData: MonthlyDataPoint[];
}

interface Competitor {
  id: string;
  name: string;
  platform: ReviewSource;
  platform_url: string;
  total_reviews: number | null;
  avg_rating: number | null;
  scrape_status: string;
  scrape_error: string | null;
  last_scraped_at: string | null;
}

const ENTITY_COLORS = ["var(--gold)", "#4285F4", "#4A8F6B", "#B85050", "#a855f7", "#516B84"];

interface BenchmarkClientProps {
  hotelId: string;
  hotelName: string;
}

export default function BenchmarkClient({ hotelId, hotelName }: BenchmarkClientProps) {
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [benchmark, setBenchmark] = useState<{ hotel: BenchmarkEntity; competitors: BenchmarkEntity[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [addName, setAddName] = useState("");
  const [addUrl, setAddUrl] = useState("");
  const [addPlatform, setAddPlatform] = useState<ReviewSource>("booking");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [compRes, benchRes] = await Promise.all([
        fetch(`/api/hotels/${hotelId}/competitors`),
        fetch(`/api/hotels/${hotelId}/benchmark`),
      ]);
      const compData = await compRes.json();
      const benchData = await benchRes.json();
      setCompetitors(compData.competitors || []);
      setBenchmark(benchData.hotel ? benchData : null);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [hotelId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Poll for scraping competitors
  useEffect(() => {
    const scraping = competitors.some((c) => c.scrape_status === "scraping" || c.scrape_status === "pending");
    if (!scraping) return;
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, [competitors, fetchData]);

  async function handleAdd() {
    if (!addName.trim() || !addUrl.trim()) {
      setError("Name and URL are required");
      return;
    }
    setAdding(true);
    setError(null);
    try {
      const res = await fetch(`/api/hotels/${hotelId}/competitors`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: addName.trim(), platformUrl: addUrl.trim(), platform: addPlatform }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to add competitor");
        return;
      }
      setAddName("");
      setAddUrl("");
      setShowAddForm(false);
      fetchData();
    } catch {
      setError("Network error");
    } finally {
      setAdding(false);
    }
  }

  async function handleRemove(competitorId: string) {
    await fetch(`/api/hotels/${hotelId}/competitors/${competitorId}`, { method: "DELETE" });
    fetchData();
  }

  async function handleRescrape(competitorId: string) {
    await fetch(`/api/hotels/${hotelId}/competitors/${competitorId}`, { method: "POST" });
    fetchData();
  }

  // Build chart data
  const allEntities = benchmark ? [benchmark.hotel, ...benchmark.competitors] : [];

  // Rating comparison data
  const ratingData = allEntities.map((e) => ({
    name: e.isYourHotel ? `${e.name} (You)` : e.name,
    rating: e.avgRating ?? 0,
    fill: ENTITY_COLORS[allEntities.indexOf(e) % ENTITY_COLORS.length],
  }));

  // Monthly trend data — merge all entities into unified months
  const monthSet = new Set<string>();
  allEntities.forEach((e) => e.monthlyData.forEach((m) => monthSet.add(m.month)));
  const months = Array.from(monthSet).sort();
  const trendData = months.map((month) => {
    const point: Record<string, unknown> = { month: `${month.slice(5, 7)}/${month.slice(2, 4)}` }; // MM/YY
    allEntities.forEach((e) => {
      const m = e.monthlyData.find((d) => d.month === month);
      const key = e.isYourHotel ? "You" : e.name;
      point[key] = m?.avgRating ?? null;
    });
    return point;
  });

  // Response rate data
  const responseData = allEntities.map((e) => ({
    name: e.isYourHotel ? `${e.name} (You)` : e.name,
    rate: e.responseRate ?? 0,
    fill: ENTITY_COLORS[allEntities.indexOf(e) % ENTITY_COLORS.length],
  }));

  // Volume data
  const volumeData = allEntities.map((e) => ({
    name: e.isYourHotel ? `${e.name} (You)` : e.name,
    reviews: e.totalReviews,
    fill: ENTITY_COLORS[allEntities.indexOf(e) % ENTITY_COLORS.length],
  }));

  // Ranking
  const sorted = [...allEntities].sort((a, b) => (b.avgRating ?? 0) - (a.avgRating ?? 0));
  const rank = sorted.findIndex((e) => e.isYourHotel) + 1;

  if (loading) {
    return (
      <div className="text-center py-20">
        <div className="inline-block w-6 h-6 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
        <p className="text-muted text-sm mt-3">Loading benchmark data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Hero */}
      <motion.div {...fadeIn} className="relative rounded-3xl overflow-hidden">
        <div className="w-full h-[180px] md:h-[220px]" style={{ background: "var(--page-gradient)" }} />
        <div className="absolute inset-0 bg-gradient-to-t from-navy-1 via-navy-1/50 to-transparent" />
        <div className="absolute inset-0 flex flex-col justify-end p-6 md:p-10">
          <h2 className="text-foreground text-2xl md:text-3xl font-bold mb-1">Competitor Benchmark</h2>
          <p className="text-cyan text-sm">Compare your hotel against the competition</p>
        </div>
      </motion.div>

      {/* Ranking Summary */}
      {allEntities.length > 1 && rank > 0 && (
        <motion.div {...fadeIn} transition={{ delay: 0.05, duration: 0.5 }}>
          <div
            className="rounded-2xl p-6 text-center"
            style={{
              background: rank === 1
                ? "linear-gradient(135deg, rgba(252,219,55,0.15), rgba(170,138,0,0.08))"
                : "linear-gradient(135deg, var(--glass-bg), var(--glass-bg-end))",
              border: `1px solid ${rank === 1 ? "rgba(252,219,55,0.3)" : "var(--glass-border)"}`,
            }}
          >
            <p className="text-foreground text-4xl font-bold">
              #{rank} <span className="text-lg text-muted font-normal">of {allEntities.length}</span>
            </p>
            <p className="text-muted text-sm mt-1">
              {rank === 1 ? "You're leading your competitive set!" : "in your competitive set by average rating"}
            </p>
          </div>
        </motion.div>
      )}

      {/* Competitor Management */}
      <motion.div {...fadeIn} transition={{ delay: 0.1, duration: 0.5 }}>
        <GlassCard>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-foreground font-semibold text-base">
              Competitors ({competitors.length}/5)
            </h3>
            {competitors.length < 5 && (
              <button
                onClick={() => setShowAddForm(!showAddForm)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-navy-1"
                style={{ background: "linear-gradient(135deg, var(--gold) 0%, var(--gold-dark) 100%)" }}
              >
                {showAddForm ? "Cancel" : "+ Add Competitor"}
              </button>
            )}
          </div>

          {/* Add Form */}
          {showAddForm && (
            <div className="mb-4 p-4 rounded-xl" style={{ background: "var(--input-bg)", border: "1px solid var(--glass-border)" }}>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                <input
                  type="text"
                  placeholder="Hotel name"
                  value={addName}
                  onChange={(e) => setAddName(e.target.value)}
                  className="px-3 py-2 rounded-lg text-sm text-foreground placeholder:text-muted bg-[var(--input-bg)] border border-[var(--input-border)] focus:outline-none focus:border-gold/30"
                />
                <input
                  type="url"
                  placeholder="Booking.com / Google URL"
                  value={addUrl}
                  onChange={(e) => setAddUrl(e.target.value)}
                  className="px-3 py-2 rounded-lg text-sm text-foreground placeholder:text-muted bg-[var(--input-bg)] border border-[var(--input-border)] focus:outline-none focus:border-gold/30"
                />
                <select
                  value={addPlatform}
                  onChange={(e) => setAddPlatform(e.target.value as ReviewSource)}
                  className="px-3 py-2 rounded-lg text-sm text-foreground bg-[var(--input-bg)] border border-[var(--input-border)] focus:outline-none"
                >
                  {PLATFORMS.map((p) => (
                    <option key={p} value={p}>{PLATFORM_CONFIG[p].label}</option>
                  ))}
                </select>
              </div>
              {error && <p className="text-danger text-xs mb-2">{error}</p>}
              <button
                onClick={handleAdd}
                disabled={adding}
                className="px-4 py-2 rounded-lg text-xs font-medium text-navy-1 disabled:opacity-40"
                style={{ background: "linear-gradient(135deg, var(--gold) 0%, var(--gold-dark) 100%)" }}
              >
                {adding ? "Adding..." : "Add & Scrape"}
              </button>
            </div>
          )}

          {/* Competitor List */}
          {competitors.length === 0 ? (
            <p className="text-muted text-sm py-4 text-center">
              No competitors added yet. Add up to 5 competitors to compare.
            </p>
          ) : (
            <div className="space-y-2">
              {competitors.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between p-3 rounded-xl"
                  style={{ background: "var(--input-bg)", border: "1px solid var(--glass-border)" }}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{
                        background: c.scrape_status === "completed" ? "#4A8F6B"
                          : c.scrape_status === "failed" ? "#B85050"
                          : "#C9A86A",
                      }}
                    />
                    <div className="min-w-0">
                      <p className="text-foreground text-sm font-medium truncate">{c.name}</p>
                      <p className="text-muted text-xs">
                        <span style={{ color: PLATFORM_CONFIG[c.platform]?.color }}>{PLATFORM_CONFIG[c.platform]?.label}</span>
                        {c.scrape_status === "completed" && c.avg_rating != null && (
                          <> &middot; Rating: {c.avg_rating} &middot; {c.total_reviews?.toLocaleString()} reviews</>
                        )}
                        {c.scrape_status === "scraping" && <> &middot; Scraping...</>}
                        {c.scrape_status === "pending" && <> &middot; Pending...</>}
                        {c.scrape_status === "failed" && (
                          <span className="text-danger"> &middot; Failed: {c.scrape_error?.slice(0, 60)}</span>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleRescrape(c.id)}
                      className="px-2 py-1 rounded text-xs text-muted hover:text-foreground transition-colors"
                      title="Re-scrape"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M23 4v6h-6M1 20v-6h6" />
                        <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleRemove(c.id)}
                      className="px-2 py-1 rounded text-xs text-muted hover:text-danger transition-colors"
                      title="Remove"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M18 6L6 18M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </GlassCard>
      </motion.div>

      {/* Charts — only show if we have benchmark data */}
      {allEntities.length > 1 && (
        <>
          {/* Rating Comparison */}
          <motion.div {...fadeIn} transition={{ delay: 0.15, duration: 0.5 }}>
            <GlassCard>
              <h3 className="text-foreground font-semibold text-base mb-4">Average Rating Comparison</h3>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={ratingData} layout="vertical" margin={{ left: 20, right: 20 }}>
                    <XAxis type="number" domain={[0, 10]} tick={{ fill: "var(--muted)", fontSize: 12 }} />
                    <YAxis type="category" dataKey="name" width={140} tick={{ fill: "var(--foreground)", fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{
                        background: "var(--navy-2)",
                        border: "1px solid var(--glass-border)",
                        borderRadius: 12,
                        color: "var(--foreground)",
                      }}
                      formatter={(value?: number) => [(value ?? 0).toFixed(1), "Avg Rating"]}
                    />
                    <Bar dataKey="rating" radius={[0, 6, 6, 0]} barSize={28}>
                      {ratingData.map((entry, i) => (
                        <rect key={i} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </GlassCard>
          </motion.div>

          {/* Monthly Trend */}
          {trendData.length > 1 && (
            <motion.div {...fadeIn} transition={{ delay: 0.2, duration: 0.5 }}>
              <GlassCard>
                <h3 className="text-foreground font-semibold text-base mb-4">Rating Trend Over Time</h3>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trendData} margin={{ left: 0, right: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--subtle-border)" />
                      <XAxis dataKey="month" tick={{ fill: "var(--muted)", fontSize: 11 }} />
                      <YAxis domain={[0, 10]} tick={{ fill: "var(--muted)", fontSize: 12 }} />
                      <Tooltip
                        contentStyle={{
                          background: "var(--navy-2)",
                          border: "1px solid var(--glass-border)",
                          borderRadius: 12,
                          color: "var(--foreground)",
                        }}
                      />
                      <Legend />
                      {allEntities.map((e, i) => (
                        <Line
                          key={e.id}
                          type="monotone"
                          dataKey={e.isYourHotel ? "You" : e.name}
                          stroke={ENTITY_COLORS[i % ENTITY_COLORS.length]}
                          strokeWidth={e.isYourHotel ? 3 : 2}
                          dot={false}
                          connectNulls
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </GlassCard>
            </motion.div>
          )}

          {/* Response Rate + Volume side by side */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <motion.div {...fadeIn} transition={{ delay: 0.25, duration: 0.5 }}>
              <GlassCard>
                <h3 className="text-foreground font-semibold text-base mb-4">Response Rate (%)</h3>
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={responseData} layout="vertical" margin={{ left: 20, right: 20 }}>
                      <XAxis type="number" domain={[0, 100]} tick={{ fill: "var(--muted)", fontSize: 12 }} />
                      <YAxis type="category" dataKey="name" width={140} tick={{ fill: "var(--foreground)", fontSize: 11 }} />
                      <Tooltip
                        contentStyle={{
                          background: "var(--navy-2)",
                          border: "1px solid var(--glass-border)",
                          borderRadius: 12,
                          color: "var(--foreground)",
                        }}
                        formatter={(value?: number) => [`${(value ?? 0).toFixed(1)}%`, "Response Rate"]}
                      />
                      <Bar dataKey="rate" radius={[0, 6, 6, 0]} barSize={24}>
                        {responseData.map((entry, i) => (
                          <rect key={i} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </GlassCard>
            </motion.div>

            <motion.div {...fadeIn} transition={{ delay: 0.3, duration: 0.5 }}>
              <GlassCard>
                <h3 className="text-foreground font-semibold text-base mb-4">Total Reviews</h3>
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={volumeData} layout="vertical" margin={{ left: 20, right: 20 }}>
                      <XAxis type="number" tick={{ fill: "var(--muted)", fontSize: 12 }} />
                      <YAxis type="category" dataKey="name" width={140} tick={{ fill: "var(--foreground)", fontSize: 11 }} />
                      <Tooltip
                        contentStyle={{
                          background: "var(--navy-2)",
                          border: "1px solid var(--glass-border)",
                          borderRadius: 12,
                          color: "var(--foreground)",
                        }}
                        formatter={(value?: number) => [(value ?? 0).toLocaleString(), "Reviews"]}
                      />
                      <Bar dataKey="reviews" radius={[0, 6, 6, 0]} barSize={24}>
                        {volumeData.map((entry, i) => (
                          <rect key={i} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </GlassCard>
            </motion.div>
          </div>
        </>
      )}

      {/* Empty state */}
      {allEntities.length <= 1 && competitors.length === 0 && (
        <motion.div {...fadeIn} transition={{ delay: 0.15, duration: 0.5 }}>
          <div className="text-center py-16">
            <div
              className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center"
              style={{
                background: "linear-gradient(135deg, rgba(252,219,55,0.15), rgba(170,138,0,0.1))",
                border: "1px solid rgba(252,219,55,0.15)",
              }}
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="1.5">
                <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                <circle cx="8.5" cy="7" r="4" />
                <line x1="20" y1="8" x2="20" y2="14" />
                <line x1="23" y1="11" x2="17" y2="11" />
              </svg>
            </div>
            <h3 className="text-foreground font-semibold mb-2">Add Your First Competitor</h3>
            <p className="text-muted text-sm max-w-md mx-auto">
              Paste a Booking.com, Google, or TripAdvisor URL for a competing hotel. We&apos;ll scrape their reviews and show you how you compare.
            </p>
          </div>
        </motion.div>
      )}
    </div>
  );
}
