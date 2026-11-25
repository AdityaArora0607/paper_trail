import { describe, expect, it } from "vitest";
import { NO_FILTERS, centerOut, filterGraph, nodeSize, shortTitle, tickBands, yearLayout } from "@/components/graph/layout";
import type { GraphResponse } from "@/lib/types";
import { edge, paper } from "./fixtures";

function bigGraph(n = 200): GraphResponse {
  const nodes = Array.from({ length: n }, (_, i) =>
    paper({
      id: i + 1,
      year: i % 10 === 0 ? 2020 : 2015 + (i % 6),
      citation_count: i * 3,
      in_library: i % 7 === 0,
    }),
  );
  const edges = nodes.slice(1).map((p, i) =>
    edge({ citing_id: p.id, cited_id: 1 + (i % 5), contexts: i % 3 === 0 ? ["ctx"] : [] }),
  );
  return { nodes, edges, root_id: 1 };
}

describe("yearLayout", () => {
  it("gives every node a unique position", () => {
    const g = bigGraph(300);
    const { positions } = yearLayout(g);
    const keys = new Set(Object.values(positions).map((p) => `${p.x},${p.y}`));
    expect(Object.keys(positions)).toHaveLength(300);
    expect(keys.size).toBe(300);
  });

  it("keeps nodes inside their year band and bands disjoint and ordered", () => {
    const g = bigGraph();
    const { positions, bands } = yearLayout(g);
    for (let i = 1; i < bands.length; i++) expect(bands[i].x0).toBeGreaterThanOrEqual(bands[i - 1].x1);
    for (const n of g.nodes) {
      const b = bands.find((x) => x.year === n.year)!;
      expect(positions[n.id].x).toBeGreaterThanOrEqual(b.x0);
      expect(positions[n.id].x).toBeLessThanOrEqual(b.x1);
    }
  });

  it("spreads a crowded year over several rows and columns, not one line", () => {
    const g = bigGraph(200);
    const { positions } = yearLayout(g);
    const xs = new Set(Object.values(positions).map((p) => p.x));
    const ys = new Set(Object.values(positions).map((p) => p.y));
    expect(xs.size).toBeGreaterThan(6);
    expect(ys.size).toBeGreaterThan(10);
  });

  it("centers the root vertically in the middle of its band", () => {
    const g = bigGraph();
    const { positions, bands } = yearLayout(g);
    const root = g.nodes[0];
    expect(positions[root.id].y).toBe(0);
    expect(positions[root.id].x).toBe(bands.find((b) => b.year === root.year)!.cx);
  });

  it("puts unknown-year papers in their own trailing band", () => {
    const g: GraphResponse = {
      nodes: [paper({ id: 1, year: 2020 }), paper({ id: 2, year: null })],
      edges: [],
      root_id: 1,
    };
    const { positions, bands } = yearLayout(g);
    expect(bands[bands.length - 1].year).toBeNull();
    expect(positions[2].x).toBeGreaterThan(positions[1].x);
  });

  it("handles an empty graph", () => {
    expect(yearLayout({ nodes: [], edges: [], root_id: 1 }).bands).toEqual([]);
  });
});

describe("filterGraph", () => {
  const g: GraphResponse = {
    root_id: 1,
    nodes: [
      paper({ id: 1, year: 2020, in_library: false }),
      paper({ id: 2, year: 2018, in_library: true }),
      paper({ id: 3, year: 2010, in_library: false }),
      paper({ id: 4, year: 2021, in_library: false }),
      paper({ id: 5, year: 2019, in_library: false }),
    ],
    edges: [
      edge({ citing_id: 1, cited_id: 2, contexts: ["x"] }),
      edge({ citing_id: 1, cited_id: 3 }),
      edge({ citing_id: 4, cited_id: 1, contexts: ["y"] }),
      edge({ citing_id: 5, cited_id: 3 }),
    ],
  };

  it("is a no-op with no filters", () => {
    const f = filterGraph(g, NO_FILTERS);
    expect(f.nodes).toHaveLength(5);
    expect(f.edges).toHaveLength(4);
  });

  it("only edges with context drops contextless edges and orphans, keeps root", () => {
    const f = filterGraph(g, { ...NO_FILTERS, onlyContext: true });
    expect(f.edges).toHaveLength(2);
    expect(f.nodes.map((n) => n.id).sort()).toEqual([1, 2, 4]);
  });

  it("only in-library + neighbors keeps library papers and their neighbors", () => {
    const f = filterGraph(g, { ...NO_FILTERS, onlyLibraryNeighbors: true });
    // root counts as a seed, so its neighbors (2, 3, 4) stay; 5 is only linked to 3
    expect(f.nodes.map((n) => n.id).sort()).toEqual([1, 2, 3, 4]);
    expect(f.edges).toHaveLength(3);
  });

  it("year range filters nodes and dangling edges but never the root", () => {
    const f = filterGraph(g, { ...NO_FILTERS, minYear: 2019, maxYear: 2019 });
    expect(f.nodes.map((n) => n.id).sort()).toEqual([1, 5]);
    expect(f.edges).toHaveLength(0);
  });
});

describe("helpers", () => {
  it("centerOut alternates around zero", () => {
    expect([0, 1, 2, 3, 4].map(centerOut)).toEqual([0, 1, -1, 2, -2]);
  });
  it("nodeSize grows with citations within bounds", () => {
    expect(nodeSize(null)).toBeLessThan(nodeSize(100));
    expect(nodeSize(100)).toBeLessThan(nodeSize(100000));
    expect(nodeSize(1e9)).toBeLessThanOrEqual(54);
  });
  it("shortTitle truncates", () => {
    expect(shortTitle("a".repeat(50), 30)).toHaveLength(30);
    expect(shortTitle("short")).toBe("short");
  });
  it("tickBands thins labels", () => {
    const { bands } = yearLayout({
      root_id: 1,
      nodes: Array.from({ length: 100 }, (_, i) => paper({ id: i + 1, year: 1920 + i })),
      edges: [],
    });
    expect(tickBands(bands, 24).length).toBeLessThanOrEqual(24);
  });
});

function bbox(positions: Record<number, { x: number; y: number }>) {
  const ps = Object.values(positions);
  const xs = ps.map((p) => p.x);
  const ys = ps.map((p) => p.y);
  return { w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) };
}

describe("yearLayout aspect and gap compression", () => {
  const wide = (): GraphResponse => {
    // root 2018, refs back to 1952, ~150 citing papers 2019-2026
    const years = [1952, 1960, 1987, 1999, 2010, 2016, 2017, 2018];
    const nodes = [
      ...years.map((y, i) => paper({ id: i + 1, year: y, citation_count: 10 })),
      ...Array.from({ length: 150 }, (_, i) => paper({ id: 100 + i, year: 2019 + (i % 8), citation_count: i })),
    ];
    nodes[7] = { ...nodes[7], id: 8 };
    return { nodes, edges: [], root_id: 8 };
  };

  for (const target of [1.2, 2, 3]) {
    it(`bbox aspect is within 25% of target ${target}`, () => {
      const { positions } = yearLayout(wide(), target);
      const { w, h } = bbox(positions);
      const ratio = w / h / target;
      expect(ratio).toBeGreaterThan(0.75);
      expect(ratio).toBeLessThan(1.25);
    });
  }

  it("collapses long gaps, keeps year order and monotonic x", () => {
    const { bands, positions } = yearLayout(wide(), 2);
    const gaps = bands.filter((b) => b.gap);
    expect(gaps.length).toBeGreaterThan(0);
    for (let i = 1; i < bands.length; i++) expect(bands[i].x0).toBeGreaterThanOrEqual(bands[i - 1].x1);
    const populated = bands.filter((b) => b.count > 0).map((b) => b.year as number);
    expect([...populated].sort((a, b) => a - b)).toEqual(populated);
    const total = bands[bands.length - 1].x1;
    expect(total).toBeLessThan(75 * 24 + 8 * 120); // far narrower than linear time
    const byYear = new Map<number, number>();
    for (const n of wide().nodes) byYear.set(n.year!, positions[n.id].x);
    const ys = [...byYear.keys()].sort((a, b) => a - b);
    for (let i = 1; i < ys.length; i++) expect(byYear.get(ys[i])!).toBeGreaterThan(byYear.get(ys[i - 1])!);
  });

  it("gives sparse years narrow bands", () => {
    const { bands } = yearLayout(wide(), 2);
    const sparse = bands.find((b) => b.year === 1952)!;
    expect(sparse.x1 - sparse.x0).toBeLessThan(90);
  });
});
