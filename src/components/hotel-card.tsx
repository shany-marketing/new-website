"use client";

import Link from "next/link";
import GlassCard from "@/components/ui/glass-card";

interface HotelCardProps {
  id: string;
  name: string;
  reviewCount: number;
  avgRating: number | null;
  pipelineStatus: string | null;
}

const statusConfig: Record<string, { label: string; color: string }> = {
  completed: { label: "Ready", color: "#4A8F6B" },
  running: { label: "Running", color: "var(--gold)" },
  failed: { label: "Failed", color: "#B85050" },
  pending: { label: "Pending", color: "#516B84" },
};

export default function HotelCard({ id, name, reviewCount, avgRating, pipelineStatus }: HotelCardProps) {
  const status = pipelineStatus ? statusConfig[pipelineStatus] : null;

  return (
    <Link href={`/dashboard/${id}`}>
      <GlassCard hover className="h-full">
        <div className="flex flex-col gap-4">
          <div className="flex items-start justify-between">
            <h3 className="text-foreground font-semibold text-lg">{name}</h3>
            {status && (
              <span
                className="px-2.5 py-1 rounded-full text-xs font-semibold"
                style={{ background: `${status.color}59`, color: status.color }}
              >
                {status.label}
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-muted text-xs uppercase tracking-wider">Reviews</p>
              <p className="text-foreground text-2xl font-bold">{reviewCount.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-muted text-xs uppercase tracking-wider">Avg Rating</p>
              <p className="text-2xl font-bold" style={{ color: avgRating && avgRating >= 7 ? "#4A8F6B" : avgRating && avgRating >= 5 ? "var(--gold)" : "#B85050" }}>
                {avgRating?.toFixed(1) ?? "N/A"}
              </p>
            </div>
          </div>
        </div>
      </GlassCard>
    </Link>
  );
}
