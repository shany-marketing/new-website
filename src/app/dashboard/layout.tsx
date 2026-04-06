"use client";

import { Suspense, useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { clsx } from "clsx";
import ChatDrawer from "@/components/chat/chat-drawer";
import ThemeToggle from "@/components/ui/theme-toggle";
import NotificationBell from "@/components/ui/notification-bell";

type PlanTier = "free" | "ratings" | "premium" | null;

function tierLevel(t: string): number {
  return { free: 0, ratings: 1, premium: 2, insight: 2 }[t] ?? 0;
}

/** Generate list of YYYY-MM strings between two months (inclusive). */
function generateMonthOptions(earliest: string, latest: string): string[] {
  const months: string[] = [];
  const [sy, sm] = earliest.split("-").map(Number);
  const [ey, em] = latest.split("-").map(Number);
  let y = sy, m = sm;
  while (y < ey || (y === ey && m <= em)) {
    months.push(`${y}-${String(m).padStart(2, "0")}`);
    m++;
    if (m > 12) { m = 1; y++; }
  }
  return months;
}

function formatMonth(ym: string): string {
  const [y, m] = ym.split("-");
  return `${m}/${y.slice(2)}`;
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={null}>
      <DashboardLayoutInner>{children}</DashboardLayoutInner>
    </Suspense>
  );
}

function DashboardLayoutInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const [plan, setPlan] = useState<PlanTier>(null);

  const isAdmin = session?.user?.role === "admin";
  const isChainManager = session?.user?.role === "chain_manager";
  const isOnChainChat = pathname === "/dashboard/chain/chat";

  // Extract hotelId from path if present
  const hotelMatch = pathname.match(/^\/dashboard\/([^/]+)/);
  const hotelId = hotelMatch?.[1] && hotelMatch[1] !== "admin" && hotelMatch[1] !== "chain" ? hotelMatch[1] : undefined;

  useEffect(() => {
    if (!hotelId) {
      setPlan(null);
      return;
    }
    fetch(`/api/hotels/${hotelId}/plan`)
      .then((r) => r.json())
      .then((d) => {
        const p = d.plan;
        if (p === "premium" || p === "insight") setPlan("premium");
        else if (p === "ratings") setPlan("ratings");
        else setPlan("free");
      })
      .catch(() => setPlan("free"));
  }, [hotelId]);

  // Date range picker state
  const [dateRange, setDateRange] = useState<{ earliest: string; latest: string } | null>(null);
  const fromParam = searchParams.get("from") || "";
  const toParam = searchParams.get("to") || "";

  useEffect(() => {
    if (!hotelId) { setDateRange(null); return; }
    fetch(`/api/hotels/${hotelId}/date-range`)
      .then((r) => r.json())
      .then((d) => {
        if (d.earliest && d.latest) setDateRange({ earliest: d.earliest, latest: d.latest });
      })
      .catch(() => {});
  }, [hotelId]);

  const updateDateParams = useCallback((from: string, to: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (from) params.set("from", from); else params.delete("from");
    if (to) params.set("to", to); else params.delete("to");
    const qs = params.toString();
    router.replace(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false });
  }, [pathname, router, searchParams]);

  const isOnElaine = pathname.endsWith("/chat");
  const showDatePicker = hotelId && dateRange && !isOnElaine;

  // All tabs visible — lower tiers see blurred/teaser content with upgrade CTAs
  const allNavItems = hotelId
    ? [
        { name: "Statistics", href: `/dashboard/${hotelId}`, minTier: "free" },
        { name: "Ratings", href: `/dashboard/${hotelId}/ratings`, minTier: "free" },
        { name: "Insight", href: `/dashboard/${hotelId}/insights`, minTier: "free" },
        { name: "Actions", href: `/dashboard/${hotelId}/actions`, minTier: "premium" },
        { name: "Reviews", href: `/dashboard/${hotelId}/reviews`, minTier: "free" },
        { name: "Elaine", href: `/dashboard/${hotelId}/chat`, minTier: "premium" },
      ]
    : [];

  // Chain nav (when chain manager is on /dashboard or /dashboard/chain/*)
  const chainNavItems =
    isChainManager && !hotelId
      ? [
          { name: "Properties", href: "/dashboard", minTier: "free" },
          { name: "Chain Elaine", href: "/dashboard/chain/chat", minTier: "free" },
        ]
      : [];

  const currentLevel = tierLevel(plan ?? "free");
  const navItems = chainNavItems.length > 0
    ? chainNavItems
    : allNavItems.filter((item) => currentLevel >= tierLevel(item.minTier));

  const isPremium = plan === "premium";

  return (
    <div
      className="min-h-screen"
      style={{
        background: "var(--page-gradient)",
      }}
    >
      {/* Logo Header */}
      <div className="flex items-center justify-between pt-8 pb-4 px-4 md:px-8 max-w-7xl mx-auto w-full">
        <div className="w-24" />
        <Link href="/dashboard" className="cursor-pointer hover:opacity-90 transition-opacity">
          <img src="/logo.svg" alt="RatingIQ" style={{ height: "32px", width: "auto" }} />
        </Link>
        <div className="flex items-center gap-3 justify-end">
          <NotificationBell />
          <ThemeToggle />
          {hotelId && (
            <Link
              href={`/dashboard/${hotelId}/settings`}
              className="text-muted hover:text-gold-light transition-colors p-1"
              title="Settings"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
              </svg>
            </Link>
          )}
          {isAdmin && (
            <Link
              href="/dashboard/admin"
              className="text-xs text-muted hover:text-gold-light transition-colors"
            >
              Admin
            </Link>
          )}
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="text-xs text-muted hover:text-danger transition-colors"
          >
            Sign out
          </button>
        </div>
      </div>

      {/* Title */}
      <div className="text-center pb-4 mb-4">
        <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-gold via-gold-light to-gold-dark bg-clip-text text-transparent tracking-tight leading-relaxed">
          Reputation Intelligence
        </h1>
        <p className="text-foreground text-base md:text-lg mt-2 font-semibold tracking-wide">
          Structured Control Over Guest Feedback
        </p>
      </div>

      {/* Navigation - only show sub-nav when viewing a hotel */}
      {navItems.length > 0 && (
        <div className="flex justify-center px-4 pb-6 overflow-x-auto">
          <nav
            className="flex gap-1 p-1.5 rounded-2xl min-w-max md:min-w-0"
            style={{
              background: "var(--input-bg)",
              border: "1px solid var(--glass-border)",
            }}
          >
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={clsx(
                    "px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 whitespace-nowrap",
                    isActive
                      ? "bg-gradient-to-r from-gold-light to-gold-dark text-navy-1 shadow-lg shadow-gold-dark/20"
                      : "text-gold-light/70 hover:text-gold-light hover:bg-foreground/5"
                  )}
                >
                  {item.name}
                </Link>
              );
            })}
            {hotelId && !isPremium && (
              <Link
                href="/pricing"
                className="px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 whitespace-nowrap text-gold/50 hover:text-gold hover:bg-foreground/5 flex items-center gap-1.5"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0110 0v4" />
                </svg>
                Upgrade
              </Link>
            )}
          </nav>
        </div>
      )}

      {/* Breadcrumb + Date Range */}
      {(hotelId || isOnChainChat) && (
        <div className="max-w-7xl mx-auto px-4 md:px-8 mb-4 flex items-center justify-between flex-wrap gap-2">
          <Link href="/dashboard" className="text-muted hover:text-gold-light text-sm transition-colors">
            &larr; {isChainManager ? "Back to Chain" : "All Hotels"}
          </Link>

          {showDatePicker && (() => {
            const months = generateMonthOptions(dateRange.earliest, dateRange.latest);
            return (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted text-xs font-medium">Period:</span>
                <select
                  value={fromParam}
                  onChange={(e) => updateDateParams(e.target.value, toParam)}
                  className="rounded-lg px-2.5 py-1.5 text-xs font-medium cursor-pointer"
                  style={{
                    background: "var(--input-bg)",
                    border: "1px solid var(--glass-border)",
                    color: "var(--foreground)",
                  }}
                >
                  <option value="">From start</option>
                  {months.map((m) => (
                    <option key={m} value={m}>{formatMonth(m)}</option>
                  ))}
                </select>
                <span className="text-muted text-xs">—</span>
                <select
                  value={toParam}
                  onChange={(e) => updateDateParams(fromParam, e.target.value)}
                  className="rounded-lg px-2.5 py-1.5 text-xs font-medium cursor-pointer"
                  style={{
                    background: "var(--input-bg)",
                    border: "1px solid var(--glass-border)",
                    color: "var(--foreground)",
                  }}
                >
                  <option value="">To latest</option>
                  {months.map((m) => (
                    <option key={m} value={m}>{formatMonth(m)}</option>
                  ))}
                </select>
                {(fromParam || toParam) && (
                  <button
                    onClick={() => updateDateParams("", "")}
                    className="text-xs text-muted hover:text-gold-light transition-colors ml-1"
                  >
                    Reset
                  </button>
                )}
              </div>
            );
          })()}
        </div>
      )}

      {/* Page Content */}
      <main className="px-4 md:px-8 pb-12 max-w-7xl mx-auto">
        {children}
      </main>

      {/* Footer */}
      <footer className="flex items-center justify-center gap-2 py-8 border-t" style={{ borderColor: "var(--glass-border)" }}>
        <Image src="/u-logo.png" alt="" width={18} height={18} className="h-4.5 w-4.5 opacity-40" />
        <p className="text-muted text-xs">
          Powered by <span className="text-gold-light font-semibold">UpStar</span> Intelligence
        </p>
      </footer>

      {/* AI Chat Drawer - Insight tier only */}
      {hotelId && isPremium && <ChatDrawer hotelId={hotelId} />}
    </div>
  );
}
