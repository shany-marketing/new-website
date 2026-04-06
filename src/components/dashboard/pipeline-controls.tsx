"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import GlassCard from "@/components/ui/glass-card";

const STAGES = [
  { key: "baseline_stats", label: "Baseline Stats" },
  { key: "decomposition", label: "Decomposition" },
  { key: "embeddings", label: "Embeddings" },
  { key: "consensus", label: "Consensus" },
  { key: "mapping", label: "Mapping" },
  { key: "aggregation", label: "Aggregation" },
  { key: "insights", label: "Insights" },
];

interface StageProgress {
  done: number;
  total: number;
}

interface PipelineControlsProps {
  hotelId: string;
  canRunPipeline?: boolean;
  /** When true, hide the entire component if the pipeline has already completed (user-facing). */
  hideOnComplete?: boolean;
  /** When true, disable the Run Pipeline button (e.g., while scraping is in progress). */
  disabled?: boolean;
}

interface PipelineStatus {
  runId?: string;
  status: string;
  currentStage?: string | null;
  error?: string;
  startedAt?: string;
  stageProgress?: Record<string, StageProgress>;
}

function formatElapsed(startedAt: string): string {
  const elapsed = Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000);
  if (elapsed < 0) return "0s";
  const m = Math.floor(elapsed / 60);
  const s = elapsed % 60;
  if (m === 0) return `${s}s`;
  return `${m}m ${s.toString().padStart(2, "0")}s`;
}

export default function PipelineControls({ hotelId, canRunPipeline = true, hideOnComplete = false, disabled = false }: PipelineControlsProps) {
  const router = useRouter();
  const [status, setStatus] = useState<PipelineStatus | null>(null);
  const [running, setRunning] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [userTriggered, setUserTriggered] = useState(false);
  const [elapsed, setElapsed] = useState("");
  const elapsedRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    fetchStatus();
  }, [hotelId]);

  useEffect(() => {
    if (!running) return;
    const interval = setInterval(fetchStatus, 3000);
    return () => clearInterval(interval);
  }, [running]);

  // Elapsed time ticker
  useEffect(() => {
    if (elapsedRef.current) clearInterval(elapsedRef.current);
    if (status?.status === "running" && status.startedAt) {
      setElapsed(formatElapsed(status.startedAt));
      elapsedRef.current = setInterval(() => {
        setElapsed(formatElapsed(status.startedAt!));
      }, 1000);
    } else {
      setElapsed("");
    }
    return () => {
      if (elapsedRef.current) clearInterval(elapsedRef.current);
    };
  }, [status?.status, status?.startedAt]);

  // Hide the component after pipeline completes
  useEffect(() => {
    if (status?.status === "completed") {
      if (hideOnComplete && !userTriggered) {
        // Pipeline was already completed before user visited — hide immediately
        setHidden(true);
      } else {
        // User triggered this run — show "completed" briefly, then hide
        const timer = setTimeout(() => setHidden(true), 4000);
        return () => clearTimeout(timer);
      }
    }
  }, [status?.status, hideOnComplete, userTriggered]);

  async function fetchStatus() {
    try {
      const res = await fetch(`/api/hotels/${hotelId}/pipeline/status`);
      const data = await res.json();
      setStatus(data);
      if (data.status === "completed" || data.status === "failed") {
        setRunning(false);
      }
    } catch {
      // ignore
    }
  }

  const [error, setError] = useState<string | null>(null);

  async function handleRun() {
    if (!canRunPipeline) {
      router.push("/pricing");
      return;
    }

    setRunning(true);
    setHidden(false);
    setUserTriggered(true);
    setError(null);

    try {
      const res = await fetch(`/api/hotels/${hotelId}/pipeline/run`, {
        method: "POST",
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? `Pipeline failed (${res.status})`);
        setRunning(false);
        return;
      }

      setStatus({ runId: data.runId, status: "running", currentStage: data.currentStage, startedAt: new Date().toISOString() });
    } catch {
      setError("Network error — could not start pipeline");
      setRunning(false);
    }
  }

  // Don't render at all once hidden after completion
  if (hidden) return null;

  const currentIndex = status?.currentStage
    ? STAGES.findIndex((s) => s.key === status.currentStage)
    : -1;

  const sp = status?.stageProgress;

  return (
    <GlassCard>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h3 className="text-foreground font-semibold text-base">Pipeline</h3>
          {elapsed && status?.status === "running" && (
            <span className="text-xs text-muted">{elapsed}</span>
          )}
        </div>
        <button
          onClick={handleRun}
          disabled={running || disabled}
          className="px-4 py-2 rounded-xl text-sm font-semibold text-navy-1 transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ background: "linear-gradient(to right, var(--gold-light), var(--gold-dark))" }}
        >
          {disabled ? "Importing reviews…" : running ? "Running…" : "Run Pipeline"}
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2">
          <span className="text-sm" style={{ color: "#B85050" }}>{error}</span>
        </div>
      )}

      {status && status.status !== "none" && (
        <div className="space-y-3">
          {/* Stage progress */}
          <div className="flex gap-1">
            {STAGES.map((stage, i) => {
              const isCompleted = status.status === "completed" || i < currentIndex;
              const isCurrent = i === currentIndex && status.status === "running";
              const isFailed = status.status === "failed" && i === currentIndex;
              const progress = sp?.[stage.key];
              const pct = progress && progress.total > 0
                ? Math.round((progress.done / progress.total) * 100)
                : 0;

              // Determine bar color/fill
              let bg = "var(--input-bg)";
              let fillPct = 100;

              if (status.status === "completed") {
                bg = "#4A8F6B";
              } else if (isFailed) {
                bg = "#B85050";
              } else if (i < currentIndex) {
                bg = "#4A8F6B";
              } else if (isCurrent) {
                bg = "var(--gold)";
                // Partial fill for active stage
                if (progress && progress.total > 0) {
                  fillPct = Math.max(5, pct); // minimum 5% visible
                }
              }

              return (
                <div key={stage.key} className="flex-1 flex flex-col items-center gap-1">
                  {/* Bar segment */}
                  {isCurrent && progress && progress.total > 0 ? (
                    <div
                      className="w-full h-2 rounded-full overflow-hidden"
                      style={{ background: "var(--input-bg)" }}
                    >
                      <div
                        className="h-full rounded-full transition-all duration-700 ease-out"
                        style={{ background: bg, width: `${fillPct}%` }}
                      />
                    </div>
                  ) : (
                    <div
                      className="w-full h-2 rounded-full transition-colors duration-500"
                      style={{ background: bg }}
                    />
                  )}
                  {/* Label */}
                  <span className="text-[9px] text-muted text-center leading-tight">{stage.label}</span>
                  {/* Progress counter */}
                  {progress && progress.total > 0 && (isCompleted || isCurrent) && (
                    <span
                      className="text-[8px] leading-none font-mono"
                      style={{ color: isCompleted && !isCurrent ? "#4A8F6B" : "var(--gold)" }}
                    >
                      {progress.done}/{progress.total}
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Status text */}
          <div className="flex items-center gap-2">
            {status.status === "running" && (
              <div className="w-2 h-2 rounded-full bg-gold animate-pulse" />
            )}
            <span className="text-sm" style={{
              color: status.status === "completed" ? "#4A8F6B" : status.status === "failed" ? "#B85050" : "var(--gold)",
            }}>
              {status.status === "completed" && "Pipeline completed"}
              {status.status === "failed" && `Failed: ${status.error ?? "Unknown error"}`}
              {status.status === "running" && (() => {
                const stageLabel = STAGES.find(s => s.key === status.currentStage)?.label ?? status.currentStage;
                const progress = sp?.[status.currentStage ?? ""];
                if (progress && progress.total > 0) {
                  const pct = Math.round((progress.done / progress.total) * 100);
                  return `${stageLabel}: ${progress.done}/${progress.total} (${pct}%)`;
                }
                return `Running: ${stageLabel}`;
              })()}
              {status.status === "pending" && "Pending"}
            </span>
          </div>
        </div>
      )}
    </GlassCard>
  );
}
