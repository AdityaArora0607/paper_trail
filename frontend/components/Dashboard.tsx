"use client";

import Link from "next/link";
import { api, type Paper } from "@/lib/api";
import { authorsShort } from "@/lib/format";
import { useAsync } from "@/lib/useAsync";
import { Async } from "./States";
import ImportBox from "./ImportBox";
import PaperRow from "./PaperRow";
import UpNext from "./UpNext";
import { buttonClass, Card, EmptyState } from "./ui";

function ReadingCard({ paper }: { paper: Paper }) {
  return (
    <Card as="article" className="flex flex-col gap-2 hover:border-accent/40 transition-colors">
      <div className="flex-1">
        <Link href={`/papers/${paper.id}`} className="font-medium leading-snug hover:text-accent">
          {paper.title}
        </Link>
        <div className="text-xs text-muted mt-0.5">
          {paper.year ?? "n.d."} · {authorsShort(paper.authors, 2)}
        </div>
      </div>
      <div className="flex gap-1.5">
        <Link href={`/papers/${paper.id}`} className={buttonClass("primary", "sm")}>
          Open
        </Link>
        <Link href={`/path?paper=${paper.id}`} className={buttonClass("secondary", "sm")}>
          Reading path
        </Link>
      </div>
    </Card>
  );
}

export default function Dashboard() {
  const reading = useAsync(() => api.listPapers({ in_library: true, reading_status: "reading", sort: "recent", limit: 6 }), []);
  const recent = useAsync(() => api.listPapers({ in_library: true, sort: "added", limit: 8 }), []);

  const libraryEmpty = recent.data !== null && recent.data.total === 0 && reading.data !== null && reading.data.items.length === 0;

  function refresh() {
    reading.reload();
    recent.reload();
  }

  return (
    <div className="space-y-8">
      <section aria-label="Import" className="rounded-xl border border-line bg-panel p-5">
        <h1 className="mb-1">What are you reading?</h1>
        <p className="text-sm text-muted mb-3">Paste an arXiv id, DOI, or URL to add a paper and map its citations.</p>
        <ImportBox prominent onImported={refresh} />
      </section>

      {libraryEmpty ? (
        <EmptyState
          title="Import your first paper"
          action={
            <Link href="/library" className={buttonClass("secondary")}>
              Browse library
            </Link>
          }
        >
          Your library is empty. Import a paper above, then mark papers as reading or read to get personalised recommendations and
          reading paths.
        </EmptyState>
      ) : (
        <>
          <section aria-label="Continue reading" className="space-y-3">
            <h2>Continue reading</h2>
            <Async
              state={reading}
              skeletonRows={2}
              isEmpty={(d) => d.items.length === 0}
              empty={
                <p className="text-sm text-muted">
                  Nothing in progress. Open a paper and press “Start reading” to track it here.
                </p>
              }
            >
              {(d) => (
                <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {d.items.map((p) => (
                    <li key={p.id}>
                      <ReadingCard paper={p} />
                    </li>
                  ))}
                </ul>
              )}
            </Async>
          </section>

          <UpNext limit={5} onSaved={refresh} />

          <section aria-label="Recently added" className="space-y-2">
            <div className="flex items-center justify-between">
              <h2>Recently added</h2>
              <Link href="/library" className="text-sm text-accent hover:underline">
                View library →
              </Link>
            </div>
            <Async state={recent} skeletonRows={4} isEmpty={(d) => d.items.length === 0} empty="No papers yet.">
              {(d) => (
                <ul>
                  {d.items.map((p) => (
                    <PaperRow key={p.id} paper={p} />
                  ))}
                </ul>
              )}
            </Async>
          </section>
        </>
      )}
    </div>
  );
}
