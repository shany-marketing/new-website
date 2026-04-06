"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import type { BaselineStats } from "@/lib/stats";
import SectionTitle from "@/components/ui/section-title";
import WidgetGrid from "@/components/ui/widget-grid";
import KPICards from "@/components/dashboard/kpi-cards";
import TravellerTypes from "@/components/dashboard/traveller-types";
import GuestOrigins from "@/components/dashboard/guest-origins";
import RoomTypes from "@/components/dashboard/room-types";
import MonthlyVolume from "@/components/dashboard/monthly-volume";
import PipelineControls from "@/components/dashboard/pipeline-controls";
import ScrapeProgress from "@/components/dashboard/scrape-progress";
import UpgradeBanner from "@/components/ui/upgrade-banner";
import NightOriginDistribution from "@/components/dashboard/night-origin-distribution";
import TextVsNonText from "@/components/dashboard/text-vs-nontext";
import CompositionCards from "@/components/dashboard/composition-cards";
import ReviewGuide from "@/components/dashboard/review-guide";
import PlatformMix from "@/components/dashboard/platform-mix";
import ReviewHeatmap from "@/components/dashboard/review-heatmap";
import ReviewDepth from "@/components/dashboard/review-depth";
import ResponseRateCard from "@/components/dashboard/response-rate-card";
import ReviewVelocityCard from "@/components/dashboard/review-velocity-card";
import LanguageBreakdown from "@/components/dashboard/language-breakdown";
import PlatformHealth from "@/components/dashboard/platform-health";

const fadeIn = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5 },
};

interface StatisticsClientProps {
  hotelId: string;
  hotelName: string;
  stats: BaselineStats | null;
  plan?: "free" | "ratings" | "premium";
  canRunPipeline?: boolean;
}

const PLATFORM_LABELS: Record<string, string> = {
  booking: "Booking.com",
  tripadvisor: "TripAdvisor",
  google: "Google",
  expedia: "Expedia",
};

export default function StatisticsClient({ hotelId, hotelName, stats, plan = "free", canRunPipeline = false }: StatisticsClientProps) {
  const isPremium = plan === "premium";
  const [scraping, setScraping] = useState(false);

  if (!stats || stats.totalReviews === 0) {
    return (
      <div className="space-y-8">
        <motion.div {...fadeIn}>
          <div className="text-center py-12">
            <h2 className="text-foreground text-2xl font-bold mb-2">{hotelName}</h2>
            <p className="text-muted">No review data yet. Ingest reviews via the webhook to see analytics.</p>
          </div>
        </motion.div>
        <ScrapeProgress hotelId={hotelId} onScrapingChange={setScraping} />
        {isPremium && <PipelineControls hotelId={hotelId} canRunPipeline={canRunPipeline} hideOnComplete disabled={scraping} />}
      </div>
    );
  }

  function renderWidget(widgetId: string) {
    if (!stats) return null;
    switch (widgetId) {
      case "traveller-types":
        return <TravellerTypes data={stats.byTravelerType} totalReviews={stats.totalReviews} showRatings={false} />;
      case "guest-origins":
        return <GuestOrigins data={stats.byUserLocation} totalReviews={stats.totalReviews} showRatings={false} />;
      case "language-breakdown":
        return stats.byLanguage.length > 0 ? <LanguageBreakdown data={stats.byLanguage} totalReviews={stats.totalReviews} /> : null;
      case "room-types":
        return <RoomTypes data={stats.byRoomInfo} totalReviews={stats.totalReviews} showRatings={false} />;
      case "monthly-volume":
        return <MonthlyVolume data={stats.monthlyVolume} showRatings={false} />;
      case "night-origin":
        return stats.nightOrigins.length > 0 ? <NightOriginDistribution data={stats.nightOrigins} showRatings={false} /> : null;
      case "platform-mix":
        return stats.platformMix.length > 0 ? <PlatformMix data={stats.platformMix} totalReviews={stats.totalReviews} hotelId={hotelId} /> : null;
      case "review-depth":
        return stats.reviewDepth ? <ReviewDepth data={stats.reviewDepth} totalReviews={stats.totalReviews} /> : null;
      case "platform-health":
        return stats.platformHealth && stats.platformHealth.length > 0 ? <PlatformHealth data={stats.platformHealth} plan={plan} /> : null;
      case "review-heatmap":
        return stats.reviewHeatmap.length > 0 ? <ReviewHeatmap data={stats.reviewHeatmap} /> : null;
      case "text-vs-nontext":
        return stats.reviewComposition.length > 0 ? <TextVsNonText data={stats.reviewComposition} totalReviews={stats.totalReviews} showRatings={false} /> : null;
      case "composition-cards":
        return stats.reviewComposition.length > 0 ? <CompositionCards data={stats.reviewComposition} totalReviews={stats.totalReviews} showRatings={false} /> : null;
      case "review-guide":
        return <ReviewGuide />;
      default:
        return null;
    }
  }

  return (
    <div className="space-y-10">
      {/* Hero with KPI */}
      <motion.div {...fadeIn} className="relative rounded-3xl overflow-hidden">
        <div
          className="w-full h-[280px] md:h-[340px]"
          style={{
            background: "var(--page-gradient)",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-navy-1 via-navy-1/40 to-transparent" />
        <div className="absolute inset-0 flex flex-col justify-end p-6 md:p-10">
          <h2 className="text-foreground text-2xl md:text-3xl font-bold mb-2">
            {hotelName} — Statistical Analysis
          </h2>
          <p className="text-cyan text-sm mb-6">
            Annual Performance Dashboard {"\u2022"} {stats.dateRange.earliest?.slice(0, 4) ?? ""} {"\u2013"} {stats.dateRange.latest?.slice(0, 4) ?? ""}
            {stats.platformMix.length > 0 &&
              !(stats.platformMix.length === 1 && stats.platformMix[0].platform === "booking") && (
              <>
                {" \u2022 "}
                <span className="text-[var(--text-secondary)]">
                  Data from{" "}
                  {stats.platformMix
                    .map(p => PLATFORM_LABELS[p.platform] ?? p.platform)
                    .join(", ")}
                </span>
              </>
            )}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <KPICards
              totalReviews={stats.totalReviews}
              avgRating={stats.avgRating}
              dateRange={stats.dateRange}
              showRatings={false}
              showTeaserRating={plan === "free"}
            />
            <ResponseRateCard
              respondedCount={stats.responseRate.respondedCount}
              totalCount={stats.responseRate.totalCount}
              percent={stats.responseRate.percent}
            />
            <ReviewVelocityCard
              recentCount={stats.reviewVelocity.recentCount}
              priorCount={stats.reviewVelocity.priorCount}
              percentChange={stats.reviewVelocity.percentChange}
              periodLabel={stats.reviewVelocity.periodLabel}
            />
          </div>
        </div>
      </motion.div>

      {/* Scrape Progress + Pipeline Controls */}
      <motion.div {...fadeIn} transition={{ delay: 0.05, duration: 0.5 }}>
        <ScrapeProgress hotelId={hotelId} onScrapingChange={setScraping} />
      </motion.div>
      {isPremium && (
        <motion.div {...fadeIn} transition={{ delay: 0.05, duration: 0.5 }}>
          <PipelineControls hotelId={hotelId} canRunPipeline={canRunPipeline} hideOnComplete disabled={scraping} />
        </motion.div>
      )}

      {/* Upgrade banner for free users */}
      {plan === "free" && (
        <motion.div {...fadeIn} transition={{ delay: 0.05, duration: 0.5 }}>
          <UpgradeBanner feature="Ratings Analysis, Insights, and more — starting at $99/mo" />
        </motion.div>
      )}

      {/* Section 1: Guest Profile */}
      <motion.div {...fadeIn} transition={{ delay: 0.1, duration: 0.5 }}>
        <SectionTitle title="A Look at the Guests" subtitle="Traveller profiles, guest origins, and review languages" />
        <WidgetGrid section="guest-profile" plan={plan}>
          {renderWidget}
        </WidgetGrid>
      </motion.div>

      {/* Section 2: Stay Patterns */}
      <motion.div {...fadeIn} transition={{ delay: 0.15, duration: 0.5 }}>
        <SectionTitle title="Guest Stay Patterns" subtitle="Room types and monthly review trends" />
        <WidgetGrid section="stay-patterns" plan={plan}>
          {renderWidget}
        </WidgetGrid>
      </motion.div>

      {/* Section 3: Night-Origin Distribution */}
      {stats.nightOrigins.length > 0 && (
        <motion.div {...fadeIn} transition={{ delay: 0.2, duration: 0.5 }}>
          <WidgetGrid section="night-origin" plan={plan}>
            {renderWidget}
          </WidgetGrid>
        </motion.div>
      )}

      {/* Section 4: Platform Mix, Depth & Health */}
      {(stats.platformMix.length > 0 || stats.reviewDepth || (stats.platformHealth && stats.platformHealth.length > 0)) && (
        <motion.div {...fadeIn} transition={{ delay: 0.25, duration: 0.5 }}>
          <SectionTitle title="Review Intelligence" subtitle="Platform distribution, feedback depth, and health trends" />
          <WidgetGrid section="review-intelligence" plan={plan}>
            {renderWidget}
          </WidgetGrid>
        </motion.div>
      )}

      {/* Section 5: Seasonality Heatmap */}
      {stats.reviewHeatmap.length > 0 && (
        <motion.div {...fadeIn} transition={{ delay: 0.3, duration: 0.5 }}>
          <SectionTitle title="Timing & Seasonality" subtitle="When your guests post reviews" />
          <WidgetGrid section="seasonality" plan={plan}>
            {renderWidget}
          </WidgetGrid>
        </motion.div>
      )}

      {/* Section 6: Review Composition */}
      {stats.reviewComposition.length > 0 && (
        <motion.div {...fadeIn} transition={{ delay: 0.35, duration: 0.5 }}>
          <SectionTitle title="Review Composition" subtitle="How guests structure their feedback" />
          <WidgetGrid section="composition" plan={plan}>
            {renderWidget}
          </WidgetGrid>
        </motion.div>
      )}

      {/* Section 7: Review Structure Guide */}
      <motion.div {...fadeIn} transition={{ delay: 0.4, duration: 0.5 }}>
        <WidgetGrid section="guide" plan={plan}>
          {renderWidget}
        </WidgetGrid>
      </motion.div>
    </div>
  );
}
