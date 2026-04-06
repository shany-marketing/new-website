"use client";

import { useState, useCallback } from "react";
import Image from "next/image";
import GenerateButton from "./generate-button";
import ResponseEditor from "./response-editor";
import QualityBadge from "./quality-badge";
import RefineModal from "./refine-modal";
import FeedbackBadge from "./feedback-badge";
import AnnotatedResponse from "./annotated-response";
import FeedbackPanel from "./feedback-panel";
import { nestFeedback } from "@/lib/feedback-utils";
import type { FeedbackItem, FeedbackRaw } from "@/lib/feedback-utils";
import { PLATFORM_CONFIG } from "@/types/platform";
import type { ReviewSource } from "@/types/platform";
import type { ResponseQualityCriteria } from "@/types/reviews";

const TRAVELER_ICONS: Record<string, string> = {
  solo: "/single.png",
  "solo traveller": "/single.png",
  "solo traveler": "/single.png",
  couple: "/couple.png",
  family: "/family.png",
  "family with young children": "/family.png",
  "family with older children": "/family.png",
  group: "/group.png",
  "group of friends": "/group.png",
};

interface PlatformStatus {
  connected: boolean;
  verified?: boolean;
}

interface ReviewCardProps {
  review: Record<string, unknown>;
  hotelId: string;
  isPremium: boolean;
  usage: number | null;
  limit: number | null;
  userId?: string;
  platformStatus?: Record<string, PlatformStatus>;
  onUpdate: (reviewId: string, patch: Record<string, unknown>) => void;
  onUsageChange: (usage: number) => void;
}

function ratingColor(rating: number): string {
  if (rating >= 8) return "#4A8F6B";
  if (rating >= 6) return "#C9A86A";
  return "#ef4444";
}

export default function ReviewCard({
  review,
  hotelId,
  isPremium,
  usage,
  limit,
  userId,
  platformStatus,
  onUpdate,
  onUsageChange,
}: ReviewCardProps) {
  const [editing, setEditing] = useState(false);
  const [refining, setRefining] = useState(false);
  const [markingSent, setMarkingSent] = useState(false);
  const [posting, setPosting] = useState(false);
  const [postStatus, setPostStatus] = useState<string>(
    (review.post_status as string) || "none"
  );

  // Translation state
  const [showTranslation, setShowTranslation] = useState(false);
  const [translation, setTranslation] = useState<{
    titleEn: string | null;
    likedTextEn: string | null;
    dislikedTextEn: string | null;
    responseEn: string | null;
  } | null>(null);
  const [translating, setTranslating] = useState(false);
  const [showResponseTranslation, setShowResponseTranslation] = useState(false);

  // Feedback state
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackItem[]>([]);
  const [feedbackLoaded, setFeedbackLoaded] = useState(false);
  const [activeAnnotationId, setActiveAnnotationId] = useState<string | null>(null);
  const [pendingSelection, setPendingSelection] = useState<{
    text: string;
    startOffset: number;
    endOffset: number;
  } | null>(null);
  const [addingComment, setAddingComment] = useState(false);
  const [newComment, setNewComment] = useState("");

  const id = review.id as string;
  const source = (review.source as ReviewSource) || "booking";
  const platformConfig = PLATFORM_CONFIG[source];
  const hasLikedDislikedSplit = platformConfig?.hasLikedDislikedSplit ?? true;
  const rating = review.rating as number | null;
  const guestName = (review.reviewer_display_name as string) || "Guest";
  const title = review.review_title as string | null;
  const liked = review.liked_text as string | null;
  const disliked = review.disliked_text as string | null;
  const reviewDate = review.review_date as string | null;
  const location = review.user_location as string | null;
  const travelerType = review.traveler_type as string | null;
  const aiResponse = review.ai_response as string | null;
  const propertyResponse = review.property_response as string | null;
  const sentToBooking = review.sent_to_booking as boolean;
  const qualityScore = review.quality_score as number | null;
  const reviewLanguage = review.review_language as string | null;
  const feedbackCount = (review.feedback_count as number) || 0;
  const unreadCount = (review.unread_count as number) || 0;
  const roomInfo = review.room_info as string | null;
  const numberOfNights = review.number_of_nights as number | null;
  const isNonEnglish = reviewLanguage && reviewLanguage !== "en";

  const hasAI = !!aiResponse;
  const hasScraped = !!propertyResponse;
  const currentResponse = aiResponse || propertyResponse || "";

  const qualityCriteria: ResponseQualityCriteria | null = qualityScore !== null
    ? {
        is_response: review.is_response as boolean | null,
        is_right_lang: review.is_right_lang as boolean | null,
        is_answered_positive: review.is_answered_positive as boolean | null,
        is_answered_negative: review.is_answered_negative as boolean | null,
        is_include_guest_name: review.is_include_guest_name as boolean | null,
        is_include_hotelier_name: review.is_include_hotelier_name as boolean | null,
        is_kind: review.is_kind as boolean | null,
        is_concise: review.is_concise as boolean | null,
        is_gratitude: review.is_gratitude as boolean | null,
        is_include_come_back_asking: review.is_include_come_back_asking as boolean | null,
        is_syntax_right: review.is_syntax_right as boolean | null,
        is_personal_tone_not_generic: review.is_personal_tone_not_generic as boolean | null,
        quality_score: qualityScore,
      }
    : null;

  const isConnected = platformStatus?.[source]?.connected ?? false;
  const canPostToAPI = platformConfig?.canPost && isConnected;

  async function handleMarkSent() {
    setMarkingSent(true);
    try {
      const res = await fetch(`/api/hotels/${hotelId}/reviews/${id}/mark-sent`, {
        method: "PUT",
      });
      if (!res.ok) throw new Error("Failed");
      onUpdate(id, { sent_to_booking: true, sent_to_booking_at: new Date().toISOString() });
    } catch {
      alert("Failed to mark as sent");
    } finally {
      setMarkingSent(false);
    }
  }

  // Translation handler
  async function handleTranslate() {
    if (showTranslation) {
      setShowTranslation(false);
      return;
    }
    if (translation) {
      setShowTranslation(true);
      return;
    }
    setTranslating(true);
    try {
      const res = await fetch(`/api/hotels/${hotelId}/reviews/${id}/translate`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setTranslation(data);
      setShowTranslation(true);
    } catch {
      alert("Translation failed");
    } finally {
      setTranslating(false);
    }
  }

  // Feedback handlers
  const fetchFeedback = useCallback(async () => {
    try {
      const res = await fetch(`/api/hotels/${hotelId}/reviews/${id}/feedback`);
      const data = await res.json();
      setFeedback(nestFeedback(data.feedback as FeedbackRaw[]));
      setFeedbackLoaded(true);
    } catch {
      /* ignore */
    }
  }, [hotelId, id]);

  async function handleOpenFeedback() {
    setFeedbackOpen(!feedbackOpen);
    if (!feedbackLoaded) {
      await fetchFeedback();
    }
    // Mark as read
    fetch(`/api/hotels/${hotelId}/reviews/${id}/feedback/read`, { method: "POST" });
  }

  async function handleAddAnnotation() {
    if (!pendingSelection || !newComment.trim()) return;
    setAddingComment(true);
    try {
      await fetch(`/api/hotels/${hotelId}/reviews/${id}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          comment: newComment.trim(),
          selectedText: pendingSelection.text,
          startOffset: pendingSelection.startOffset,
          endOffset: pendingSelection.endOffset,
        }),
      });
      setPendingSelection(null);
      setNewComment("");
      await fetchFeedback();
    } catch {
      alert("Failed to add comment");
    } finally {
      setAddingComment(false);
    }
  }

  // Response translation toggle — reuses the same cached translation
  async function handleResponseTranslate() {
    if (showResponseTranslation) {
      setShowResponseTranslation(false);
      return;
    }
    if (translation?.responseEn) {
      setShowResponseTranslation(true);
      return;
    }
    // Need to fetch translation (may already have review parts cached)
    setTranslating(true);
    try {
      const res = await fetch(`/api/hotels/${hotelId}/reviews/${id}/translate`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setTranslation(data);
      setShowResponseTranslation(true);
    } catch {
      alert("Translation failed");
    } finally {
      setTranslating(false);
    }
  }

  // Display text (original or translated)
  const displayTitle = showTranslation && translation?.titleEn ? translation.titleEn : title;
  const displayLiked = showTranslation && translation?.likedTextEn ? translation.likedTextEn : liked;
  const displayDisliked = showTranslation && translation?.dislikedTextEn ? translation.dislikedTextEn : disliked;
  const displayResponse = showResponseTranslation && translation?.responseEn ? translation.responseEn : currentResponse;

  async function handlePost() {
    setPosting(true);
    try {
      const res = await fetch(`/api/hotels/${hotelId}/reviews/${id}/post`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform: source }),
      });
      const data = await res.json();
      if (res.ok) {
        setPostStatus(data.status);
        onUpdate(id, { sent_to_booking: true, post_status: data.status });
      } else {
        setPostStatus("failed");
        alert(data.error || "Failed to post");
      }
    } catch {
      setPostStatus("failed");
      alert("Network error — try again");
    } finally {
      setPosting(false);
    }
  }

  return (
    <>
      <div
        className="rounded-2xl p-5 space-y-4"
        style={{
          background: "linear-gradient(135deg, var(--glass-bg-end), var(--input-bg))",
          border: "1px solid var(--glass-border)",
        }}
      >
        {/* Review: 2-column layout */}
        <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
          {/* Left column — guest info + metadata */}
          <div className="sm:shrink-0 sm:w-[260px]">
            <p className="text-foreground font-bold text-lg leading-tight">{guestName}</p>
            {location && <p className="text-muted text-sm mt-0.5">{location}</p>}

            <div className="mt-4 space-y-2.5">
              {roomInfo && (
                <div className="flex items-center gap-2.5">
                  <Image src="/bed.png" alt="" width={18} height={18} className="opacity-70" />
                  <span className="text-[var(--text-secondary)] text-sm">{roomInfo}</span>
                </div>
              )}
              {(numberOfNights || reviewDate) && (
                <div className="flex items-center gap-2.5">
                  <Image src="/date.png" alt="" width={18} height={18} className="opacity-70" />
                  <span className="text-[var(--text-secondary)] text-sm">
                    {numberOfNights ? `${numberOfNights} night${numberOfNights !== 1 ? "s" : ""}` : ""}
                    {numberOfNights && reviewDate ? " | " : ""}
                    {reviewDate
                      ? new Date(reviewDate).toLocaleDateString("en-GB", { month: "long", year: "numeric" })
                      : ""}
                  </span>
                </div>
              )}
              {travelerType && (
                <div className="flex items-center gap-2.5">
                  <Image
                    src={TRAVELER_ICONS[travelerType.toLowerCase()] || "/family.png"}
                    alt=""
                    width={18}
                    height={18}
                    className="opacity-70"
                  />
                  <span className="text-[var(--text-secondary)] text-sm capitalize">{travelerType}</span>
                </div>
              )}
            </div>

            {/* Show Translation button */}
            {isNonEnglish && (
              <button
                onClick={handleTranslate}
                disabled={translating}
                className="mt-4 px-3.5 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 transition-all"
                style={{
                  background: showTranslation
                    ? "linear-gradient(135deg, var(--gold), var(--gold-dark))"
                    : "var(--input-bg)",
                  color: showTranslation ? "var(--navy-1)" : "var(--text-secondary)",
                  border: showTranslation ? "none" : "1px solid var(--subtle-border)",
                }}
              >
                {translating ? (
                  <>
                    <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.3" />
                      <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                    </svg>
                    Translating...
                  </>
                ) : showTranslation ? (
                  "Show Original"
                ) : (
                  <>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="2" y1="12" x2="22" y2="12" />
                      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                    </svg>
                    Show Translation
                  </>
                )}
              </button>
            )}
          </div>

          {/* Right column — review content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3">
              <div>
                {reviewDate && (
                  <p className="text-foreground font-semibold text-lg">
                    Reviewed: {new Date(reviewDate).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
                  </p>
                )}
                {displayTitle && (
                  <p className="text-foreground font-semibold text-base mt-0.5">{displayTitle}</p>
                )}
              </div>

              {/* Rating + status badges */}
              <div className="flex items-center gap-2 shrink-0">
                {source !== "booking" && (
                  <span
                    className="px-2 py-0.5 rounded-full text-[10px] font-medium"
                    style={{
                      background: `${platformConfig.color}59`,
                      color: platformConfig.color,
                    }}
                  >
                    {platformConfig.label}
                  </span>
                )}
                {(sentToBooking || postStatus === "posted") && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-success/35 text-success">
                    {postStatus === "posted" ? "Posted" : "Sent"}
                  </span>
                )}
                {postStatus === "in_moderation" && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-500/35 text-amber-400">
                    In Review
                  </span>
                )}
                {hasAI && !sentToBooking && postStatus === "none" && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-gold/35 text-gold">
                    AI Response
                  </span>
                )}
                {hasScraped && !hasAI && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-cyan/35 text-cyan">
                    Platform Response
                  </span>
                )}
                {qualityCriteria && <QualityBadge criteria={qualityCriteria} />}
                {feedbackCount > 0 && (
                  <FeedbackBadge
                    feedbackCount={feedbackCount}
                    unreadCount={unreadCount}
                    onClick={handleOpenFeedback}
                  />
                )}
                {rating !== null && (
                  <div
                    className="w-11 h-11 rounded-lg flex items-center justify-center font-bold text-sm"
                    style={{
                      background: `${ratingColor(rating)}15`,
                      color: ratingColor(rating),
                      border: `2px solid ${ratingColor(rating)}40`,
                    }}
                  >
                    {rating}
                  </div>
                )}
              </div>
            </div>

            {/* Translated label */}
            {showTranslation && (
              <p className="text-[10px] text-gold/60 uppercase tracking-wider mt-1">
                Translated from {reviewLanguage}
              </p>
            )}

            {/* Review text */}
            <div className="mt-3 space-y-2">
              {hasLikedDislikedSplit ? (
                <>
                  {displayLiked && (
                    <div className="flex gap-2">
                      <span className="text-success font-semibold text-sm shrink-0">+</span>
                      <p className="text-[var(--text-tertiary)] text-sm">{displayLiked}</p>
                    </div>
                  )}
                  {displayDisliked && (
                    <div className="flex gap-2">
                      <span className="text-danger font-semibold text-sm shrink-0">&minus;</span>
                      <p className="text-[var(--text-tertiary)] text-sm">{displayDisliked}</p>
                    </div>
                  )}
                </>
              ) : (
                displayLiked && <p className="text-[var(--text-tertiary)] text-sm">{displayLiked}</p>
              )}
            </div>
          </div>
        </div>

        {/* Response Section */}
        <div
          className="rounded-xl p-4 space-y-3"
          style={{
            background: "var(--input-bg)",
            border: "1px solid var(--subtle-border)",
          }}
        >
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-gold/70 uppercase tracking-wider">Response</p>
            {isNonEnglish && currentResponse && !editing && (
              <button
                onClick={handleResponseTranslate}
                disabled={translating}
                className="text-[11px] text-muted hover:text-gold-light transition-colors flex items-center gap-1"
              >
                {translating ? (
                  <span className="flex items-center gap-1">
                    <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.3" />
                      <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                    </svg>
                    Translating...
                  </span>
                ) : showResponseTranslation ? (
                  "Show Original"
                ) : (
                  <>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="2" y1="12" x2="22" y2="12" />
                      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                    </svg>
                    Show Translation
                  </>
                )}
              </button>
            )}
          </div>

          {showResponseTranslation && (
            <p className="text-[10px] text-gold/60 uppercase tracking-wider">Translated to English</p>
          )}

          {editing ? (
            <ResponseEditor
              hotelId={hotelId}
              reviewId={id}
              text={currentResponse}
              onSave={(text) => {
                onUpdate(id, { ai_response: text, ai_response_edited: true });
                setEditing(false);
              }}
              onCancel={() => setEditing(false)}
            />
          ) : currentResponse ? (
            <>
              {/* Response text — annotated when feedback is open, plain otherwise */}
              {feedbackOpen && aiResponse ? (
                <AnnotatedResponse
                  text={aiResponse}
                  feedbackItems={feedback}
                  onTextSelect={setPendingSelection}
                  onAnnotationClick={setActiveAnnotationId}
                  activeAnnotationId={activeAnnotationId}
                />
              ) : (
                <p className="text-[var(--text-secondary)] text-sm whitespace-pre-wrap">{displayResponse}</p>
              )}

              {/* Add comment popover for text selection */}
              {pendingSelection && (
                <div
                  className="rounded-xl p-3 mt-2"
                  style={{
                    background: "linear-gradient(135deg, var(--glass-bg), var(--glass-bg-end))",
                    border: "1px solid rgba(252,219,55,0.3)",
                  }}
                >
                  <p className="text-[11px] text-muted mb-2 italic line-clamp-1">
                    On: &ldquo;{pendingSelection.text.substring(0, 60)}{pendingSelection.text.length > 60 ? "..." : ""}&rdquo;
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleAddAnnotation()}
                      placeholder="Add your feedback..."
                      className="flex-1 px-2 py-1.5 rounded-lg text-xs bg-[var(--input-bg)] border border-[var(--subtle-border)] text-foreground placeholder:text-muted focus:outline-none focus:border-gold/40"
                      autoFocus
                    />
                    <button
                      onClick={handleAddAnnotation}
                      disabled={!newComment.trim() || addingComment}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium text-navy-1 disabled:opacity-40"
                      style={{ background: "linear-gradient(135deg, var(--gold), var(--gold-dark))" }}
                    >
                      {addingComment ? "..." : "Post"}
                    </button>
                    <button
                      onClick={() => { setPendingSelection(null); setNewComment(""); }}
                      className="text-xs text-muted hover:text-foreground"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={() => setEditing(true)}
                  className="text-xs text-muted hover:text-gold-light transition-colors"
                >
                  Edit
                </button>
                {isPremium && hasAI && (
                  <button
                    onClick={() => setRefining(true)}
                    className="text-xs text-muted hover:text-gold-light transition-colors"
                  >
                    Refine
                  </button>
                )}
                {hasAI && (
                  <button
                    onClick={handleOpenFeedback}
                    className="text-xs text-muted hover:text-gold-light transition-colors"
                  >
                    {feedbackOpen ? "Hide Feedback" : "Feedback"}
                  </button>
                )}
                {hasAI && !sentToBooking && postStatus === "none" && (
                  canPostToAPI ? (
                    <button
                      onClick={handlePost}
                      disabled={posting}
                      className="px-2 py-0.5 rounded text-xs font-medium transition-all hover:opacity-80 disabled:opacity-40"
                      style={{
                        background: `${platformConfig.color}25`,
                        color: platformConfig.color,
                      }}
                    >
                      {posting ? "Posting..." : `Post to ${platformConfig.label}`}
                    </button>
                  ) : (
                    <button
                      onClick={handleMarkSent}
                      disabled={markingSent}
                      className="text-xs text-muted hover:text-success transition-colors"
                    >
                      {markingSent ? "Marking..." : "Mark as Sent"}
                    </button>
                  )
                )}
                {postStatus === "in_moderation" && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-500/35 text-amber-400">
                    In Review (~48h)
                  </span>
                )}
                {postStatus === "failed" && (
                  <button
                    onClick={handlePost}
                    disabled={posting}
                    className="text-xs text-red-400 hover:text-red-300 transition-colors"
                  >
                    {posting ? "Retrying..." : "Retry Post"}
                  </button>
                )}
                {postStatus === "rejected" && (
                  <span className="text-xs text-red-400">Rejected by platform</span>
                )}
              </div>

              {/* Feedback Panel */}
              {feedbackOpen && userId && (
                <FeedbackPanel
                  hotelId={hotelId}
                  reviewId={id}
                  feedbackItems={feedback}
                  activeAnnotationId={activeAnnotationId}
                  onAnnotationClick={setActiveAnnotationId}
                  onFeedbackChange={fetchFeedback}
                  currentUserId={userId}
                />
              )}
            </>
          ) : (
            <p className="text-muted text-sm italic">No response yet</p>
          )}

          {/* Generate Button */}
          <GenerateButton
            hotelId={hotelId}
            reviewId={id}
            hasResponse={hasAI}
            usage={usage}
            limit={limit}
            onGenerated={(text, newUsage) => {
              onUpdate(id, {
                ai_response: text,
                ai_response_generated_at: new Date().toISOString(),
                ai_response_edited: false,
                quality_score: null,
              });
              onUsageChange(newUsage);
            }}
          />
        </div>
      </div>

      {/* Refine Modal */}
      {refining && (
        <RefineModal
          hotelId={hotelId}
          reviewId={id}
          currentResponse={aiResponse!}
          onRefined={(text) => onUpdate(id, { ai_response: text })}
          onClose={() => setRefining(false)}
        />
      )}
    </>
  );
}
