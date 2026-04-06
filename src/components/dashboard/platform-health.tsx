"use client";

import GlassCard from "@/components/ui/glass-card";
import type { PlatformHealthEntry } from "@/lib/stats";

interface PlatformHealthProps {
  data: PlatformHealthEntry[];
  plan?: string;
}

const PLATFORM_LABELS: Record<string, string> = {
  booking: "Booking.com",
  tripadvisor: "TripAdvisor",
  google: "Google",
  expedia: "Expedia",
};

function getHealthColor(countChange: number): string {
  if (countChange > 0) return "#4A8F6B";
  if (countChange >= -20) return "#C9A86A";
  return "#B85050";
}

function getHealthLabel(countChange: number): string {
  if (countChange > 0) return "Growing";
  if (countChange >= -20) return "Stable";
  return "Declining";
}

function ChangeArrow({ value, suffix = "%" }: { value: number; suffix?: string }) {
  if (value === 0) return <span className="text-muted text-xs">—</span>;
  const color = value > 0 ? "#4A8F6B" : "#B85050";
  const arrow = value > 0 ? "\u25B2" : "\u25BC";
  return (
    <span className="text-xs font-medium" style={{ color }}>
      {arrow} {Math.abs(value)}{suffix}
    </span>
  );
}

export default function PlatformHealth({ data, plan = "free" }: PlatformHealthProps) {
  const showRatings = plan !== "free";

  return (
    <GlassCard>
      <h3 className="text-foreground font-semibold text-base mb-4">Platform Health</h3>
      <div className="space-y-3">
        {data.map((entry) => {
          const healthColor = getHealthColor(entry.countChange);
          const healthLabel = getHealthLabel(entry.countChange);
          const isAlert = entry.countChange < -20;

          return (
            <div
              key={entry.platform}
              className="flex items-center gap-3 p-3 rounded-xl"
              style={{
                background: `${healthColor}08`,
                border: `1px solid ${healthColor}20`,
              }}
            >
              {/* Status dot */}
              <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: healthColor }} />

              {/* Platform info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-foreground text-sm font-medium truncate">
                    {PLATFORM_LABELS[entry.platform] ?? entry.platform}
                  </span>
                  {isAlert && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md" style={{ background: "#B8505020", color: "#B85050" }}>
                      ALERT
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-muted text-xs">{entry.currentMonthCount} reviews</span>
                  <ChangeArrow value={entry.countChange} />
                  {showRatings && entry.currentAvgRating != null && (
                    <>
                      <span className="text-muted text-xs">{"\u2605"} {entry.currentAvgRating.toFixed(1)}</span>
                      {entry.ratingChange != null && entry.ratingChange !== 0 && (
                        <ChangeArrow value={Math.round(entry.ratingChange * 10)} suffix="pts" />
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Health label */}
              <span className="text-[11px] font-medium px-2 py-1 rounded-lg flex-shrink-0" style={{ background: `${healthColor}15`, color: healthColor }}>
                {healthLabel}
              </span>
            </div>
          );
        })}
      </div>
    </GlassCard>
  );
}
