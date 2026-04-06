"use client";

import { useState } from "react";
import type { FeedbackItem } from "@/lib/feedback-utils";

interface FeedbackPanelProps {
  hotelId: string;
  reviewId: string;
  feedbackItems: FeedbackItem[];
  activeAnnotationId: string | null;
  onAnnotationClick: (id: string) => void;
  onFeedbackChange: () => void;
  currentUserId: string;
}

export default function FeedbackPanel({
  hotelId,
  reviewId,
  feedbackItems,
  activeAnnotationId,
  onAnnotationClick,
  onFeedbackChange,
  currentUserId,
}: FeedbackPanelProps) {
  const [generalComment, setGeneralComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleAddGeneral() {
    if (!generalComment.trim()) return;
    setSubmitting(true);
    try {
      await fetch(`/api/hotels/${hotelId}/reviews/${reviewId}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comment: generalComment.trim() }),
      });
      setGeneralComment("");
      onFeedbackChange();
    } catch {
      alert("Failed to post comment");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="rounded-xl p-4 space-y-3 mt-3"
      style={{
        background: "var(--input-bg)",
        border: "1px solid var(--subtle-border)",
      }}
    >
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-gold/70 uppercase tracking-wider">
          Feedback ({feedbackItems.length})
        </p>
      </div>

      {/* General comment input */}
      <div className="flex gap-2">
        <input
          type="text"
          value={generalComment}
          onChange={(e) => setGeneralComment(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAddGeneral()}
          placeholder="Add a general comment..."
          className="flex-1 px-3 py-1.5 rounded-lg text-xs bg-[var(--input-bg)] border border-[var(--subtle-border)] text-foreground placeholder:text-muted focus:outline-none focus:border-gold/40"
        />
        <button
          onClick={handleAddGeneral}
          disabled={!generalComment.trim() || submitting}
          className="px-3 py-1.5 rounded-lg text-xs font-medium text-navy-1 disabled:opacity-40 transition-opacity"
          style={{ background: "linear-gradient(135deg, var(--gold), var(--gold-dark))" }}
        >
          Post
        </button>
      </div>

      {/* Threads */}
      {feedbackItems.length === 0 ? (
        <p className="text-muted text-xs italic py-2">No feedback yet. Select text in the response above to add inline comments.</p>
      ) : (
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {feedbackItems.map((item) => (
            <FeedbackThread
              key={item.id}
              thread={item}
              hotelId={hotelId}
              reviewId={reviewId}
              currentUserId={currentUserId}
              isActive={activeAnnotationId === item.id}
              onClick={() => item.selectedText ? onAnnotationClick(item.id) : undefined}
              onFeedbackChange={onFeedbackChange}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function FeedbackThread({
  thread,
  hotelId,
  reviewId,
  currentUserId,
  isActive,
  onClick,
  onFeedbackChange,
}: {
  thread: FeedbackItem;
  hotelId: string;
  reviewId: string;
  currentUserId: string;
  isActive: boolean;
  onClick: () => void;
  onFeedbackChange: () => void;
}) {
  const [replyText, setReplyText] = useState("");
  const [replying, setReplying] = useState(false);
  const [showReplyInput, setShowReplyInput] = useState(false);

  const isOwn = thread.userId === currentUserId;
  const isAnnotation = !!thread.selectedText;

  async function handleReply() {
    if (!replyText.trim()) return;
    setReplying(true);
    try {
      await fetch(`/api/hotels/${hotelId}/reviews/${reviewId}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comment: replyText.trim(), parentId: thread.id }),
      });
      setReplyText("");
      setShowReplyInput(false);
      onFeedbackChange();
    } catch {
      alert("Failed to reply");
    } finally {
      setReplying(false);
    }
  }

  async function handleResolve() {
    try {
      await fetch(`/api/hotels/${hotelId}/reviews/${reviewId}/feedback/${thread.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resolved: !thread.resolved }),
      });
      onFeedbackChange();
    } catch {
      alert("Failed to update");
    }
  }

  async function handleDelete() {
    if (!confirm("Delete this comment?")) return;
    try {
      await fetch(`/api/hotels/${hotelId}/reviews/${reviewId}/feedback/${thread.id}`, {
        method: "DELETE",
      });
      onFeedbackChange();
    } catch {
      alert("Failed to delete");
    }
  }

  const timeAgo = formatTimeAgo(thread.createdAt);

  return (
    <div
      className="rounded-lg p-3 transition-colors cursor-pointer"
      style={{
        background: isActive ? "rgba(252,219,55,0.08)" : "transparent",
        border: isActive ? "1px solid rgba(252,219,55,0.2)" : "1px solid transparent",
        opacity: thread.resolved ? 0.5 : 1,
      }}
      onClick={onClick}
    >
      {/* Quoted text for annotations */}
      {isAnnotation && (
        <div
          className="text-[11px] text-[var(--text-tertiary)] mb-2 pl-2 line-clamp-2 italic"
          style={{ borderLeft: "2px solid rgba(252,219,55,0.4)" }}
        >
          &ldquo;{thread.selectedText}&rdquo;
        </div>
      )}

      {/* Comment */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-foreground">{thread.userName}</span>
            <span className="text-[10px] text-muted">{timeAgo}</span>
            {thread.resolved && (
              <span className="text-[10px] text-success">Resolved</span>
            )}
          </div>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">{thread.comment}</p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={(e) => { e.stopPropagation(); handleResolve(); }}
            className="p-1 rounded hover:bg-[var(--input-bg)] transition-colors"
            title={thread.resolved ? "Unresolve" : "Resolve"}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={thread.resolved ? "var(--success)" : "var(--muted)"} strokeWidth="2" strokeLinecap="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </button>
          {isOwn && (
            <button
              onClick={(e) => { e.stopPropagation(); handleDelete(); }}
              className="p-1 rounded hover:bg-[var(--input-bg)] transition-colors"
              title="Delete"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="2" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Replies */}
      {thread.replies.length > 0 && (
        <div className="ml-4 mt-2 space-y-2 pl-2" style={{ borderLeft: "1px solid var(--subtle-border)" }}>
          {thread.replies.map((reply) => (
            <div key={reply.id} className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-medium text-foreground">{reply.userName}</span>
                  <span className="text-[10px] text-muted">{formatTimeAgo(reply.createdAt)}</span>
                </div>
                <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">{reply.comment}</p>
              </div>
              {reply.userId === currentUserId && (
                <button
                  onClick={async (e) => {
                    e.stopPropagation();
                    if (!confirm("Delete this reply?")) return;
                    await fetch(`/api/hotels/${hotelId}/reviews/${reviewId}/feedback/${reply.id}`, { method: "DELETE" });
                    onFeedbackChange();
                  }}
                  className="p-1 rounded hover:bg-[var(--input-bg)] transition-colors shrink-0"
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="2" strokeLinecap="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Reply input */}
      {showReplyInput ? (
        <div className="flex gap-2 mt-2 ml-4" onClick={(e) => e.stopPropagation()}>
          <input
            type="text"
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleReply()}
            placeholder="Reply..."
            className="flex-1 px-2 py-1 rounded-lg text-[11px] bg-[var(--input-bg)] border border-[var(--subtle-border)] text-foreground placeholder:text-muted focus:outline-none focus:border-gold/40"
            autoFocus
          />
          <button
            onClick={handleReply}
            disabled={!replyText.trim() || replying}
            className="px-2 py-1 rounded-lg text-[11px] font-medium text-navy-1 disabled:opacity-40"
            style={{ background: "linear-gradient(135deg, var(--gold), var(--gold-dark))" }}
          >
            Reply
          </button>
          <button
            onClick={() => { setShowReplyInput(false); setReplyText(""); }}
            className="text-[11px] text-muted"
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          onClick={(e) => { e.stopPropagation(); setShowReplyInput(true); }}
          className="text-[11px] text-muted hover:text-gold-light transition-colors mt-1 ml-4"
        >
          Reply
        </button>
      )}
    </div>
  );
}

function formatTimeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString();
}
