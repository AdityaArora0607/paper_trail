export type ReasonPart = { type: "text"; text: string } | { type: "link"; text: string; paperId: number };

const QUOTE_RE = /“([^”]+)”|"([^"]+)"/g;

const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/[…]|\.{3}/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

function titleMatches(quoted: string, title: string): boolean {
  const q = norm(quoted);
  const t = norm(title);
  if (!q || !t) return false;
  return t === q || t.startsWith(q) || q.startsWith(t) || t.includes(q);
}

/**
 * Splits a reason's text into plain text and links. Quoted titles ("…" or “…”) that match a
 * fetched evidence paper title become links; if titles are not available yet and the number of
 * quotes equals the number of evidence ids, they are matched by position. When the text quotes
 * nothing at all, up to one evidence paper is appended as a trailing link.
 */
export function parseReason(text: string, evidenceIds: number[], titles: Record<number, string>): ReasonPart[] {
  const quotes = [...text.matchAll(QUOTE_RE)];
  const parts: ReasonPart[] = [];
  if (quotes.length === 0) {
    parts.push({ type: "text", text });
    const id = evidenceIds.find((i) => titles[i]);
    if (id !== undefined) parts.push({ type: "text", text: " " }, { type: "link", text: titles[id], paperId: id });
    return parts;
  }
  const used = new Set<number>();
  let last = 0;
  quotes.forEach((m, qi) => {
    const quoted = m[1] ?? m[2];
    let id = evidenceIds.find((i) => !used.has(i) && titles[i] && titleMatches(quoted, titles[i]));
    if (id === undefined && quotes.length === evidenceIds.length && !used.has(evidenceIds[qi])) id = evidenceIds[qi];
    const start = m.index ?? 0;
    if (start > last) parts.push({ type: "text", text: text.slice(last, start) });
    if (id !== undefined) {
      used.add(id);
      parts.push({ type: "link", text: m[0], paperId: id });
    } else {
      parts.push({ type: "text", text: m[0] });
    }
    last = start + m[0].length;
  });
  if (last < text.length) parts.push({ type: "text", text: text.slice(last) });
  return parts;
}
