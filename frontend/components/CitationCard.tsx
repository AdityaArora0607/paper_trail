"use client";

import Link from "next/link";
import { api } from "@/lib/api";
import { authorsShort } from "@/lib/format";
import { useAsync } from "@/lib/useAsync";
import { Badge, ErrorBanner, Loading } from "./States";
import { intentClass } from "@/lib/format";

/**
 * Interactive citation card: fetches /papers/{citingId}/cites/{citedId} and shows the
 * cited paper plus the citing paper's context sentences as quoted evidence.
 */
export default function CitationCard({
  citingId,
  citedId,
  onClose,
}: {
  citingId: number;
  citedId: number;
  onClose?: () => void;
}) {
  const state = useAsync(() => api.getCite(citingId, citedId), [citingId, citedId]);

  return (
    <aside aria-label="Citation card" className="rounded border border-line bg-panel p-3 text-sm">
      {onClose && (
        <button onClick={onClose} aria-label="Close citation card" className="float-right text-muted hover:text-fg">
          ✕
        </button>
      )}
      {state.error && <ErrorBanner error={state.error} onRetry={state.reload} />}
      {state.loading && !state.data && <Loading label="Loading citation…" />}
      {state.data && (
        <>
          <div className="font-medium">
            <Link href={`/papers/${state.data.paper.id}`} className="hover:underline text-accent">
              {state.data.paper.title}
            </Link>
          </div>
          <div className="text-muted text-xs">
            {state.data.paper.year ?? "n.d."} · {authorsShort(state.data.paper.authors)}
          </div>
          <div className="mt-2 flex flex-wrap gap-1 items-center">
            {state.data.edge.intents.map((i) => (
              <Badge key={i} className={intentClass(i)}>
                {i}
              </Badge>
            ))}
            {state.data.edge.is_influential && <Badge className="bg-amber-500/20">influential</Badge>}
            <Badge title="data source">{state.data.edge.source}</Badge>
          </div>
          <div className="mt-2 space-y-2">
            {state.data.edge.contexts.length === 0 ? (
              <p className="text-muted italic">No citation context available.</p>
            ) : (
              state.data.edge.contexts.map((c, i) => (
                <blockquote key={i} className="border-l-2 border-accent pl-2 text-[13px] italic">
                  “{c}”
                </blockquote>
              ))
            )}
          </div>
        </>
      )}
    </aside>
  );
}
