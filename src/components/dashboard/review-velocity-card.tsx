"use client";

interface ReviewVelocityCardProps {
  recentCount: number;
  priorCount: number;
  percentChange: number | null;
  periodLabel: string;
}

export default function ReviewVelocityCard({ recentCount, priorCount, percentChange, periodLabel }: ReviewVelocityCardProps) {
  const isUp = percentChange !== null && percentChange > 0;
  const isDown = percentChange !== null && percentChange < 0;
  const color = isUp ? "#4A8F6B" : isDown ? "#B85050" : "#516B84";

  return (
    <div
      className="rounded-2xl p-4 flex flex-col justify-between h-28 transition-all duration-300"
      style={{
        background: "linear-gradient(135deg, var(--glass-bg) 0%, var(--glass-bg-end) 100%)",
        backdropFilter: "blur(12px)",
        border: `1px solid ${color}30`,
        boxShadow: "var(--card-shadow)",
      }}
    >
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl flex-shrink-0" style={{ background: `${color}20` }}>
          <svg className="w-5 h-5" style={{ color }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            {isDown ? (
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            )}
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-muted uppercase tracking-wider truncate">Review Trend</p>
          <p className="text-2xl font-extrabold text-foreground truncate">
            {percentChange !== null ? `${isUp ? "+" : ""}${percentChange}%` : "N/A"}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-medium text-muted uppercase tracking-wider truncate">
            vs prior {periodLabel}
          </p>
          <p className="text-lg font-bold text-[var(--text-secondary)] truncate">
            {recentCount.toLocaleString()} vs {priorCount.toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  );
}
