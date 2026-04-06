import { clsx } from "clsx";

interface TrendBadgeProps {
  trend: "improving" | "stable" | "declining";
  className?: string;
}

const config = {
  improving: { label: "Improving", bg: "bg-success/35", text: "text-success", arrow: "\u2191" },
  stable: { label: "Stable", bg: "bg-gold/35", text: "text-gold", arrow: "\u2192" },
  declining: { label: "Declining", bg: "bg-danger/35", text: "text-danger", arrow: "\u2193" },
};

export default function TrendBadge({ trend, className }: TrendBadgeProps) {
  const c = config[trend];
  return (
    <span className={clsx("inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold", c.bg, c.text, className)}>
      {c.arrow} {c.label}
    </span>
  );
}
