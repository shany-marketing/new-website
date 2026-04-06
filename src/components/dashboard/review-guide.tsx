"use client";

import GlassCard from "@/components/ui/glass-card";

export default function ReviewGuide() {
  return (
    <GlassCard>
      <div className="flex items-center gap-2 mb-4">
        <svg className="w-5 h-5 text-cyan" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <h3 className="text-foreground font-semibold text-base">Understanding Review Components</h3>
      </div>

      <div
        className="rounded-xl p-4"
        style={{ background: "var(--input-bg)", border: "1px solid var(--glass-border)" }}
      >
        {/* Mock review header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[var(--input-bg)] flex items-center justify-center">
              <span className="text-[var(--text-tertiary)] text-xs">JD</span>
            </div>
            <div>
              <p className="text-foreground text-sm font-medium">John D.</p>
              <p className="text-muted text-[10px]">Reviewed: Feb 2026</p>
            </div>
          </div>
          <div
            className="px-2.5 py-1 rounded-lg text-sm font-bold"
            style={{ background: "#003b95", color: "white" }}
          >
            8.0
          </div>
        </div>

        {/* Title */}
        <div className="mb-3">
          <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400">
            Header
          </span>
          <p className="text-foreground text-sm mt-1 italic">&ldquo;Great location, room needs improvement&rdquo;</p>
        </div>

        {/* Liked */}
        <div className="mb-3 p-3 rounded-lg" style={{ background: "rgba(53,221,159,0.08)", border: "1px solid rgba(53,221,159,0.15)" }}>
          <div className="flex items-center gap-2 mb-1">
            <svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
            </svg>
            <span className="text-[10px] font-bold uppercase tracking-wider text-green-400">Liked</span>
          </div>
          <p className="text-[var(--text-secondary)] text-xs">
            &ldquo;The staff were incredibly friendly and helpful. Location was perfect, just 5 minutes from the beach.&rdquo;
          </p>
        </div>

        {/* Disliked */}
        <div className="p-3 rounded-lg" style={{ background: "rgba(255,107,107,0.08)", border: "1px solid rgba(255,107,107,0.15)" }}>
          <div className="flex items-center gap-2 mb-1">
            <svg className="w-4 h-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018a2 2 0 01.485.06l3.76.94m-7 10v5a2 2 0 002 2h.096c.5 0 .905-.405.905-.904 0-.715.211-1.413.608-2.008L17 13V4m-7 10h2m5-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.5" />
            </svg>
            <span className="text-[10px] font-bold uppercase tracking-wider text-red-400">Disliked</span>
          </div>
          <p className="text-[var(--text-secondary)] text-xs">
            &ldquo;The air conditioning was noisy and the bathroom could use a renovation.&rdquo;
          </p>
        </div>
      </div>

      <p className="text-muted text-[10px] mt-3 text-center">
        Booking.com reviews may include a title, liked text, disliked text, or just a score
      </p>
    </GlassCard>
  );
}
