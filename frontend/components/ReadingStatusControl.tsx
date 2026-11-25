"use client";

import { useState } from "react";
import { api, type Paper, type ReadingStatus } from "@/lib/api";
import { Select, useToast } from "./ui";

const OPTIONS: { value: ReadingStatus; label: string }[] = [
  { value: null, label: "No status" },
  { value: "unread", label: "To read" },
  { value: "reading", label: "Reading" },
  { value: "read", label: "Read" },
];

export default function ReadingStatusControl({ paper, onChange }: { paper: Paper; onChange?: (p: Paper) => void }) {
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();

  async function set(v: ReadingStatus) {
    setBusy(true);
    try {
      onChange?.(await api.patchPaper(paper.id, { reading_status: v }));
    } catch (e) {
      toast(e instanceof Error ? e.message : String(e), { kind: "error" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Select
      aria-label="Reading status"
      disabled={busy}
      value={paper.reading_status ?? ""}
      onChange={(e) => set((e.target.value || null) as ReadingStatus)}
    >
      {OPTIONS.map((o) => (
        <option key={String(o.value)} value={o.value ?? ""}>
          {o.label}
        </option>
      ))}
    </Select>
  );
}
