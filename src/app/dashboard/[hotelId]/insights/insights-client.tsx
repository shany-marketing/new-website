"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import type { InsightResult, CategoryTimeSeries } from "@/lib/insights";
import SectionTitle from "@/components/ui/section-title";
import InsightsKPI from "@/components/dashboard/insights-kpi";
import PositiveThemes from "@/components/dashboard/positive-themes";
import IssuesAnalysis from "@/components/dashboard/issues-analysis";
import ImpactDrivers from "@/components/dashboard/impact-drivers";
import InsightCard from "@/components/dashboard/insight-card";
import ImpactPareto from "@/components/dashboard/impact-pareto";
import ComplaintHeatmap from "@/components/dashboard/complaint-heatmap";

const fadeIn = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5 },
};

interface InsightsClientProps {
  hotelId: string;
  hotelName: string;
  insightData: InsightResult | null;
  timeSeries: CategoryTimeSeries[];
  availableMonths: string[];
  categories: Array<{ id: string; label: string; sentiment: string }>;
  locked?: boolean;
}

export default function InsightsClient({
  hotelId,
  hotelName,
  insightData,
  timeSeries,
  availableMonths,
  categories,
  locked = false,
}: InsightsClientProps) {
  // Locked teaser for non-premium users
  if (locked) {
    return (
      <div className="space-y-10">
        <motion.div {...fadeIn} className="relative rounded-3xl overflow-hidden">
          <div className="w-full h-[200px] md:h-[260px]" style={{ background: "var(--page-gradient)" }} />
          <div className="absolute inset-0 bg-gradient-to-t from-navy-1 via-navy-1/50 to-transparent" />
          <div className="absolute inset-0 flex flex-col justify-end p-6 md:p-10">
            <h2 className="text-foreground text-2xl md:text-3xl font-bold mb-1">Key Factors Behind Guest Reviews</h2>
            <p className="text-cyan text-sm">In-depth analysis of guest feedback themes</p>
          </div>
        </motion.div>

        {/* Teaser cards */}
        <motion.div {...fadeIn} transition={{ delay: 0.1, duration: 0.5 }}>
          <div className="relative">
            <div className="pointer-events-none select-none" style={{ filter: "blur(6px)" }}>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {["Positive Themes", "Key Issues", "Impact Drivers", "Action Items"].map((label) => (
                  <div key={label} className="rounded-2xl p-6 text-center" style={{ background: "rgba(201,168,106,0.08)", border: "1px solid rgba(201,168,106,0.15)" }}>
                    <p className="text-gold text-xs uppercase tracking-wider mb-2">{label}</p>
                    <p className="text-foreground text-3xl font-bold">--</p>
                    <p className="text-muted text-xs mt-1">categories analyzed</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-navy-1/60 backdrop-blur-[2px] rounded-2xl">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-3" style={{ background: "rgba(201,168,106,0.15)", border: "1px solid rgba(201,168,106,0.25)" }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="1.5" strokeLinecap="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0110 0v4" />
                </svg>
              </div>
              <p className="text-foreground font-semibold text-sm mb-1">Unlock AI Insights</p>
              <p className="text-muted text-xs mb-4">Executive summaries, root causes & action items — $999/mo</p>
              <Link
                href="/pricing"
                className="inline-block px-5 py-2.5 rounded-xl text-xs font-semibold text-navy-1 transition-opacity hover:opacity-90"
                style={{ background: "linear-gradient(to right, var(--gold), var(--gold-dark))" }}
              >
                View Plans
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  if (!insightData || insightData.categoryInsights.length === 0) {
    return (
      <div className="text-center py-20">
        <h2 className="text-foreground text-2xl font-bold mb-2">{hotelName} — Insights</h2>
        <p className="text-muted">
          No insights available yet. Run the full pipeline from the Overview tab to generate insights.
        </p>
      </div>
    );
  }

  const { categoryInsights, executiveSummary } = insightData;

  return (
    <div className="space-y-10">
      {/* Hero */}
      <motion.div {...fadeIn} className="relative rounded-3xl overflow-hidden">
        <div
          className="w-full h-[200px] md:h-[260px]"
          style={{
            background: "var(--page-gradient)",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-navy-1 via-navy-1/50 to-transparent" />
        <div className="absolute inset-0 flex flex-col justify-end p-6 md:p-10">
          <h2 className="text-foreground text-2xl md:text-3xl font-bold mb-1">
            Key Factors Behind Guest Reviews
          </h2>
          <p className="text-cyan text-sm">
            In-depth analysis of guest feedback themes
          </p>
        </div>
      </motion.div>

      {/* Executive Summary */}
      {executiveSummary && (
        <motion.div {...fadeIn} transition={{ delay: 0.05, duration: 0.5 }}>
          <div
            className="rounded-2xl p-5"
            style={{
              background: "linear-gradient(135deg, rgba(252,219,55,0.08), rgba(170,138,0,0.04))",
              border: "1px solid rgba(252,219,55,0.15)",
            }}
          >
            <p className="text-gold text-xs uppercase tracking-wider mb-2">Executive Summary</p>
            <p className="text-[var(--text-secondary)] text-sm leading-relaxed">{executiveSummary}</p>
          </div>
        </motion.div>
      )}

      {/* KPI Cards */}
      <motion.div {...fadeIn} transition={{ delay: 0.1, duration: 0.5 }}>
        <InsightsKPI insights={categoryInsights} />
      </motion.div>

      {/* Positive Themes */}
      <motion.div {...fadeIn} transition={{ delay: 0.15, duration: 0.5 }}>
        <PositiveThemes insights={categoryInsights} />
      </motion.div>

      {/* Issues */}
      <motion.div {...fadeIn} transition={{ delay: 0.2, duration: 0.5 }}>
        <IssuesAnalysis insights={categoryInsights} />
      </motion.div>

      {/* Complaint Heatmap — Data → Action → Follow-up */}
      {timeSeries.length > 0 && (
        <motion.div {...fadeIn} transition={{ delay: 0.25, duration: 0.5 }}>
          <ComplaintHeatmap
            hotelId={hotelId}
            timeSeries={timeSeries}
            availableMonths={availableMonths}
            categories={categories}
          />
        </motion.div>
      )}

      {/* Impact Drivers */}
      <motion.div {...fadeIn} transition={{ delay: 0.3, duration: 0.5 }}>
        <ImpactDrivers insights={categoryInsights} />
      </motion.div>

      {/* Impact Pareto / Issue Prioritization */}
      <motion.div {...fadeIn} transition={{ delay: 0.32, duration: 0.5 }}>
        <ImpactPareto insights={categoryInsights} />
      </motion.div>

      {/* Individual Category Cards */}
      <motion.div {...fadeIn} transition={{ delay: 0.35, duration: 0.5 }}>
        <SectionTitle
          title="Category Deep Dive"
          subtitle="Detailed analysis per category with root causes and action items"
        />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {categoryInsights.map((insight) => (
            <InsightCard key={insight.category} insight={insight} />
          ))}
        </div>
      </motion.div>
    </div>
  );
}
