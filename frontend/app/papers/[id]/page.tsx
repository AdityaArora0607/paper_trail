"use client";

import { useParams } from "next/navigation";
import { useState } from "react";
import { api, type Paper } from "@/lib/api";
import { authorsShort } from "@/lib/format";
import { useAsync } from "@/lib/useAsync";
import { Async } from "@/components/States";
import OverviewTab from "@/components/OverviewTab";
import EdgeTable from "@/components/EdgeTable";
import GraphTab from "@/components/GraphTab";
import ReadingPathTab from "@/components/ReadingPathTab";
import ReadTab from "@/components/ReadTab";
import PaperActions from "@/components/PaperActions";
import ReadNext from "@/components/ReadNext";
import { Tabs } from "@/components/ui";

const TABS = [
  { id: "Overview", label: "Overview" },
  { id: "References & Citations", label: "References & Citations" },
  { id: "Graph", label: "Graph" },
  { id: "Reading path", label: "Reading path" },
  { id: "Read", label: "Read" },
] as const;
type Tab = (typeof TABS)[number]["id"];

export default function PaperPage() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const [tab, setTab] = useState<Tab>("Overview");
  const [override, setOverride] = useState<Paper | null>(null);
  const paper = useAsync(() => api.getPaper(id), [id]);
  const refs = useAsync(() => api.getReferences(id), [id]);
  const cites = useAsync(() => api.getCitations(id, 100), [id]);

  return (
    <Async state={paper} skeletonRows={6}>
      {(loaded) => {
        const p = override?.id === loaded.id ? override : loaded;
        const wide = tab === "Graph" || tab === "Read";
        return (
          <div className="space-y-4">
            <header className="sticky top-12 z-20 -mx-4 border-b border-line bg-bg/95 px-4 py-3 backdrop-blur">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="min-w-0 flex-1">
                  <h1 className="!text-xl leading-tight">{p.title}</h1>
                  <div className="text-sm text-muted">
                    {authorsShort(p.authors, 6)} · {p.year ?? "n.d."}
                  </div>
                </div>
                <PaperActions paper={p} onChange={setOverride} />
              </div>
            </header>
            <Tabs tabs={TABS} value={tab} onChange={setTab} label="Paper sections" />
            <div className={wide ? "" : "grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px]"}>
              <div role="tabpanel" className="min-w-0">
                {tab === "Overview" && <OverviewTab paper={p} onChange={setOverride} />}
                {tab === "References & Citations" && (
                  <div className="space-y-8">
                    <section>
                      <h2 className="mb-2">References</h2>
                      <Async state={refs}>{(d) => <EdgeTable items={d.items} paperId={id} kind="references" />}</Async>
                    </section>
                    <section>
                      <h2 className="mb-2">Cited by</h2>
                      <Async state={cites}>{(d) => <EdgeTable items={d.items} paperId={id} kind="citations" />}</Async>
                    </section>
                  </div>
                )}
                {tab === "Graph" && <GraphTab paperId={id} />}
                {tab === "Reading path" && <ReadingPathTab paperId={id} />}
                {tab === "Read" && <ReadTab paper={p} />}
              </div>
              {!wide && <ReadNext paperId={id} />}
            </div>
          </div>
        );
      }}
    </Async>
  );
}
