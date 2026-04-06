"use client";

import { clsx } from "clsx";

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  hover?: boolean;
}

export default function GlassCard({ children, className = "", onClick, hover = false }: GlassCardProps) {
  return (
    <div
      className={clsx(
        "rounded-2xl p-5 overflow-hidden transition-all duration-300",
        hover && "cursor-pointer hover:scale-[1.02] hover:shadow-lg hover:shadow-gold/5",
        className
      )}
      style={{
        background: "linear-gradient(135deg, var(--glass-bg) 0%, var(--glass-bg-end) 100%)",
        border: "1px solid var(--glass-border)",
        backdropFilter: "blur(12px)",
        boxShadow: "var(--card-shadow)",
      }}
      onClick={onClick}
    >
      {children}
    </div>
  );
}
