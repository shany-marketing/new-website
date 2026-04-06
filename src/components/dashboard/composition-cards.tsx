"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import GlassCard from "@/components/ui/glass-card";
import type { ReviewComposition } from "@/lib/stats";

interface CompositionCardsProps {
  data: ReviewComposition[];
  totalReviews: number;
  showRatings?: boolean;
}

function getRatingColor(r: number) {
  if (r >= 8.0) return "#4A8F6B";
  if (r >= 7.0) return "#C9A86A";
  return "#ff8c42";
}

interface CompositionType {
  label: string;
  hasLiked: boolean;
  hasDisliked: boolean;
  hasTitle: boolean;
  count: number;
  percent: number;
  avgRating: number;
}

export default function CompositionCards({ data, totalReviews, showRatings = true }: CompositionCardsProps) {
  const [selected, setSelected] = useState<number | null>(null);

  const compositions = useMemo(() => {
    // Group into meaningful categories
    const types: CompositionType[] = [];
    const total = data.reduce((s, d) => s + d.count, 0);

    // Full Review: has liked + disliked + title
    const full = data.filter(d => d.hasLiked && d.hasDisliked && d.hasTitle);
    const fullCount = full.reduce((s, d) => s + d.count, 0);
    const fullRating = fullCount > 0 ? full.reduce((s, d) => s + d.avgRating * d.count, 0) / fullCount : 0;
    if (fullCount > 0) {
      types.push({
        label: "Full Review",
        hasLiked: true, hasDisliked: true, hasTitle: true,
        count: fullCount,
        percent: total > 0 ? Math.round((fullCount / total) * 100) : 0,
        avgRating: Math.round(fullRating * 100) / 100,
      });
    }

    // Liked & Disliked (no title)
    const likedDisliked = data.filter(d => d.hasLiked && d.hasDisliked && !d.hasTitle);
    const ldCount = likedDisliked.reduce((s, d) => s + d.count, 0);
    const ldRating = ldCount > 0 ? likedDisliked.reduce((s, d) => s + d.avgRating * d.count, 0) / ldCount : 0;
    if (ldCount > 0) {
      types.push({
        label: "Liked & Disliked",
        hasLiked: true, hasDisliked: true, hasTitle: false,
        count: ldCount,
        percent: total > 0 ? Math.round((ldCount / total) * 100) : 0,
        avgRating: Math.round(ldRating * 100) / 100,
      });
    }

    // Score Only (no text at all)
    const scoreOnly = data.filter(d => !d.hasLiked && !d.hasDisliked);
    const soCount = scoreOnly.reduce((s, d) => s + d.count, 0);
    const soRating = soCount > 0 ? scoreOnly.reduce((s, d) => s + d.avgRating * d.count, 0) / soCount : 0;
    if (soCount > 0) {
      types.push({
        label: "Score Only",
        hasLiked: false, hasDisliked: false, hasTitle: false,
        count: soCount,
        percent: total > 0 ? Math.round((soCount / total) * 100) : 0,
        avgRating: Math.round(soRating * 100) / 100,
      });
    }

    // Partial (liked only or disliked only)
    const partial = data.filter(d => (d.hasLiked && !d.hasDisliked) || (!d.hasLiked && d.hasDisliked));
    const pCount = partial.reduce((s, d) => s + d.count, 0);
    const pRating = pCount > 0 ? partial.reduce((s, d) => s + d.avgRating * d.count, 0) / pCount : 0;
    if (pCount > 0) {
      types.push({
        label: "Partial Review",
        hasLiked: true, hasDisliked: false, hasTitle: false,
        count: pCount,
        percent: total > 0 ? Math.round((pCount / total) * 100) : 0,
        avgRating: Math.round(pRating * 100) / 100,
      });
    }

    return types.sort((a, b) => b.count - a.count);
  }, [data]);

  if (compositions.length === 0) return null;

  return (
    <GlassCard>
      <div className="flex items-center gap-2 mb-4">
        <svg className="w-5 h-5 text-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
        <h3 className="text-foreground font-semibold text-base">Review Composition Analysis</h3>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {compositions.slice(0, 3).map((comp, i) => {
          const isActive = selected === i;
          const color = showRatings ? getRatingColor(comp.avgRating) : "#516B84";
          return (
            <button
              key={comp.label}
              onClick={() => setSelected(isActive ? null : i)}
              className="rounded-xl p-4 text-left transition-all duration-200"
              style={{
                background: isActive ? `${color}15` : "var(--input-bg)",
                border: `1px solid ${isActive ? `${color}40` : "var(--glass-border)"}`,
              }}
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full" style={{ background: color }} />
                <p className="text-foreground text-sm font-semibold">{comp.label}</p>
              </div>
              <p className="text-foreground text-2xl font-bold">{comp.percent}%</p>
              <div className="flex items-center gap-2 mt-1">
                {comp.hasLiked && <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-500/20 text-green-400">Liked</span>}
                {comp.hasDisliked && <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-400">Disliked</span>}
                {comp.hasTitle && <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400">Title</span>}
                {!comp.hasLiked && !comp.hasDisliked && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--input-bg)] text-[var(--text-tertiary)]">No text</span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      <AnimatePresence>
        {selected !== null && compositions[selected] && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mt-4 p-4 rounded-xl" style={{ background: "var(--input-bg)", border: "1px solid var(--glass-border)" }}>
              <div className="flex items-center justify-between mb-3">
                <p className="text-foreground font-semibold text-sm">{compositions[selected].label} — Details</p>
                <button onClick={() => setSelected(null)} className="text-[var(--text-tertiary)] hover:text-foreground text-lg">&times;</button>
              </div>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-muted text-xs">Count</p>
                  <p className="text-foreground font-bold text-lg">{compositions[selected].count.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-muted text-xs">Percentage</p>
                  <p className="text-gold font-bold text-lg">{compositions[selected].percent}%</p>
                </div>
                {showRatings && (
                  <div>
                    <p className="text-muted text-xs">Avg Rating</p>
                    <p className="text-cyan font-bold text-lg">{compositions[selected].avgRating.toFixed(2)}</p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </GlassCard>
  );
}
