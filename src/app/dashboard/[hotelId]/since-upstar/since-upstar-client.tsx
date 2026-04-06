"use client";

import { motion } from "framer-motion";
import type { SinceUpstarData } from "@/lib/since-upstar";
import SectionTitle from "@/components/ui/section-title";
import SentimentShift from "@/components/dashboard/sentiment-shift";
import HighImpactProblems from "@/components/dashboard/high-impact-problems";
import GuestSatisfaction from "@/components/dashboard/guest-satisfaction";

const fadeIn = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5 },
};

function formatMonth(m: string) {
  const [y, mo] = m.split("-");
  return `${mo}/${y.slice(2)}`;
}

interface SinceUpstarClientProps {
  hotelName: string;
  data: SinceUpstarData | null;
}

export default function SinceUpstarClient({ hotelName, data }: SinceUpstarClientProps) {
  if (!data) {
    return (
      <div className="text-center py-20">
        <h2 className="text-foreground text-2xl font-bold mb-2">{hotelName} — Since UpStar</h2>
        <p className="text-muted">
          Not enough data yet. At least 2 months of reviews are needed for before/after comparison.
        </p>
      </div>
    );
  }

  const { before, after, ratingJump, categoryChanges, improvedCount, totalNegCategories } = data;

  return (
    <div className="space-y-10">
      {/* Hero */}
      <motion.div {...fadeIn} className="relative rounded-3xl overflow-hidden">
        <div
          className="w-full h-[200px] md:h-[280px]"
          style={{
            background: "var(--page-gradient)",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-navy-1 via-navy-1/50 to-transparent" />
        <div className="absolute inset-0 flex flex-col justify-end p-6 md:p-10">
          <h2 className="text-foreground text-2xl md:text-3xl font-bold mb-1">
            Since UpStar
          </h2>
          <p className="text-cyan text-sm">
            Turning review noise into operational and commercial decisions
          </p>
          <p className="text-muted text-xs mt-1">
            ({formatMonth(before.startMonth)} {"\u2013"} {formatMonth(before.endMonth)} vs {formatMonth(after.startMonth)} {"\u2013"} {formatMonth(after.endMonth)})
          </p>
        </div>
      </motion.div>

      {/* Rating Jump */}
      {ratingJump && (
        <motion.div {...fadeIn} transition={{ delay: 0.05, duration: 0.5 }}>
          <div className="flex flex-col md:flex-row items-center justify-center gap-6 py-6">
            <div className="text-center">
              <div
                className="inline-flex items-center justify-center w-28 h-28 rounded-2xl text-4xl font-bold"
                style={{
                  background: "rgba(255,140,66,0.15)",
                  border: "2px solid rgba(255,140,66,0.3)",
                  color: "#ff8c42",
                }}
              >
                {ratingJump.before.toFixed(1)}
              </div>
              <p className="text-[var(--text-tertiary)] text-xs mt-2">Before UpStar</p>
            </div>

            <div className="flex flex-col items-center">
              <svg className="w-10 h-10 text-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </div>

            <div className="text-center">
              <div
                className="inline-flex items-center justify-center w-28 h-28 rounded-2xl text-4xl font-bold"
                style={{
                  background: "rgba(53,221,159,0.15)",
                  border: "2px solid rgba(53,221,159,0.3)",
                  color: "#4A8F6B",
                }}
              >
                {ratingJump.after.toFixed(1)}
              </div>
              <p className="text-[var(--text-tertiary)] text-xs mt-2">With UpStar</p>
            </div>
          </div>

          {ratingJump.after > ratingJump.before && (
            <p className="text-center text-gold text-sm font-semibold">
              Rating jump on Booking.com: +{(ratingJump.after - ratingJump.before).toFixed(1)} points
            </p>
          )}
        </motion.div>
      )}

      {/* Sentiment Shift */}
      <motion.div {...fadeIn} transition={{ delay: 0.1, duration: 0.5 }}>
        <SectionTitle title="Sentiment Shift" subtitle="How guest sentiment changed between periods" />
        <SentimentShift before={before} after={after} />
      </motion.div>

      {/* Category Improvements Summary */}
      {totalNegCategories > 0 && (
        <motion.div {...fadeIn} transition={{ delay: 0.15, duration: 0.5 }}>
          <div
            className="rounded-2xl p-5 text-center"
            style={{
              background: "linear-gradient(135deg, rgba(53,221,159,0.1), rgba(53,221,159,0.03))",
              border: "1px solid rgba(53,221,159,0.15)",
            }}
          >
            <p className="text-success text-4xl font-bold">{improvedCount}</p>
            <p className="text-foreground text-sm mt-1">
              out of {totalNegCategories} complaint categories improved
            </p>
          </div>
        </motion.div>
      )}

      {/* High Impact Problems */}
      {categoryChanges.length > 0 && (
        <motion.div {...fadeIn} transition={{ delay: 0.2, duration: 0.5 }}>
          <SectionTitle title="Impact on Issues" subtitle="Complaint categories that showed improvement" />
          <HighImpactProblems changes={categoryChanges} />
        </motion.div>
      )}

      {/* Guest Satisfaction */}
      <motion.div {...fadeIn} transition={{ delay: 0.25, duration: 0.5 }}>
        <SectionTitle title="Guest Satisfaction" subtitle="Overall rating comparison between periods" />
        <GuestSatisfaction before={before} after={after} />
      </motion.div>
    </div>
  );
}
