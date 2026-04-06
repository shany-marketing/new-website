/** Reusable style objects that respect CSS variable theming. */

export const pageGradient: React.CSSProperties = {
  background: "var(--page-gradient)",
};

export const glassCard: React.CSSProperties = {
  background: "linear-gradient(135deg, var(--glass-bg) 0%, var(--glass-bg-end) 100%)",
  border: "1px solid var(--glass-border)",
  backdropFilter: "blur(12px)",
  boxShadow: "var(--card-shadow)",
};

export const glassCardNoBorder: React.CSSProperties = {
  background: "linear-gradient(135deg, var(--glass-bg) 0%, var(--glass-bg-end) 100%)",
  boxShadow: "var(--card-shadow)",
};

export const navScrolled: React.CSSProperties = {
  background: "var(--nav-scrolled-bg)",
  backdropFilter: "blur(12px)",
  borderColor: "var(--glass-border)",
};

export const subtleBorder: React.CSSProperties = {
  borderColor: "var(--subtle-border)",
};

export const goldButton: React.CSSProperties = {
  background: "linear-gradient(to right, var(--gold), var(--gold-dark))",
};

export const goldButtonLight: React.CSSProperties = {
  background: "linear-gradient(to right, var(--gold-light), var(--gold-dark))",
};

export const inputBase: React.CSSProperties = {
  background: "var(--input-bg)",
  borderColor: "var(--input-border)",
};

export const cardBorder: React.CSSProperties = {
  border: "1px solid var(--glass-border)",
};

export const heroOverlay: React.CSSProperties = {
  background: "var(--hero-overlay)",
};
