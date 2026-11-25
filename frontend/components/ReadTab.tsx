"use client";

import { useEffect, useState, type ComponentType } from "react";
import type { Paper } from "@/lib/api";
import { arxivUrl } from "@/lib/format";
import { Loading } from "./States";

type ViewerProps = { url?: string; paperId?: number };

/**
 * Client-only lazy load of the (pdf.js) viewer. Deliberately NOT next/dynamic or React.lazy: those wrap the
 * viewer in a Suspense boundary, and any re-suspend there hides the subtree and re-runs its effects (the PDF
 * was re-fetched in a loop). A plain state-held component never suspends, so the viewer mounts exactly once.
 */
function LazyPdfViewer(props: ViewerProps) {
  const [Viewer, setViewer] = useState<ComponentType<ViewerProps> | null>(null);
  useEffect(() => {
    let cancelled = false;
    void import("./PdfViewer").then((m) => {
      if (!cancelled) setViewer(() => m.default);
    });
    return () => {
      cancelled = true;
    };
  }, []);
  return Viewer ? <Viewer {...props} /> : <Loading label="Loading viewer" rows={2} />;
}

export default function ReadTab({ paper }: { paper: Paper }) {
  if (paper.pdf_url) return <LazyPdfViewer paperId={paper.id} url={paper.pdf_url ?? undefined} />;
  const link = arxivUrl(paper) ?? (paper.doi ? `https://doi.org/${paper.doi}` : null);
  return (
    <div className="text-sm">
      <p className="text-muted italic">No PDF is available for this paper.</p>
      {link && (
        <p className="mt-2">
          <a href={link} target="_blank" rel="noreferrer" className="text-accent underline">
            {paper.arxiv_id ? "View on arXiv" : "Open via DOI"}
          </a>
        </p>
      )}
    </div>
  );
}
