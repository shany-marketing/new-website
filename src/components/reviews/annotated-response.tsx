"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import type { FeedbackItem } from "@/lib/feedback-utils";

interface Annotation {
  id: string;
  startOffset: number;
  endOffset: number;
  selectedText: string;
  userName: string;
  comment: string;
  resolved: boolean;
  replyCount: number;
}

interface AnnotatedResponseProps {
  text: string;
  feedbackItems: FeedbackItem[];
  onTextSelect: (sel: { text: string; startOffset: number; endOffset: number } | null) => void;
  onAnnotationClick: (id: string) => void;
  activeAnnotationId: string | null;
}

interface Segment {
  start: number;
  end: number;
  annotationIds: string[];
}

function buildSegments(text: string, annotations: Annotation[]): Segment[] {
  if (annotations.length === 0) return [{ start: 0, end: text.length, annotationIds: [] }];

  // Collect all boundary points
  const boundaries = new Set<number>();
  boundaries.add(0);
  boundaries.add(text.length);

  for (const ann of annotations) {
    boundaries.add(Math.max(0, ann.startOffset));
    boundaries.add(Math.min(text.length, ann.endOffset));
  }

  const sorted = Array.from(boundaries).sort((a, b) => a - b);
  const segments: Segment[] = [];

  for (let i = 0; i < sorted.length - 1; i++) {
    const start = sorted[i];
    const end = sorted[i + 1];
    if (start === end) continue;

    const ids: string[] = [];
    for (const ann of annotations) {
      if (ann.startOffset <= start && ann.endOffset >= end) {
        ids.push(ann.id);
      }
    }
    segments.push({ start, end, annotationIds: ids });
  }

  return segments;
}

function getTextOffset(container: Node, targetNode: Node, targetOffset: number): number {
  let offset = 0;
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    if (walker.currentNode === targetNode) {
      return offset + targetOffset;
    }
    offset += walker.currentNode.textContent?.length || 0;
  }
  return offset;
}

export default function AnnotatedResponse({
  text,
  feedbackItems,
  onTextSelect,
  onAnnotationClick,
  activeAnnotationId,
}: AnnotatedResponseProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [popoverPos, setPopoverPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

  // Build valid annotations (verify offsets match or relocate)
  const annotations: Annotation[] = feedbackItems
    .filter((f) => f.selectedText && f.startOffset !== null && f.endOffset !== null)
    .map((f) => {
      let start = f.startOffset!;
      let end = f.endOffset!;
      const selected = f.selectedText!;

      // Verify offset match
      if (text.substring(start, end) !== selected) {
        // Try to relocate
        const idx = text.indexOf(selected);
        if (idx >= 0) {
          start = idx;
          end = idx + selected.length;
        } else {
          return null; // Orphaned
        }
      }

      return {
        id: f.id,
        startOffset: start,
        endOffset: end,
        selectedText: selected,
        userName: f.userName,
        comment: f.comment,
        resolved: f.resolved,
        replyCount: f.replies.length,
      };
    })
    .filter(Boolean) as Annotation[];

  const segments = buildSegments(text, annotations);

  const handleMouseUp = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) return;

    const range = selection.getRangeAt(0);
    const container = containerRef.current;
    if (!container || !container.contains(range.startContainer)) return;

    const selectedText = selection.toString().trim();
    if (!selectedText || selectedText.length < 3) return;

    const startOffset = getTextOffset(container, range.startContainer, range.startOffset);
    const endOffset = getTextOffset(container, range.endContainer, range.endOffset);

    onTextSelect({ text: selectedText, startOffset, endOffset });
  }, [onTextSelect]);

  // Clear selection when clicking empty space
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const container = containerRef.current;
      if (!container) return;
      const target = e.target as HTMLElement;
      if (target.tagName === "MARK" || target.closest("mark")) return;
    }
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

  function handleMarkHover(e: React.MouseEvent, annotationId: string) {
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    const containerRect = containerRef.current?.getBoundingClientRect();
    if (!containerRect) return;

    setPopoverPos({
      top: rect.top - containerRect.top - 8,
      left: rect.left - containerRect.left + rect.width / 2,
    });
    setHoveredId(annotationId);
  }

  const hoveredAnnotation = hoveredId ? annotations.find((a) => a.id === hoveredId) : null;

  return (
    <div className="relative" ref={containerRef} onMouseUp={handleMouseUp}>
      <p className="text-[var(--text-secondary)] text-sm whitespace-pre-wrap leading-relaxed">
        {segments.map((seg, i) => {
          const segText = text.substring(seg.start, seg.end);

          if (seg.annotationIds.length === 0) {
            return <span key={i}>{segText}</span>;
          }

          const primaryId = seg.annotationIds[0];
          const isActive = seg.annotationIds.includes(activeAnnotationId || "");
          const isHovered = seg.annotationIds.includes(hoveredId || "");

          return (
            <mark
              key={i}
              className="cursor-pointer rounded-sm transition-colors"
              style={{
                backgroundColor:
                  isActive || isHovered
                    ? "rgba(252, 219, 55, 0.35)"
                    : "rgba(252, 219, 55, 0.15)",
                borderBottom: "2px solid rgba(252, 219, 55, 0.5)",
                color: "inherit",
              }}
              onMouseEnter={(e) => handleMarkHover(e, primaryId)}
              onMouseLeave={() => setHoveredId(null)}
              onClick={() => onAnnotationClick(primaryId)}
            >
              {segText}
            </mark>
          );
        })}
      </p>

      {/* Hover popover */}
      {hoveredAnnotation && (
        <div
          className="absolute z-50 rounded-xl p-3 max-w-xs pointer-events-none"
          style={{
            top: popoverPos.top,
            left: popoverPos.left,
            transform: "translate(-50%, -100%)",
            background: "linear-gradient(135deg, var(--glass-bg), var(--glass-bg-end))",
            border: "1px solid var(--glass-border)",
            backdropFilter: "blur(12px)",
            boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
          }}
        >
          <p className="text-xs font-medium text-foreground">{hoveredAnnotation.userName}</p>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5 line-clamp-3">{hoveredAnnotation.comment}</p>
          {hoveredAnnotation.replyCount > 0 && (
            <p className="text-[10px] text-gold/60 mt-1">+{hoveredAnnotation.replyCount} {hoveredAnnotation.replyCount === 1 ? "reply" : "replies"}</p>
          )}
        </div>
      )}
    </div>
  );
}
