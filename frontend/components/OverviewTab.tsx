"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { api, type Paper } from "@/lib/api";
import { arxivUrl } from "@/lib/format";
import { useAsync } from "@/lib/useAsync";
import { Async } from "./States";
import { Badge, Button, useToast } from "./ui";

export default function OverviewTab({ paper }: { paper: Paper; onChange?: (p: Paper) => void }) {
  const concepts = useAsync(() => api.getPaperConcepts(paper.id), [paper.id]);
  const { toast } = useToast();
  const [jobId, setJobId] = useState<number | null>(null);
  const [queuing, setQueuing] = useState(false);
  const reloadRef = useRef(concepts.reload);
  useEffect(() => {
    reloadRef.current = concepts.reload;
  });

  // Poll the extraction job until it finishes, then refresh the concept list.
  useEffect(() => {
    if (jobId === null) return;
    let stopped = false;
    const timer = setInterval(async () => {
      try {
        const job = await api.getJob(jobId);
        if (stopped || (job.status !== "done" && job.status !== "failed")) return;
        clearInterval(timer);
        setJobId(null);
        if (job.status === "done") {
          toast("Concept extraction finished", { kind: "success" });
          reloadRef.current();
        } else {
          toast(`Concept extraction failed${job.error ? `: ${job.error}` : ""}`, { kind: "error" });
        }
      } catch {
        /* transient; keep polling */
      }
    }, 3000);
    return () => {
      stopped = true;
      clearInterval(timer);
    };
  }, [jobId, toast]);

  async function extract() {
    setQueuing(true);
    try {
      const { job } = await api.extractConcepts(paper.id);
      toast("Extraction queued — refresh in a minute", { kind: "info" });
      if (job.status === "queued" || job.status === "running") setJobId(job.id);
    } catch (e) {
      toast(`Could not start extraction: ${e instanceof Error ? e.message : String(e)}`, { kind: "error" });
    } finally {
      setQueuing(false);
    }
  }

  return (
    <div className="space-y-4 max-w-3xl">
      <dl className="grid grid-cols-[110px_1fr] gap-y-1 text-sm">
        <dt className="text-muted">Venue</dt>
        <dd>{paper.venue ?? "—"}</dd>
        <dt className="text-muted">Year</dt>
        <dd>{paper.year ?? "—"}</dd>
        <dt className="text-muted">Citations</dt>
        <dd>{paper.citation_count ?? "—"}</dd>
        <dt className="text-muted">arXiv</dt>
        <dd>
          {arxivUrl(paper) ? (
            <a className="text-accent underline" href={arxivUrl(paper)!} target="_blank" rel="noreferrer">
              {paper.arxiv_id}
            </a>
          ) : (
            "—"
          )}
        </dd>
        <dt className="text-muted">DOI</dt>
        <dd>{paper.doi ?? "—"}</dd>
        <dt className="text-muted">In library</dt>
        <dd>{paper.in_library ? "yes" : "no (graph stub)"}</dd>
      </dl>
      <section>
        <h2 className="section-label mb-1">Abstract</h2>
        {paper.abstract ? <p className="text-sm leading-relaxed">{paper.abstract}</p> : <p className="text-muted italic text-sm">No abstract available.</p>}
      </section>
      <section>
        <div className="flex items-center gap-3 mb-1">
          <h2 className="section-label">Concepts</h2>
          <Button size="sm" variant="secondary" loading={queuing || jobId !== null} onClick={extract}>
            Extract concepts
          </Button>
          {jobId !== null && (
            <span role="status" className="text-xs text-muted animate-pulse">
              Extracting concepts… this can take a minute.
            </span>
          )}
        </div>
        <Async
          state={concepts}
          isEmpty={(d) => d.items.length === 0}
          empty={
            jobId !== null
              ? "Extraction is running — concepts will appear here when it finishes."
              : "No concepts extracted yet. Click “Extract concepts” to find the techniques and ideas this paper introduces or uses."
          }
        >
          {(d) => (
            <ul className="space-y-1.5">
              {d.items.map(({ concept, role, evidence }) => (
                <li key={concept.id} className="text-sm">
                  <Link href={`/concepts/${concept.id}`} className="font-medium text-accent hover:underline">
                    {concept.name}
                  </Link>{" "}
                  <Badge tone={role === "introduces" ? "success" : "neutral"} title={role === "introduces" ? "This paper introduces the concept" : "This paper uses the concept"}>
                    {role === "introduces" ? "★ introduces" : "uses"}
                  </Badge>{" "}
                  <span className="text-xs text-muted">{concept.kind}</span>
                  {evidence[0] && <div className="text-xs italic text-muted ml-3">“{evidence[0].quote}”</div>}
                </li>
              ))}
            </ul>
          )}
        </Async>
      </section>
    </div>
  );
}
