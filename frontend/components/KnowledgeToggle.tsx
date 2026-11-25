"use client";

import { useState } from "react";
import { api, type KnowledgeState } from "@/lib/api";

const STATES: KnowledgeState[] = ["unknown", "partial", "known"];
const ACTIVE: Record<KnowledgeState, string> = {
  unknown: "bg-red-500/20 text-red-700 dark:text-red-300",
  partial: "bg-amber-500/20 text-amber-700 dark:text-amber-300",
  known: "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300",
};

/** known / partial / unknown toggle; PUTs to /profile/concepts/{id}. */
export default function KnowledgeToggle({
  conceptId,
  state,
  onChange,
}: {
  conceptId: number;
  state: KnowledgeState | null;
  onChange?: (s: KnowledgeState) => void;
}) {
  const [current, setCurrent] = useState<KnowledgeState | null>(state);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function pick(s: KnowledgeState) {
    const prev = current;
    setCurrent(s);
    setBusy(true);
    setErr(null);
    try {
      await api.setConceptState(conceptId, s);
      onChange?.(s);
    } catch (e) {
      setCurrent(prev);
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <span className="inline-flex items-center gap-2">
      <span role="group" aria-label="Knowledge state" className="inline-flex rounded border border-line overflow-hidden">
        {STATES.map((s) => (
          <button
            key={s}
            type="button"
            disabled={busy}
            aria-pressed={current === s}
            onClick={() => pick(s)}
            className={`px-2 py-0.5 text-xs border-r border-line last:border-r-0 ${
              current === s ? ACTIVE[s] + " font-medium" : "text-muted hover:text-fg"
            }`}
          >
            {s}
          </button>
        ))}
      </span>
      {err && <span className="text-red-600 text-xs">{err}</span>}
    </span>
  );
}
