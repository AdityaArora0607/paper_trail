"use client";

import { useState } from "react";
import { api, type Paper, type ReadingStatus } from "@/lib/api";
import ReadingStatusControl from "./ReadingStatusControl";
import { Button, useToast } from "./ui";

/** Primary status button + status dropdown + add-to-library for the paper header. */
export default function PaperActions({ paper, onChange }: { paper: Paper; onChange: (p: Paper) => void }) {
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);

  async function patch(body: { reading_status?: ReadingStatus; in_library?: boolean }, msg: string) {
    setBusy(true);
    try {
      onChange(await api.patchPaper(paper.id, body));
      toast(msg, { kind: "success" });
    } catch (e) {
      toast(`Could not update: ${e instanceof Error ? e.message : String(e)}`, { kind: "error" });
    } finally {
      setBusy(false);
    }
  }

  const s = paper.reading_status;
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {s === "reading" ? (
        <Button variant="primary" loading={busy} onClick={() => patch({ reading_status: "read" }, "Marked as read")}>
          Mark as read
        </Button>
      ) : s === "read" ? (
        <Button variant="secondary" loading={busy} onClick={() => patch({ reading_status: "reading" }, "Marked as reading")}>
          ✓ Read
        </Button>
      ) : (
        <Button
          variant="primary"
          loading={busy}
          onClick={() => patch({ reading_status: "reading", ...(paper.in_library ? {} : { in_library: true }) }, "Started reading")}
        >
          Start reading
        </Button>
      )}
      <ReadingStatusControl paper={paper} onChange={onChange} />
      {!paper.in_library && (
        <Button loading={busy} onClick={() => patch({ in_library: true }, "Added to library")}>
          Add to library
        </Button>
      )}
    </div>
  );
}
