"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { PaperEdgeItem } from "@/lib/api";
import { authorsShort, intentClass } from "@/lib/format";
import CitationCard from "./CitationCard";
import { Badge, Drawer, EmptyState } from "./ui";

/** Table of references (this paper cites them) or citations (they cite this paper). Rows open a citation drawer. */
export default function EdgeTable({
  items,
  paperId,
  kind,
}: {
  items: PaperEdgeItem[];
  paperId: number;
  kind: "references" | "citations";
}) {
  const [open, setOpen] = useState<number | null>(null);
  const [intent, setIntent] = useState<string | null>(null);
  const [hasContext, setHasContext] = useState(false);

  const intents = useMemo(() => Array.from(new Set(items.flatMap((i) => i.edge.intents))).sort(), [items]);
  const rows = items.filter(
    ({ edge }) => (!intent || edge.intents.includes(intent)) && (!hasContext || edge.contexts.length > 0),
  );

  if (items.length === 0) return <EmptyState title={`No ${kind} recorded`}>Import or expand this paper&apos;s citations to populate this table.</EmptyState>;

  const openItem = items.find((i) => i.paper.id === open) ?? null;
  const chip = (active: boolean) =>
    `rounded-full border px-2.5 py-0.5 text-xs transition-colors ${active ? "border-accent bg-accent/10 text-accent" : "border-line text-muted hover:text-fg hover:bg-hover"}`;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-1.5">
        <button type="button" className={chip(intent === null)} aria-pressed={intent === null} onClick={() => setIntent(null)}>
          All intents
        </button>
        {intents.map((i) => (
          <button key={i} type="button" className={chip(intent === i)} aria-pressed={intent === i} onClick={() => setIntent(intent === i ? null : i)}>
            {i}
          </button>
        ))}
        <label className="ml-2 flex items-center gap-1.5 text-xs text-muted">
          <input type="checkbox" checked={hasContext} onChange={(e) => setHasContext(e.target.checked)} />
          Has context
        </label>
        <span className="ml-auto text-xs text-muted">
          {rows.length} of {items.length}
        </span>
      </div>
      {rows.length === 0 ? (
        <p className="text-sm text-muted py-3">No rows match these filters.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-muted border-b border-line">
              <th className="py-1.5 pr-2 font-medium">Paper</th>
              <th className="pr-2 w-14 font-medium">Year</th>
              <th className="pr-2 font-medium">Intent</th>
              <th className="font-medium">Context</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ paper, edge }) => (
              <tr
                key={paper.id}
                onClick={() => setOpen(paper.id)}
                className="border-b border-line align-top cursor-pointer hover:bg-hover"
              >
                <td className="py-2 pr-2">
                  <Link href={`/papers/${paper.id}`} onClick={(e) => e.stopPropagation()} className="font-medium hover:text-accent">
                    {paper.title}
                  </Link>
                  <div className="text-xs text-muted">{authorsShort(paper.authors, 2)}</div>
                </td>
                <td className="pr-2 py-2">{paper.year ?? "—"}</td>
                <td className="pr-2 py-2 space-x-1">
                  {edge.intents.map((i) => (
                    <Badge key={i} className={intentClass(i)}>
                      {i}
                    </Badge>
                  ))}
                  {edge.is_influential && <Badge tone="warn">influential</Badge>}
                </td>
                <td className="py-2 text-xs">
                  {edge.contexts[0] ? (
                    <span className="italic">
                      “{edge.contexts[0].length > 140 ? edge.contexts[0].slice(0, 140) + "…" : edge.contexts[0]}”
                    </span>
                  ) : (
                    <span className="text-muted">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <Drawer open={openItem !== null} onClose={() => setOpen(null)} title="Citation">
        {openItem && (
          <CitationCard
            citingId={kind === "references" ? paperId : openItem.paper.id}
            citedId={kind === "references" ? openItem.paper.id : paperId}
          />
        )}
      </Drawer>
    </div>
  );
}
