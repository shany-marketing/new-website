"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import ReviewCard from "@/components/reviews/review-card";
import FiltersBar from "@/components/reviews/filters-bar";
import SettingsModal from "@/components/reviews/settings-modal";
import AutoRespondSettings from "@/components/reviews/auto-respond-settings";
import PlatformConnectBanner from "@/components/reviews/platform-connect-banner";
import { PLATFORM_CONFIG, PLATFORMS } from "@/types/platform";
import type { ReviewSource } from "@/types/platform";
import type { ReviewFilters, ResponseAnalytics } from "@/types/reviews";

const fadeIn = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5 },
};

interface ReviewsClientProps {
  hotelId: string;
  hotelName: string;
  accessLevel?: "demo" | "full";
}

export default function ReviewsClient({ hotelId, hotelName, accessLevel = "full" }: ReviewsClientProps) {
  const isDemo = accessLevel === "demo";
  const { data: session } = useSession();
  const userId = (session?.user as { id?: string })?.id;
  const globalParams = useSearchParams();
  const dateFrom = globalParams.get("from") || "";
  const dateTo = globalParams.get("to") || "";
  const [reviews, setReviews] = useState<Record<string, unknown>[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [analytics, setAnalytics] = useState<ResponseAnalytics | null>(null);
  const [plan, setPlan] = useState<"free" | "ratings" | "premium" | null>(null);
  const [usage, setUsage] = useState<number | null>(null);
  const [limit, setLimit] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [showAutoRespond, setShowAutoRespond] = useState(false);
  const [activeSource, setActiveSource] = useState<ReviewSource>("booking");
  const [platformStatus, setPlatformStatus] = useState<Record<string, { connected: boolean; verified?: boolean }>>({});

  const [filters, setFilters] = useState<ReviewFilters>({
    page: 1,
    limit: 20,
    sortBy: "date",
    sortOrder: "desc",
    responseStatus: "all",
  });

  const isPremium = plan === "premium";
  const canManage = !isDemo && isPremium;

  // Fetch plan
  useEffect(() => {
    fetch(`/api/hotels/${hotelId}/plan`)
      .then((r) => r.json())
      .then((d) => {
        const p = d.plan;
        setPlan(p === "premium" || p === "insight" ? "premium" : p === "ratings" ? "ratings" : "free");
      })
      .catch(() => setPlan("free"));
  }, [hotelId]);

  // Fetch platform connection status
  const fetchPlatformStatus = useCallback(() => {
    fetch(`/api/hotels/${hotelId}/platform-connect`)
      .then((r) => r.json())
      .then((d) => setPlatformStatus(d))
      .catch(() => {});
  }, [hotelId]);

  useEffect(() => {
    fetchPlatformStatus();
  }, [fetchPlatformStatus]);

  // Fetch analytics (per platform)
  useEffect(() => {
    fetch(`/api/hotels/${hotelId}/reviews/analytics?source=${activeSource}`)
      .then((r) => r.json())
      .then((d) => setAnalytics(d))
      .catch(() => {});
  }, [hotelId, activeSource]);

  // Reset page when switching platform
  useEffect(() => {
    setFilters((f) => ({ ...f, page: 1 }));
  }, [activeSource]);

  // Fetch reviews
  const fetchReviews = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (isDemo) {
        // Demo mode: 2 unanswered reviews per platform
        params.set("page", "1");
        params.set("limit", "2");
        params.set("source", activeSource);
        params.set("responseStatus", "none");
        params.set("sortBy", "date");
        params.set("sortOrder", "desc");
      } else {
        params.set("page", String(filters.page || 1));
        params.set("limit", String(filters.limit || 20));
        params.set("source", activeSource);
        if (filters.search) params.set("search", filters.search);
        if (filters.ratingMin) params.set("ratingMin", String(filters.ratingMin));
        if (filters.ratingMax) params.set("ratingMax", String(filters.ratingMax));
        if (filters.responseStatus && filters.responseStatus !== "all")
          params.set("responseStatus", filters.responseStatus);
        if (filters.sortBy) params.set("sortBy", filters.sortBy);
        if (filters.sortOrder) params.set("sortOrder", filters.sortOrder);
      }
      // Global date range filter
      if (dateFrom) params.set("startDate", dateFrom);
      if (dateTo) params.set("endDate", dateTo);

      const res = await fetch(`/api/hotels/${hotelId}/reviews?${params}`);
      const data = await res.json();
      setReviews(data.reviews || []);
      setPagination(data.pagination || { page: 1, limit: 20, total: 0, totalPages: 0 });
    } catch {
      setReviews([]);
    } finally {
      setLoading(false);
    }
  }, [hotelId, filters, activeSource, isDemo, dateFrom, dateTo]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  // Update a review locally
  function handleReviewUpdate(reviewId: string, patch: Record<string, unknown>) {
    setReviews((prev) =>
      prev.map((r) => (r.id === reviewId ? { ...r, ...patch } : r))
    );
  }

  return (
    <div className="space-y-8">
      {/* Hero */}
      <motion.div {...fadeIn} className="relative rounded-3xl overflow-hidden">
        <div
          className="w-full h-[180px] md:h-[220px]"
          style={{
            background: "var(--page-gradient)",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-navy-1 via-navy-1/50 to-transparent" />
        <div className="absolute inset-0 flex flex-col justify-end p-6 md:p-10">
          <div className="flex items-end justify-between">
            <div>
              <h2 className="text-foreground text-2xl md:text-3xl font-bold mb-1">Reviews & Responses</h2>
              <p className="text-cyan text-sm">
                {isDemo ? "Centralized review management preview" : "AI-powered review response management"}
              </p>
            </div>
            {canManage && (
              <div className="flex gap-2">
                <button
                  onClick={() => setShowAutoRespond(true)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-gold-light hover:text-gold border border-gold/20 hover:border-gold/40 transition-colors"
                >
                  Auto-Respond
                </button>
                <button
                  onClick={() => setShowSettings(true)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-gold-light hover:text-gold border border-gold/20 hover:border-gold/40 transition-colors"
                >
                  Settings
                </button>
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* Platform Tabs */}
      <motion.div {...fadeIn} transition={{ delay: 0.03, duration: 0.5 }}>
        <div className="flex gap-2">
          {PLATFORMS.map((platform) => {
            const config = PLATFORM_CONFIG[platform];
            const isActive = activeSource === platform;
            return (
              <button
                key={platform}
                onClick={() => setActiveSource(platform)}
                className="px-4 py-2 rounded-xl text-sm font-medium transition-all"
                style={{
                  background: isActive
                    ? `${config.color}20`
                    : "var(--input-bg)",
                  border: `1px solid ${isActive ? `${config.color}50` : "var(--subtle-border)"}`,
                  color: isActive ? config.color : "var(--text-tertiary)",
                }}
              >
                {config.label}
              </button>
            );
          })}
        </div>
      </motion.div>

      {/* KPI Cards */}
      <motion.div {...fadeIn} transition={{ delay: 0.05, duration: 0.5 }}>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div
            className="rounded-2xl p-4 text-center"
            style={{
              background: "linear-gradient(135deg, rgba(147,220,246,0.1), rgba(147,220,246,0.03))",
              border: "1px solid rgba(147,220,246,0.15)",
            }}
          >
            <p className="text-cyan text-xs uppercase tracking-wider mb-1">Total Reviews</p>
            <p className="text-foreground text-2xl font-bold">
              {analytics?.totalReviews?.toLocaleString() ?? "—"}
            </p>
          </div>
          <div
            className="rounded-2xl p-4 text-center"
            style={{
              background: "linear-gradient(135deg, rgba(252,219,55,0.1), rgba(252,219,55,0.03))",
              border: "1px solid rgba(252,219,55,0.15)",
            }}
          >
            <p className="text-gold text-xs uppercase tracking-wider mb-1">Response Rate</p>
            <p className="text-foreground text-2xl font-bold">
              {analytics?.responseRate != null ? `${analytics.responseRate}%` : "—"}
            </p>
          </div>
          <div
            className="rounded-2xl p-4 text-center"
            style={{
              background: "linear-gradient(135deg, rgba(53,221,159,0.1), rgba(53,221,159,0.03))",
              border: "1px solid rgba(53,221,159,0.15)",
            }}
          >
            <p className="text-success text-xs uppercase tracking-wider mb-1">Avg Quality</p>
            <p className="text-foreground text-2xl font-bold">
              {analytics?.avgQualityScore != null
                ? `${Math.round(analytics.avgQualityScore)}%`
                : "—"}
            </p>
          </div>
          <div
            className="rounded-2xl p-4 text-center"
            style={{
              background: "linear-gradient(135deg, rgba(168,85,247,0.1), rgba(168,85,247,0.03))",
              border: "1px solid rgba(168,85,247,0.15)",
            }}
          >
            <p className="text-xs uppercase tracking-wider mb-1" style={{ color: "#a855f7" }}>
              AI Responses
            </p>
            <p className="text-foreground text-2xl font-bold">
              {analytics?.aiGeneratedCount?.toLocaleString() ?? "—"}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Demo Mode Banner */}
      {isDemo && (
        <motion.div {...fadeIn} transition={{ delay: 0.1, duration: 0.5 }}>
          <div
            className="rounded-2xl p-5 flex items-center justify-between"
            style={{
              background: "linear-gradient(135deg, rgba(252,219,55,0.08), rgba(170,138,0,0.05))",
              border: "1px solid rgba(252,219,55,0.15)",
            }}
          >
            <div>
              <p className="text-gold font-medium text-sm">Preview Mode — 2 unanswered reviews per platform</p>
              <p className="text-muted text-xs mt-0.5">
                Unlock full review management with unlimited AI responses, auto-respond, custom prompts, and quality analytics.
              </p>
            </div>
            <Link
              href="/pricing"
              className="px-5 py-2.5 rounded-lg text-xs font-bold text-navy-1 shrink-0"
              style={{ background: "linear-gradient(135deg, var(--gold) 0%, var(--gold-dark) 100%)" }}
            >
              Unlock Full Access
            </Link>
          </div>
        </motion.div>
      )}

      {/* Upgrade Banner for Free (full mode) */}
      {!isDemo && plan === "free" && (
        <motion.div {...fadeIn} transition={{ delay: 0.1, duration: 0.5 }}>
          <div
            className="rounded-2xl p-4 flex items-center justify-between"
            style={{
              background: "linear-gradient(135deg, rgba(252,219,55,0.08), rgba(170,138,0,0.05))",
              border: "1px solid rgba(252,219,55,0.15)",
            }}
          >
            <div>
              <p className="text-gold font-medium text-sm">Free Plan — 5 AI responses/month</p>
              <p className="text-muted text-xs mt-0.5">
                Upgrade for unlimited responses, refinement, analytics, and custom prompts.
              </p>
            </div>
            <Link
              href="/pricing"
              className="px-4 py-2 rounded-lg text-xs font-medium text-navy-1 shrink-0"
              style={{ background: "linear-gradient(135deg, var(--gold) 0%, var(--gold-dark) 100%)" }}
            >
              Upgrade
            </Link>
          </div>
        </motion.div>
      )}

      {/* Platform Connect Banner (full mode only) */}
      {!isDemo && PLATFORM_CONFIG[activeSource]?.canPost && !platformStatus[activeSource]?.connected && (
        <PlatformConnectBanner
          hotelId={hotelId}
          platform={activeSource}
          onConnected={fetchPlatformStatus}
        />
      )}

      {/* Filters (full mode only) */}
      {!isDemo && (
        <motion.div {...fadeIn} transition={{ delay: 0.15, duration: 0.5 }}>
          <FiltersBar filters={filters} onChange={setFilters} activeSource={activeSource} />
        </motion.div>
      )}

      {/* Reviews List */}
      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block w-6 h-6 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
            <p className="text-muted text-sm mt-3">Loading reviews...</p>
          </div>
        ) : reviews.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted text-sm">No reviews found matching your filters.</p>
          </div>
        ) : (
          reviews.map((review) => (
            <ReviewCard
              key={review.id as string}
              review={review}
              hotelId={hotelId}
              isPremium={isPremium}
              usage={usage}
              limit={limit}
              userId={userId}
              platformStatus={platformStatus}
              onUpdate={handleReviewUpdate}
              onUsageChange={(u) => setUsage(u)}
            />
          ))
        )}
      </div>

      {/* Pagination (full mode only) */}
      {!isDemo && pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <button
            onClick={() => setFilters((f) => ({ ...f, page: Math.max(1, (f.page || 1) - 1) }))}
            disabled={pagination.page <= 1}
            className="px-3 py-1.5 rounded-lg text-xs text-muted hover:text-foreground border border-[var(--subtle-border)] disabled:opacity-30 transition-colors"
          >
            Previous
          </button>
          <span className="text-xs text-muted">
            Page {pagination.page} of {pagination.totalPages}
          </span>
          <button
            onClick={() =>
              setFilters((f) => ({
                ...f,
                page: Math.min(pagination.totalPages, (f.page || 1) + 1),
              }))
            }
            disabled={pagination.page >= pagination.totalPages}
            className="px-3 py-1.5 rounded-lg text-xs text-muted hover:text-foreground border border-[var(--subtle-border)] disabled:opacity-30 transition-colors"
          >
            Next
          </button>
        </div>
      )}

      {/* Settings Modal (full mode only) */}
      {!isDemo && showSettings && (
        <SettingsModal hotelId={hotelId} onClose={() => setShowSettings(false)} />
      )}
      {!isDemo && showAutoRespond && (
        <AutoRespondSettings hotelId={hotelId} onClose={() => setShowAutoRespond(false)} />
      )}
    </div>
  );
}
