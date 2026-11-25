"use client";

import Link from "next/link";
import { useState } from "react";
import { api, type Paper } from "@/lib/api";
import { useAsync } from "@/lib/useAsync";
import { Async } from "./States";
import ReadingStepCard from "./ReadingStep";
import { Button, EmptyState } from "./ui";

/** Progress bar + step list for a target paper; shared by /path and the paper page tab. */
export default function ReadingPathView({
  paperId,
  maxPapers = 10,
  showLink = false,
}: {
  paperId: number;
  maxPapers?: number;
  showLink?: boolean;
}) {
  const path = useAsync(() => api.getReadingPath(paperId, maxPapers), [paperId, maxPapers]);
  const [overrides, setOverrides] = useState<Record<number, Paper>>({});
  const [hideRead, setHideRead] = useState(false);

  function regenerate() {
    setOverrides({});
    path.reload();
  }

  return (
    <Async
      state={path}
      skeletonRows={5}
      isEmpty={(p) => p.steps.length === 0}
      empty={
        <EmptyState title="No prerequisite reading found">
          Either this paper needs nothing else, or its concepts haven&apos;t been extracted yet. Open the paper and run
          “Extract concepts”.
        </EmptyState>
      }
    >
      {(p) => {
        const steps = p.steps.map((s) => ({ s, paper: overrides[s.paper.id] ?? s.paper }));
        const readCount = steps.filter((x) => x.paper.reading_status === "read").length;
        const pct = Math.round((readCount / steps.length) * 100);
        const complete = readCount === steps.length;
        const visible = hideRead ? steps.filter((x) => x.paper.reading_status !== "read") : steps;
        return (
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm text-muted" data-testid="path-summary">
                <strong className="text-fg">{steps.length} papers</strong> · ~{readCount} already read · est. reading order
                foundational → target
              </p>
              <Button size="sm" variant="secondary" loading={path.loading} onClick={regenerate}>
                Regenerate
              </Button>
            </div>
            <div>
              <div className="flex items-center justify-between text-sm mb-1">
                <span>
                  <strong>{readCount}</strong> of {steps.length} steps read
                </span>
                <label className="flex items-center gap-1.5 text-xs text-muted">
                  <input type="checkbox" checked={hideRead} onChange={(e) => setHideRead(e.target.checked)} />
                  Hide papers I&apos;ve read
                </label>
              </div>
              <div
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={steps.length}
                aria-valuenow={readCount}
                className="h-1.5 w-full overflow-hidden rounded-full bg-line"
              >
                <div className="h-full bg-success transition-all" style={{ width: `${pct}%` }} />
              </div>
            </div>
            {showLink && (
              <Link href={`/path?paper=${paperId}`} className="text-sm text-accent hover:underline">
                Open in full reading path view →
              </Link>
            )}
            {complete && (
              <div role="status" className="rounded-lg border border-success/40 bg-success/10 px-4 py-3">
                <p className="font-medium text-success">Path complete</p>
                <p className="mt-0.5 text-sm">
                  You&apos;ve read every prerequisite. You&apos;re ready for{" "}
                  <Link href={`/papers/${p.target.id}`} className="font-medium text-accent hover:underline">
                    {p.target.title}
                  </Link>
                  .
                </p>
              </div>
            )}
            {visible.length === 0 ? (
              !complete && <EmptyState title="Nothing to show">Every remaining step is hidden by the filter.</EmptyState>
            ) : (
              <ol className="space-y-2">
                {visible.map(({ s, paper }) => (
                  <ReadingStepCard
                    key={s.paper.id}
                    step={s}
                    index={steps.findIndex((x) => x.s === s)}
                    paper={paper}
                    onChange={(u) => setOverrides((o) => ({ ...o, [u.id]: u }))}
                  />
                ))}
              </ol>
            )}
          </div>
        );
      }}
    </Async>
  );
}
