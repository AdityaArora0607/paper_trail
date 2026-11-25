"use client";

import Link from "next/link";
import { useState } from "react";
import { api, type RecAction, type Recommendation } from "@/lib/api";
import { firstAuthorEtAl } from "@/lib/format";
import RecReasons from "./RecReasons";
import { Button, Card, useToast } from "./ui";

const DONE_MSG: Record<RecAction, string> = {
  save: "Saved to library",
  dismiss: "Dismissed",
  not_relevant: "Marked not relevant — we'll show less like this",
};

/**
 * One recommendation: title/year/authors, compact reasons (quoted titles link out),
 * and Save / Dismiss / Not relevant. Actions are optimistic: onOptimistic fires immediately,
 * onRollback if the API call fails.
 */
export default function RecommendationCard({
  rec,
  evidenceTitles = {},
  onOptimistic,
  onRollback,
  onDone,
}: {
  rec: Recommendation;
  /** paper_id -> title for evidence links (falls back to "paper #id"). */
  evidenceTitles?: Record<number, string>;
  onOptimistic?: (action: RecAction, rec: Recommendation) => void;
  onRollback?: (action: RecAction, rec: Recommendation) => void;
  onDone?: (action: RecAction, rec: Recommendation) => void;
}) {
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  const p = rec.paper;

  async function act(action: RecAction) {
    setBusy(true);
    onOptimistic?.(action, rec);
    try {
      await api.sendRecFeedback({ paper_id: p.id, action });
      toast(DONE_MSG[action], { kind: "success" });
      onDone?.(action, rec);
    } catch (e) {
      onRollback?.(action, rec);
      toast(`Could not update: ${e instanceof Error ? e.message : String(e)}`, { kind: "error" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card as="article" className="group hover:border-accent/40 focus-within:border-accent/40 transition-colors">
      <Link href={`/papers/${p.id}`} className="line-clamp-2 font-medium leading-snug hover:text-accent">
        {p.title}
      </Link>
      <div className="text-xs text-muted mt-0.5">
        {[p.year ?? "n.d.", firstAuthorEtAl(p.authors), p.citation_count !== null ? `${p.citation_count} cites` : null]
          .filter(Boolean)
          .join(" · ")}
      </div>
      <RecReasons reasons={rec.reasons} titles={evidenceTitles} />
      <div className="hover-actions mt-2 flex flex-wrap gap-1.5">
        <Button size="sm" variant="primary" disabled={busy} onClick={() => act("save")}>
          Save to library
        </Button>
        <Button size="sm" variant="ghost" disabled={busy} onClick={() => act("dismiss")}>
          Dismiss
        </Button>
        <Button size="sm" variant="ghost" disabled={busy} onClick={() => act("not_relevant")}>
          Not relevant
        </Button>
      </div>
    </Card>
  );
}
