"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { api, type KnowledgeState } from "@/lib/api";
import { useAsync } from "@/lib/useAsync";
import { Async } from "@/components/States";
import { EmptyState } from "@/components/ui";
import KnowledgeToggle from "@/components/KnowledgeToggle";

export default function ProfilePage() {
  const profile = useAsync(() => api.getProfile(), []);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<KnowledgeState | "all">("all");

  const rows = useMemo(
    () =>
      (profile.data?.items ?? []).filter(
        (i) =>
          (filter === "all" || i.state === filter) &&
          i.concept.name.toLowerCase().includes(q.trim().toLowerCase()),
      ),
    [profile.data, q, filter],
  );

  return (
    <div className="space-y-3">
      <h1 className="text-xl font-semibold">Knowledge profile</h1>
      <div className="flex gap-2">
        <input aria-label="Filter concepts" placeholder="Filter concepts…" value={q} onChange={(e) => setQ(e.target.value)} />
        <select aria-label="State filter" value={filter} onChange={(e) => setFilter(e.target.value as typeof filter)}>
          <option value="all">All states</option>
          <option value="known">known</option>
          <option value="partial">partial</option>
          <option value="unknown">unknown</option>
        </select>
      </div>
      <Async state={profile} isEmpty={(d) => d.items.length === 0} empty={
          <EmptyState title="No concepts in your profile yet">
            Open a paper and click “Extract concepts”. Extracted concepts show up here so you can mark what you already know;
            reading paths and lineage fill in as more papers are processed.
          </EmptyState>
        }>
        {() =>
          rows.length === 0 ? (
            <EmptyState title="No concepts match">Try a different name or state filter.</EmptyState>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted border-b border-line">
                  <th className="py-1">Concept</th>
                  <th>Kind</th>
                  <th>State</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ concept, state }) => (
                  <tr key={concept.id} className="border-b border-line">
                    <td className="py-1.5">
                      <Link href={`/concepts/${concept.id}`} className="text-accent hover:underline">
                        {concept.name}
                      </Link>
                    </td>
                    <td className="text-muted">{concept.kind}</td>
                    <td>
                      <KnowledgeToggle conceptId={concept.id} state={state} onChange={() => profile.reload()} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        }
      </Async>
    </div>
  );
}
