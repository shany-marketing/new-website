"use client";

import type { ReactNode } from "react";
import { getWidgetsForSection, canAccessWidget, type WidgetConfig } from "@/lib/dashboard-config";
import LockedOverlay from "./locked-overlay";

interface WidgetGridProps {
  section: string;
  plan: string;
  children: (widgetId: string) => ReactNode | null;
}

const SPAN_CLASSES: Record<number, string> = {
  1: "md:col-span-1 lg:col-span-1",
  2: "md:col-span-2 lg:col-span-2",
  3: "md:col-span-2 lg:col-span-3",
};

export default function WidgetGrid({ section, plan, children }: WidgetGridProps) {
  const widgets = getWidgetsForSection(section);
  if (widgets.length === 0) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
      {widgets.map((w: WidgetConfig) => {
        const content = children(w.id);
        if (content === null) return null;

        const hasAccess = canAccessWidget(w.minTier, plan);

        return (
          <div key={w.id} className={`min-w-0 ${SPAN_CLASSES[w.span] ?? "lg:col-span-1"}`}>
            {hasAccess ? content : (
              <LockedOverlay feature={w.id} plan={plan}>
                {content}
              </LockedOverlay>
            )}
          </div>
        );
      })}
    </div>
  );
}
