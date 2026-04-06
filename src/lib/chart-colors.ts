// Centralized chart color palette — "Calm Authority" brand
export const CHART_COLORS = {
  primary: "#C9A86A",     // Soft Gold
  secondary: "#516B84",   // Slate Blue
  success: "#4A8F6B",     // Muted green
  danger: "#B85050",      // Muted red
  warning: "#C9A86A",     // Same as primary
  info: "#7BA7C2",        // Light slate blue
  neutral: "#8A9AAD",     // Muted gray
  navy: "#1C2A39",        // Deep navy
};

export const CHART_PALETTE = [
  "#C9A86A", "#516B84", "#4A8F6B", "#B85050",
  "#7BA7C2", "#8A9AAD", "#A78BFA", "#D4A574",
];

export function getRatingColor(rating: number): string {
  if (rating >= 8.0) return CHART_COLORS.success;
  if (rating >= 7.0) return CHART_COLORS.primary;
  if (rating >= 6.0) return CHART_COLORS.warning;
  return CHART_COLORS.danger;
}

export function getSentimentColor(sentiment: "positive" | "negative" | "neutral"): string {
  if (sentiment === "positive") return CHART_COLORS.success;
  if (sentiment === "negative") return CHART_COLORS.danger;
  return CHART_COLORS.primary;
}
