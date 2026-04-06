"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

interface Hotel {
  id: string;
  name: string;
  plan: string;
  booking_url: string | null;
  review_count: string;
  user_count: string;
  created_at: string;
}

interface User {
  id: string;
  email: string;
  name: string | null;
  role: string;
  hotel_id: string | null;
  hotel_name: string | null;
  created_at: string;
  chain_name: string | null;
  chain_hotel_count: number;
}

interface AdminNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  hotel_id: string | null;
  created_at: string;
}

interface CostData {
  budget: {
    spent: number;
    limit: number;
    hardStop: boolean;
    alertThreshold: number;
    percentUsed: number;
    exceeded: boolean;
  };
  summary: {
    totalSpent: number;
    byModel: { model: string; cost: number; calls: number }[];
    byHotel: { hotelId: string; hotelName: string; cost: number }[];
    byOperation: { operation: string; cost: number; calls: number }[];
  };
}

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [tab, setTab] = useState<"hotels" | "users">("hotels");
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // New hotel form
  const [newHotelName, setNewHotelName] = useState("");
  const [newHotelUrl, setNewHotelUrl] = useState("");
  const [creating, setCreating] = useState(false);

  // Scrape & pipeline state
  const [scrapingHotelId, setScrapingHotelId] = useState<string | null>(null);
  const [pipelineHotelId, setPipelineHotelId] = useState<string | null>(null);
  const [scrapeMsg, setScrapeMsg] = useState<{ hotelId: string; text: string; isError: boolean } | null>(null);

  // Cost tracking
  const [costData, setCostData] = useState<CostData | null>(null);
  const [editingBudget, setEditingBudget] = useState(false);
  const [budgetInput, setBudgetInput] = useState("");
  const [savingBudget, setSavingBudget] = useState(false);

  // Chain hotel management
  const [chainModalUserId, setChainModalUserId] = useState<string | null>(null);
  const [chainSelectedHotelIds, setChainSelectedHotelIds] = useState<string[]>([]);
  const [chainSaving, setChainSaving] = useState(false);

  useEffect(() => {
    if (status === "loading") return;
    if (!session?.user?.role || session.user.role !== "admin") {
      router.push("/dashboard");
      return;
    }
    loadData();
  }, [status, session, router]);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const [hotelsRes, usersRes, notifRes, costsRes] = await Promise.all([
        fetch("/api/admin/hotels"),
        fetch("/api/admin/users"),
        fetch("/api/admin/notifications"),
        fetch("/api/admin/costs"),
      ]);
      if (!hotelsRes.ok || !usersRes.ok) {
        const msg = !hotelsRes.ok
          ? `Hotels API: ${hotelsRes.status} ${hotelsRes.statusText}`
          : `Users API: ${usersRes.status} ${usersRes.statusText}`;
        setError(msg);
      }
      if (hotelsRes.ok) setHotels(await hotelsRes.json());
      if (usersRes.ok) setUsers(await usersRes.json());
      if (notifRes.ok) setNotifications(await notifRes.json());
      if (costsRes.ok) setCostData(await costsRes.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    }
    setLoading(false);
  }

  async function dismissNotification(id: string) {
    try {
      await fetch("/api/admin/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    } catch {
      // ignore
    }
  }

  async function saveBudget() {
    const val = parseFloat(budgetInput);
    if (isNaN(val) || val <= 0) return;
    setSavingBudget(true);
    try {
      const res = await fetch("/api/admin/costs", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ monthlyLimit: val }),
      });
      if (res.ok) {
        const data = await res.json();
        setCostData((prev) => prev ? { ...prev, budget: data.budget } : prev);
        setEditingBudget(false);
      }
    } catch {
      // ignore
    }
    setSavingBudget(false);
  }

  async function toggleHardStop() {
    if (!costData) return;
    try {
      const res = await fetch("/api/admin/costs", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hardStop: !costData.budget.hardStop }),
      });
      if (res.ok) {
        const data = await res.json();
        setCostData((prev) => prev ? { ...prev, budget: data.budget } : prev);
      }
    } catch {
      // ignore
    }
  }

  async function deleteHotel(hotelId: string, name: string) {
    if (!confirm(`Delete hotel "${name}" and ALL its data (reviews, items, insights)? This cannot be undone.`)) return;
    try {
      const res = await fetch("/api/admin/hotels", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hotelId }),
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Failed to delete hotel");
      } else {
        await loadData();
      }
    } catch {
      // ignore
    }
  }

  async function deleteUser(userId: string, email: string) {
    if (!confirm(`Delete user ${email}? This cannot be undone.`)) return;
    try {
      const res = await fetch("/api/admin/users", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Failed to delete user");
      } else {
        await loadData();
      }
    } catch {
      // ignore
    }
  }

  async function createHotel(e: React.FormEvent) {
    e.preventDefault();
    if (!newHotelName.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/admin/hotels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newHotelName, bookingUrl: newHotelUrl }),
      });
      if (res.ok) {
        setNewHotelName("");
        setNewHotelUrl("");
        await loadData();
      }
    } catch {
      // ignore
    }
    setCreating(false);
  }

  async function setPlan(hotelId: string, plan: string) {
    try {
      await fetch(`/api/admin/hotels/${hotelId}/plan`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      await loadData();
    } catch {
      // ignore
    }
  }

  async function openChainHotelEditor(userId: string) {
    setChainModalUserId(userId);
    try {
      const res = await fetch(`/api/admin/users/${userId}/hotels`);
      if (res.ok) {
        const data = await res.json();
        setChainSelectedHotelIds(data.map((h: { id: string }) => h.id));
      } else {
        setChainSelectedHotelIds([]);
      }
    } catch {
      setChainSelectedHotelIds([]);
    }
  }

  async function saveChainHotels() {
    if (!chainModalUserId) return;
    setChainSaving(true);
    try {
      await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: chainModalUserId, chainHotelIds: chainSelectedHotelIds }),
      });
      await loadData();
    } catch {
      // ignore
    }
    setChainSaving(false);
    setChainModalUserId(null);
  }

  function toggleChainHotel(hotelId: string) {
    setChainSelectedHotelIds((prev) =>
      prev.includes(hotelId) ? prev.filter((id) => id !== hotelId) : [...prev, hotelId]
    );
  }

  async function assignHotel(userId: string, hotelId: string | null) {
    try {
      await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, hotelId }),
      });
      await loadData();
    } catch {
      // ignore
    }
  }

  async function changeRole(userId: string, role: string) {
    try {
      await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, role }),
      });
      await loadData();
    } catch {
      // ignore
    }
  }

  async function scrapeHotel(hotelId: string) {
    setScrapingHotelId(hotelId);
    setScrapeMsg(null);
    try {
      const res = await fetch(`/api/admin/hotels/${hotelId}/scrape`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setScrapeMsg({ hotelId, text: data.error ?? "Scrape failed", isError: true });
      } else {
        setScrapeMsg({ hotelId, text: data.message, isError: false });
      }
    } catch {
      setScrapeMsg({ hotelId, text: "Network error", isError: true });
    }
    setScrapingHotelId(null);
  }

  async function runPipeline(hotelId: string) {
    setPipelineHotelId(hotelId);
    setScrapeMsg(null);
    try {
      const res = await fetch(`/api/hotels/${hotelId}/pipeline`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setScrapeMsg({ hotelId, text: data.error ?? "Pipeline failed", isError: true });
      } else {
        setScrapeMsg({ hotelId, text: "Pipeline started", isError: false });
      }
    } catch {
      setScrapeMsg({ hotelId, text: "Network error", isError: true });
    }
    setPipelineHotelId(null);
  }

  if (status === "loading" || loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="text-muted">Loading admin panel...</div>
      </div>
    );
  }

  const glassStyle = {
    background: "linear-gradient(135deg, var(--glass-bg) 0%, var(--glass-bg-end) 100%)",
    border: "1px solid var(--glass-border)",
    boxShadow: "var(--card-shadow)",
  };

  return (
    <div className="space-y-8">
      {error && (
        <div className="rounded-xl p-4 bg-danger/10 border border-danger/20 text-danger text-sm">
          {error}
        </div>
      )}

      {notifications.length > 0 && (
        <div className="space-y-3">
          {notifications.map((n) => (
            <div
              key={n.id}
              className="rounded-xl p-4 border flex items-start gap-3"
              style={{
                background: n.type === "scrape_failure"
                  ? "rgba(184, 80, 80, 0.08)"
                  : "rgba(201, 168, 106, 0.08)",
                borderColor: n.type === "scrape_failure"
                  ? "rgba(184, 80, 80, 0.25)"
                  : "rgba(201, 168, 106, 0.25)",
              }}
            >
              <span className="text-xl mt-0.5">
                {n.type === "scrape_failure" ? "\u26A0\uFE0F" : "\u2139\uFE0F"}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-foreground font-semibold text-sm">{n.title}</span>
                  <span className="text-muted text-xs">
                    {new Date(n.created_at).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-[var(--text-secondary)] text-sm mt-1">{n.message}</p>
              </div>
              <button
                onClick={() => dismissNotification(n.id)}
                className="text-muted hover:text-foreground text-lg leading-none shrink-0 ml-2"
                title="Dismiss"
              >
                &times;
              </button>
            </div>
          ))}
        </div>
      )}

      {/* AI Cost Tracker */}
      {costData && (
        <div className="rounded-2xl p-6 space-y-4" style={glassStyle}>
          <div className="flex items-center justify-between">
            <h3 className="text-foreground font-semibold">AI Cost Tracker — {new Date().toLocaleString("en-US", { month: "long", year: "numeric" })}</h3>
            <div className="flex items-center gap-3">
              <button
                onClick={toggleHardStop}
                className={`text-xs px-3 py-1 rounded-full font-medium transition-colors ${
                  costData.budget.hardStop
                    ? "bg-danger/20 text-danger"
                    : "bg-[var(--input-bg)] text-muted"
                }`}
              >
                Hard Stop: {costData.budget.hardStop ? "ON" : "OFF"}
              </button>
              {editingBudget ? (
                <div className="flex items-center gap-2">
                  <span className="text-muted text-sm">$</span>
                  <input
                    type="number"
                    value={budgetInput}
                    onChange={(e) => setBudgetInput(e.target.value)}
                    className="w-20 px-2 py-1 rounded-lg text-sm text-foreground focus:outline-none"
                    style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)" }}
                    autoFocus
                  />
                  <button
                    onClick={saveBudget}
                    disabled={savingBudget}
                    className="text-xs px-2 py-1 rounded-lg font-semibold text-navy-1 disabled:opacity-50"
                    style={{ background: "linear-gradient(to right, var(--gold-light), var(--gold-dark))" }}
                  >
                    Save
                  </button>
                  <button onClick={() => setEditingBudget(false)} className="text-muted text-xs">Cancel</button>
                </div>
              ) : (
                <button
                  onClick={() => { setBudgetInput(String(costData.budget.limit)); setEditingBudget(true); }}
                  className="text-xs text-muted hover:text-foreground transition-colors"
                >
                  Edit Limit
                </button>
              )}
            </div>
          </div>

          {/* Spend gauge bar */}
          <div>
            <div className="flex items-baseline justify-between mb-2">
              <span className={`text-2xl font-bold ${
                costData.budget.percentUsed >= 100
                  ? "text-danger"
                  : costData.budget.percentUsed >= costData.budget.alertThreshold
                  ? "text-gold"
                  : "text-green-400"
              }`}>
                ${costData.budget.spent.toFixed(2)}
              </span>
              <span className="text-muted text-sm">/ ${costData.budget.limit.toFixed(2)} limit</span>
            </div>
            <div className="h-3 rounded-full overflow-hidden" style={{ background: "var(--input-bg)" }}>
              <div
                className={`h-full rounded-full transition-all ${
                  costData.budget.percentUsed >= 100
                    ? "bg-danger"
                    : costData.budget.percentUsed >= costData.budget.alertThreshold
                    ? "bg-gold"
                    : "bg-green-400"
                }`}
                style={{ width: `${Math.min(costData.budget.percentUsed, 100)}%` }}
              />
            </div>
            {costData.budget.exceeded && costData.budget.hardStop && (
              <p className="text-danger text-xs mt-2 font-medium">Budget exceeded — all AI calls are blocked until limit is raised.</p>
            )}
          </div>

          {/* Mini tables */}
          <div className="grid md:grid-cols-2 gap-4">
            {/* By Model */}
            <div className="rounded-xl p-4" style={{ background: "var(--input-bg)" }}>
              <h4 className="text-muted text-xs font-medium mb-3 uppercase tracking-wider">By Model</h4>
              <div className="space-y-2">
                {costData.summary.byModel.map((m) => (
                  <div key={m.model} className="flex items-center justify-between text-sm">
                    <span className="text-[var(--text-secondary)] truncate">{m.model}</span>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-muted text-xs">{m.calls} calls</span>
                      <span className="text-foreground font-medium">${m.cost.toFixed(2)}</span>
                    </div>
                  </div>
                ))}
                {costData.summary.byModel.length === 0 && (
                  <div className="text-muted text-xs text-center py-2">No usage this month</div>
                )}
              </div>
            </div>

            {/* By Hotel */}
            <div className="rounded-xl p-4" style={{ background: "var(--input-bg)" }}>
              <h4 className="text-muted text-xs font-medium mb-3 uppercase tracking-wider">By Hotel</h4>
              <div className="space-y-2">
                {costData.summary.byHotel.map((h) => (
                  <div key={h.hotelId} className="flex items-center justify-between text-sm">
                    <span className="text-[var(--text-secondary)] truncate">{h.hotelName}</span>
                    <span className="text-foreground font-medium shrink-0">${h.cost.toFixed(2)}</span>
                  </div>
                ))}
                {costData.summary.byHotel.length === 0 && (
                  <div className="text-muted text-xs text-center py-2">No usage this month</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/dashboard")}
            className="text-muted hover:text-foreground text-sm transition-colors flex items-center gap-1"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Back to Hotels
          </button>
          <h2 className="text-2xl font-bold text-foreground">Admin Panel</h2>
        </div>
        <div className="flex gap-2">
          {(["hotels", "users"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                tab === t
                  ? "bg-gradient-to-r from-gold-light to-gold-dark text-navy-1"
                  : "text-muted hover:text-foreground bg-[var(--input-bg)]"
              }`}
            >
              {t === "hotels" ? "Hotels" : "Users"} ({t === "hotels" ? hotels.length : users.length})
            </button>
          ))}
        </div>
      </div>

      {tab === "hotels" && (
        <div className="space-y-6">
          {/* Create Hotel Form */}
          <form
            onSubmit={createHotel}
            className="rounded-2xl p-6 space-y-4"
            style={glassStyle}
          >
            <h3 className="text-foreground font-semibold">Add New Hotel</h3>
            <div className="grid md:grid-cols-3 gap-4">
              <input
                type="text"
                value={newHotelName}
                onChange={(e) => setNewHotelName(e.target.value)}
                placeholder="Hotel name"
                required
                className="px-4 py-2.5 rounded-xl text-foreground placeholder:text-muted focus:outline-none focus:border-gold/50 text-sm"
                style={{ background: "var(--input-bg)", borderColor: "var(--input-border)", borderWidth: "1px", borderStyle: "solid" }}
              />
              <input
                type="url"
                value={newHotelUrl}
                onChange={(e) => setNewHotelUrl(e.target.value)}
                placeholder="Booking.com URL (optional)"
                className="px-4 py-2.5 rounded-xl text-foreground placeholder:text-muted focus:outline-none focus:border-gold/50 text-sm"
                style={{ background: "var(--input-bg)", borderColor: "var(--input-border)", borderWidth: "1px", borderStyle: "solid" }}
              />
              <button
                type="submit"
                disabled={creating}
                className="px-6 py-2.5 rounded-xl font-semibold text-navy-1 text-sm transition-opacity hover:opacity-90 disabled:opacity-50"
                style={{ background: "linear-gradient(to right, var(--gold-light), var(--gold-dark))" }}
              >
                {creating ? "Creating..." : "Create Hotel"}
              </button>
            </div>
          </form>

          {/* Hotels Table */}
          <div className="rounded-2xl overflow-hidden" style={glassStyle}>
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--glass-border)" }}>
                  <th className="text-left text-muted text-xs font-medium px-6 py-4">Hotel</th>
                  <th className="text-center text-muted text-xs font-medium px-4 py-4">Reviews</th>
                  <th className="text-center text-muted text-xs font-medium px-4 py-4">Users</th>
                  <th className="text-center text-muted text-xs font-medium px-4 py-4">Plan</th>
                  <th className="text-right text-muted text-xs font-medium px-6 py-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {hotels.map((hotel) => (
                  <tr key={hotel.id} style={{ borderBottom: "1px solid var(--subtle-border)" }}>
                    <td className="px-6 py-3">
                      <div className="text-foreground text-sm font-medium">{hotel.name}</div>
                      {hotel.booking_url && (
                        <div className="text-muted text-xs truncate max-w-xs">{hotel.booking_url}</div>
                      )}
                    </td>
                    <td className="text-center text-[var(--text-secondary)] text-sm px-4 py-3">{hotel.review_count}</td>
                    <td className="text-center text-[var(--text-secondary)] text-sm px-4 py-3">{hotel.user_count}</td>
                    <td className="text-center px-4 py-3">
                      <select
                        value={hotel.plan || "free"}
                        onChange={(e) => setPlan(hotel.id, e.target.value)}
                        className={`text-xs font-semibold rounded-full px-3 py-1 focus:outline-none cursor-pointer ${
                          hotel.plan === "premium" || hotel.plan === "insight"
                            ? "bg-gold/20 text-gold"
                            : hotel.plan === "ratings"
                            ? "bg-cyan/20 text-cyan"
                            : "bg-[var(--input-bg)] text-muted"
                        }`}
                        style={{ border: "1px solid var(--glass-border)" }}
                      >
                        <option value="free">free</option>
                        <option value="ratings">ratings</option>
                        <option value="premium">premium</option>
                      </select>
                    </td>
                    <td className="text-right px-6 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => scrapeHotel(hotel.id)}
                          disabled={scrapingHotelId === hotel.id}
                          className="text-xs px-2.5 py-1 rounded-lg font-medium transition-colors disabled:opacity-50"
                          style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)", color: "var(--text-secondary)" }}
                        >
                          {scrapingHotelId === hotel.id ? "Scraping..." : "Scrape"}
                        </button>
                        <button
                          onClick={() => runPipeline(hotel.id)}
                          disabled={pipelineHotelId === hotel.id}
                          className="text-xs px-2.5 py-1 rounded-lg font-semibold transition-opacity hover:opacity-90 text-navy-1 disabled:opacity-50"
                          style={{ background: "linear-gradient(to right, var(--gold-light), var(--gold-dark))" }}
                        >
                          {pipelineHotelId === hotel.id ? "Running..." : "Pipeline"}
                        </button>
                        <button
                          onClick={() => deleteHotel(hotel.id, hotel.name)}
                          className="text-xs px-2 py-1 rounded-lg text-danger/70 hover:text-danger hover:bg-danger/10 transition-colors"
                          title="Delete hotel"
                        >
                          &times;
                        </button>
                      </div>
                      {scrapeMsg && scrapeMsg.hotelId === hotel.id && (
                        <div className={`text-[10px] mt-1 ${scrapeMsg.isError ? "text-danger" : "text-green-400"}`}>
                          {scrapeMsg.text}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
                {hotels.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-center text-muted text-sm py-8">No hotels yet</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "users" && (
        <div className="rounded-2xl overflow-hidden" style={glassStyle}>
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--glass-border)" }}>
                <th className="text-left text-muted text-xs font-medium px-6 py-4">User</th>
                <th className="text-center text-muted text-xs font-medium px-4 py-4">Role</th>
                <th className="text-right text-muted text-xs font-medium px-6 py-4">Hotel Assignment</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} style={{ borderBottom: "1px solid var(--subtle-border)" }}>
                  <td className="px-6 py-3">
                    <div className="text-foreground text-sm font-medium">{user.email}</div>
                    {user.name && <div className="text-muted text-xs">{user.name}</div>}
                  </td>

                  {/* Role dropdown — admins cannot be demoted here */}
                  <td className="text-center px-4 py-3">
                    <span
                      className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                        user.role === "admin"
                          ? "bg-danger/20 text-danger"
                          : user.role === "chain_manager"
                          ? "bg-gold/20 text-gold"
                          : "bg-[var(--input-bg)] text-muted"
                      }`}
                    >
                      {user.role === "chain_manager" ? "chain" : user.role}
                    </span>
                    {user.chain_name && (
                      <div className="text-gold-light text-[10px] mt-0.5">{user.chain_name}</div>
                    )}
                  </td>
                  <td className="text-center text-[var(--text-secondary)] text-sm px-4 py-3">
                    {user.role === "chain_manager" ? (
                      <span className="text-gold-light text-xs">{user.chain_hotel_count} hotels</span>
                    ) : (
                      user.hotel_name || <span className="text-muted">None</span>
                    )}
                  </td>

                  {/* Hotel assignment — single select for user, multi-checkbox for chain_manager */}
                  <td className="text-right px-6 py-3">
                    <div className="flex items-center justify-end gap-2">
                      {user.role === "chain_manager" ? (
                        <button
                          onClick={() => openChainHotelEditor(user.id)}
                          className="text-xs px-3 py-1.5 rounded-lg font-medium text-gold-light hover:text-gold transition-colors"
                          style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)" }}
                        >
                          Manage Hotels
                        </button>
                      ) : (
                        <select
                          value={user.hotel_id || ""}
                          onChange={(e) => assignHotel(user.id, e.target.value || null)}
                          className="text-foreground text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:border-gold/50"
                          style={{ background: "var(--input-bg)", borderColor: "var(--input-border)", borderWidth: "1px", borderStyle: "solid" }}
                        >
                          <option value="">No hotel</option>
                          {hotels.map((h) => (
                            <option key={h.id} value={h.id}>{h.name}</option>
                          ))}
                        </select>
                      )}
                      {user.role !== "admin" && (
                        <button
                          onClick={() => deleteUser(user.id, user.email)}
                          className="text-xs px-2 py-1.5 rounded-lg text-danger/70 hover:text-danger hover:bg-danger/10 transition-colors"
                          title="Delete user"
                        >
                          &times;
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={3} className="text-center text-muted text-sm py-8">No users yet</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Chain Hotel Assignment Modal */}
      {chainModalUserId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div
            className="w-full max-w-md rounded-2xl p-6 space-y-4 max-h-[80vh] flex flex-col"
            style={glassStyle}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-foreground font-semibold">
                Assign Hotels to{" "}
                <span className="text-gold-light">
                  {users.find((u) => u.id === chainModalUserId)?.chain_name || "Chain Manager"}
                </span>
              </h3>
              <button
                onClick={() => setChainModalUserId(null)}
                className="text-muted hover:text-foreground text-xl leading-none"
              >
                &times;
              </button>
            </div>
            <div className="overflow-y-auto flex-1 space-y-1">
              {hotels.map((hotel) => (
                <label
                  key={hotel.id}
                  className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-white/5 cursor-pointer transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={chainSelectedHotelIds.includes(hotel.id)}
                    onChange={() => toggleChainHotel(hotel.id)}
                    className="h-4 w-4 rounded accent-gold"
                  />
                  <div>
                    <div className="text-foreground text-sm">{hotel.name}</div>
                    <div className="text-muted text-xs">{hotel.review_count} reviews</div>
                  </div>
                </label>
              ))}
            </div>
            <div className="flex items-center justify-between pt-2" style={{ borderTop: "1px solid var(--glass-border)" }}>
              <span className="text-muted text-xs">{chainSelectedHotelIds.length} selected</span>
              <div className="flex gap-2">
                <button
                  onClick={() => setChainModalUserId(null)}
                  className="px-4 py-2 rounded-xl text-sm text-muted hover:text-foreground transition-colors"
                  style={{ background: "var(--input-bg)" }}
                >
                  Cancel
                </button>
                <button
                  onClick={saveChainHotels}
                  disabled={chainSaving}
                  className="px-4 py-2 rounded-xl text-sm font-semibold text-navy-1 transition-opacity hover:opacity-90 disabled:opacity-50"
                  style={{ background: "linear-gradient(to right, var(--gold-light), var(--gold-dark))" }}
                >
                  {chainSaving ? "Saving..." : "Save"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

