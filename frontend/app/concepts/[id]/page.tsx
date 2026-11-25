"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import { useAsync } from "@/lib/useAsync";
import { Async, Badge } from "@/components/States";
import KnowledgeToggle from "@/components/KnowledgeToggle";
import { EmptyState } from "@/components/ui";
import LineageTimeline, { RelationLegend } from "@/components/LineageTimeline";

export default function ConceptPage() {
  const id = Number(useParams<{ id: string }>().id);
  const lineage = useAsync(() => api.getLineage(id), [id]);
  const prereqs = useAsync(() => api.getPrerequisites(id), [id]);
  const profile = useAsync(() => api.getProfile(), []);

  return (
    <Async state={lineage}>
      {(l) => {
        const state = profile.data?.items.find((i) => i.concept.id === id)?.state ?? null;
        return (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6">
            <div className="space-y-3 min-w-0">
              <header>
                <h1 className="text-xl font-semibold">{l.concept.name}</h1>
                <div className="text-xs text-muted">
                  <Badge>{l.concept.kind}</Badge>
                  {l.concept.aliases.length > 0 && <span className="ml-2">aka {l.concept.aliases.join(", ")}</span>}
                </div>
                {l.concept.description && <p className="text-sm mt-1 max-w-2xl">{l.concept.description}</p>}
              </header>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted">I know this:</span>
                {profile.loading && !profile.data ? (
                  <span className="text-muted text-xs">loading…</span>
                ) : (
                  <KnowledgeToggle key={String(state)} conceptId={id} state={state} />
                )}
                {profile.error && <span className="text-xs text-red-600">profile unavailable</span>}
              </div>
              {l.relations.length > 0 && <RelationLegend />}
              {l.papers.length === 0 ? (
                <EmptyState title="No lineage yet">
                  No papers are linked to this concept so far. Lineage fills in as concepts are extracted from more papers in
                  your library.
                </EmptyState>
              ) : (
                <>
                  <LineageTimeline lineage={l} />
                  {l.relations.length === 0 && (
                    <p className="rounded-lg border border-dashed border-line px-3 py-2 text-sm text-muted">
                      No relations between these papers yet (extends, applies, improves…). They are inferred as concepts are
                      extracted from more papers, so this timeline fills in over time.
                    </p>
                  )}
                </>
              )}
            </div>
            <aside>
              <h2 className="text-xs uppercase tracking-wide text-muted mb-1">Prerequisites</h2>
              <Async state={prereqs} isEmpty={(d) => d.items.length === 0} empty="No prerequisites identified yet. They appear as more papers' concepts are extracted and linked.">
                {(d) => (
                  <ul className="space-y-2">
                    {d.items.map(({ concept, evidence }) => (
                      <li key={concept.id} className="text-sm">
                        <Link href={`/concepts/${concept.id}`} className="text-accent hover:underline">
                          {concept.name}
                        </Link>
                        {evidence[0] && <div className="text-xs italic text-muted">“{evidence[0].quote}”</div>}
                      </li>
                    ))}
                  </ul>
                )}
              </Async>
            </aside>
          </div>
        );
      }}
    </Async>
  );
}
