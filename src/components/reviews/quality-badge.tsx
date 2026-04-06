"use client";

import { useState } from "react";
import type { ResponseQualityCriteria } from "@/types/reviews";

const CRITERIA_LABELS: Record<string, string> = {
  is_response: "Valid Response",
  is_right_lang: "Correct Language",
  is_answered_positive: "Addressed Positive",
  is_answered_negative: "Addressed Negative",
  is_include_guest_name: "Includes Guest Name",
  is_include_hotelier_name: "Includes Hotelier Name",
  is_kind: "Kind Tone",
  is_concise: "Concise",
  is_gratitude: "Shows Gratitude",
  is_include_come_back_asking: "Invites Return",
  is_syntax_right: "Correct Syntax",
  is_personal_tone_not_generic: "Personal Tone",
};

function getScoreColor(score: number): string {
  if (score >= 80) return "#4A8F6B";
  if (score >= 60) return "#C9A86A";
  return "#ef4444";
}

export default function QualityBadge({ criteria }: { criteria: ResponseQualityCriteria }) {
  const [expanded, setExpanded] = useState(false);
  const score = criteria.quality_score;
  if (score === null) return null;

  const color = getScoreColor(score);

  return (
    <div className="relative">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium hover:opacity-80 transition-opacity"
        style={{
          background: "var(--input-bg)",
          border: "1px solid var(--subtle-border)",
        }}
      >
        <svg width="28" height="28" viewBox="0 0 36 36">
          <circle
            cx="18" cy="18" r="15.5"
            fill="none"
            stroke="var(--subtle-border)"
            strokeWidth="3"
          />
          <circle
            cx="18" cy="18" r="15.5"
            fill="none"
            stroke={color}
            strokeWidth="3"
            strokeDasharray={`${(score / 100) * 97.4} 97.4`}
            strokeLinecap="round"
            transform="rotate(-90 18 18)"
          />
        </svg>
        <span style={{ color }}>{Math.round(score)}%</span>
      </button>

      {expanded && (
        <div
          className="absolute right-0 top-full mt-2 z-50 rounded-xl p-3 min-w-[220px]"
          style={{
            background: "var(--card-solid-bg, var(--navy-2))",
            border: "1px solid var(--glass-border)",
            backdropFilter: "blur(24px)",
            boxShadow: "0 15px 40px rgba(0,0,0,0.4)",
          }}
        >
          <p className="text-xs font-semibold text-foreground mb-2">Quality Criteria</p>
          <div className="space-y-1">
            {Object.entries(CRITERIA_LABELS).map(([key, label]) => {
              const value = criteria[key as keyof ResponseQualityCriteria];
              if (value === null || value === undefined) return null;
              const passed = value === true;
              return (
                <div key={key} className="flex items-center justify-between text-xs">
                  <span className="text-muted">{label}</span>
                  <span className={passed ? "text-success" : "text-danger"}>
                    {passed ? "Pass" : "Fail"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
