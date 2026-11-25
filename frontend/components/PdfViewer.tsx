"use client";

import { useEffect, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/TextLayer.css";
import "react-pdf/dist/Page/AnnotationLayer.css";
import { api, API_URL, AUTH_EXPIRED_EVENT } from "../lib/api";

pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();

const inflight = new Map<string, Promise<Blob>>();
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** One network fetch per src at a time (StrictMode's double effect run shares it). Polls while the API answers 202. */
function loadPdfBlob(src: string, onFetching: (v: boolean) => void): Promise<Blob> {
  const existing = inflight.get(src);
  if (existing) return existing;
  const p = (async () => {
    for (let attempt = 0; attempt < 60; attempt++) {
      const res = await fetch(src, {
        credentials: API_URL.startsWith("/") ? "same-origin" : "include",
        headers: { "X-Requested-With": "papertrail" },
      });
      if (res.status === 202) {
        onFetching(true);
        const body = await res.json().catch(() => null);
        const jobId: number | undefined = body?.job?.id;
        if (jobId != null) {
          for (let i = 0; i < 40; i++) {
            const j = await api.getJob(jobId);
            if (j.status === "done") break;
            if (j.status === "failed") throw new Error(j.error || "PDF fetch failed");
            await sleep(1500);
          }
        } else {
          await sleep(1500);
        }
        continue;
      }
      if (res.status === 401) {
        window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT));
        throw new Error("Not authenticated");
      }
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`.trim());
      return res.blob();
    }
    throw new Error("timed out waiting for the PDF");
  })().finally(() => inflight.delete(src));
  inflight.set(src, p);
  return p;
}

/**
 * Pass `paperId` to load the PDF through the backend (session cookie; the API may answer 200 with the
 * bytes, 307 to a presigned/source URL which fetch follows, or 202 while it fetches the file, which we
 * poll via the job). `url` is the direct link, used only when no id is given.
 */
export default function PdfViewer({ url, paperId }: { url?: string; paperId?: number }) {
  const src = paperId != null ? `${API_URL}/papers/${paperId}/pdf` : url ?? "";
  const [file, setFile] = useState<string | null>(paperId != null ? null : src);
  const [error, setError] = useState<string | null>(null);
  const [fetching, setFetching] = useState(false);
  useEffect(() => {
    if (paperId == null) return;
    let cancelled = false;
    let objectUrl: string | null = null;
    loadPdfBlob(src, (v) => !cancelled && setFetching(v)).then(
      (blob) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setFetching(false);
        setFile(objectUrl);
      },
      (e) => {
        if (cancelled) return;
        setFetching(false);
        setError(e instanceof Error ? e.message : String(e));
      },
    );
    return () => {
      // Revoke only on unmount / paper change. Under StrictMode the first run is cancelled before its blob
      // resolves, so it never creates a URL that the second run's Document could be left pointing at.
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [paperId, src]);
  const [pages, setPages] = useState(0);
  const [page, setPage] = useState(1);
  const [scale, setScale] = useState(1.2);

  return (
    <div>
      <div className="flex items-center gap-2 mb-2 text-sm">
        <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="px-2 border border-line rounded disabled:opacity-40">
          ‹
        </button>
        <span>
          Page {page} / {pages || "…"}
        </span>
        <button disabled={page >= pages} onClick={() => setPage(page + 1)} className="px-2 border border-line rounded disabled:opacity-40">
          ›
        </button>
        <button onClick={() => setScale((s) => Math.max(0.5, s - 0.2))} className="px-2 border border-line rounded">
          −
        </button>
        <button onClick={() => setScale((s) => Math.min(3, s + 0.2))} className="px-2 border border-line rounded">
          +
        </button>
        <a href={src} target="_blank" rel="noreferrer" className="ml-auto text-accent underline">
          Open PDF in new tab
        </a>
      </div>
      {error && (
        <div role="alert" className="text-red-600 text-sm mb-2">
          Could not render PDF ({error}). It may block cross-origin loading — use the link above.
        </div>
      )}
      <div className="overflow-auto border border-line rounded bg-stone-500/10 flex justify-center p-2">
        {fetching && <div role="status" className="text-muted p-4">Fetching PDF…</div>}
        {file && (
        <Document
          file={file}
          onLoadSuccess={(d) => setPages(d.numPages)}
          onLoadError={(e) => setError(e.message)}
          loading={<div className="text-muted p-4">Loading PDF…</div>}
        >
          <Page pageNumber={page} scale={scale} renderTextLayer renderAnnotationLayer />
        </Document>
        )}
      </div>
    </div>
  );
}
