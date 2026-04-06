"use client";

import { useState } from "react";

interface StatCardProps {
  label: string;
  value: string;
  subLabel?: string;
  subValue?: string;
  icon: React.ReactNode;
  color: string;
}

export default function StatCard({ label, value, subLabel, subValue, icon, color }: StatCardProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className="relative w-full h-28 cursor-pointer transition-all duration-300"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div
        className="absolute inset-0 rounded-2xl p-4 flex flex-col justify-between transition-all duration-300 overflow-hidden"
        style={{
          background: `linear-gradient(135deg, var(--glass-bg) 0%, var(--glass-bg-end) 100%)`,
          backdropFilter: "blur(12px)",
          border: `1px solid ${color}30`,
          boxShadow: "var(--card-shadow)",
        }}
      >
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl flex-shrink-0" style={{ background: `${color}20` }}>
            {icon}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-muted uppercase tracking-wider truncate">{label}</p>
            <p className="text-2xl font-extrabold text-foreground truncate">{value}</p>
          </div>
        </div>
        {subLabel && (
          <div className="flex items-center gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-medium text-muted uppercase tracking-wider truncate">{subLabel}</p>
              <p className="text-lg font-bold text-[var(--text-secondary)] truncate">{subValue}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
