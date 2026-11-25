"use client";

import { useState } from "react";
import { api, type RecMode, type Recommendation } from "@/lib/api";
import { usePaperTitles } from "@/lib/usePaperTitles";
import { useAsync } from "@/lib/useAsync";
import { Async } from "./States";
import RecommendationCard from "./RecommendationCard";
import { EmptyState, Tabs } from "./ui";

const MODES = [
  { id: "balanced", label: "Balanced" },
  { id: "foundations", label: "Foundations" },
  { id: "frontier", label: "Frontier" },
] as const;

export default function UpNext({
  limit = 5,
  onSaved,
  seedPaperId,
}: {
  limit?: number;
  onSaved?: () => void;
  seedPaperId?: number;
}) {
  const [mode, setMode] = useState<RecMode>("balanced");
  const recs = useAsync(() => api.getRecommendations({ mode, limit, seed_paper_id: seedPaperId }), [mode, limit, seedPaperId]);
  const [hiddenState, setHidden] = useState<{ mode: RecMode; ids: Set<number> }>({ mode, ids: new Set() });
  const hidden = hiddenState.mode === mode ? hiddenState.ids : new Set<number>();

  const items: Recommendation[] = (recs.data?.items ?? []).filter((r) => !hidden.has(r.paper.id));
  const titles = usePaperTitles(items.flatMap((r) => r.reasons.flatMap((x) => x.evidence_paper_ids)));

  return (
    <section aria-label="Up next" className="space-y-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h2>Up next</h2>
        <Tabs tabs={MODES} value={mode} onChange={setMode} label="Recommendation mode" className="border-b-0" />
      </div>
      <Async
        state={recs}
        skeletonRows={limit}
        isEmpty={() => items.length === 0}
        empty={
          <EmptyState title="No recommendations yet">
            Recommendations appear once you have papers in your library, especially ones marked as reading or read. Import a
            paper or mark one as read to get started.
          </EmptyState>
        }
      >
        {() => (
          <ul className="grid gap-3 md:grid-cols-2">
            {items.map((r) => (
              <li key={r.paper.id}>
                <RecommendationCard
                  rec={r}
                  evidenceTitles={titles}
                  onOptimistic={(_a, rec) => setHidden({ mode, ids: new Set(hidden).add(rec.paper.id) })}
                  onRollback={(_a, rec) =>
                    setHidden((s) => {
                      const n = new Set(s.ids);
                      n.delete(rec.paper.id);
                      return { mode: s.mode, ids: n };
                    })
                  }
                  onDone={(a) => a === "save" && onSaved?.()}
                />
              </li>
            ))}
          </ul>
        )}
      </Async>
    </section>
  );
}
