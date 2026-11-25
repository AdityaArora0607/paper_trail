import type { Paper, RelationType } from "./types";

export function authorsShort(authors: string[], max = 3): string {
  if (!authors?.length) return "Unknown authors";
  if (authors.length <= max) return authors.join(", ");
  return `${authors.slice(0, max).join(", ")} et al.`;
}

export function arxivUrl(p: Pick<Paper, "arxiv_id">): string | null {
  return p.arxiv_id ? `https://arxiv.org/abs/${p.arxiv_id}` : null;
}

export const RELATION_COLORS: Record<RelationType, string> = {
  introduces: "#16a34a",
  extends: "#2563eb",
  applies: "#9333ea",
  improves: "#d97706",
  challenges: "#dc2626",
};

export const INTENT_CLASSES: Record<string, string> = {
  background: "bg-stone-500/15 text-stone-700 dark:text-stone-300",
  methodology: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
  result: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
};

export function intentClass(intent: string): string {
  return INTENT_CLASSES[intent] ?? "bg-stone-500/15";
}

export const STATUS_LABEL: Record<string, string> = {
  unread: "To read",
  reading: "Reading",
  read: "Read",
};

/** "Vaswani et al." style: first author, plus "et al." when there are more. */
export function firstAuthorEtAl(authors: string[]): string {
  if (!authors?.length) return "Unknown authors";
  return authors.length > 1 ? `${authors[0]} et al.` : authors[0];
}

export function formatDate(iso: string | undefined | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toISOString().slice(0, 10);
}
