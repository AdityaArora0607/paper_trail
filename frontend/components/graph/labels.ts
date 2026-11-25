export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface LabelCandidate {
  id: string;
  box: Box;
  priority: number;
}

export const LABEL_FONT_PX = 11.5;
export const LABEL_MAX_CHARS = 28;
export const LABEL_MAX_LINES = 2;

/** Wrap text to at most `maxLines` lines of `maxChars`, ellipsizing what does not fit. */
export function wrapLabel(text: string, maxChars = LABEL_MAX_CHARS, maxLines = LABEL_MAX_LINES): string {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let cur = "";
  let i = 0;
  for (; i < words.length; i++) {
    let w = words[i];
    if (w.length > maxChars) w = `${w.slice(0, maxChars - 1)}…`;
    const next = cur ? `${cur} ${w}` : w;
    if (next.length <= maxChars) cur = next;
    else {
      lines.push(cur);
      cur = w;
      if (lines.length === maxLines - 1) {
        i++;
        break;
      }
    }
  }
  if (cur) {
    const rest = words.slice(i).join(" ");
    if (lines.length === maxLines - 1 && rest) {
      cur = `${cur} ${rest}`;
      if (cur.length > maxChars) cur = `${cur.slice(0, maxChars - 1).trimEnd()}…`;
    }
    lines.push(cur);
  }
  return lines.join("\n");
}

/** Approximate on-screen size of a (pre-wrapped) label, including background padding. */
export function labelSize(label: string, fontPx = LABEL_FONT_PX, pad = 3): { w: number; h: number } {
  const lines = label.split("\n");
  const longest = Math.max(...lines.map((l) => l.length), 0);
  return { w: longest * fontPx * 0.58 + pad * 2, h: lines.length * fontPx * 1.2 + pad * 2 };
}

/** Higher = placed first. Root beats in-library beats degree. */
export function labelPriority(isRoot: boolean, inLibrary: boolean, degree: number): number {
  return (isRoot ? 1e6 : 0) + (inLibrary ? 1000 : 0) + degree;
}

export function boxesOverlap(a: Box, b: Box, gap = 0): boolean {
  return a.x < b.x + b.w + gap && b.x < a.x + a.w + gap && a.y < b.y + b.h + gap && b.y < a.y + a.h + gap;
}

/**
 * Greedy label placement: candidates in descending priority; a label is kept only when its
 * box overlaps no already-placed box. The root (when among the candidates) is always kept.
 */
export function placeLabels(cands: LabelCandidate[], rootId?: string, gap = 2): string[] {
  const sorted = [...cands].sort(
    (a, b) => Number(b.id === rootId) - Number(a.id === rootId) || b.priority - a.priority || (a.id < b.id ? -1 : 1),
  );
  const placed: LabelCandidate[] = [];
  for (const c of sorted) {
    if (c.id === rootId || !placed.some((p) => boxesOverlap(p.box, c.box, gap))) placed.push(c);
  }
  return placed.map((p) => p.id);
}
