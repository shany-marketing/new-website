"use client";

import { RatingHeroVisual, TestimonialsSection } from "@/app/home-client";

export default function GraveyardPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-start px-8 py-16 gap-20" style={{ background: "var(--background)" }}>
      <div className="w-full max-w-5xl">
        <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: "var(--muted)" }}>Graveyard</p>
        <h1 className="text-2xl font-bold mb-1" style={{ color: "var(--foreground)" }}>Archived Visuals</h1>
        <p className="text-sm" style={{ color: "var(--muted)" }}>Components and sections saved for reference. Nothing gets lost.</p>
      </div>

      {/* ── Hero Visual v1 ── */}
      <section className="w-full max-w-5xl">
        <div className="mb-6 pb-4" style={{ borderBottom: "1px solid var(--glass-border)" }}>
          <p className="text-[10px] font-semibold uppercase tracking-widest mb-1" style={{ color: "var(--muted)" }}>Homepage · Hero Section</p>
          <h2 className="text-lg font-bold" style={{ color: "var(--foreground)" }}>RatingHeroVisual v1</h2>
          <p className="text-xs mt-1" style={{ color: "var(--muted)" }}>
            6-stage animated loop: reviews in → rating drop → root cause → alert → phone push → recovery.
          </p>
        </div>
        <div className="flex justify-center">
          <RatingHeroVisual />
        </div>
      </section>

      {/* ── Testimonials v1 ── */}
      <section className="w-full max-w-5xl">
        <div className="mb-6 pb-4" style={{ borderBottom: "1px solid var(--glass-border)" }}>
          <p className="text-[10px] font-semibold uppercase tracking-widest mb-1" style={{ color: "var(--muted)" }}>Homepage · Testimonials Section</p>
          <h2 className="text-lg font-bold" style={{ color: "var(--foreground)" }}>TestimonialsSection v1</h2>
          <p className="text-xs mt-1" style={{ color: "var(--muted)" }}>
            3-up sliding carousel (desktop), 1-up (mobile). Placeholder quotes — archived pending real testimonials.
          </p>
        </div>
        <TestimonialsSection />
      </section>
    </main>
  );
}
