"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { PLATFORM_CONFIG } from "@/types/platform";
import type { ReviewSource } from "@/types/platform";
import GlassCard from "@/components/ui/glass-card";

interface ScrapeProgressProps {
  hotelId: string;
  onScrapingChange?: (scraping: boolean) => void;
}

interface PlatformStatus {
  source: string;
  status: string;
  reviewsFound: number;
  reviewsInserted: number;
  statusMessage: string | null;
  createdAt: string;
  completedAt: string | null;
}

interface ScrapeStatus {
  scraping: boolean;
  batchId: string | null;
  platforms: PlatformStatus[];
}

function StatusIcon({ status }: { status: string }) {
  if (status === "running" || status === "ingesting") {
    return (
      <span className="relative flex h-2.5 w-2.5">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: "var(--gold)" }} />
        <span className="relative inline-flex rounded-full h-2.5 w-2.5" style={{ background: "var(--gold)" }} />
      </span>
    );
  }
  if (status === "completed") {
    return <span className="text-xs" style={{ color: "#4A8F6B" }}>&#10003;</span>;
  }
  if (status === "failed") {
    return <span className="text-xs" style={{ color: "#B85050" }}>&#10005;</span>;
  }
  return null;
}

function statusLabel(p: PlatformStatus): string {
  if (p.status === "running") {
    if (p.reviewsFound > 0) return `${p.reviewsFound} reviews found so far`;
    return p.statusMessage || "Starting scraper...";
  }
  if (p.status === "ingesting") {
    return `Importing ${p.reviewsFound} reviews...`;
  }
  if (p.status === "completed") {
    if (p.reviewsInserted > 0) {
      return `${p.reviewsFound} found, ${p.reviewsInserted} new`;
    }
    return `${p.reviewsFound} reviews (all already imported)`;
  }
  if (p.status === "failed") {
    return "Failed to fetch reviews";
  }
  return p.statusMessage || "";
}

export default function ScrapeProgress({ hotelId, onScrapingChange }: ScrapeProgressProps) {
  const [status, setStatus] = useState<ScrapeStatus | null>(null);
  const [visible, setVisible] = useState(false);
  const prevScraping = useRef<boolean | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch(`/api/hotels/${hotelId}/scrape/status`);
      const data: ScrapeStatus = await res.json();
      setStatus(data);

      if (data.platforms.length > 0) {
        setVisible(true);
        if (hideTimer.current) clearTimeout(hideTimer.current);

        if (!data.scraping) {
          // All done — hide after 8 seconds
          hideTimer.current = setTimeout(() => setVisible(false), 8000);
        }
      }

      if (prevScraping.current !== data.scraping) {
        prevScraping.current = data.scraping;
        onScrapingChange?.(data.scraping);
      }
    } catch {
      // ignore
    }
  }, [hotelId, onScrapingChange]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // Poll while scraping is active
  useEffect(() => {
    if (!status?.scraping) return;
    const interval = setInterval(fetchStatus, 3000);
    return () => clearInterval(interval);
  }, [status?.scraping, fetchStatus]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, []);

  if (!visible || !status || status.platforms.length === 0) return null;

  const allDone = !status.scraping;
  const anyFailed = status.platforms.some(p => p.status === "failed");
  const totalInserted = status.platforms.reduce((sum, p) => sum + p.reviewsInserted, 0);

  return (
    <GlassCard>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-foreground font-semibold text-base">
          {allDone ? "Import Complete" : "Importing Reviews"}
        </h3>
        {!allDone && (
          <span className="text-xs text-muted animate-pulse">Live</span>
        )}
      </div>

      <div className="space-y-3">
        {status.platforms.map((p) => {
          const config = PLATFORM_CONFIG[p.source as ReviewSource];
          return (
            <div key={p.source} className="flex items-center gap-3">
              <span
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ background: config?.color ?? "#888" }}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium" style={{ color: config?.color ?? "var(--foreground)" }}>
                    {config?.label ?? p.source}
                  </span>
                  <StatusIcon status={p.status} />
                </div>
                <p className="text-xs text-muted truncate">
                  {statusLabel(p)}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {allDone && (
        <div
          className="mt-3 pt-3 text-xs"
          style={{ borderTop: "1px solid var(--glass-border)" }}
        >
          {anyFailed && totalInserted === 0 ? (
            <span style={{ color: "#B85050" }}>All imports failed. Check your platform URLs and try again.</span>
          ) : (
            <span style={{ color: "#4A8F6B" }}>
              {totalInserted > 0
                ? `${totalInserted} new reviews imported. Pipeline starting automatically...`
                : "No new reviews found. All reviews were already imported."}
            </span>
          )}
        </div>
      )}
    </GlassCard>
  );
}
