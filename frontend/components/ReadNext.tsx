"use client";

import Link from "next/link";
import { api } from "@/lib/api";
import { firstAuthorEtAl } from "@/lib/format";
import { usePaperTitles } from "@/lib/usePaperTitles";
import { useAsync } from "@/lib/useAsync";
import { Async } from "./States";
import RecReasons from "./RecReasons";

export default function ReadNext({ paperId }: { paperId: number }) {
  const similar = useAsync(() => api.getSimilar(paperId, 6), [paperId]);
  const titles = usePaperTitles((similar.data?.items ?? []).flatMap((r) => r.reasons.flatMap((x) => x.evidence_paper_ids)));
  return (
    <aside aria-label="Read next" className="space-y-3">
      <h2 className="section-label">Read next</h2>
      <Async state={similar} skeletonRows={4} isEmpty={(d) => d.items.length === 0} empty="No related papers found yet.">
        {(d) => (
          <ul className="space-y-3">
            {d.items.map((r) => (
              <li key={r.paper.id} className="rounded-lg border border-line bg-panel p-2.5 hover:border-accent/40 transition-colors">
                <Link href={`/papers/${r.paper.id}`} className="line-clamp-2 text-sm font-medium leading-snug hover:text-accent">
                  {r.paper.title}
                </Link>
                <div className="text-xs text-muted">
                  {[r.paper.year ?? "n.d.", firstAuthorEtAl(r.paper.authors), r.paper.citation_count !== null ? `${r.paper.citation_count} cites` : null].filter(Boolean).join(" · ")}
                </div>
                <RecReasons reasons={r.reasons} titles={titles} />
              </li>
            ))}
          </ul>
        )}
      </Async>
    </aside>
  );
}
