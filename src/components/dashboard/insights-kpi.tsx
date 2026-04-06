"use client";

import type { CategoryInsight } from "@/lib/insights";

interface InsightsKPIProps {
  insights: CategoryInsight[];
}

export default function InsightsKPI({ insights }: InsightsKPIProps) {
  const totalTopics = insights.reduce((s, i) => s + i.itemCount, 0);
  const positive = insights.filter((i) => i.sentiment === "positive");
  const negative = insights.filter((i) => i.sentiment === "negative");
  const posCount = positive.reduce((s, i) => s + i.itemCount, 0);
  const negCount = negative.reduce((s, i) => s + i.itemCount, 0);
  const posPct = totalTopics > 0 ? ((posCount / totalTopics) * 100).toFixed(1) : "0";
  const negPct = totalTopics > 0 ? ((negCount / totalTopics) * 100).toFixed(1) : "0";

  const cards = [
    { label: "Total Topics", value: totalTopics.toLocaleString(), sub: `${insights.length} categories`, color: "#516B84" },
    { label: "Total Positive", value: posCount.toLocaleString(), sub: `${posPct}% Positive`, color: "#4A8F6B" },
    { label: "Total Negative", value: negCount.toLocaleString(), sub: `${negPct}% Negative`, color: "#B85050" },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className="relative h-36 rounded-2xl p-6 flex flex-col justify-between overflow-hidden"
          style={{
            background: "linear-gradient(135deg, var(--glass-bg) 0%, var(--glass-bg-end) 100%)",
            border: `1px solid ${card.color}30`,
            boxShadow: "var(--card-shadow)",
          }}
        >
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl flex-shrink-0" style={{ background: `${card.color}15` }}>
              <svg className="w-7 h-7" style={{ color: card.color }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                {card.label === "Total Topics" && <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />}
                {card.label === "Total Positive" && <path strokeLinecap="round" strokeLinejoin="round" d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />}
                {card.label === "Total Negative" && <path strokeLinecap="round" strokeLinejoin="round" d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018a2 2 0 01.485.06l3.76.94m-7 10v5a2 2 0 002 2h.096c.5 0 .905-.405.905-.904 0-.715.211-1.413.608-2.008L17 13V4m-7 10h2m5-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.5" />}
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-muted text-base uppercase tracking-wider">{card.label}</p>
              <p className="text-foreground text-3xl font-extrabold">{card.value}</p>
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[var(--text-tertiary)] text-lg font-bold">{card.sub}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
