"use client";

import { useState } from "react";

interface StaffMember {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  position: string | null;
}

interface StaffMembersModalProps {
  hotelId: string;
  staffMembers: StaffMember[];
  onClose: () => void;
  onMembersChanged: () => void;
}

export default function StaffMembersModal({
  hotelId,
  staffMembers,
  onClose,
  onMembersChanged,
}: StaffMembersModalProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [position, setPosition] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFields, setEditFields] = useState<{ name: string; email: string; phone: string; position: string }>({
    name: "", email: "", phone: "", position: "",
  });
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const inputClass =
    "w-full rounded-xl px-4 py-2.5 text-sm text-foreground bg-[var(--input-bg)] border border-[var(--subtle-border)] focus:border-gold/50 focus:outline-none focus:ring-1 focus:ring-gold/30 transition-colors";

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      setError("Name and email are required.");
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const res = await fetch(`/api/hotels/${hotelId}/staff-members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim() || null,
          position: position.trim() || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to add staff member.");
        return;
      }
      setName("");
      setEmail("");
      setPhone("");
      setPosition("");
      onMembersChanged();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/hotels/${hotelId}/staff-members?id=${id}`, { method: "DELETE" });
      if (res.ok) onMembersChanged();
    } catch {
      // ignore
    } finally {
      setDeletingId(null);
    }
  };

  const startEdit = (member: StaffMember) => {
    setEditingId(member.id);
    setEditFields({
      name: member.name,
      email: member.email,
      phone: member.phone || "",
      position: member.position || "",
    });
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editFields.name.trim() || !editFields.email.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/hotels/${hotelId}/staff-members`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingId,
          name: editFields.name.trim(),
          email: editFields.email.trim(),
          phone: editFields.phone.trim() || null,
          position: editFields.position.trim() || null,
        }),
      });
      if (res.ok) {
        setEditingId(null);
        onMembersChanged();
      }
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative w-full max-w-2xl rounded-2xl p-6 max-h-[85vh] overflow-y-auto"
        style={{
          background: "linear-gradient(135deg, var(--navy-2), var(--navy-3))",
          border: "1px solid rgba(252,219,55,0.15)",
          boxShadow: "0 25px 50px rgba(0,0,0,0.3)",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-foreground font-semibold text-lg">Staff Directory</h3>
            <p className="text-muted text-xs mt-0.5">Manage your hotel staff members for task assignments</p>
          </div>
          <button
            onClick={onClose}
            className="text-[var(--text-tertiary)] hover:text-foreground transition-colors text-2xl leading-none"
          >
            &times;
          </button>
        </div>

        {/* Add New Staff */}
        <form onSubmit={handleAdd} className="mb-6">
          <h4 className="text-gold-light text-xs font-semibold uppercase tracking-wider mb-3">
            Add New Staff Member
          </h4>
          <div className="grid grid-cols-2 gap-3">
            <input
              type="text"
              placeholder="Full Name *"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputClass}
            />
            <input
              type="email"
              placeholder="Email Address *"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
            />
            <input
              type="tel"
              placeholder="Phone (optional)"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className={inputClass}
            />
            <input
              type="text"
              placeholder="Position (optional)"
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              className={inputClass}
            />
          </div>
          {error && <p className="text-danger text-xs font-semibold mt-2">{error}</p>}
          <div className="flex justify-end mt-3">
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 rounded-xl text-sm font-semibold transition-all disabled:opacity-50"
              style={{
                background: "linear-gradient(135deg, var(--gold), var(--gold-dark))",
                color: "var(--navy-1)",
              }}
            >
              {saving ? "Adding..." : "Add Member"}
            </button>
          </div>
        </form>

        {/* Staff List */}
        <div>
          <h4 className="text-gold-light text-xs font-semibold uppercase tracking-wider mb-3">
            Current Staff ({staffMembers.length})
          </h4>
          {staffMembers.length === 0 ? (
            <p className="text-muted text-sm text-center py-6">
              No staff members yet. Add your first team member above.
            </p>
          ) : (
            <div className="space-y-2">
              {staffMembers.map((member) => (
                <div
                  key={member.id}
                  className="rounded-xl p-3 flex items-center gap-3"
                  style={{
                    background: "var(--input-bg)",
                    border: "1px solid var(--subtle-border)",
                  }}
                >
                  {editingId === member.id ? (
                    /* Edit mode */
                    <div className="flex-1 grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={editFields.name}
                        onChange={(e) => setEditFields({ ...editFields, name: e.target.value })}
                        className={inputClass + " !py-1.5 !text-xs"}
                        placeholder="Name"
                      />
                      <input
                        type="email"
                        value={editFields.email}
                        onChange={(e) => setEditFields({ ...editFields, email: e.target.value })}
                        className={inputClass + " !py-1.5 !text-xs"}
                        placeholder="Email"
                      />
                      <input
                        type="tel"
                        value={editFields.phone}
                        onChange={(e) => setEditFields({ ...editFields, phone: e.target.value })}
                        className={inputClass + " !py-1.5 !text-xs"}
                        placeholder="Phone"
                      />
                      <input
                        type="text"
                        value={editFields.position}
                        onChange={(e) => setEditFields({ ...editFields, position: e.target.value })}
                        className={inputClass + " !py-1.5 !text-xs"}
                        placeholder="Position"
                      />
                      <div className="col-span-2 flex justify-end gap-2">
                        <button
                          onClick={() => setEditingId(null)}
                          className="px-3 py-1 rounded-lg text-xs text-[var(--text-tertiary)] hover:text-foreground transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleSaveEdit}
                          disabled={saving}
                          className="px-3 py-1 rounded-lg text-xs font-semibold disabled:opacity-50"
                          style={{
                            background: "linear-gradient(135deg, var(--gold), var(--gold-dark))",
                            color: "var(--navy-1)",
                          }}
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* View mode */
                    <>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-foreground text-sm font-medium truncate">{member.name}</span>
                          {member.position && (
                            <span
                              className="text-xs px-2 py-0.5 rounded-full"
                              style={{
                                background: "rgba(252,219,55,0.1)",
                                color: "var(--gold-light)",
                                border: "1px solid rgba(252,219,55,0.2)",
                              }}
                            >
                              {member.position}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-0.5">
                          <span className="text-muted text-xs truncate">{member.email}</span>
                          {member.phone && (
                            <span className="text-muted text-xs">{member.phone}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => startEdit(member)}
                          className="px-2.5 py-1 rounded-lg text-xs text-gold-light/70 hover:text-gold-light transition-colors"
                          style={{ background: "rgba(252,219,55,0.05)" }}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(member.id)}
                          disabled={deletingId === member.id}
                          className="px-2.5 py-1 rounded-lg text-xs text-danger/70 hover:text-danger transition-colors disabled:opacity-50"
                          style={{ background: "rgba(184,80,80,0.05)" }}
                        >
                          {deletingId === member.id ? "..." : "Remove"}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
