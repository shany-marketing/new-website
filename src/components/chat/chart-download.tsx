"use client";

import { useRef, useCallback } from "react";
import { toPng } from "html-to-image";
import DynamicChart from "./dynamic-chart";
import GlassCard from "@/components/ui/glass-card";
import type { ChartSpec } from "@/types/chart";

interface ChartDownloadProps {
  spec: ChartSpec;
}

export default function ChartDownload({ spec }: ChartDownloadProps) {
  const chartRef = useRef<HTMLDivElement>(null);

  const handleDownload = useCallback(async () => {
    if (!chartRef.current) return;
    try {
      const dataUrl = await toPng(chartRef.current, {
        backgroundColor: "#1C2A39",
        pixelRatio: 2,
      });
      const link = document.createElement("a");
      link.download = `${spec.title.replace(/\s+/g, "-").toLowerCase()}.png`;
      link.href = dataUrl;
      link.click();
    } catch {
      // download failed silently
    }
  }, [spec.title]);

  return (
    <GlassCard className="relative">
      <button
        onClick={handleDownload}
        className="absolute top-3 right-3 z-10 w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-[var(--input-bg)]"
        style={{ color: "var(--gold)" }}
        title="Download as PNG"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
      </button>
      <div ref={chartRef} className="pt-1">
        <h4 className="text-foreground font-semibold text-sm mb-1">{spec.title}</h4>
        {spec.subtitle && (
          <p className="text-muted text-xs mb-3">{spec.subtitle}</p>
        )}
        <DynamicChart spec={spec} />
      </div>
    </GlassCard>
  );
}
