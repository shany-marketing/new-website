"use client";

interface FeedbackBadgeProps {
  feedbackCount: number;
  unreadCount: number;
  onClick: () => void;
}

export default function FeedbackBadge({ feedbackCount, unreadCount, onClick }: FeedbackBadgeProps) {
  if (feedbackCount === 0) return null;

  const hasUnread = unreadCount > 0;

  return (
    <button
      onClick={onClick}
      className="px-2 py-0.5 rounded-full text-[10px] font-medium transition-colors flex items-center gap-1"
      style={{
        background: hasUnread ? "rgba(252,219,55,0.35)" : "var(--input-bg)",
        color: hasUnread ? "var(--gold)" : "var(--muted)",
        border: hasUnread ? "1px solid rgba(252,219,55,0.5)" : "1px solid var(--subtle-border)",
      }}
    >
      {hasUnread && (
        <span className="w-1.5 h-1.5 rounded-full bg-gold animate-pulse" />
      )}
      {hasUnread ? `${unreadCount} new` : `${feedbackCount} comments`}
    </button>
  );
}
