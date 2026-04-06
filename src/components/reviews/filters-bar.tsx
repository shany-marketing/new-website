"use client";

import { PLATFORM_CONFIG } from "@/types/platform";
import type { ReviewSource } from "@/types/platform";
import type { ReviewFilters } from "@/types/reviews";

interface FiltersBarProps {
  filters: ReviewFilters;
  onChange: (filters: ReviewFilters) => void;
  activeSource?: ReviewSource;
}

export default function FiltersBar({ filters, onChange, activeSource = "booking" }: FiltersBarProps) {
  const set = (patch: Partial<ReviewFilters>) => onChange({ ...filters, ...patch, page: 1 });
  const platformLabel = PLATFORM_CONFIG[activeSource]?.label || "Platform";

  return (
    <div
      className="rounded-2xl p-4 flex flex-wrap gap-3 items-center"
      style={{
        background: "linear-gradient(135deg, var(--glass-bg-end), var(--input-bg))",
        border: "1px solid var(--glass-border)",
      }}
    >
      {/* Search */}
      <input
        type="text"
        placeholder="Search reviews..."
        value={filters.search || ""}
        onChange={(e) => set({ search: e.target.value })}
        className="flex-1 min-w-[180px] px-3 py-2 rounded-lg text-sm text-foreground placeholder:text-muted focus:outline-none"
        style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)" }}
      />

      {/* Rating Min/Max */}
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-muted">Rating</span>
        <input
          type="number"
          min={1}
          max={10}
          step={0.5}
          placeholder="Min"
          value={filters.ratingMin ?? ""}
          onChange={(e) =>
            set({ ratingMin: e.target.value ? parseFloat(e.target.value) : undefined })
          }
          className="w-16 px-2 py-2 rounded-lg text-sm text-foreground placeholder:text-muted focus:outline-none"
          style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)" }}
        />
        <span className="text-muted text-xs">-</span>
        <input
          type="number"
          min={1}
          max={10}
          step={0.5}
          placeholder="Max"
          value={filters.ratingMax ?? ""}
          onChange={(e) =>
            set({ ratingMax: e.target.value ? parseFloat(e.target.value) : undefined })
          }
          className="w-16 px-2 py-2 rounded-lg text-sm text-foreground placeholder:text-muted focus:outline-none"
          style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)" }}
        />
      </div>

      {/* Response Status */}
      <select
        value={filters.responseStatus || "all"}
        onChange={(e) => set({ responseStatus: e.target.value as ReviewFilters["responseStatus"] })}
        className="px-3 py-2 rounded-lg text-sm text-foreground focus:outline-none cursor-pointer"
        style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)" }}
      >
        <option value="all">All Responses</option>
        <option value="none">No Response</option>
        <option value="ai">AI Generated</option>
        <option value="scraped">Scraped Response</option>
        <option value="sent">Sent to {platformLabel}</option>
      </select>

      {/* Sort */}
      <select
        value={`${filters.sortBy || "date"}-${filters.sortOrder || "desc"}`}
        onChange={(e) => {
          const [sortBy, sortOrder] = e.target.value.split("-") as [ReviewFilters["sortBy"], ReviewFilters["sortOrder"]];
          set({ sortBy, sortOrder });
        }}
        className="px-3 py-2 rounded-lg text-sm text-foreground focus:outline-none cursor-pointer"
        style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)" }}
      >
        <option value="date-desc">Newest First</option>
        <option value="date-asc">Oldest First</option>
        <option value="rating-desc">Highest Rating</option>
        <option value="rating-asc">Lowest Rating</option>
        <option value="quality-desc">Best Quality</option>
        <option value="quality-asc">Worst Quality</option>
      </select>
    </div>
  );
}
