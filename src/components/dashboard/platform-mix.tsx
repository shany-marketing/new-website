"use client";

import Link from "next/link";
import GlassCard from "@/components/ui/glass-card";
import type { PlatformMixEntry } from "@/lib/stats";

interface PlatformMixProps {
  data: PlatformMixEntry[];
  totalReviews: number;
  hotelId: string;
}

const PLATFORM_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  booking:     { label: "Booking.com",  color: "#003b95", icon: "B" },
  tripadvisor: { label: "TripAdvisor",  color: "#00aa6c", icon: "T" },
  google:      { label: "Google",       color: "#4285f4", icon: "G" },
  expedia:     { label: "Expedia",      color: "#f5a623", icon: "E" },
};

export default function PlatformMix({ data, totalReviews, hotelId }: PlatformMixProps) {
  if (data.length === 0) return null;

  const maxCount = Math.max(...data.map(d => d.count));

  return (
    <GlassCard>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
          </svg>
          <h3 className="text-foreground font-semibold text-base">Platform Mix</h3>
        </div>
      </div>

      <div className="space-y-3">
        {data.filter((entry) => entry.count > 0).map((entry) => {
          const config = PLATFORM_CONFIG[entry.platform] ?? {
            label: entry.platform,
            color: "#7e93b2",
            icon: entry.platform[0]?.toUpperCase() ?? "?",
          };
          const pct = totalReviews > 0 ? Math.round((entry.count / totalReviews) * 100) : 0;
          const barWidth = maxCount > 0 ? (entry.count / maxCount) * 100 : 0;

          return (
            <div key={entry.platform} className="group">
              <div className="flex items-center gap-3 mb-1">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                  style={{ background: config.color }}
                >
                  {config.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-foreground text-sm font-medium">{config.label}</span>
                    <span className="text-muted text-xs">
                      {entry.count.toLocaleString()} <span className="text-[var(--text-tertiary)]">({pct}%)</span>
                    </span>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden" style={{ background: `${config.color}15` }}>
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${barWidth}%`, background: config.color }}
                    />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {data.length === 1 && (
        <Link
          href={`/dashboard/${hotelId}/settings`}
          className="flex items-center gap-2 mt-5 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all hover:scale-[1.02]"
          style={{
            background: "rgba(252,219,55,0.08)",
            border: "1px solid rgba(252,219,55,0.15)",
            color: "var(--gold)",
          }}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          <span>Connect another platform <span className="font-normal text-[var(--text-tertiary)]">— reviews import automatically</span></span>
        </Link>
      )}
    </GlassCard>
  );
}
