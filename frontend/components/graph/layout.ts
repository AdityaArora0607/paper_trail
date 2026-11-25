import type { CitationEdge, GraphResponse, Paper } from "@/lib/types";

export interface Pos {
  x: number;
  y: number;
}

export interface GraphFilters {
  onlyContext: boolean;
  onlyLibraryNeighbors: boolean;
  minYear: number | null;
  maxYear: number | null;
}

export const NO_FILTERS: GraphFilters = {
  onlyContext: false,
  onlyLibraryNeighbors: false,
  minYear: null,
  maxYear: null,
};

export interface YearBand {
  /** null = papers with unknown year */
  year: number | null;
  x0: number;
  x1: number;
  cx: number;
  count: number;
  /** collapsed run of empty years (rendered as a "⋯" marker) */
  gap?: boolean;
}

export interface YearLayout {
  positions: Record<number, Pos>;
  bands: YearBand[];
}

export const SUB_COL_W = 48; // horizontal space for one sub-column inside a year band
export const ROW_H = 36; // vertical space per row
export const MAX_ROWS = 14; // rows before a year spills into another sub-column
export const EMPTY_BAND_W = 24;
export const MIN_BAND_W = 90;

/** Node diameter in px from citation count (log scale, clamped). */
export function nodeSize(count: number | null): number {
  return Math.round(Math.max(14, Math.min(54, 10 + Math.log10(1 + Math.max(count ?? 0, 0)) * 8)));
}

export function hasContext(e: CitationEdge): boolean {
  return e.contexts.length > 0;
}

/** Undirected degree per node id (edges to unknown ids ignored). */
export function degrees(nodes: Paper[], edges: CitationEdge[]): Map<number, number> {
  const d = new Map<number, number>(nodes.map((n) => [n.id, 0]));
  for (const e of edges) {
    if (d.has(e.citing_id) && d.has(e.cited_id)) {
      d.set(e.citing_id, d.get(e.citing_id)! + 1);
      d.set(e.cited_id, d.get(e.cited_id)! + 1);
    }
  }
  return d;
}

/** Ids of the n highest-degree nodes (ties broken by citation count). */
export function topByDegree(nodes: Paper[], edges: CitationEdge[], n: number): Set<number> {
  const d = degrees(nodes, edges);
  return new Set(
    [...nodes]
      .sort((a, b) => d.get(b.id)! - d.get(a.id)! || (b.citation_count ?? 0) - (a.citation_count ?? 0) || a.id - b.id)
      .slice(0, n)
      .map((p) => p.id),
  );
}

export function yearRange(nodes: Paper[]): [number, number] | null {
  const ys = nodes.map((n) => n.year).filter((y): y is number => y !== null);
  return ys.length ? [Math.min(...ys), Math.max(...ys)] : null;
}

/**
 * Apply filters. The root is always kept. Edges are kept only when both ends survive.
 * With `onlyContext`, edges without context sentences are dropped and nodes left
 * without any edge are dropped too (root excepted).
 */
export function filterGraph(g: GraphResponse, f: GraphFilters): GraphResponse {
  let nodes = g.nodes;
  let edges = g.edges;

  if (f.minYear !== null || f.maxYear !== null) {
    nodes = nodes.filter(
      (n) =>
        n.id === g.root_id ||
        n.year === null ||
        ((f.minYear === null || n.year >= f.minYear) && (f.maxYear === null || n.year <= f.maxYear)),
    );
  }
  if (f.onlyLibraryNeighbors) {
    const lib = new Set(nodes.filter((n) => n.in_library || n.id === g.root_id).map((n) => n.id));
    const keep = new Set(lib);
    for (const e of edges) {
      if (lib.has(e.citing_id)) keep.add(e.cited_id);
      if (lib.has(e.cited_id)) keep.add(e.citing_id);
    }
    nodes = nodes.filter((n) => keep.has(n.id));
  }
  let ids = new Set(nodes.map((n) => n.id));
  edges = edges.filter((e) => ids.has(e.citing_id) && ids.has(e.cited_id));
  if (f.onlyContext) {
    edges = edges.filter(hasContext);
    const touched = new Set<number>([g.root_id]);
    for (const e of edges) {
      touched.add(e.citing_id);
      touched.add(e.cited_id);
    }
    nodes = nodes.filter((n) => touched.has(n.id));
    ids = new Set(nodes.map((n) => n.id));
  }
  return { nodes, edges, root_id: g.root_id };
}

/** Slot offsets 0, +1, -1, +2, -2, ... so the highest-ranked item sits at the center. */
export function centerOut(i: number): number {
  return i === 0 ? 0 : i % 2 === 1 ? (i + 1) / 2 : -i / 2;
}

/** Years with at most this many nodes get a narrow band. */
export const SPARSE_COUNT = 2;
export const SPARSE_BAND_W = 60;
/** Runs of empty years longer than this collapse into one gap marker band. */
export const MAX_EMPTY_RUN = 2;
export const GAP_BAND_W = 32;
export const DEFAULT_ASPECT = 2;

interface Plan {
  year: number | null;
  items: Paper[];
  cols: number;
  rows: number;
  width: number;
}

function planBands(groups: { year: number | null; items: Paper[] }[], maxRows: number): Plan[] {
  return groups.map(({ year, items }) => {
    const cols = Math.ceil(items.length / maxRows);
    const rows = Math.ceil(items.length / cols);
    const width =
      items.length <= SPARSE_COUNT ? SPARSE_BAND_W : Math.max(MIN_BAND_W, cols * SUB_COL_W + 20);
    return { year, items, cols, rows, width };
  });
}

/**
 * Year layout: x by year (one band per populated year, wider when crowded), y spread inside a band.
 * Within a year, nodes are ranked (root first, then degree, then citations); the best
 * sit nearest the vertical center. Crowded years spill into several sub-columns only after
 * `maxRows` rows, and maxRows plus the row spacing are chosen so the layout bounding box
 * matches `aspect` (container width / height). Sparse years get narrow bands and long runs of
 * empty years collapse into a single gap band (`gap: true`).
 */
export function yearLayout(g: GraphResponse, aspect: number = DEFAULT_ASPECT): YearLayout {
  const deg = degrees(g.nodes, g.edges);
  const byYear = new Map<number | null, Paper[]>();
  for (const n of g.nodes) {
    const k = n.year ?? null;
    const arr = byYear.get(k);
    if (arr) arr.push(n);
    else byYear.set(k, [n]);
  }
  const rank = (a: Paper, b: Paper) =>
    Number(b.id === g.root_id) - Number(a.id === g.root_id) ||
    deg.get(b.id)! - deg.get(a.id)! ||
    (b.citation_count ?? 0) - (a.citation_count ?? 0) ||
    a.id - b.id;

  const target = Number.isFinite(aspect) && aspect > 0 ? aspect : DEFAULT_ASPECT;
  const known = [...byYear.keys()].filter((y): y is number => y !== null).sort((a, b) => a - b);

  // ordered groups: populated years, empty filler years, "gap" markers
  type Group = { year: number | null; items: Paper[]; gap?: boolean };
  const groups: Group[] = [];
  for (let i = 0; i < known.length; i++) {
    if (i > 0) {
      const empty = known[i] - known[i - 1] - 1;
      if (empty > MAX_EMPTY_RUN) groups.push({ year: known[i - 1] + 1, items: [], gap: true });
      else for (let y = known[i - 1] + 1; y < known[i]; y++) groups.push({ year: y, items: [] });
    }
    groups.push({ year: known[i], items: (byYear.get(known[i]) ?? []).sort(rank) });
  }
  if (byYear.has(null)) groups.push({ year: null, items: byYear.get(null)!.sort(rank) });

  const populated = groups.filter((x) => x.items.length > 0);
  const widthOf = (plans: Plan[]) => {
    let w = 0;
    for (const gr of groups) {
      if (gr.items.length === 0) w += gr.gap ? GAP_BAND_W : EMPTY_BAND_W;
      else w += plans.find((p) => p.year === gr.year)!.width;
    }
    return w;
  };

  // pick maxRows whose (width / height) is closest to the target aspect
  let best = { maxRows: MAX_ROWS, err: Infinity };
  for (let r = 3; r <= 60; r++) {
    const plans = planBands(populated, r);
    const h = Math.max(1, ...plans.map((p) => p.rows)) * ROW_H;
    const err = Math.abs(Math.log(widthOf(plans) / h / target));
    if (err < best.err - 1e-9) best = { maxRows: r, err };
  }
  const plans = planBands(populated, best.maxRows);
  const planByYear = new Map(plans.map((p) => [p.year, p]));

  // fine-tune row spacing so the bbox hits the target aspect
  const fullH = Math.max(1, ...plans.map((p) => p.rows - 1)) * ROW_H + ROW_H;
  const yScale = populated.length
    ? Math.max(0.7, Math.min(2.5, widthOf(plans) / (target * fullH)))
    : 1;
  const rowH = ROW_H * yScale;

  const positions: Record<number, Pos> = {};
  const bands: YearBand[] = [];
  let cursor = 0;
  for (const gr of groups) {
    const plan = planByYear.get(gr.year);
    if (gr.items.length === 0 || !plan) {
      const w = gr.gap ? GAP_BAND_W : EMPTY_BAND_W;
      bands.push({ year: gr.year, x0: cursor, x1: cursor + w, cx: cursor + w / 2, count: 0, gap: gr.gap });
      cursor += w;
      continue;
    }
    const { items, cols, width } = plan;
    const cx = cursor + width / 2;
    items.forEach((n, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      // stagger alternate columns by half a row so neighbours don't line up
      const stagger = cols > 1 && col % 2 === 1 ? rowH / 2 : 0;
      positions[n.id] = { x: cx + centerOut(col) * SUB_COL_W, y: centerOut(row) * rowH + stagger };
    });
    // the root is first in its band and so sits at (cx, 0): exactly centered
    bands.push({ year: gr.year, x0: cursor, x1: cursor + width, cx, count: items.length });
    cursor += width;
  }
  return { positions, bands };
}

/** Which bands get an axis label, thinning out when there are many. */
export function tickBands(bands: YearBand[], maxLabels = 24): YearBand[] {
  const withNodes = bands.filter((b) => b.count > 0 || b.gap || (b.year !== null && b.year % 5 === 0));
  if (withNodes.length <= maxLabels) return withNodes;
  const step = Math.ceil(withNodes.length / maxLabels);
  return withNodes.filter((b, i) => b.year === null || b.gap || i % step === 0);
}

export function shortTitle(title: string, max = 30): string {
  return title.length > max ? `${title.slice(0, max - 1).trimEnd()}…` : title;
}
