"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import type { BaselineStats } from "@/lib/stats";
import SectionTitle from "@/components/ui/section-title";
import GlassCard from "@/components/ui/glass-card";
import LockedOverlay from "@/components/ui/locked-overlay";
import RatingDistribution from "@/components/dashboard/rating-distribution";
import TravellerTypes from "@/components/dashboard/traveller-types";
import GuestOrigins from "@/components/dashboard/guest-origins";
import RoomTypes from "@/components/dashboard/room-types";
import MonthlyVolume from "@/components/dashboard/monthly-volume";
import GuestCombinations from "@/components/dashboard/guest-combinations";

const fadeIn = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5 },
};

interface RatingsClientProps {
  hotelId: string;
  hotelName: string;
  stats: BaselineStats | null;
  latestRating: number | null;
  platformBreakdown: { source: string; avgRating: number; count: number }[];
  locked?: boolean;
}

const PLATFORM_LABELS: Record<string, { label: string; color: string }> = {
  booking: { label: "Booking.com", color: "#003b95" },
  google: { label: "Google", color: "#4285f4" },
  tripadvisor: { label: "TripAdvisor", color: "#34e0a1" },
  expedia: { label: "Expedia", color: "#fbcc33" },
};

export default function RatingsClient({ hotelId, hotelName, stats, latestRating, platformBreakdown, locked = false }: RatingsClientProps) {
  // 12-month lookback for monthly rating trend
  const last12Months = useMemo(() => {
    if (!stats) return [];
    return stats.monthlyVolume.slice(-12);
  }, [stats]);

  if (!stats || stats.totalReviews === 0) {
    return (
      <div className="text-center py-20">
        <h2 className="text-foreground text-2xl font-bold mb-2">{hotelName} — Ratings</h2>
        <p className="text-muted">
          No review data yet. Ingest reviews via the webhook to see analytics.
        </p>
      </div>
    );
  }

  const totalMonths = stats.monthlyVolume.length;
  const avgMonthly = totalMonths > 0 ? Math.round(stats.totalReviews / totalMonths) : 0;

  const content = (
    <div className="space-y-10">
      {/* Hero */}
      <motion.div {...fadeIn} className="relative rounded-3xl overflow-hidden">
        <div
          className="w-full h-[280px] md:h-[340px]"
          style={{ background: "var(--page-gradient)" }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-navy-1 via-navy-1/40 to-transparent" />
        <div className="absolute inset-0 flex flex-col justify-end p-6 md:p-10">
          <h2 className="text-foreground text-2xl md:text-3xl font-bold mb-2">
            Ratings & Performance Analysis
          </h2>
          <p className="text-cyan text-sm">
            Cross-referenced performance metrics across all platforms
          </p>
        </div>
      </motion.div>

      {/* KPI Cards — 4-column */}
      <motion.div {...fadeIn} transition={{ delay: 0.05, duration: 0.5 }}>
        <MaybeLockedSection locked={locked} feature="ratings">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <KPICard label="Average Rating" value={stats.avgRating?.toFixed(2) ?? "—"} sub="out of 10" color="#C9A86A" />
            <KPICard label="Median Rating" value={stats.medianRating?.toFixed(1) ?? "—"} sub="50th percentile" color="#4A8F6B" />
            <KPICard label="Latest Score" value={latestRating?.toFixed(1) ?? "—"} sub="most recent review" color="#516B84" />
            <KPICard label="Total Reviews" value={stats.totalReviews.toLocaleString()} sub={`~${avgMonthly}/month`} color="#C9A86A" />
          </div>
        </MaybeLockedSection>
      </motion.div>

      {/* Rating Distribution */}
      <motion.div {...fadeIn} transition={{ delay: 0.1, duration: 0.5 }}>
        <SectionTitle title="Rating Distribution" subtitle="Breakdown of guest scores" />
        <MaybeLockedSection locked={locked} feature="ratings">
          <RatingDistribution
            ratingDistribution={stats.ratingDistribution}
            totalReviews={stats.totalReviews}
          />
        </MaybeLockedSection>
      </motion.div>

      {/* Platform Performance */}
      {platformBreakdown.length > 0 && (
        <motion.div {...fadeIn} transition={{ delay: 0.15, duration: 0.5 }}>
          <SectionTitle title="Platform Performance" subtitle="Average rating per review platform" />
          <MaybeLockedSection locked={locked} feature="ratings">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {platformBreakdown.map((p) => {
                const meta = PLATFORM_LABELS[p.source] ?? { label: p.source, color: "#7e93b2" };
                return (
                  <GlassCard key={p.source}>
                    <div className="text-center">
                      <p className="text-xs uppercase tracking-wider mb-2 font-medium" style={{ color: meta.color }}>{meta.label}</p>
                      <p className="text-foreground text-3xl font-bold">{p.avgRating ? p.avgRating.toFixed(2) : "—"}</p>
                      <p className="text-muted text-xs mt-1">{p.count.toLocaleString()} reviews</p>
                    </div>
                  </GlassCard>
                );
              })}
            </div>
          </MaybeLockedSection>
        </motion.div>
      )}

      {/* Average Ratings by Segment */}
      <motion.div {...fadeIn} transition={{ delay: 0.2, duration: 0.5 }}>
        <SectionTitle title="Average Ratings by Segment" subtitle="Performance breakdown across guest segments" />
        <MaybeLockedSection locked={locked} feature="ratings">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <TravellerTypes
              data={stats.byTravelerType}
              totalReviews={stats.totalReviews}
              showRatings={!locked}
            />
            <GuestOrigins
              data={stats.byUserLocation}
              totalReviews={stats.totalReviews}
              showRatings={!locked}
            />
          </div>
          <div className="mt-5">
            <RoomTypes
              data={stats.byRoomInfo}
              totalReviews={stats.totalReviews}
              showRatings={!locked}
            />
          </div>
        </MaybeLockedSection>
      </motion.div>

      {/* Guest Cross-Insights Drill-down */}
      {stats.guestCombinations.length > 0 && (
        <motion.div {...fadeIn} transition={{ delay: 0.25, duration: 0.5 }}>
          <SectionTitle title="Guest Cross-Insights Drill-down" subtitle="Multi-dimensional guest analysis by origin and traveller type" />
          <MaybeLockedSection locked={locked} feature="ratings">
            <GuestCombinations data={stats.guestCombinations} totalReviews={stats.totalReviews} />
          </MaybeLockedSection>
        </motion.div>
      )}

      {/* Monthly Average Rating — 12-month lookback */}
      {last12Months.length > 0 && (
        <motion.div {...fadeIn} transition={{ delay: 0.3, duration: 0.5 }}>
          <SectionTitle title="Monthly Average Rating" subtitle="12-month performance trend" />
          <MaybeLockedSection locked={locked} feature="ratings">
            <MonthlyVolume data={last12Months} showRatings={!locked} />
          </MaybeLockedSection>
        </motion.div>
      )}
    </div>
  );

  return content;
}

function MaybeLockedSection({ locked, feature, children }: { locked: boolean; feature: string; children: React.ReactNode }) {
  if (!locked) return <>{children}</>;
  return (
    <LockedOverlay feature={feature} plan="free">
      {children}
    </LockedOverlay>
  );
}

/** Inline KPI card for Ratings page */
function KPICard({ label, value, sub, color }: { label: string; value: string; sub: string; color: string }) {
  return (
    <div
      className="rounded-2xl p-5 text-center"
      style={{
        background: `linear-gradient(135deg, ${color}15, ${color}05)`,
        border: `1px solid ${color}25`,
      }}
    >
      <p className="text-xs uppercase tracking-wider mb-1 font-medium" style={{ color }}>{label}</p>
      <p className="text-foreground text-3xl font-bold">{value}</p>
      <p className="text-muted text-xs mt-1">{sub}</p>
    </div>
  );
}
