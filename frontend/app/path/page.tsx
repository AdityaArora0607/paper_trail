"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { useAsync } from "@/lib/useAsync";
import ReadingPathView from "@/components/ReadingPathView";
import { Loading } from "@/components/States";
import { EmptyState, Select } from "@/components/ui";

function PathBuilder() {
  const router = useRouter();
  const params = useSearchParams();
  const fromUrl = params.get("paper") ? Number(params.get("paper")) : null;
  const [picked, setPicked] = useState<number | null>(null);
  const [q, setQ] = useState("");

  const reading = useAsync(() => api.listPapers({ in_library: true, reading_status: "reading", sort: "recent", limit: 50 }), []);
  const search = useAsync(
    () => (q.trim() ? api.listPapers({ in_library: true, q: q.trim(), limit: 8 }) : Promise.resolve(null)),
    [q],
  );

  const readingItems = reading.data?.items ?? [];
  const targetId = picked ?? (fromUrl && !Number.isNaN(fromUrl) ? fromUrl : null) ?? readingItems[0]?.id ?? null;
  const selectedInfo = useAsync(
    () => (targetId && !readingItems.some((p) => p.id === targetId) ? api.getPaper(targetId) : Promise.resolve(null)),
    [targetId, reading.data !== null],
  );

  useEffect(() => {
    if (picked !== null) router.replace(`/path?paper=${picked}`);
  }, [picked, router]);

  return (
    <div className="space-y-5 max-w-3xl">
      <div>
        <h1>Reading path</h1>
        <p className="text-sm text-muted mt-1">Pick a paper you want to understand and see what to read first.</p>
      </div>

      <div className="rounded-lg border border-line bg-panel p-3 space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <label htmlFor="path-target" className="text-sm text-muted">
            Target paper
          </label>
          <Select id="path-target" className="min-w-64 max-w-full" value={targetId ?? ""} onChange={(e) => setPicked(Number(e.target.value))} disabled={reading.loading && !targetId}>
            {targetId === null && <option value="">{reading.loading ? "Loading…" : "No papers in progress"}</option>}
            {readingItems.length > 0 && (
              <optgroup label="Currently reading">
                {readingItems.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                  </option>
                ))}
              </optgroup>
            )}
            {selectedInfo.data && <option value={selectedInfo.data.id}>{selectedInfo.data.title}</option>}
          </Select>
        </div>
        <div>
          <input aria-label="Search library for a target" placeholder="Or search your library…" className="w-full" value={q} onChange={(e) => setQ(e.target.value)} />
          {search.data && (
            <ul className="mt-1 divide-y divide-line rounded-md border border-line">
              {search.data.items.length === 0 && <li className="px-2 py-1.5 text-sm text-muted">No matches.</li>}
              {search.data.items.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    className="w-full px-2 py-1.5 text-left text-sm hover:bg-hover"
                    onClick={() => {
                      setPicked(p.id);
                      setQ("");
                    }}
                  >
                    {p.title} <span className="text-xs text-muted">{p.year ?? ""}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {targetId ? (
        <ReadingPathView key={targetId} paperId={targetId} maxPapers={15} />
      ) : reading.loading ? (
        <Loading rows={4} />
      ) : (
        <EmptyState title="Choose a target paper">
          You aren&apos;t reading anything yet. Mark a paper as “Reading”, or search your library above.
        </EmptyState>
      )}
    </div>
  );
}

export default function PathPage() {
  return (
    <Suspense fallback={<Loading rows={4} />}>
      <PathBuilder />
    </Suspense>
  );
}
