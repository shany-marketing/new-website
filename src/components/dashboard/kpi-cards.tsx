"use client";

import { useState } from "react";

interface KPICardsProps {
  totalReviews: number;
  avgRating: number | null;
  dateRange: { earliest: string | null; latest: string | null };
  showRatings?: boolean;
  showTeaserRating?: boolean;
}

interface CardData {
  label: string;
  value: string;
  subLabel: string;
  subValue: string;
  color: string;
}

export default function KPICards({ totalReviews, avgRating, dateRange, showRatings = true, showTeaserRating = false }: KPICardsProps) {
  const cards: CardData[] = [
    {
      label: "Total Reviews",
      value: totalReviews.toLocaleString(),
      subLabel: "Data Period",
      subValue: dateRange.earliest && dateRange.latest
        ? `${dateRange.earliest.slice(5, 7)}/${dateRange.earliest.slice(0, 4)} \u2013 ${dateRange.latest.slice(5, 7)}/${dateRange.latest.slice(0, 4)}`
        : "N/A",
      color: "var(--gold)",
    },
  ];

  if (showRatings) {
    cards.push({
      label: "Average Rating",
      value: avgRating?.toFixed(2) ?? "N/A",
      subLabel: "Out of",
      subValue: "10.0",
      color: "#4A8F6B",
    });
  } else if (showTeaserRating && avgRating != null) {
    cards.push({
      label: "Overall Rating",
      value: avgRating.toFixed(1),
      subLabel: "Trends & breakdown",
      subValue: "Upgrade \u2192",
      color: "#516B84",
    });
  }

  const hasTwo = showRatings || (showTeaserRating && avgRating != null);

  return (
    <div className={`grid ${hasTwo ? "grid-cols-2" : "grid-cols-1"} gap-4`}>
      {cards.map((card, i) => (
        <FlipCard key={i} {...card} />
      ))}
    </div>
  );
}

function FlipCard({ label, value, subLabel, subValue, color }: CardData) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className="relative w-full h-28 cursor-pointer transition-all duration-300"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div
        className="absolute inset-0 rounded-2xl p-4 flex flex-col justify-between transition-all duration-300 overflow-hidden"
        style={{
          background: `linear-gradient(135deg, var(--glass-bg) 0%, var(--glass-bg-end) 100%)`,
          backdropFilter: "blur(12px)",
          border: `1px solid ${color}30`,
          boxShadow: "var(--card-shadow)",
        }}
      >
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl flex-shrink-0" style={{ background: `${color}20` }}>
            <svg className="w-5 h-5" style={{ color }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              {label === "Total Reviews" ? (
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              )}
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-muted uppercase tracking-wider truncate">{label}</p>
            <p className="text-2xl font-extrabold text-foreground truncate">{value}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-medium text-muted uppercase tracking-wider truncate">{subLabel}</p>
            <p className="text-lg font-bold text-[var(--text-secondary)] truncate">{subValue}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
