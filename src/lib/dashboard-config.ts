export interface WidgetConfig {
  id: string;
  span: 1 | 2 | 3;
  minTier: "free" | "ratings" | "premium";
  section: string;
}

export const DASHBOARD_WIDGETS: WidgetConfig[] = [
  // Hero
  { id: "kpi-cards",             span: 3, minTier: "free",    section: "hero" },

  // Guest Profile
  { id: "traveller-types",       span: 1, minTier: "free",    section: "guest-profile" },
  { id: "guest-origins",         span: 1, minTier: "free",    section: "guest-profile" },
  { id: "language-breakdown",    span: 1, minTier: "free",    section: "guest-profile" },

  // Stay Patterns (2-col layout via span)
  { id: "room-types",            span: 1, minTier: "free",    section: "stay-patterns" },
  { id: "monthly-volume",        span: 2, minTier: "free",    section: "stay-patterns" },

  // Night-Origin
  { id: "night-origin",          span: 3, minTier: "free",    section: "night-origin" },

  // Review Intelligence
  { id: "platform-mix",          span: 1, minTier: "free",    section: "review-intelligence" },
  { id: "review-depth",          span: 1, minTier: "free",    section: "review-intelligence" },
  { id: "platform-health",       span: 1, minTier: "free",    section: "review-intelligence" },

  // Seasonality
  { id: "review-heatmap",        span: 3, minTier: "free",    section: "seasonality" },

  // Review Composition
  { id: "text-vs-nontext",       span: 1, minTier: "free",    section: "composition" },
  { id: "composition-cards",     span: 2, minTier: "free",    section: "composition" },

  // Guide
  { id: "review-guide",          span: 3, minTier: "free",    section: "guide" },
];

const TIER_LEVELS: Record<string, number> = { free: 0, ratings: 1, premium: 2 };

export function getWidgetsForSection(section: string): WidgetConfig[] {
  return DASHBOARD_WIDGETS.filter((w) => w.section === section);
}

export function canAccessWidget(widgetTier: string, userTier: string): boolean {
  return (TIER_LEVELS[userTier] ?? 0) >= (TIER_LEVELS[widgetTier] ?? 0);
}
