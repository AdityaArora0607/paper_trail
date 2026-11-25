"use client";

import Link from "next/link";
import { useState } from "react";
import type { RecReason, RecReasonKind } from "@/lib/api";
import { parseReason } from "@/lib/reasons";

const KINDS: Record<RecReasonKind, { glyph: string; label: string; cls: string }> = {
  graph: { glyph: "↗", label: "Citation graph", cls: "bg-accent/15 text-accent" },
  cocitation: { glyph: "⇄", label: "Co-cited", cls: "bg-purple-500/15 text-purple-700 dark:text-purple-300" },
  method: { glyph: "ƒ", label: "Method", cls: "bg-orange-500/15 text-orange-700 dark:text-orange-300" },
  prereq: { glyph: "◧", label: "Prerequisite", cls: "bg-warn/15 text-warn" },
  similar: { glyph: "≈", label: "Similar", cls: "bg-hover text-muted" },
  frontier: { glyph: "✦", label: "Frontier", cls: "bg-success/15 text-success" },
  impact: { glyph: "▲", label: "High impact", cls: "bg-danger/10 text-danger" },
};

/** Compact "why recommended" list: one line per reason, quoted titles are the links. */
export default function RecReasons({
  reasons,
  titles = {},
  max = 2,
}: {
  reasons: RecReason[];
  titles?: Record<number, string>;
  max?: number;
}) {
  const [open, setOpen] = useState(false);
  if (reasons.length === 0) return null;
  const shown = open ? reasons : reasons.slice(0, max);
  const hidden = reasons.length - max;
  return (
    <ul aria-label="Why recommended" className="mt-2 space-y-1">
      {shown.map((r, i) => {
        const k = KINDS[r.kind] ?? KINDS.similar;
        return (
          <li key={i} className="flex items-start gap-1.5 text-xs leading-snug">
            <span
              title={k.label}
              role="img"
              aria-label={k.label}
              className={`mt-px inline-flex h-4 w-4 shrink-0 items-center justify-center rounded text-[10px] ${k.cls}`}
            >
              {k.glyph}
            </span>
            <span className="min-w-0 text-muted">
              {parseReason(r.text, r.evidence_paper_ids, titles).map((p, j) =>
                p.type === "link" ? (
                  <Link key={j} href={`/papers/${p.paperId}`} className="text-fg underline decoration-line underline-offset-2 hover:text-accent">
                    {p.text}
                  </Link>
                ) : (
                  <span key={j}>{p.text}</span>
                ),
              )}
            </span>
          </li>
        );
      })}
      {hidden > 0 && (
        <li>
          <button type="button" aria-expanded={open} onClick={() => setOpen((o) => !o)} className="text-xs text-accent hover:underline">
            {open ? "Show less" : `+${hidden} more`}
          </button>
        </li>
      )}
    </ul>
  );
}
