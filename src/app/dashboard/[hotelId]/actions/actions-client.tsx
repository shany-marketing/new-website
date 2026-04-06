"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import SectionTitle from "@/components/ui/section-title";
import StaffActionForm from "@/components/dashboard/staff-action-form";
import StaffMembersModal from "@/components/dashboard/staff-members-modal";

const fadeIn = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5 },
};

interface Assignee {
  id: string;
  name: string;
  email: string;
}

interface StaffAction {
  id: string;
  category: string;
  category_id: string;
  period_month: string;
  action_date: string;
  staff_name: string;
  description: string;
  created_at: string;
  due_date: string | null;
  status: string;
  priority: string;
  completed_at: string | null;
  notes: string | null;
  assignees: Assignee[];
}

interface StaffMember {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  position: string | null;
}

interface ActionsClientProps {
  hotelId: string;
  hotelName: string;
  categories: Array<{ id: string; label: string; sentiment: string }>;
}

function formatDate(d: string | null): string {
  if (!d) return "\u2014";
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatMonth(dateStr: string): string {
  const parts = dateStr.slice(0, 7).split("-");
  return `${parts[1]}/${parts[0].slice(2)}`;
}

function getDueDateStatus(dueDate: string | null, status: string): "overdue" | "due-soon" | "ok" | null {
  if (!dueDate || status === "completed") return null;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const due = new Date(dueDate + "T00:00:00");
  const diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return "overdue";
  if (diffDays <= 3) return "due-soon";
  return "ok";
}

const priorityConfig: Record<string, { color: string; bg: string; border: string; label: string }> = {
  urgent: { color: "#B85050", bg: "rgba(184,80,80,0.12)", border: "rgba(184,80,80,0.3)", label: "Urgent" },
  high: { color: "#ff8c42", bg: "rgba(255,140,66,0.12)", border: "rgba(255,140,66,0.3)", label: "High" },
  medium: { color: "#C9A86A", bg: "rgba(201,168,106,0.12)", border: "rgba(201,168,106,0.3)", label: "Medium" },
  low: { color: "#999", bg: "rgba(153,153,153,0.12)", border: "rgba(153,153,153,0.3)", label: "Low" },
};

const statusConfig: Record<string, { color: string; bg: string; border: string; label: string }> = {
  pending: { color: "#C9A86A", bg: "rgba(201,168,106,0.1)", border: "rgba(201,168,106,0.25)", label: "Pending" },
  in_progress: { color: "#4A9FD6", bg: "rgba(74,159,214,0.1)", border: "rgba(74,159,214,0.25)", label: "In Progress" },
  completed: { color: "#4A8F6B", bg: "rgba(74,143,107,0.1)", border: "rgba(74,143,107,0.25)", label: "Completed" },
};

export default function ActionsClient({
  hotelId,
  hotelName,
  categories,
}: ActionsClientProps) {
  const [actions, setActions] = useState<StaffAction[]>([]);
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("");
  const [filterPriority, setFilterPriority] = useState("");
  const [filterAssignee, setFilterAssignee] = useState("");
  const [showActionForm, setShowActionForm] = useState(false);
  const [editingAction, setEditingAction] = useState<StaffAction | null>(null);
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [notifyingId, setNotifyingId] = useState<string | null>(null);

  const fetchActions = useCallback(async () => {
    try {
      const res = await fetch(`/api/hotels/${hotelId}/staff-actions`);
      if (res.ok) {
        const data = await res.json();
        setActions(data);
      }
    } catch {
      // ignore
    }
  }, [hotelId]);

  const fetchStaffMembers = useCallback(async () => {
    try {
      const res = await fetch(`/api/hotels/${hotelId}/staff-members`);
      if (res.ok) {
        const data = await res.json();
        setStaffMembers(data);
      }
    } catch {
      // ignore
    }
  }, [hotelId]);

  useEffect(() => {
    Promise.all([fetchActions(), fetchStaffMembers()]).finally(() => setLoading(false));
  }, [fetchActions, fetchStaffMembers]);

  const handleStatusChange = async (actionId: string, newStatus: string) => {
    setUpdatingId(actionId);
    try {
      const res = await fetch(`/api/hotels/${hotelId}/staff-actions`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: actionId, status: newStatus }),
      });
      if (res.ok) await fetchActions();
    } catch {
      // ignore
    } finally {
      setUpdatingId(null);
    }
  };

  const handleRenotify = async (actionId: string) => {
    setNotifyingId(actionId);
    try {
      await fetch(`/api/hotels/${hotelId}/staff-actions/notify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actionId }),
      });
    } catch {
      // ignore
    } finally {
      setNotifyingId(null);
    }
  };

  const handleDelete = async (actionId: string) => {
    setUpdatingId(actionId);
    try {
      const res = await fetch(`/api/hotels/${hotelId}/staff-actions?id=${actionId}`, {
        method: "DELETE",
      });
      if (res.ok) await fetchActions();
    } catch {
      // ignore
    } finally {
      setUpdatingId(null);
    }
  };

  const handleActionCreated = async () => {
    await fetchActions();
    setShowActionForm(false);
    setEditingAction(null);
  };

  // Get available months from actions
  const availableMonths = [...new Set(actions.map((a) => a.period_month))].sort();

  // Filter actions
  const filtered = actions.filter((a) => {
    if (filterStatus && a.status !== filterStatus) return false;
    if (filterPriority && a.priority !== filterPriority) return false;
    if (filterAssignee && !a.assignees.some((as) => as.id === filterAssignee)) return false;
    return true;
  });

  // Stats
  const totalCount = actions.length;
  const pendingCount = actions.filter((a) => a.status === "pending").length;
  const overdueCount = actions.filter((a) => getDueDateStatus(a.due_date, a.status) === "overdue").length;
  const completedCount = actions.filter((a) => a.status === "completed").length;

  const selectClass =
    "rounded-lg px-2.5 py-1.5 text-xs font-medium cursor-pointer bg-[var(--input-bg)] border border-[var(--glass-border)] text-foreground";

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-muted text-sm">Loading actions...</div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Hero */}
      <motion.div {...fadeIn} className="relative rounded-3xl overflow-hidden">
        <div
          className="w-full h-[160px] md:h-[200px]"
          style={{ background: "var(--page-gradient)" }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-navy-1 via-navy-1/50 to-transparent" />
        <div className="absolute inset-0 flex flex-col justify-end p-6 md:p-10">
          <h2 className="text-foreground text-2xl md:text-3xl font-bold mb-1">
            Staff Actions & Assignments
          </h2>
          <p className="text-cyan text-sm">
            {hotelName} — Track and manage complaint-driven tasks
          </p>
        </div>
      </motion.div>

      {/* Stats */}
      <motion.div {...fadeIn} transition={{ delay: 0.05, duration: 0.5 }}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total Actions", value: totalCount, color: "var(--foreground)" },
            { label: "Pending", value: pendingCount, color: "#C9A86A" },
            { label: "Overdue", value: overdueCount, color: "#B85050" },
            { label: "Completed", value: completedCount, color: "#4A8F6B" },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-2xl p-4 text-center"
              style={{
                background: "linear-gradient(135deg, var(--glass-bg) 0%, var(--glass-bg-end) 100%)",
                border: "1px solid var(--glass-border)",
              }}
            >
              <div className="text-2xl font-bold" style={{ color: stat.color }}>
                {stat.value}
              </div>
              <div className="text-muted text-xs mt-1">{stat.label}</div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Toolbar */}
      <motion.div {...fadeIn} transition={{ delay: 0.1, duration: 0.5 }}>
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className={selectClass}
            style={{ appearance: "none" }}
          >
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
          </select>

          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className={selectClass}
            style={{ appearance: "none" }}
          >
            <option value="">All Priorities</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          {staffMembers.length > 0 && (
            <select
              value={filterAssignee}
              onChange={(e) => setFilterAssignee(e.target.value)}
              className={selectClass}
              style={{ appearance: "none" }}
            >
              <option value="">All Staff</option>
              {staffMembers.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          )}

          <div className="flex-1" />

          <button
            onClick={() => setShowStaffModal(true)}
            className="px-4 py-1.5 rounded-xl text-xs font-semibold transition-all"
            style={{
              border: "1px solid rgba(252,219,55,0.25)",
              color: "var(--gold-light)",
              background: "rgba(252,219,55,0.05)",
            }}
          >
            Manage Staff
          </button>

          <button
            onClick={() => { setEditingAction(null); setShowActionForm(true); }}
            className="px-4 py-1.5 rounded-xl text-xs font-semibold transition-all"
            style={{
              background: "linear-gradient(135deg, var(--gold), var(--gold-dark))",
              color: "var(--navy-1)",
            }}
          >
            + New Action
          </button>
        </div>
      </motion.div>

      {/* Actions List */}
      <motion.div {...fadeIn} transition={{ delay: 0.15, duration: 0.5 }}>
        <SectionTitle title="Action Items" subtitle={`${filtered.length} action${filtered.length !== 1 ? "s" : ""}`} />

        {filtered.length === 0 ? (
          <div
            className="rounded-2xl p-12 text-center"
            style={{
              background: "linear-gradient(135deg, var(--glass-bg) 0%, var(--glass-bg-end) 100%)",
              border: "1px solid var(--glass-border)",
            }}
          >
            <p className="text-muted text-sm mb-4">
              {actions.length === 0
                ? "No actions recorded yet. Create your first action to start tracking staff assignments."
                : "No actions match the current filters."}
            </p>
            {actions.length === 0 && (
              <button
                onClick={() => setShowActionForm(true)}
                className="px-6 py-2.5 rounded-xl text-sm font-semibold transition-all"
                style={{
                  background: "linear-gradient(135deg, var(--gold), var(--gold-dark))",
                  color: "var(--navy-1)",
                }}
              >
                Create First Action
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((action) => {
              const pConfig = priorityConfig[action.priority] || priorityConfig.medium;
              const sConfig = statusConfig[action.status] || statusConfig.pending;
              const dueDateStatus = getDueDateStatus(action.due_date, action.status);
              const isUpdating = updatingId === action.id;
              const isNotifying = notifyingId === action.id;

              return (
                <div
                  key={action.id}
                  className="rounded-2xl p-5 transition-all"
                  style={{
                    background: "linear-gradient(135deg, var(--glass-bg) 0%, var(--glass-bg-end) 100%)",
                    border: `1px solid ${dueDateStatus === "overdue" ? "rgba(184,80,80,0.3)" : "var(--glass-border)"}`,
                    opacity: action.status === "completed" ? 0.7 : 1,
                  }}
                >
                  {/* Top row: category + badges */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-foreground font-semibold text-sm">{action.category}</span>
                        <span
                          className="text-xs px-2 py-0.5 rounded-full font-semibold"
                          style={{
                            background: pConfig.bg,
                            border: `1px solid ${pConfig.border}`,
                            color: pConfig.color,
                          }}
                        >
                          {pConfig.label}
                        </span>
                        <span
                          className="text-xs px-2 py-0.5 rounded-full font-semibold"
                          style={{
                            background: sConfig.bg,
                            border: `1px solid ${sConfig.border}`,
                            color: sConfig.color,
                          }}
                        >
                          {sConfig.label}
                        </span>
                      </div>
                      <p className="text-muted text-sm mt-1.5">{action.description}</p>
                      {action.notes && (
                        <p className="text-muted text-xs mt-1 italic">Note: {action.notes}</p>
                      )}
                    </div>
                  </div>

                  {/* Info row */}
                  <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs mb-3">
                    {/* Assignees */}
                    <div className="flex items-center gap-1.5">
                      <span className="text-[var(--text-tertiary)]">Assigned:</span>
                      {action.assignees.length > 0 ? (
                        <span className="text-gold-light font-medium">
                          {action.assignees.map((a) => a.name).join(", ")}
                        </span>
                      ) : (
                        <span className="text-muted">{action.staff_name || "Unassigned"}</span>
                      )}
                    </div>

                    {/* Due date */}
                    {action.due_date && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-[var(--text-tertiary)]">Due:</span>
                        <span
                          className="font-medium"
                          style={{
                            color:
                              dueDateStatus === "overdue"
                                ? "#B85050"
                                : dueDateStatus === "due-soon"
                                ? "#ff8c42"
                                : "var(--foreground)",
                          }}
                        >
                          {formatDate(action.due_date)}
                          {dueDateStatus === "overdue" && " (Overdue)"}
                          {dueDateStatus === "due-soon" && " (Due Soon)"}
                        </span>
                      </div>
                    )}

                    {/* Month */}
                    <div className="flex items-center gap-1.5">
                      <span className="text-[var(--text-tertiary)]">Month:</span>
                      <span className="text-muted">{formatMonth(action.period_month)}</span>
                    </div>

                    {/* Created */}
                    <div className="flex items-center gap-1.5">
                      <span className="text-[var(--text-tertiary)]">Created:</span>
                      <span className="text-muted">{formatDate(action.action_date)}</span>
                    </div>

                    {action.completed_at && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-[var(--text-tertiary)]">Completed:</span>
                        <span className="text-[#4A8F6B]">
                          {new Date(action.completed_at).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center gap-2 pt-2 border-t border-[var(--subtle-border)]">
                    {action.status !== "completed" && (
                      <>
                        {action.status === "pending" && (
                          <button
                            onClick={() => handleStatusChange(action.id, "in_progress")}
                            disabled={isUpdating}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all disabled:opacity-50"
                            style={{
                              background: "rgba(74,159,214,0.1)",
                              border: "1px solid rgba(74,159,214,0.25)",
                              color: "#4A9FD6",
                            }}
                          >
                            Start
                          </button>
                        )}
                        <button
                          onClick={() => handleStatusChange(action.id, "completed")}
                          disabled={isUpdating}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all disabled:opacity-50"
                          style={{
                            background: "rgba(74,143,107,0.1)",
                            border: "1px solid rgba(74,143,107,0.25)",
                            color: "#4A8F6B",
                          }}
                        >
                          Complete
                        </button>
                      </>
                    )}

                    {action.status === "completed" && (
                      <button
                        onClick={() => handleStatusChange(action.id, "pending")}
                        disabled={isUpdating}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all disabled:opacity-50"
                        style={{
                          background: "rgba(201,168,106,0.1)",
                          border: "1px solid rgba(201,168,106,0.25)",
                          color: "#C9A86A",
                        }}
                      >
                        Reopen
                      </button>
                    )}

                    {action.assignees.length > 0 && action.status !== "completed" && (
                      <button
                        onClick={() => handleRenotify(action.id)}
                        disabled={isNotifying}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all disabled:opacity-50"
                        style={{
                          background: "rgba(252,219,55,0.05)",
                          border: "1px solid rgba(252,219,55,0.2)",
                          color: "var(--gold-light)",
                        }}
                      >
                        {isNotifying ? "Sending..." : "Re-notify"}
                      </button>
                    )}

                    <button
                      onClick={() => {
                        setEditingAction(action);
                        setShowActionForm(true);
                      }}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                      style={{
                        background: "rgba(255,255,255,0.03)",
                        border: "1px solid var(--subtle-border)",
                        color: "var(--text-tertiary)",
                      }}
                    >
                      Edit
                    </button>

                    <div className="flex-1" />

                    <button
                      onClick={() => handleDelete(action.id)}
                      disabled={isUpdating}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all disabled:opacity-50"
                      style={{
                        color: "rgba(184,80,80,0.6)",
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </motion.div>

      {/* Modals */}
      {showActionForm && (
        <StaffActionForm
          hotelId={hotelId}
          categories={categories}
          availableMonths={availableMonths.length > 0 ? availableMonths : getDefaultMonths()}
          staffMembers={staffMembers}
          initialData={
            editingAction
              ? {
                  id: editingAction.id,
                  categoryId: editingAction.category_id,
                  periodMonth: editingAction.period_month,
                  actionDate: editingAction.action_date,
                  description: editingAction.description,
                  dueDate: editingAction.due_date,
                  priority: editingAction.priority,
                  assigneeIds: editingAction.assignees.map((a) => a.id),
                }
              : undefined
          }
          onActionCreated={handleActionCreated}
          onClose={() => {
            setShowActionForm(false);
            setEditingAction(null);
          }}
        />
      )}

      {showStaffModal && (
        <StaffMembersModal
          hotelId={hotelId}
          staffMembers={staffMembers}
          onClose={() => setShowStaffModal(false)}
          onMembersChanged={() => {
            fetchStaffMembers();
          }}
        />
      )}
    </div>
  );
}

/** Generate last 12 months as fallback when no actions exist yet */
function getDefaultMonths(): string[] {
  const months: string[] = [];
  const now = new Date();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`);
  }
  return months;
}
