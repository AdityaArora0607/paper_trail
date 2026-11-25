"use client";

import { useState } from "react";
import { api, type Job, type Paper } from "@/lib/api";
import { Button, useToast } from "./ui";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export default function ImportBox({ onImported, prominent = false }: { onImported?: (p: Paper) => void; prominent?: boolean }) {
  const [value, setValue] = useState("");
  const [msg, setMsg] = useState<{ kind: "info" | "error" | "ok"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const { toast, update } = useToast();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const identifier = value.trim();
    if (!identifier) return;
    setBusy(true);
    setMsg({ kind: "info", text: "Importing…" });
    const tid = toast("Importing paper…", { duration: 0 });
    try {
      const { paper, job } = await api.importPaper(identifier);
      onImported?.(paper);
      let j: Job = job;
      for (let i = 0; i < 120 && (j.status === "queued" || j.status === "running"); i++) {
        const text = `Imported “${paper.title}”. Expanding citations (${j.status})…`;
        setMsg({ kind: "info", text });
        update(tid, text, { kind: "info", duration: 0 });
        await sleep(1500);
        j = await api.getJob(j.id);
      }
      if (j.status === "failed") {
        const text = `Citation expansion failed: ${j.error ?? "unknown error"}`;
        setMsg({ kind: "error", text });
        update(tid, text, { kind: "error" });
      } else if (j.status === "done") {
        const text = `Imported “${paper.title}” and expanded its citations.`;
        setMsg({ kind: "ok", text });
        update(tid, text, { kind: "success" });
      } else {
        const text = `Imported “${paper.title}”; expansion still running in background.`;
        setMsg({ kind: "info", text });
        update(tid, text, { kind: "info" });
      }
      setValue("");
      onImported?.(paper);
    } catch (err) {
      const text = err instanceof Error ? err.message : String(err);
      setMsg({ kind: "error", text });
      update(tid, text, { kind: "error" });
    } finally {
      setBusy(false);
    }
  }

  const color = msg?.kind === "error" ? "text-danger" : msg?.kind === "ok" ? "text-success" : "text-muted";
  return (
    <form onSubmit={submit} className="flex flex-col gap-1.5">
      <div className="flex gap-2">
        <input
          aria-label="Import identifier"
          className={`flex-1 ${prominent ? "!h-10 text-base" : ""}`}
          placeholder="Import: arXiv id, DOI, or URL (e.g. 1706.03762)"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          disabled={busy}
        />
        <Button type="submit" variant="primary" size={prominent ? "lg" : "md"} disabled={!value.trim()} loading={busy}>
          {busy ? "Importing…" : "Import"}
        </Button>
      </div>
      {msg && (
        <div role="status" className={`text-xs ${color}`}>
          {msg.text}
        </div>
      )}
    </form>
  );
}
