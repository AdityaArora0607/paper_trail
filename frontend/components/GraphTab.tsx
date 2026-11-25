"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { api, type CitationEdge, type GraphDirection, type Paper } from "@/lib/api";
import { authorsShort, arxivUrl } from "@/lib/format";
import { useAsync } from "@/lib/useAsync";
import { Async, Badge } from "./States";
import CitationCard from "./CitationCard";
import CitationGraph, { type GraphLayoutMode } from "./CitationGraph";
import { NO_FILTERS, filterGraph, yearRange, type GraphFilters } from "./graph/layout";

const MAX_NODE_OPTIONS = [50, 100, 200, 500, 1000];

function useDebounced<T>(value: T, ms: number): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

export default function GraphTab({ paperId }: { paperId: number }) {
  const [direction, setDirection] = useState<GraphDirection>("both");
  const [depth, setDepth] = useState(2);
  const [maxNodes, setMaxNodes] = useState(200);
  const [layout, setLayout] = useState<GraphLayoutMode>("year");
  const [filters, setFilters] = useState<GraphFilters>(NO_FILTERS);
  // stack of roots reached through "Expand from here"; the last entry is the current root
  const [trail, setTrail] = useState<{ paperId: number; roots: Paper[] }>({ paperId, roots: [] });
  const [node, setNode] = useState<Paper | null>(null);
  const [edge, setEdge] = useState<CitationEdge | null>(null);

  const roots = trail.paperId === paperId ? trail.roots : [];
  const rootId = roots.length ? roots[roots.length - 1].id : paperId;

  const params = useDebounced({ rootId, direction, depth, maxNodes }, 350);
  const graph = useAsync(
    () => api.getGraph(params.rootId, { direction: params.direction, depth: params.depth, max_nodes: params.maxNodes }),
    [params.rootId, params.direction, params.depth, params.maxNodes],
  );

  const raw = graph.data;
  const filtered = useMemo(() => (raw ? filterGraph(raw, filters) : null), [raw, filters]);
  const range = useMemo(() => (raw ? yearRange(raw.nodes) : null), [raw]);

  const setRoots = (next: Paper[]) => {
    setTrail({ paperId, roots: next });
    setNode(null);
    setEdge(null);
  };
  const setFilter = (patch: Partial<GraphFilters>) => setFilters((f) => ({ ...f, ...patch }));
  const yearInput = (key: "minYear" | "maxYear", label: string) => (
    <label className="flex items-center gap-1">
      {label}
      <input
        type="number"
        aria-label={label}
        className="w-20 rounded border border-line bg-panel px-1"
        value={filters[key] ?? ""}
        placeholder={range ? String(key === "minYear" ? range[0] : range[1]) : ""}
        onChange={(e) => setFilter({ [key]: e.target.value === "" ? null : Number(e.target.value) })}
      />
    </label>
  );

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
        <label>
          Direction{" "}
          <select value={direction} onChange={(e) => setDirection(e.target.value as GraphDirection)}>
            <option value="up">references (up)</option>
            <option value="down">citations (down)</option>
            <option value="both">both</option>
          </select>
        </label>
        <label>
          Depth{" "}
          <select value={depth} onChange={(e) => setDepth(Number(e.target.value))}>
            {[1, 2, 3].map((d) => (
              <option key={d}>{d}</option>
            ))}
          </select>
        </label>
        <label>
          Max nodes{" "}
          <select value={maxNodes} onChange={(e) => setMaxNodes(Number(e.target.value))}>
            {MAX_NODE_OPTIONS.map((d) => (
              <option key={d}>{d}</option>
            ))}
          </select>
        </label>
        <label>
          Layout{" "}
          <select value={layout} onChange={(e) => setLayout(e.target.value as GraphLayoutMode)}>
            <option value="year">by year</option>
            <option value="force">force</option>
            <option value="breadthfirst">breadth-first</option>
          </select>
        </label>
        {graph.loading && <span className="text-xs text-muted animate-pulse">Loading…</span>}
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
        <label className="flex items-center gap-1">
          <input
            type="checkbox"
            checked={filters.onlyContext}
            onChange={(e) => setFilter({ onlyContext: e.target.checked })}
          />
          Only edges with context
        </label>
        <label className="flex items-center gap-1">
          <input
            type="checkbox"
            checked={filters.onlyLibraryNeighbors}
            onChange={(e) => setFilter({ onlyLibraryNeighbors: e.target.checked })}
          />
          Only in-library + neighbors
        </label>
        {yearInput("minYear", "Min year")}
        {yearInput("maxYear", "Max year")}
        {(filters.onlyContext || filters.onlyLibraryNeighbors || filters.minYear !== null || filters.maxYear !== null) && (
          <button type="button" className="text-xs underline text-muted" onClick={() => setFilters(NO_FILTERS)}>
            Clear filters
          </button>
        )}
        {roots.length > 0 && (
          <button type="button" className="text-xs underline text-accent" onClick={() => setRoots(roots.slice(0, -1))}>
            ← Back to {roots.length > 1 ? roots[roots.length - 2].title.slice(0, 30) : "original paper"}
          </button>
        )}
      </div>
      <Async state={graph} isEmpty={(g) => g.nodes.length === 0} empty="No graph data for this paper yet.">
        {() =>
          filtered && (
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-3">
              <CitationGraph
                graph={filtered}
                layout={layout}
                onNodeClick={(p) => {
                  setNode(p);
                  setEdge(null);
                }}
                onEdgeClick={(e) => {
                  setEdge(e);
                  setNode(null);
                }}
              />
              <div className="space-y-2">
                {!node && !edge && (
                  <p className="text-sm text-muted italic">
                    {filtered.nodes.length} of {raw?.nodes.length} nodes, {filtered.edges.length} edges. Click a node or
                    edge for details; hover to highlight neighbors and see context.
                  </p>
                )}
                {node && (
                  <div className="rounded border border-line bg-panel p-3 text-sm" aria-label="Paper details">
                    <button
                      type="button"
                      onClick={() => setNode(null)}
                      aria-label="Close paper details"
                      className="float-right text-muted hover:text-fg"
                    >
                      ✕
                    </button>
                    <div className="font-medium">{node.title}</div>
                    <div className="text-xs text-muted">
                      {node.year ?? "n.d."} · {authorsShort(node.authors)}
                      {node.citation_count !== null && ` · ${node.citation_count} citations`}
                    </div>
                    <div className="mt-1 flex gap-1">
                      {node.in_library && <Badge>In library</Badge>}
                      {node.reading_status && <Badge>{node.reading_status}</Badge>}
                    </div>
                    {node.abstract && <p className="mt-2 text-xs line-clamp-6">{node.abstract}</p>}
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-xs">
                      <Link href={`/papers/${node.id}`} className="text-accent underline">
                        Open paper
                      </Link>
                      {arxivUrl(node) && (
                        <a href={arxivUrl(node)!} target="_blank" rel="noreferrer" className="text-accent underline">
                          arXiv
                        </a>
                      )}
                      {node.id !== rootId && (
                        <button
                          type="button"
                          className="rounded border border-line px-2 py-0.5 hover:bg-black/5 dark:hover:bg-white/10"
                          onClick={() => setRoots([...roots, node])}
                        >
                          Expand from here
                        </button>
                      )}
                    </div>
                  </div>
                )}
                {edge && <CitationCard citingId={edge.citing_id} citedId={edge.cited_id} onClose={() => setEdge(null)} />}
              </div>
            </div>
          )
        }
      </Async>
    </div>
  );
}
