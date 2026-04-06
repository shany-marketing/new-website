"use client";

interface ResponseRateCardProps {
  respondedCount: number;
  totalCount: number;
  percent: number;
}

export default function ResponseRateCard({ respondedCount, totalCount, percent }: ResponseRateCardProps) {
  const color = percent >= 80 ? "#4A8F6B" : percent >= 50 ? "#C9A86A" : "#B85050";

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
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-muted uppercase tracking-wider truncate">Response Rate</p>
          <p className="text-2xl font-extrabold text-foreground truncate">{percent}%</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-medium text-muted uppercase tracking-wider truncate">Responded</p>
          <p className="text-lg font-bold text-[var(--text-secondary)] truncate">
            {respondedCount.toLocaleString()} / {totalCount.toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  );
}
