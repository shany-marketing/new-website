"use client";

import { useState, useRef, useEffect } from "react";

interface StaffMember {
  id: string;
  name: string;
  email: string;
}

interface InitialData {
  id: string;
  categoryId: string;
  periodMonth: string;
  actionDate: string;
  description: string;
  dueDate: string | null;
  priority: string;
  assigneeIds: string[];
}

interface StaffActionFormProps {
  hotelId: string;
  categories: Array<{ id: string; label: string; sentiment: string }>;
  availableMonths: string[];
  staffMembers?: StaffMember[];
  preSelectedCategory?: string;
  preSelectedMonth?: string;
  initialData?: InitialData;
  onActionCreated: () => void;
  onClose: () => void;
}

function formatMonth(dateStr: string): string {
  const parts = dateStr.slice(0, 7).split("-");
  return `${parts[1]}/${parts[0].slice(2)}`;
}

export default function StaffActionForm({
  hotelId,
  categories,
  availableMonths,
  staffMembers = [],
  preSelectedCategory,
  preSelectedMonth,
  initialData,
  onActionCreated,
  onClose,
}: StaffActionFormProps) {
  const isEditing = !!initialData;
  const [categoryId, setCategoryId] = useState(initialData?.categoryId ?? preSelectedCategory ?? "");
  const [periodMonth, setPeriodMonth] = useState(initialData?.periodMonth ?? preSelectedMonth ?? "");
  const [actionDate, setActionDate] = useState(initialData?.actionDate ?? new Date().toISOString().split("T")[0]);
  const [description, setDescription] = useState(initialData?.description ?? "");
  const [dueDate, setDueDate] = useState(initialData?.dueDate ?? "");
  const [priority, setPriority] = useState(initialData?.priority ?? "medium");
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>(initialData?.assigneeIds ?? []);
  const [staffName, setStaffName] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const hasStaffMembers = staffMembers.length > 0;

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const toggleAssignee = (id: string) => {
    setSelectedAssignees((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const selectedNames = staffMembers
    .filter((m) => selectedAssignees.includes(m.id))
    .map((m) => m.name);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!categoryId || !periodMonth || !actionDate || !description.trim()) {
      setError("Category, month, date, and description are required.");
      return;
    }

    if (!hasStaffMembers && !staffName.trim()) {
      setError("Please enter a staff member name or add staff in the directory first.");
      return;
    }

    setSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        categoryId,
        periodMonth,
        actionDate,
        description: description.trim(),
        priority,
        dueDate: dueDate || null,
      };

      if (hasStaffMembers) {
        payload.assigneeIds = selectedAssignees;
      } else {
        payload.staffName = staffName.trim();
      }

      if (isEditing) {
        payload.id = initialData.id;
        if (hasStaffMembers) {
          payload.assigneeIds = selectedAssignees;
        }
      }

      const res = await fetch(`/api/hotels/${hotelId}/staff-actions`, {
        method: isEditing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to save action.");
        return;
      }

      await onActionCreated();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass =
    "w-full rounded-xl px-4 py-2.5 text-sm text-foreground bg-[var(--input-bg)] border border-[var(--subtle-border)] focus:border-gold/50 focus:outline-none focus:ring-1 focus:ring-gold/30 transition-colors";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div
        className="relative w-full max-w-lg rounded-2xl p-6 max-h-[90vh] overflow-y-auto"
        style={{
          background: "linear-gradient(135deg, var(--navy-2), var(--navy-3))",
          border: "1px solid rgba(252,219,55,0.15)",
          boxShadow: "0 25px 50px rgba(0,0,0,0.3)",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-foreground font-semibold text-lg">
              {isEditing ? "Edit Staff Action" : "Record Staff Action"}
            </h3>
            <p className="text-muted text-xs mt-0.5">
              {isEditing
                ? "Update the action details and assignments"
                : "Track actions taken to address guest complaints"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-[var(--text-tertiary)] hover:text-foreground transition-colors text-2xl leading-none"
          >
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Category */}
          <div>
            <label className="text-gold-light text-xs font-semibold uppercase tracking-wider mb-1.5 block">
              Issue Category
            </label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className={inputClass}
              style={{ appearance: "none" }}
            >
              <option value="" className="bg-navy-2">Select category...</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id} className="bg-navy-2">
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          {/* Month */}
          <div>
            <label className="text-gold-light text-xs font-semibold uppercase tracking-wider mb-1.5 block">
              Related Month
            </label>
            <select
              value={periodMonth}
              onChange={(e) => setPeriodMonth(e.target.value)}
              className={inputClass}
              style={{ appearance: "none" }}
            >
              <option value="" className="bg-navy-2">Select month...</option>
              {availableMonths.map((m) => (
                <option key={m} value={m} className="bg-navy-2">
                  {formatMonth(m)}
                </option>
              ))}
            </select>
          </div>

          {/* Action Date + Due Date row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-gold-light text-xs font-semibold uppercase tracking-wider mb-1.5 block">
                Action Date
              </label>
              <input
                type="date"
                value={actionDate}
                onChange={(e) => setActionDate(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className="text-gold-light text-xs font-semibold uppercase tracking-wider mb-1.5 block">
                Due Date
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className={inputClass}
                placeholder="Optional"
              />
            </div>
          </div>

          {/* Priority */}
          <div>
            <label className="text-gold-light text-xs font-semibold uppercase tracking-wider mb-1.5 block">
              Priority
            </label>
            <div className="flex gap-2">
              {(["low", "medium", "high", "urgent"] as const).map((p) => {
                const isActive = priority === p;
                const colors: Record<string, { bg: string; border: string; text: string }> = {
                  low: { bg: "rgba(153,153,153,0.1)", border: "rgba(153,153,153,0.3)", text: "#999" },
                  medium: { bg: "rgba(201,168,106,0.1)", border: "rgba(201,168,106,0.3)", text: "#C9A86A" },
                  high: { bg: "rgba(255,140,66,0.1)", border: "rgba(255,140,66,0.3)", text: "#ff8c42" },
                  urgent: { bg: "rgba(184,80,80,0.1)", border: "rgba(184,80,80,0.3)", text: "#B85050" },
                };
                const c = colors[p];
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPriority(p)}
                    className="flex-1 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all"
                    style={{
                      background: isActive ? c.bg : "transparent",
                      border: `1.5px solid ${isActive ? c.border : "var(--subtle-border)"}`,
                      color: isActive ? c.text : "var(--text-tertiary)",
                    }}
                  >
                    {p}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Staff Members - multi-select or free text */}
          <div>
            <label className="text-gold-light text-xs font-semibold uppercase tracking-wider mb-1.5 block">
              Assign To
            </label>
            {hasStaffMembers ? (
              <div ref={dropdownRef} className="relative">
                <button
                  type="button"
                  onClick={() => setShowDropdown(!showDropdown)}
                  className={inputClass + " text-left cursor-pointer flex items-center justify-between"}
                >
                  <span className={selectedNames.length === 0 ? "text-[var(--text-tertiary)]" : ""}>
                    {selectedNames.length === 0
                      ? "Select staff members..."
                      : selectedNames.join(", ")}
                  </span>
                  <span className="text-[var(--text-tertiary)] text-xs ml-2">
                    {showDropdown ? "\u25B2" : "\u25BC"}
                  </span>
                </button>
                {showDropdown && (
                  <div
                    className="absolute z-20 w-full mt-1 rounded-xl overflow-hidden max-h-48 overflow-y-auto"
                    style={{
                      background: "var(--navy-2)",
                      border: "1px solid rgba(252,219,55,0.15)",
                      boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
                    }}
                  >
                    {staffMembers.map((m) => {
                      const checked = selectedAssignees.includes(m.id);
                      return (
                        <label
                          key={m.id}
                          className="flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-[var(--input-bg)] transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleAssignee(m.id)}
                            className="accent-[var(--gold)] w-4 h-4 rounded"
                          />
                          <div className="min-w-0">
                            <span className="text-foreground text-sm">{m.name}</span>
                            <span className="text-muted text-xs ml-2">{m.email}</span>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              <input
                type="text"
                placeholder="e.g. Sarah / Juan"
                value={staffName}
                onChange={(e) => setStaffName(e.target.value)}
                className={inputClass}
              />
            )}
          </div>

          {/* Description */}
          <div>
            <label className="text-gold-light text-xs font-semibold uppercase tracking-wider mb-1.5 block">
              Action Description
            </label>
            <textarea
              placeholder="Describe the action to address this issue..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className={inputClass + " resize-none"}
            />
          </div>

          {/* Error */}
          {error && (
            <p className="text-danger text-xs font-semibold">{error}</p>
          )}

          {/* Buttons */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-sm text-[var(--text-tertiary)] hover:text-foreground transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-50"
              style={{
                background: "linear-gradient(135deg, var(--gold), var(--gold-dark))",
                color: "var(--navy-1)",
              }}
            >
              {submitting ? "Saving..." : isEditing ? "Update Action" : "Save Action"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
