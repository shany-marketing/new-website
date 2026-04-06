"use client";

import { useMemo } from "react";
import GlassCard from "@/components/ui/glass-card";
import type { ReviewComposition } from "@/lib/stats";

interface TextVsNonTextProps {
  data: ReviewComposition[];
  totalReviews: number;
  showRatings?: boolean;
}

export default function TextVsNonText({ data, totalReviews, showRatings = true }: TextVsNonTextProps) {
  const { withText, withoutText, withoutTextBuckets } = useMemo(() => {
    let withTextCount = 0;
    let withTextSum = 0;
    let withTextRatingSum = 0;
    let withoutTextCount = 0;
    let withoutTextSum = 0;
    let withoutTextRatingSum = 0;

    for (const d of data) {
      const hasText = d.hasLiked || d.hasDisliked;
      if (hasText) {
        withTextCount += d.count;
        withTextSum += d.count;
        withTextRatingSum += d.avgRating * d.count;
      } else {
        withoutTextCount += d.count;
        withoutTextSum += d.count;
        withoutTextRatingSum += d.avgRating * d.count;
      }
    }

    const withTextAvg = withTextSum > 0 ? withTextRatingSum / withTextSum : 0;
    const withoutTextAvg = withoutTextSum > 0 ? withoutTextRatingSum / withoutTextSum : 0;
    const total = withTextCount + withoutTextCount;

    // For "without text" reviews, we don't have per-rating-bucket data from this aggregation
    // but we can show the overall split
    return {
      withText: {
        count: withTextCount,
        percent: total > 0 ? Math.round((withTextCount / total) * 100) : 0,
        avgRating: Math.round(withTextAvg * 100) / 100,
      },
      withoutText: {
        count: withoutTextCount,
        percent: total > 0 ? Math.round((withoutTextCount / total) * 100) : 0,
        avgRating: Math.round(withoutTextAvg * 100) / 100,
      },
      withoutTextBuckets: null, // Could be computed with finer-grained SQL
    };
  }, [data]);

  if (data.length === 0) return null;

  // Both sides need reviews for a meaningful comparison
  const hasBothSides = withText.count > 0 && withoutText.count > 0;
  const higher = withoutText.avgRating > withText.avgRating ? "without" : "with";

  return (
    <GlassCard>
      <div className="flex items-center gap-2 mb-4">
        <svg className="w-5 h-5 text-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <h3 className="text-foreground font-semibold text-base">Reviews: Text vs Non-Text</h3>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        {/* Without Text */}
        <div
          className="rounded-xl p-4 text-center"
          style={{ background: "rgba(147,220,246,0.08)", border: "1px solid rgba(147,220,246,0.15)" }}
        >
          <p className="text-cyan text-xs uppercase tracking-wider mb-2">Without Text</p>
          <p className="text-foreground text-3xl font-bold">{withoutText.percent}%</p>
          <p className="text-[var(--text-tertiary)] text-xs mt-1">{withoutText.count} reviews</p>
          {showRatings && withoutText.count > 0 && (
            <p className="text-cyan text-sm font-semibold mt-2">Avg {withoutText.avgRating.toFixed(2)}</p>
          )}
        </div>

        {/* With Text */}
        <div
          className="rounded-xl p-4 text-center"
          style={{ background: "rgba(252,219,55,0.08)", border: "1px solid rgba(252,219,55,0.15)" }}
        >
          <p className="text-gold text-xs uppercase tracking-wider mb-2">With Text</p>
          <p className="text-foreground text-3xl font-bold">{withText.percent}%</p>
          <p className="text-[var(--text-tertiary)] text-xs mt-1">{withText.count} reviews</p>
          {showRatings && withText.count > 0 && (
            <p className="text-gold text-sm font-semibold mt-2">Avg {withText.avgRating.toFixed(2)}</p>
          )}
        </div>
      </div>

      {/* Insight — only show when both sides have data for a meaningful comparison */}
      <div
        className="rounded-xl p-3 mt-3"
        style={{ background: "rgba(252,219,55,0.06)", border: "1px solid rgba(252,219,55,0.1)" }}
      >
        <p className="text-gold-light text-xs">
          <span className="font-semibold">Insight:</span>{" "}
          {hasBothSides ? (
            showRatings ? (
              <>
                Reviews {higher} text tend to have higher ratings
                ({higher === "without" ? withoutText.avgRating.toFixed(2) : withText.avgRating.toFixed(2)} vs{" "}
                {higher === "without" ? withText.avgRating.toFixed(2) : withoutText.avgRating.toFixed(2)})
              </>
            ) : (
              <>{withText.count.toLocaleString()} reviews include text, {withoutText.count.toLocaleString()} are score-only</>
            )
          ) : withText.count > 0 && withoutText.count === 0 ? (
            <>All {withText.count.toLocaleString()} reviews include text feedback{showRatings ? ` (avg ${withText.avgRating.toFixed(2)})` : ""}</>
          ) : withoutText.count > 0 && withText.count === 0 ? (
            <>All {withoutText.count.toLocaleString()} reviews are rating-only with no text{showRatings ? ` (avg ${withoutText.avgRating.toFixed(2)})` : ""}</>
          ) : (
            <>No review data available yet</>
          )}
        </p>
      </div>
    </GlassCard>
  );
}
