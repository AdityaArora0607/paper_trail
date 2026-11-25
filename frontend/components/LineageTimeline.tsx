"use client";

import Link from "next/link";
import type { Lineage, Paper, ConceptRelation } from "@/lib/api";
import { RELATION_COLORS, authorsShort } from "@/lib/format";
import { Empty } from "./States";

function byYear(a: Paper, b: Paper) {
  return (a.year ?? 9999) - (b.year ?? 9999) || a.id - b.id;
}

export function RelationLegend() {
  return (
    <div className="flex flex-wrap gap-3 text-xs text-muted items-center">
      {Object.entries(RELATION_COLORS).map(([k, c]) => (
        <span key={k} className="inline-flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded-sm" style={{ background: c }} />
          {k}
        </span>
      ))}
      <span className="inline-flex items-center gap-1">
        <span className="inline-block w-6 border-t-2 border-solid border-current" /> citation
      </span>
      <span className="inline-flex items-center gap-1">
        <span className="inline-block w-6 border-t-2 border-dashed border-current" /> inferred
      </span>
    </div>
  );
}

/** Chronological concept lineage. Citation-based relations are solid, inferred are dashed. */
export default function LineageTimeline({ lineage }: { lineage: Lineage }) {
  const papers = [...lineage.papers].sort(byYear);
  const byId = new Map(lineage.papers.map((p) => [p.id, p]));
  if (papers.length === 0) return <Empty>No papers in this concept&apos;s lineage yet.</Empty>;

  const relsFor = (pid: number): ConceptRelation[] =>
    lineage.relations.filter((r) => r.to_paper_id === pid);

  return (
    <ol className="relative border-l-2 border-line ml-2 space-y-4" aria-label="Concept lineage timeline">
      {papers.map((p) => (
        <li key={p.id} className="ml-4" data-testid={`timeline-paper-${p.id}`}>
          <span className="absolute -left-[5px] mt-1.5 w-2 h-2 rounded-full bg-accent" />
          <div className="text-xs text-muted">{p.year ?? "n.d."}</div>
          <Link href={`/papers/${p.id}`} className="font-medium text-accent hover:underline">
            {p.title}
          </Link>
          <div className="text-xs text-muted">{authorsShort(p.authors)}</div>
          <ul className="mt-1 space-y-1.5">
            {relsFor(p.id).map((r, i) => {
              const color = RELATION_COLORS[r.relation] ?? "#78716c";
              const from = byId.get(r.from_paper_id);
              return (
                <li
                  key={i}
                  data-testid="relation"
                  data-basis={r.basis}
                  data-relation={r.relation}
                  className="pl-2 py-1 text-[13px] bg-panel"
                  style={{
                    borderLeft: `3px ${r.basis === "inferred" ? "dashed" : "solid"} ${color}`,
                    opacity: r.basis === "inferred" ? 0.85 : 1,
                  }}
                >
                  <span className="font-medium" style={{ color }}>
                    {r.relation}
                  </span>
                  {from && from.id !== p.id && (
                    <>
                      {" "}
                      <Link href={`/papers/${from.id}`} className="underline decoration-dotted">
                        {from.title}
                      </Link>
                    </>
                  )}
                  <span className="ml-2 text-xs text-muted">
                    {r.basis === "inferred" ? "inferred" : "citation"} · {(r.confidence * 100).toFixed(0)}%
                  </span>
                  {r.evidence.length > 0 && (
                    <details className="mt-0.5">
                      <summary className="cursor-pointer text-xs text-muted">
                        Evidence ({r.evidence.length})
                      </summary>
                      {r.evidence.map((e, j) => (
                        <blockquote key={j} className="border-l-2 border-line pl-2 mt-1 italic">
                          “{e.quote}”
                          {e.section && <span className="text-xs text-muted not-italic"> — {e.section}</span>}
                        </blockquote>
                      ))}
                    </details>
                  )}
                </li>
              );
            })}
          </ul>
        </li>
      ))}
    </ol>
  );
}
