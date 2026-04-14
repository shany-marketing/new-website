"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

const glass = {
  background: "var(--nav-scrolled-bg)",
  backdropFilter: "blur(16px)",
  border: "1px solid var(--glass-border)",
};

const ElaineFace = ({ size = 36 }: { size?: number }) => (
  <svg viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" width={size} height={size}>
    <path d="M18 1 C11 1 6 6 6 13 L6 21 C6 25 10 28 18 28 C26 28 30 25 30 21 L30 13 C30 6 25 1 18 1Z" fill="#2C1A0E" />
    <ellipse cx="18" cy="15" rx="6.5" ry="7.5" fill="#FDEBD0" />
    <path d="M4 36 C4 27 10 28 18 28 C26 28 32 27 32 36" fill="#FDEBD0" />
    <path d="M6 13 C6 7 10 2 18 1 C14 2 11 4 10 8 C8 6 6 9 6 13Z" fill="#1C0F06" />
    <path d="M30 13 C30 9 28 6 26 8 C25 4 22 2 18 1 C26 2 30 7 30 13Z" fill="#1C0F06" />
  </svg>
);

export function pushLeadToCRM(data: {
  name: string;
  hotel: string;
  email: string;
  phone?: string;
  ctaSource: string;
  question?: string;
}) {
  if (typeof window === "undefined") return;
  try {
    const nameParts = data.name.trim().split(" ");
    const notes = [
      data.phone ? `Phone: ${data.phone}` : "",
      data.question ? `Question: ${data.question}` : "",
    ].filter(Boolean).join("\n");
    const lead = {
      id: Math.random().toString(36).slice(2, 9) + Date.now().toString(36),
      first_name: nameParts[0] || "",
      last_name: nameParts.slice(1).join(" ") || "",
      email: data.email,
      chain_name: data.hotel,
      property_name: "",
      source: "website",
      status: "Prospect",
      assigned_to: "",
      campaign: "",
      tier_interest: "",
      website_cta: data.ctaSource,
      e1_variant: "",
      last_email_sent: "",
      notes,
      blacklisted: false,
      calendar_booked: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const leads: unknown[] = JSON.parse(localStorage.getItem("crm_leads") || "[]");
    leads.push(lead);
    localStorage.setItem("crm_leads", JSON.stringify(leads));
  } catch {
    // localStorage not available
  }
}

type Props = {
  open: boolean;
  onClose: () => void;
  ctaSource: string;
  ctaLabel?: string;
  title?: string;
  subtitle?: string;
  note?: string;
  /** "elaine" shows Elaine's chat UI. "signup" (default) shows a clean RatingIQ form. */
  variant?: "signup" | "elaine";
};

const FIELDS = [
  { key: "name",  label: "Your name",        placeholder: "Full name",              type: "text"  },
  { key: "hotel", label: "Hotel / Chain name", placeholder: "Chain or company name",  type: "text"  },
  { key: "email", label: "Work email",        placeholder: "you@yourchain.com",      type: "email" },
  { key: "phone", label: "Phone number",      placeholder: "+1 (000) 000-0000",      type: "tel"   },
];

export default function SignupModal({
  open,
  onClose,
  ctaSource,
  ctaLabel = "Get Started",
  title = "Get started for free.",
  subtitle = "Tell us about your chain and we'll be in touch.",
  note,
  variant = "signup",
}: Props) {
  const [form, setForm] = useState({ name: "", hotel: "", email: "", phone: "" });
  const [sent, setSent] = useState(false);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!open) {
      setTimeout(() => { setForm({ name: "", hotel: "", email: "", phone: "" }); setSent(false); }, 300);
    }
  }, [open]);

  const handleSubmit = () => {
    if (!form.name || !form.hotel || !form.email) return;
    pushLeadToCRM({ name: form.name, hotel: form.hotel, email: form.email, phone: form.phone, ctaSource });
    setSent(true);
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50"
            style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
            onClick={onClose}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
          >
            <div className="w-full max-w-md rounded-2xl overflow-hidden pointer-events-auto" style={{ background: "var(--background)", border: "1px solid var(--glass-border)", boxShadow: "0 0 60px rgba(201,168,106,0.15), 0 24px 48px rgba(0,0,0,0.3)" }}>

              {variant === "elaine" ? (
                <>
                  <div className="px-5 py-4 flex items-center justify-between border-b" style={{ borderColor: "var(--glass-border)", background: "rgba(201,168,106,0.03)" }}>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full overflow-hidden shrink-0" style={{ background: "linear-gradient(160deg, #C9A86A 0%, #8B6A3A 100%)", border: "2px solid rgba(201,168,106,0.4)" }}>
                        <ElaineFace size={40} />
                      </div>
                      <div>
                        <div className="text-foreground text-sm font-semibold" style={{ fontFamily: "var(--font-manrope)" }}>Elaine</div>
                        <div className="text-[10px] flex items-center gap-1" style={{ color: "var(--success)" }}>
                          <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: "var(--success)" }} />
                          Ready to get started
                        </div>
                      </div>
                    </div>
                    <button onClick={onClose} className="text-muted hover:text-foreground transition-colors">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </div>
                  <div className="px-5 pt-5 pb-2">
                    <div className="flex items-end gap-2.5">
                      <div className="w-6 h-6 rounded-full overflow-hidden shrink-0 mb-0.5" style={{ background: "linear-gradient(160deg, #C9A86A 0%, #8B6A3A 100%)" }}>
                        <ElaineFace size={24} />
                      </div>
                      <div className="rounded-2xl rounded-tl-sm px-4 py-3 text-sm leading-relaxed max-w-[85%]" style={{ ...glass }}>
                        Hi — I&apos;m Elaine. Tell us about your chain and we&apos;ll be in touch.<br />
                        <span className="text-muted text-xs">We&apos;ll show you your data. Live.</span>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="px-5 pt-7 pb-2 flex items-start justify-between">
                  <div>
                    <div className="flex items-center mb-3">
                      <img src="/logo.svg" alt="RatingIQ" style={{ height: "28px", width: "auto" }} />
                    </div>
                    <h2 className="text-xl font-bold text-foreground mb-1" style={{ fontFamily: "var(--font-manrope)" }}>{title}</h2>
                    <p className="text-sm text-muted">{subtitle}</p>
                  </div>
                  <button onClick={onClose} className="text-muted hover:text-foreground transition-colors mt-1 shrink-0">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
              )}

              <div className="px-5 pb-6 pt-4">
                {sent ? (
                  <div className="flex flex-col items-center justify-center py-8 gap-3 text-center">
                    <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: "linear-gradient(to right, var(--gold), var(--gold-dark))" }}>
                      <svg className="w-6 h-6" fill="none" stroke="#1C2A39" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                    </div>
                    <p className="font-semibold text-foreground text-base">Got it — we&apos;ll be in touch.</p>
                    <p className="text-muted text-sm">Usually within a few hours.</p>
                    <button onClick={onClose} className="mt-2 text-sm font-semibold px-6 py-2.5 rounded-xl transition-all hover:opacity-90" style={{ background: "var(--input-bg)", color: "var(--foreground)", border: "1px solid var(--glass-border)" }}>Close</button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {FIELDS.map((field) => (
                      <div key={field.key}>
                        <label className="text-xs text-muted font-medium mb-1.5 block">
                          {field.label}{field.key !== "phone" && <span style={{ color: "var(--danger)" }}> *</span>}
                        </label>
                        <input
                          type={field.type}
                          placeholder={field.placeholder}
                          value={form[field.key as keyof typeof form]}
                          onChange={e => setForm(f => ({ ...f, [field.key]: e.target.value }))}
                          className="w-full rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted outline-none transition-all duration-200"
                          style={{ background: "var(--input-bg)", border: "1px solid var(--glass-border)" }}
                          onFocus={e => { e.currentTarget.style.borderColor = "rgba(201,168,106,0.5)"; }}
                          onBlur={e => { e.currentTarget.style.borderColor = "var(--glass-border)"; }}
                        />
                      </div>
                    ))}
                    <button
                      className="w-full mt-2 py-3 rounded-xl font-semibold text-sm transition-all duration-200 hover:opacity-90 hover:scale-[1.01] flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                      style={{ background: "linear-gradient(to right, var(--gold), var(--gold-dark))", color: "#1C2A39" }}
                      onClick={handleSubmit}
                      disabled={!form.name || !form.hotel || !form.email}
                    >
                      {ctaLabel}
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" /></svg>
                    </button>
                    {note && <p className="text-center text-xs mt-2" style={{ color: "var(--muted)" }}>{note}</p>}
                  </div>
                )}
              </div>

            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
