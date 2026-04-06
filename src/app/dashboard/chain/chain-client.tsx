"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";

export interface ChainHotel {
  id: string;
  name: string;
  reviewCount: number;
  currentRating: number | null;
  pipelineStatus: string | null;
  bookingUrl: string | null;
}

type SortKey = "rating-desc" | "rating-asc" | "reviews-desc" | "name";

function getRatingColor(rating: number | null): string {
  if (rating === null) return "#64748b";
  if (rating >= 9.0) return "#00e676";
  if (rating >= 8.5) return "#4aedc4";
  if (rating >= 8.0) return "#26c6da";
  return "#ffa726";
}

function SummaryCard({
  label,
  value,
  sub,
  color,
  delay,
}: {
  label: string;
  value: string | number;
  sub?: string;
  color: string;
  delay: number;
}) {
  const isLong = typeof value === "string" && value.length > 5;
  return (
    <div
      style={{
        background: "rgba(255,255,255,0.05)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: "14px",
        padding: "20px 22px",
        animation: `chainFadeIn 0.4s ease ${delay}s both`,
      }}
    >
      <div
        style={{
          fontSize: "11px",
          color: "#8da2b8",
          textTransform: "uppercase",
          letterSpacing: "1px",
          fontWeight: 600,
          marginBottom: "10px",
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: isLong ? "15px" : "28px",
          fontWeight: 700,
          color: isLong ? "#e0e8f0" : color,
          lineHeight: 1.3,
        }}
      >
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: "13px", color: "#7b92ab", marginTop: "4px" }}>
          {sub}
        </div>
      )}
    </div>
  );
}

function HotelCard({ hotel, rank }: { hotel: ChainHotel; rank: number }) {
  const router = useRouter();
  const color = getRatingColor(hotel.currentRating);
  const hasData = hotel.reviewCount > 0;

  return (
    <div
      className="chain-hotel-card"
      onClick={() => router.push(`/dashboard/${hotel.id}`)}
      style={{
        background:
          "linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 100%)",
        border: "1px solid rgba(255,255,255,0.10)",
        borderRadius: "14px",
        padding: "22px 24px",
        position: "relative",
        overflow: "hidden",
        cursor: "pointer",
        transition: "transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease",
        opacity: hasData ? 1 : 0.55,
      }}
    >
        {/* Rank badge */}
        <div
          style={{
            position: "absolute",
            top: "12px",
            right: "16px",
            fontSize: "11px",
            fontWeight: 700,
            color: "rgba(255,255,255,0.22)",
            letterSpacing: "0.5px",
          }}
        >
          #{rank}
        </div>

        {/* Corner glow */}
        {hasData && (
          <div
            style={{
              position: "absolute",
              top: 0,
              right: 0,
              width: "90px",
              height: "90px",
              background: `radial-gradient(circle at top right, ${color}25, transparent 70%)`,
              pointerEvents: "none",
            }}
          />
        )}

        {/* Hotel name */}
        <div
          style={{
            fontWeight: 700,
            fontSize: "15px",
            color: "#f0f4f8",
            lineHeight: 1.4,
            paddingRight: "32px",
            marginBottom: "18px",
          }}
        >
          {hotel.name}
        </div>

        {/* Stats row */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div>
            <div
              style={{
                fontSize: "10px",
                color: "#8da2b8",
                letterSpacing: "1px",
                textTransform: "uppercase",
                fontWeight: 600,
                marginBottom: "5px",
              }}
            >
              Reviews
            </div>
            <div style={{ fontSize: "22px", fontWeight: 700, color: "#c8d6e5", lineHeight: 1 }}>
              {hasData ? hotel.reviewCount.toLocaleString() : "—"}
            </div>
          </div>

          <div style={{ textAlign: "right" }}>
            <div
              style={{
                fontSize: "10px",
                color: "#8da2b8",
                letterSpacing: "1px",
                textTransform: "uppercase",
                fontWeight: 600,
                marginBottom: "5px",
              }}
            >
              Rating
            </div>
            <div style={{ fontSize: "32px", fontWeight: 800, color, lineHeight: 1 }}>
              {hotel.currentRating !== null ? hotel.currentRating.toFixed(1) : "—"}
            </div>
          </div>
        </div>

        {/* Booking link */}
        {hotel.bookingUrl && (
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ marginTop: "14px" }}
          >
            <a
              href={hotel.bookingUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontSize: "11px",
                color: "#4a7a9b",
                fontWeight: 500,
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              View on Booking.com →
            </a>
          </div>
        )}
    </div>
  );
}

export default function ChainDashboardClient({ hotels }: { hotels: ChainHotel[] }) {
  const [sortBy, setSortBy] = useState<SortKey>("rating-desc");

  const hotelsWithData = useMemo(() => hotels.filter((h) => h.reviewCount > 0), [hotels]);
  const hotelsNoData = useMemo(() => hotels.filter((h) => h.reviewCount === 0), [hotels]);

  const chainAvg = useMemo(() => {
    if (hotelsWithData.length === 0) return null;
    const sum = hotelsWithData.reduce((acc, h) => acc + (h.currentRating ?? 0), 0);
    return (sum / hotelsWithData.length).toFixed(2);
  }, [hotelsWithData]);

  const topHotel = useMemo(() => {
    if (hotelsWithData.length === 0) return null;
    return hotelsWithData.reduce((a, b) =>
      (a.currentRating ?? 0) > (b.currentRating ?? 0) ? a : b
    );
  }, [hotelsWithData]);

  const above9Count = useMemo(
    () => hotelsWithData.filter((h) => (h.currentRating ?? 0) >= 9.0).length,
    [hotelsWithData]
  );

  const sortedHotelsWithData = useMemo(() => {
    const list = [...hotelsWithData];
    if (sortBy === "rating-desc") list.sort((a, b) => (b.currentRating ?? 0) - (a.currentRating ?? 0));
    else if (sortBy === "rating-asc") list.sort((a, b) => (a.currentRating ?? 0) - (b.currentRating ?? 0));
    else if (sortBy === "reviews-desc") list.sort((a, b) => b.reviewCount - a.reviewCount);
    else list.sort((a, b) => a.name.localeCompare(b.name));
    return list;
  }, [hotelsWithData, sortBy]);

  const sortedNoData = useMemo(() => {
    const list = [...hotelsNoData];
    list.sort((a, b) => a.name.localeCompare(b.name));
    return list;
  }, [hotelsNoData]);

  // Distribution bands (for hotels with data)
  const dist = useMemo(() => ({
    above9: hotelsWithData.filter((h) => (h.currentRating ?? 0) >= 9.0).length,
    above85: hotelsWithData.filter((h) => (h.currentRating ?? 0) >= 8.5 && (h.currentRating ?? 0) < 9.0).length,
    above8: hotelsWithData.filter((h) => (h.currentRating ?? 0) >= 8.0 && (h.currentRating ?? 0) < 8.5).length,
    below8: hotelsWithData.filter((h) => (h.currentRating ?? 0) < 8.0).length,
  }), [hotelsWithData]);

  if (hotels.length === 0) {
    return (
      <div
        style={{
          textAlign: "center",
          padding: "80px 20px",
          color: "#8da2b8",
          fontSize: "15px",
        }}
      >
        No hotels assigned to your account.
      </div>
    );
  }

  return (
    <>
      <style>{`
        @keyframes chainFadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .chain-hotel-card:hover {
          transform: translateY(-3px) !important;
          border-color: rgba(255,255,255,0.22) !important;
          box-shadow: 0 8px 32px rgba(0,0,0,0.35) !important;
        }
        .chain-sort-select {
          appearance: none;
          -webkit-appearance: none;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%238da2b8' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 12px center;
          padding-right: 36px !important;
          cursor: pointer;
          outline: none;
        }
        .chain-sort-select option { background: #0d1f3c; color: #e0e8f0; }
      `}</style>

      {/* Page header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          marginBottom: "28px",
          flexWrap: "wrap",
          gap: "16px",
          animation: "chainFadeIn 0.3s ease both",
        }}
      >
        <div>
          <h1 style={{ fontSize: "28px", fontWeight: 800, color: "#f0f4f8", marginBottom: "4px", letterSpacing: "-0.3px" }}>
            My Hotels
          </h1>
          <p style={{ fontSize: "14px", color: "#8da2b8" }}>
            {hotels.length} hotel{hotels.length !== 1 ? "s" : ""} in your portfolio
            {hotelsWithData.length > 0 && ` · ${hotelsWithData.length} with data`}
          </p>
        </div>

        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortKey)}
          className="chain-sort-select"
          style={{
            padding: "10px 16px",
            borderRadius: "10px",
            border: "1px solid rgba(255,255,255,0.12)",
            background: "rgba(255,255,255,0.06)",
            color: "#c8d6e5",
            fontSize: "13px",
            fontWeight: 500,
          }}
        >
          <option value="rating-desc">Highest Rating</option>
          <option value="rating-asc">Lowest Rating</option>
          <option value="reviews-desc">Most Reviews</option>
          <option value="name">A – Z</option>
        </select>
      </div>

      {/* Summary cards */}
      {hotelsWithData.length > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "14px",
            marginBottom: "24px",
          }}
        >
          <SummaryCard
            label="Chain Avg Rating"
            value={chainAvg ?? "—"}
            color={getRatingColor(chainAvg ? parseFloat(chainAvg) : null)}
            delay={0}
          />
          <SummaryCard
            label="Top Rated"
            value={topHotel?.name ?? "—"}
            sub={topHotel?.currentRating?.toFixed(1)}
            color="#00e676"
            delay={0.07}
          />
          <SummaryCard
            label="Hotels Rated 9+"
            value={above9Count}
            sub={`of ${hotelsWithData.length} with data`}
            color="#00e676"
            delay={0.14}
          />
          <SummaryCard
            label="Total Hotels"
            value={hotels.length}
            color="#26c6da"
            delay={0.21}
          />
        </div>
      )}

      {/* Rating distribution bar */}
      {hotelsWithData.length > 0 && (
        <div
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: "14px",
            padding: "18px 22px",
            marginBottom: "32px",
            animation: "chainFadeIn 0.4s ease 0.28s both",
          }}
        >
          <div style={{ fontSize: "11px", color: "#8da2b8", textTransform: "uppercase", letterSpacing: "1px", fontWeight: 600, marginBottom: "12px" }}>
            Rating Distribution
          </div>
          <div style={{ display: "flex", borderRadius: "8px", overflow: "hidden", height: "30px" }}>
            {[
              { label: "9+", count: dist.above9, color: "#00e676" },
              { label: "8.5–9", count: dist.above85, color: "#4aedc4" },
              { label: "8–8.5", count: dist.above8, color: "#26c6da" },
              { label: "<8", count: dist.below8, color: "#ffa726" },
            ]
              .filter((seg) => seg.count > 0)
              .map((seg, i, arr) => (
                <div
                  key={seg.label}
                  style={{
                    flex: seg.count,
                    background: `${seg.color}28`,
                    borderRight: i < arr.length - 1 ? "2px solid rgba(10,22,40,0.8)" : "none",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "11px",
                    fontWeight: 700,
                    color: seg.color,
                    gap: "4px",
                    minWidth: "60px",
                  }}
                >
                  {seg.label} ({seg.count})
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Hotels with data */}
      {sortedHotelsWithData.length > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(290px, 1fr))",
            gap: "16px",
            marginBottom: hotelsNoData.length > 0 ? "40px" : "0",
          }}
        >
          {sortedHotelsWithData.map((hotel, i) => (
            <HotelCard key={hotel.id} hotel={hotel} rank={i + 1} />
          ))}
        </div>
      )}

      {/* Hotels with no data */}
      {sortedNoData.length > 0 && (
        <div>
          <div style={{ marginBottom: "16px" }}>
            <p style={{ fontSize: "13px", color: "#4a6a82", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.8px" }}>
              No reviews yet — {sortedNoData.length} hotel{sortedNoData.length !== 1 ? "s" : ""}
            </p>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(290px, 1fr))",
              gap: "16px",
            }}
          >
            {sortedNoData.map((hotel, i) => (
              <HotelCard key={hotel.id} hotel={hotel} rank={sortedHotelsWithData.length + i + 1} />
            ))}
          </div>
        </div>
      )}
    </>
  );
}
