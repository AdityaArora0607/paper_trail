"use client";

import Link from "next/link";
import { useState } from "react";
import { api, type Paper, type ReadingStatus, type ReadingStep as Step } from "@/lib/api";
import { authorsShort } from "@/lib/format";
import { Badge, Button, buttonClass, useToast } from "./ui";

/** Reason text clamped to 2 lines with an expand toggle (only offered for long text). */
function ClampedReason({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  const long = text.length > 110;
  return (
    <div className="mt-1">
      <p className={`text-sm ${long && !open ? "line-clamp-2" : ""}`}>{text}</p>
      {long && (
        <button type="button" aria-expanded={open} onClick={() => setOpen((o) => !o)} className="text-xs text-accent hover:underline">
          {open ? "Show less" : "Show more"}
        </button>
      )}
    </div>
  );
}

/** One step of a reading path. `paper` is the live (possibly patched) paper; changes bubble up via onChange. */
export default function ReadingStepCard({
  step,
  index,
  paper = step.paper,
  onChange,
}: {
  step: Step;
  index: number;
  paper?: Paper;
  onChange?: (p: Paper) => void;
}) {
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  const done = paper.reading_status === "read";

  async function patch(body: { reading_status?: ReadingStatus; in_library?: boolean }, okMsg: string) {
    setBusy(true);
    try {
      const updated = await api.patchPaper(paper.id, body);
      onChange?.(updated);
      toast(okMsg, { kind: "success" });
    } catch (e) {
      toast(`Could not update: ${e instanceof Error ? e.message : String(e)}`, { kind: "error" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <li
      data-done={done}
      className={`flex gap-3 rounded-lg border border-line bg-panel p-3 transition-opacity ${done ? "opacity-60" : ""}`}
    >
      <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${done ? "bg-success/15 text-success" : "bg-hover text-muted"}`}>
        {done ? "✓" : index + 1}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-baseline gap-x-2">
          <Link href={`/papers/${paper.id}`} className={`font-medium hover:text-accent ${done ? "line-through decoration-muted/50" : ""}`}>
            {paper.title}
          </Link>
          <span className="text-xs text-muted">
            {paper.year ?? "n.d."} · {authorsShort(paper.authors, 2)}
          </span>
          {paper.reading_status === "reading" && <Badge tone="warn">Reading</Badge>}
        </div>
        {!done && (
          <>
            <ClampedReason text={step.reason} />
            {step.concepts.length > 0 && (
              <div className="mt-1.5 flex flex-wrap gap-1">
                {step.concepts.map((c) => (
                  <Link key={c.id} href={`/concepts/${c.id}`}>
                    <Badge tone="accent">{c.name}</Badge>
                  </Link>
                ))}
              </div>
            )}
          </>
        )}
        <div className="mt-2 flex flex-wrap gap-1.5">
          {!done && (
            <Button size="sm" variant="primary" disabled={busy} onClick={() => patch({ reading_status: "read" }, "Marked as read")}>
              Mark read
            </Button>
          )}
          {paper.reading_status !== "reading" && (
            <Button size="sm" disabled={busy} onClick={() => patch({ reading_status: "reading" }, "Marked as reading")}>
              Reading now
            </Button>
          )}
          <Link href={`/papers/${paper.id}`} className={buttonClass("ghost", "sm")}>
            Open
          </Link>
          {!paper.in_library && (
            <Button size="sm" variant="ghost" disabled={busy} onClick={() => patch({ in_library: true }, "Added to library")}>
              Add to library
            </Button>
          )}
        </div>
      </div>
    </li>
  );
}
