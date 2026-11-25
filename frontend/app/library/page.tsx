"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { api, type PaperSort } from "@/lib/api";
import { useAsync } from "@/lib/useAsync";
import { Async } from "@/components/States";
import PaperTable from "@/components/PaperTable";
import PaperRow from "@/components/PaperRow";
import ImportBox from "@/components/ImportBox";
import { Button, EmptyState, Kbd, Select, Tabs } from "@/components/ui";

const STATUS_TABS = [
  { id: "reading", label: "Reading" },
  { id: "unread", label: "To read" },
  { id: "read", label: "Read" },
  { id: "all", label: "All" },
] as const;
type StatusTab = (typeof STATUS_TABS)[number]["id"];

const SORTS: { value: PaperSort; label: string }[] = [
  { value: "recent", label: "Recently updated" },
  { value: "added", label: "Recently added" },
  { value: "year", label: "Year" },
  { value: "citations", label: "Citations" },
  { value: "title", label: "Title" },
];

export default function LibraryPage() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<StatusTab>("all");
  const [sort, setSort] = useState<PaperSort>("recent");
  const [view, setView] = useState<"list" | "table">("list");
  const [collectionId, setCollectionId] = useState<number | null>(null);
  const [newName, setNewName] = useState("");
  const [colError, setColError] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey) return;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable)) return;
      e.preventDefault();
      searchRef.current?.focus();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  const papers = useAsync(
    () =>
      api.listPapers({
        in_library: true,
        q: q.trim() || undefined,
        reading_status: status === "all" ? undefined : status,
        sort,
        limit: 200,
      }),
    [q, status, sort],
  );
  const collections = useAsync(() => api.listCollections(), []);

  const items = useMemo(() => {
    const list = papers.data?.items ?? [];
    const col = collections.data?.find((c) => c.id === collectionId);
    return col ? list.filter((p) => col.paper_ids.includes(p.id)) : list;
  }, [papers.data, collections.data, collectionId]);

  async function createCollection(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setColError(null);
    try {
      await api.createCollection(newName.trim());
      setNewName("");
      collections.reload();
    } catch (err) {
      setColError(err instanceof Error ? err.message : String(err));
    }
  }

  const filtered = q.trim() !== "" || status !== "all" || collectionId !== null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-[210px_1fr] gap-8">
      <aside aria-label="Collections">
        <h2 className="section-label mb-2">Collections</h2>
        <ul className="space-y-0.5">
          <li>
            <button
              onClick={() => setCollectionId(null)}
              className={`w-full rounded-md px-2 py-1 text-left ${collectionId === null ? "bg-hover font-medium" : "text-muted hover:bg-hover hover:text-fg"}`}
            >
              All papers
            </button>
          </li>
          {collections.error ? (
            <li className="text-xs text-danger px-2">
              Collections unavailable{" "}
              <button className="underline" onClick={collections.reload}>
                Retry
              </button>
            </li>
          ) : (
            collections.data?.map((c) => (
              <li key={c.id}>
                <button
                  onClick={() => setCollectionId(c.id)}
                  className={`w-full rounded-md px-2 py-1 text-left ${collectionId === c.id ? "bg-hover font-medium" : "text-muted hover:bg-hover hover:text-fg"}`}
                >
                  {c.name} <span className="text-xs text-muted">({c.paper_ids.length})</span>
                </button>
              </li>
            ))
          )}
        </ul>
        {collections.data?.length === 0 && <p className="text-xs text-muted mt-1 px-2">No collections yet.</p>}
        <form onSubmit={createCollection} className="mt-3 flex gap-1">
          <input
            aria-label="New collection name"
            placeholder="New collection"
            className="w-full min-w-0"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
          <Button type="submit" aria-label="Create collection">
            +
          </Button>
        </form>
        {colError && <p className="text-xs text-danger mt-1">{colError}</p>}
      </aside>

      <section className="min-w-0 space-y-4">
        <div className="flex items-baseline justify-between">
          <h1>Library</h1>
        </div>
        <ImportBox onImported={() => papers.reload()} />
        <Tabs tabs={STATUS_TABS} value={status} onChange={setStatus} label="Reading status" />
        <div className="flex gap-2 flex-wrap items-center">
          <div className="relative flex-1 min-w-48">
            <input
              ref={searchRef}
              aria-label="Search library"
              placeholder="Search library…"
              className="w-full pr-8"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <span className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
              <Kbd>/</Kbd>
            </span>
          </div>
          <Select aria-label="Sort by" value={sort} onChange={(e) => setSort(e.target.value as PaperSort)}>
            {SORTS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </Select>
          <div role="group" aria-label="View" className="inline-flex overflow-hidden rounded-md border border-line">
            {(["list", "table"] as const).map((v) => (
              <button
                key={v}
                type="button"
                aria-pressed={view === v}
                onClick={() => setView(v)}
                className={`h-8 px-2.5 text-sm capitalize ${view === v ? "bg-hover font-medium" : "text-muted hover:bg-hover"}`}
              >
                {v}
              </button>
            ))}
          </div>
        </div>
        <Async
          state={papers}
          skeletonRows={6}
          isEmpty={() => items.length === 0}
          empty={
            filtered ? (
              <EmptyState title="No papers match">Try another status tab, collection, or search term.</EmptyState>
            ) : (
              <EmptyState
                title="Import your first paper"
                action={
                  <Link href="/" className="text-sm text-accent hover:underline">
                    Go to dashboard
                  </Link>
                }
              >
                Paste an arXiv id, DOI, or URL in the box above to start building your library.
              </EmptyState>
            )
          }
        >
          {() => (
            <>
              <div className="text-xs text-muted">
                {items.length} of {papers.data?.total ?? items.length} papers
              </div>
              {view === "table" ? (
                <PaperTable papers={items} />
              ) : (
                <ul>
                  {items.map((p) => (
                    <PaperRow key={p.id} paper={p} />
                  ))}
                </ul>
              )}
            </>
          )}
        </Async>
      </section>
    </div>
  );
}
