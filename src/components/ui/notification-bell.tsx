"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  link: string | null;
  created_at: string;
}

const TYPE_ICONS: Record<string, string> = {
  task_assigned: "\u2611",
  scrape_complete: "\u2705",
  rating_drop: "\u26A0",
  budget_alert: "\uD83D\uDCB0",
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications");
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications ?? []);
      }
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function handleMarkAllRead() {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markAll: true }),
    });
    setNotifications([]);
  }

  async function handleClick(n: Notification) {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notificationId: n.id }),
    });
    setNotifications((prev) => prev.filter((x) => x.id !== n.id));
    if (n.link) {
      router.push(n.link);
      setOpen(false);
    }
  }

  const count = notifications.length;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="relative text-muted hover:text-gold-light transition-colors p-1"
        title="Notifications"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {count > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
            {count > 9 ? "9+" : count}
          </span>
        )}
      </button>

      {open && (
        <div
          className="absolute right-0 top-8 w-80 max-h-96 overflow-y-auto rounded-xl shadow-xl z-50"
          style={{
            background: "var(--glass-bg)",
            border: "1px solid var(--glass-border)",
            backdropFilter: "blur(12px)",
          }}
        >
          <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "var(--glass-border)" }}>
            <span className="text-foreground text-sm font-semibold">Notifications</span>
            {count > 0 && (
              <button onClick={handleMarkAllRead} className="text-gold-light text-xs hover:text-gold transition-colors">
                Mark all read
              </button>
            )}
          </div>

          {count === 0 ? (
            <div className="px-4 py-8 text-center">
              <p className="text-muted text-sm">All caught up!</p>
            </div>
          ) : (
            <div>
              {notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => handleClick(n)}
                  className="w-full text-left px-4 py-3 hover:bg-foreground/5 transition-colors border-b last:border-0"
                  style={{ borderColor: "var(--glass-border)" }}
                >
                  <div className="flex items-start gap-2">
                    <span className="text-base mt-0.5">{TYPE_ICONS[n.type] ?? "\uD83D\uDD14"}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-foreground text-sm font-medium truncate">{n.title}</p>
                      <p className="text-muted text-xs mt-0.5 line-clamp-2">{n.message}</p>
                      <p className="text-muted/60 text-[10px] mt-1">{timeAgo(n.created_at)}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
