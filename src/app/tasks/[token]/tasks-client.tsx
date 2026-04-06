"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";

interface Task {
  id: string;
  category_label: string;
  description: string;
  priority: string;
  status: string;
  due_date: string | null;
  notes: string | null;
  created_at: string;
}

interface StaffData {
  staff: { id: string; name: string; position: string | null };
  hotelName: string;
  tasks: Task[];
}

const PRIORITY_COLORS: Record<string, { bg: string; text: string }> = {
  urgent: { bg: "#B8505020", text: "#B85050" },
  high: { bg: "#ff8c4220", text: "#ff8c42" },
  medium: { bg: "#C9A86A20", text: "#C9A86A" },
  low: { bg: "#7e93b220", text: "#7e93b2" },
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  in_progress: "In Progress",
  completed: "Completed",
};

function formatDate(d: string | null): string {
  if (!d) return "No due date";
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function isOverdue(dueDate: string | null, status: string): boolean {
  if (!dueDate || status === "completed") return false;
  return new Date(dueDate + "T23:59:59") < new Date();
}

export default function TasksClient({ token }: { token: string }) {
  const [data, setData] = useState<StaffData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchTasks = useCallback(async () => {
    try {
      const res = await fetch(`/api/tasks/${token}`);
      if (!res.ok) {
        const err = await res.json();
        setError(err.error || "Failed to load tasks");
        return;
      }
      setData(await res.json());
    } catch {
      setError("Failed to load tasks");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  async function updateTask(taskId: string, updates: { status?: string; notes?: string }) {
    setUpdatingId(taskId);
    try {
      await fetch(`/api/tasks/${token}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId, ...updates }),
      });
      await fetchTasks();
    } catch {
      // silent
    } finally {
      setUpdatingId(null);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--page-gradient)" }}>
        <div className="animate-pulse text-gold text-lg">Loading tasks...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-4" style={{ background: "var(--page-gradient)" }}>
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: "rgba(184,80,80,0.15)", border: "1px solid rgba(184,80,80,0.25)" }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#B85050" strokeWidth="1.5" strokeLinecap="round">
            <circle cx="12" cy="12" r="10" />
            <path d="M15 9l-6 6M9 9l6 6" />
          </svg>
        </div>
        <h1 className="text-foreground text-xl font-bold">Link expired or invalid</h1>
        <p className="text-muted text-sm text-center max-w-sm">{error}. Please ask your manager to resend the task notification.</p>
      </div>
    );
  }

  if (!data) return null;

  const { staff, hotelName, tasks } = data;

  const overdueTasks = tasks.filter(t => isOverdue(t.due_date, t.status) && t.status !== "completed");
  const pendingTasks = tasks.filter(t => t.status === "pending" && !isOverdue(t.due_date, t.status));
  const inProgressTasks = tasks.filter(t => t.status === "in_progress" && !isOverdue(t.due_date, t.status));
  const completedTasks = tasks.filter(t => t.status === "completed");

  const groups = [
    { label: "Overdue", tasks: overdueTasks, color: "#B85050" },
    { label: "Pending", tasks: pendingTasks, color: "#C9A86A" },
    { label: "In Progress", tasks: inProgressTasks, color: "#516B84" },
    { label: "Completed", tasks: completedTasks, color: "#4A8F6B" },
  ].filter(g => g.tasks.length > 0);

  return (
    <div className="min-h-screen" style={{ background: "var(--page-gradient)" }}>
      {/* Header */}
      <div className="max-w-2xl mx-auto px-4 pt-8 pb-6">
        <div className="flex items-center justify-center mb-6">
          <Image src="/upstar-logo.png" alt="UpStar" width={120} height={40} className="h-8 w-auto" priority />
        </div>
        <div className="text-center">
          <h1 className="text-foreground text-xl font-bold">Your Tasks</h1>
          <p className="text-muted text-sm mt-1">Hi {staff.name} — {hotelName}</p>
        </div>
      </div>

      {/* Task groups */}
      <div className="max-w-2xl mx-auto px-4 pb-12 space-y-6">
        {tasks.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted text-sm">No tasks assigned to you right now.</p>
          </div>
        )}

        {groups.map((group) => (
          <div key={group.label}>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2 h-2 rounded-full" style={{ background: group.color }} />
              <h2 className="text-foreground text-sm font-semibold">{group.label}</h2>
              <span className="text-muted text-xs">({group.tasks.length})</span>
            </div>

            <div className="space-y-3">
              {group.tasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  updating={updatingId === task.id}
                  onStatusChange={(status) => updateTask(task.id, { status })}
                  onNotesChange={(notes) => updateTask(task.id, { notes })}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <footer className="flex items-center justify-center gap-2 py-6 border-t" style={{ borderColor: "var(--glass-border)" }}>
        <Image src="/u-logo.png" alt="" width={16} height={16} className="h-4 w-4 opacity-40" />
        <p className="text-muted text-xs">Powered by <span className="text-gold-light font-semibold">UpStar</span></p>
      </footer>
    </div>
  );
}

function TaskCard({
  task,
  updating,
  onStatusChange,
  onNotesChange,
}: {
  task: Task;
  updating: boolean;
  onStatusChange: (status: string) => void;
  onNotesChange: (notes: string) => void;
}) {
  const [notesValue, setNotesValue] = useState(task.notes ?? "");
  const [showNotes, setShowNotes] = useState(false);
  const priority = PRIORITY_COLORS[task.priority] ?? PRIORITY_COLORS.low;
  const overdue = isOverdue(task.due_date, task.status);

  const nextStatus = task.status === "pending" ? "in_progress" : task.status === "in_progress" ? "completed" : null;
  const prevStatus = task.status === "completed" ? "in_progress" : task.status === "in_progress" ? "pending" : null;

  return (
    <div
      className="rounded-xl p-4"
      style={{
        background: "var(--glass-bg)",
        border: `1px solid ${overdue ? "rgba(184,80,80,0.3)" : "var(--glass-border)"}`,
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-foreground text-sm font-semibold">{task.category_label}</h3>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md" style={{ background: priority.bg, color: priority.text }}>
              {task.priority.toUpperCase()}
            </span>
            {overdue && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md" style={{ background: "#B8505020", color: "#B85050" }}>
                OVERDUE
              </span>
            )}
          </div>
          <p className="text-muted text-xs mt-1.5 leading-relaxed">{task.description}</p>
          <div className="flex items-center gap-3 mt-2">
            <span className="text-muted text-[11px]">{formatDate(task.due_date)}</span>
            <span className="text-[11px] px-2 py-0.5 rounded-md" style={{ background: "var(--input-bg)", color: "var(--foreground)" }}>
              {STATUS_LABELS[task.status] ?? task.status}
            </span>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-2 mt-3 flex-wrap">
        {prevStatus && (
          <button
            onClick={() => onStatusChange(prevStatus)}
            disabled={updating}
            className="text-xs px-3 py-1.5 rounded-lg transition-colors border"
            style={{ borderColor: "var(--glass-border)", color: "var(--foreground)" }}
          >
            {"\u2190"} {STATUS_LABELS[prevStatus]}
          </button>
        )}
        {nextStatus && (
          <button
            onClick={() => onStatusChange(nextStatus)}
            disabled={updating}
            className="text-xs px-3 py-1.5 rounded-lg font-medium text-navy-1 transition-opacity hover:opacity-90"
            style={{ background: "linear-gradient(to right, var(--gold), var(--gold-dark))" }}
          >
            {nextStatus === "completed" ? "\u2713 Mark Complete" : "\u25B6 Start"}
          </button>
        )}
        <button
          onClick={() => setShowNotes(!showNotes)}
          className="text-xs px-3 py-1.5 rounded-lg transition-colors text-muted hover:text-foreground"
        >
          {showNotes ? "Hide notes" : "Add notes"}
        </button>
      </div>

      {/* Notes */}
      {showNotes && (
        <div className="mt-3">
          <textarea
            value={notesValue}
            onChange={(e) => setNotesValue(e.target.value)}
            placeholder="Add notes about this task..."
            rows={3}
            className="w-full rounded-lg px-3 py-2 text-sm resize-none"
            style={{
              background: "var(--input-bg)",
              border: "1px solid var(--glass-border)",
              color: "var(--foreground)",
            }}
          />
          <button
            onClick={() => onNotesChange(notesValue)}
            disabled={updating}
            className="mt-2 text-xs px-3 py-1.5 rounded-lg font-medium text-navy-1 transition-opacity hover:opacity-90"
            style={{ background: "linear-gradient(to right, var(--gold), var(--gold-dark))" }}
          >
            Save Notes
          </button>
        </div>
      )}
    </div>
  );
}
