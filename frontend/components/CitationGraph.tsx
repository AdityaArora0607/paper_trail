"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Core, ElementDefinition, LayoutOptions, StylesheetJson } from "cytoscape";
import type { CitationEdge, GraphResponse, Paper } from "@/lib/types";
import Legend from "./graph/Legend";
import { degrees, hasContext, nodeSize, tickBands, topByDegree, yearLayout } from "./graph/layout";
import { LABEL_FONT_PX, labelPriority, labelSize, placeLabels, wrapLabel } from "./graph/labels";
import type { LabelCandidate } from "./graph/labels";

export type GraphLayoutMode = "year" | "force" | "breadthfirst";

const LABEL_TOP_N = 12;
const FIT_PADDING = 48;
const ZOOM_LABEL_THRESHOLD = 0.9;
const MIN_NODE_SCREEN_PX = 8;
const LABEL_PAD = 3;
const COLORS = {
  root: "#f59e0b",
  rootBorder: "#b45309",
  lib: "#2563eb",
  libBorder: "#1e40af",
  other: "#94a3b8",
  otherBorder: "#64748b",
  read: "#16a34a",
  accent: "#2563eb",
  method: "#7c3aed",
  edgeCtx: "#475569",
  edgeNone: "#94a3b8",
};

interface Tip {
  x: number;
  y: number;
  text: string;
  sub?: string;
}

function buildStyle(fg: string, bg: string): StylesheetJson {
  return [
    {
      selector: "node",
      style: {
        width: "data(size)",
        height: "data(size)",
        "background-color": COLORS.other,
        "border-width": 1,
        "border-color": COLORS.otherBorder,
        color: fg,
        // font size / margins are rescaled by 1/zoom on every zoom so labels stay a constant size on screen
        "font-size": LABEL_FONT_PX,
        "text-valign": "bottom",
        "text-margin-y": LABEL_PAD,
        "text-wrap": "wrap",
        "text-max-width": "200px",
        "text-background-color": bg,
        "text-background-opacity": 0.9,
        "text-background-padding": `${LABEL_PAD}px`,
        "text-background-shape": "roundrectangle",
        "min-zoomed-font-size": 0,
        "font-weight": 500,
      },
    },
    { selector: "node[lib = 1]", style: { "background-color": COLORS.lib, "border-color": COLORS.libBorder } },
    {
      selector: "node[root = 1]",
      style: { "background-color": COLORS.root, "border-color": COLORS.rootBorder, "border-width": 3, "z-index": 10 },
    },
    { selector: "node[read = 1]", style: { "border-width": 4, "border-color": COLORS.read } },
    { selector: "node.lbl, node.hover, node.nbr", style: { label: "data(label)" } },
    { selector: "node.hover", style: { "z-index": 20 } },
    {
      selector: "edge",
      style: {
        width: 0.8,
        "line-color": COLORS.edgeNone,
        "target-arrow-color": COLORS.edgeNone,
        "target-arrow-shape": "triangle",
        "curve-style": "bezier",
        "arrow-scale": 0.7,
        opacity: 0.35,
      },
    },
    {
      selector: "edge[ctx = 1]",
      style: {
        width: 1.8,
        "line-color": COLORS.edgeCtx,
        "target-arrow-color": COLORS.edgeCtx,
        opacity: 0.85,
      },
    },
    {
      selector: "edge[method = 1]",
      style: { "line-color": COLORS.method, "target-arrow-color": COLORS.method, opacity: 0.9, width: 2 },
    },
    {
      selector: "edge.hl, edge:selected",
      style: {
        opacity: 1,
        width: 3,
        "line-color": COLORS.accent,
        "target-arrow-color": COLORS.accent,
        "z-index": 20,
      },
    },
    { selector: ".faded", style: { opacity: 0.08, "text-opacity": 0.1 } },
    { selector: "node:selected", style: { "border-width": 4, "border-color": COLORS.accent } },
  ] as StylesheetJson;
}

function layoutOptions(mode: GraphLayoutMode, rootId: number): LayoutOptions {
  if (mode === "force") {
    return {
      name: "cose",
      animate: false,
      fit: true,
      padding: 30,
      randomize: true,
      nodeRepulsion: () => 12000,
      idealEdgeLength: () => 70,
      numIter: 800,
    } as LayoutOptions;
  }
  if (mode === "breadthfirst") {
    return {
      name: "breadthfirst",
      directed: true,
      fit: true,
      padding: 30,
      spacingFactor: 1.0,
      roots: [`#n${rootId}`],
    } as LayoutOptions;
  }
  return { name: "preset", fit: true, padding: FIT_PADDING };
}

/**
 * Fit the whole graph; if that leaves nodes smaller than MIN_NODE_SCREEN_PX on average, zoom in
 * toward the root (kept centered). The Fit button does a plain full fit instead.
 */
function defaultView(cy: Core) {
  cy.fit(undefined, FIT_PADDING);
  const nodes = cy.nodes();
  if (nodes.empty()) return;
  let sum = 0;
  nodes.forEach((n) => {
    sum += n.renderedWidth();
  });
  const avg = sum / nodes.length;
  if (avg >= MIN_NODE_SCREEN_PX) return;
  const level = Math.min(cy.maxZoom(), (cy.zoom() * MIN_NODE_SCREEN_PX) / avg);
  const root = cy.nodes("[root = 1]");
  cy.zoom(level);
  cy.center(root.nonempty() ? root : undefined);
}

export default function CitationGraph({
  graph,
  layout,
  onNodeClick,
  onEdgeClick,
}: {
  graph: GraphResponse;
  layout: GraphLayoutMode;
  onNodeClick?: (p: Paper) => void;
  onEdgeClick?: (e: CitationEdge) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const axisRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<Core | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);
  const cbs = useRef({ onNodeClick, onEdgeClick });
  const [tip, setTip] = useState<Tip | null>(null);
  const [aspect, setAspect] = useState<number | null>(null);

  useEffect(() => {
    cbs.current = { onNodeClick, onEdgeClick };
  });

  // measure the canvas once so the year layout can match its aspect ratio
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const w = el.clientWidth;
    const h = el.clientHeight;
    const a = w > 0 && h > 0 ? Math.round((w / h) * 4) / 4 : 2;
    setAspect(Math.max(0.5, Math.min(5, a)));
  }, []);

  const yl = useMemo(
    () => (layout === "year" && aspect !== null ? yearLayout(graph, aspect) : null),
    [graph, layout, aspect],
  );
  const ticks = useMemo(() => (yl ? tickBands(yl.bands) : []), [yl]);

  useEffect(() => {
    if (aspect === null) return;
    let destroyed = false;
    let labelTimer: ReturnType<typeof setTimeout> | undefined;
    (async () => {
      const cytoscape = (await import("cytoscape")).default;
      if (destroyed || !ref.current) return;
      const fg = getComputedStyle(document.body).color || "#222";
      const cssBg = getComputedStyle(document.documentElement).getPropertyValue("--panel").trim();
      const bg = cssBg || "#ffffff";
      const paperById = new Map(graph.nodes.map((n) => [n.id, n]));
      const nodeIds = new Set(paperById.keys());
      const labeled = topByDegree(graph.nodes, graph.edges, LABEL_TOP_N);
      const deg = degrees(graph.nodes, graph.edges);
      const edges = graph.edges.filter((e) => nodeIds.has(e.citing_id) && nodeIds.has(e.cited_id));

      const nodeEls: ElementDefinition[] = graph.nodes.map((n) => {
        const read = n.reading_status === "read";
        const base = wrapLabel(n.title);
        return {
          data: {
            id: `n${n.id}`,
            pid: n.id,
            label: read ? `✓ ${base}` : base,
            deg: deg.get(n.id) ?? 0,
            size: nodeSize(n.citation_count),
            root: n.id === graph.root_id ? 1 : 0,
            lib: n.in_library ? 1 : 0,
            read: read ? 1 : 0,
          },
          position: yl?.positions[n.id],
          classes: n.id === graph.root_id || n.in_library || labeled.has(n.id) ? "labeled" : "",
        };
      });
      const edgeEls: ElementDefinition[] = edges.map((e, i) => ({
        data: {
          id: `e${i}`,
          source: `n${e.citing_id}`,
          target: `n${e.cited_id}`,
          ctx: hasContext(e) ? 1 : 0,
          method: e.intents.includes("methodology") ? 1 : 0,
          idx: i,
        },
      }));

      const cy = cytoscape({
        container: ref.current,
        elements: [...nodeEls, ...edgeEls],
        style: buildStyle(fg, bg),
        layout: layoutOptions(layout, graph.root_id),
        wheelSensitivity: 0.3,
        minZoom: 0.05,
        maxZoom: 4,
        hideEdgesOnViewport: graph.nodes.length > 300,
      });
      cyRef.current = cy;

      // year axis overlay follows the viewport without React re-renders
      const syncAxis = () => {
        const host = axisRef.current;
        if (!host) return;
        const { x: px } = cy.pan();
        const z = cy.zoom();
        host.querySelectorAll<HTMLElement>("[data-x]").forEach((el) => {
          el.style.transform = `translateX(${Number(el.dataset.x) * z + px}px)`;
        });
        host.querySelectorAll<HTMLElement>("[data-w]").forEach((el) => {
          el.style.width = `${Number(el.dataset.w) * z}px`;
        });
      };
      cy.on("viewport", syncAxis);

      // labels: constant on-screen size (rescale by 1/zoom) + greedy collision-free selection
      let showAll = false;
      const rescaleLabels = () => {
        const z = cy.zoom();
        cy.batch(() => {
          cy.nodes().style({
            "font-size": LABEL_FONT_PX / z,
            "text-margin-y": LABEL_PAD / z,
            "text-max-width": `${200 / z}px`,
            "text-background-padding": `${LABEL_PAD / z}px`,
          });
        });
      };
      const placeAll = () => {
        if (destroyed || cy.destroyed()) return;
        const w = cy.width();
        const h = cy.height();
        const cands: LabelCandidate[] = [];
        cy.nodes().forEach((node) => {
          if (!showAll && !node.hasClass("labeled")) return;
          const rp = node.renderedPosition();
          const r = node.renderedWidth() / 2;
          const isRoot = node.data("root") === 1;
          const { w: bw, h: bh } = labelSize(String(node.data("label")));
          const box = { x: rp.x - bw / 2, y: rp.y + r + 2, w: bw, h: bh };
          if (!isRoot && (box.x + bw < 0 || box.x > w || box.y + bh < 0 || box.y > h)) return;
          cands.push({
            id: node.id(),
            box,
            priority: labelPriority(isRoot, node.data("lib") === 1, node.data("deg") ?? 0),
          });
        });
        const keep = new Set(placeLabels(cands, rootNodeId));
        cy.batch(() => {
          cy.nodes().forEach((node) => {
            node.toggleClass("lbl", keep.has(node.id()));
          });
        });
      };
      const rootNodeId = `n${graph.root_id}`;
      const schedulePlace = () => {
        clearTimeout(labelTimer);
        labelTimer = setTimeout(placeAll, 100);
      };
      let rescaleRaf = 0;
      cy.on("zoom", () => {
        const should = cy.zoom() > ZOOM_LABEL_THRESHOLD;
        if (should !== showAll) showAll = should;
        if (!rescaleRaf)
          rescaleRaf = requestAnimationFrame(() => {
            rescaleRaf = 0;
            if (!cy.destroyed()) rescaleLabels();
          });
      });
      cy.on("viewport", schedulePlace);

      // Fit (centered, padded) once the container has its real size, and again if it resizes
      // until the user pans/zooms themselves. Re-sync the year axis after every fit.
      let touched = false;
      const refit = () => {
        if (destroyed || cy.destroyed()) return;
        cy.resize();
        defaultView(cy);
        rescaleLabels();
        syncAxis();
        placeAll();
      };
      const host = ref.current;
      const markTouched = () => {
        touched = true;
      };
      host.addEventListener("wheel", markTouched, { passive: true });
      host.addEventListener("pointerdown", markTouched);
      const ro = new ResizeObserver(() => {
        if (!touched) refit();
        else {
          cy.resize();
          syncAxis();
        }
      });
      ro.observe(host);
      cleanupRef.current = () => {
        ro.disconnect();
        host.removeEventListener("wheel", markTouched);
        host.removeEventListener("pointerdown", markTouched);
      };
      cy.ready(refit);
      requestAnimationFrame(refit);

      cy.on("tap", "node", (ev) => {
        const p = paperById.get(ev.target.data("pid"));
        if (p) cbs.current.onNodeClick?.(p);
      });
      cy.on("tap", "edge", (ev) => {
        const e = edges[ev.target.data("idx")];
        if (e) cbs.current.onEdgeClick?.(e);
      });

      cy.on("mouseover", "node", (ev) => {
        const node = ev.target;
        const hood = node.closedNeighborhood();
        cy.batch(() => {
          cy.elements().addClass("faded");
          hood.removeClass("faded");
          node.addClass("hover");
          node.neighborhood("node").addClass("nbr");
          node.connectedEdges().addClass("hl");
        });
        const p = paperById.get(node.data("pid"));
        const pos = ev.renderedPosition ?? { x: 0, y: 0 };
        if (p) setTip({ x: pos.x, y: pos.y, text: p.title, sub: `${p.year ?? "n.d."}` });
      });
      cy.on("mouseout", "node", () => {
        cy.batch(() => {
          cy.elements().removeClass("faded hover nbr hl");
        });
        setTip(null);
      });
      cy.on("mouseover", "edge", (ev) => {
        ev.target.addClass("hl");
        const e = edges[ev.target.data("idx")];
        const pos = ev.renderedPosition ?? { x: 0, y: 0 };
        if (!e) return;
        const ctx = e.contexts[0];
        setTip({
          x: pos.x,
          y: pos.y,
          text: ctx ? `“${ctx.length > 220 ? ctx.slice(0, 220) + "…" : ctx}”` : "No context available",
          sub: e.intents.join(", ") || undefined,
        });
      });
      cy.on("mouseout", "edge", (ev) => {
        ev.target.removeClass("hl");
        setTip(null);
      });
    })();
    return () => {
      destroyed = true;
      clearTimeout(labelTimer);
      cleanupRef.current?.();
      cleanupRef.current = null;
      cyRef.current?.destroy();
      cyRef.current = null;
    };
  }, [graph, layout, yl, aspect]);

  const zoomBy = (f: number) => {
    const cy = cyRef.current;
    if (!cy) return;
    cy.zoom({ level: cy.zoom() * f, renderedPosition: { x: cy.width() / 2, y: cy.height() / 2 } });
  };
  const fit = () => {
    cyRef.current?.resize();
    cyRef.current?.fit(undefined, FIT_PADDING);
  };
  const reset = () => {
    const cy = cyRef.current;
    if (!cy) return;
    cy.elements().unselect();
    cy.layout(layoutOptions(layout, graph.root_id)).run();
    cy.resize();
    defaultView(cy);
  };

  const btn =
    "h-7 min-w-7 rounded border border-line bg-panel px-2 text-xs hover:bg-black/5 dark:hover:bg-white/10";

  return (
    <div className="relative overflow-hidden rounded border border-line bg-panel">
      <div ref={ref} role="img" aria-label="Citation graph" className="h-[70vh] min-h-[560px] w-full" />
      {yl && (
        <div ref={axisRef} aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
          {yl.bands
            .filter((b) => b.count > 0)
            .map((b, i) => (
              <div
                key={`s${i}`}
                data-x={b.x0}
                data-w={b.x1 - b.x0}
                className={`absolute top-0 bottom-0 left-0 ${i % 2 ? "bg-black/[0.03] dark:bg-white/[0.04]" : ""}`}
                style={{ willChange: "transform" }}
              />
            ))}
          {ticks.map((b, i) => (
            <div
              key={`t${i}`}
              data-x={b.cx}
              className="absolute top-0 left-0 w-0"
              style={{ willChange: "transform" }}
            >
              <span className="absolute top-1 -translate-x-1/2 rounded bg-panel/80 px-1 text-[11px] font-medium text-muted">
                {b.gap ? "⋯" : (b.year ?? "n.d.")}
              </span>
            </div>
          ))}
        </div>
      )}
      <div className="absolute right-2 top-2 flex flex-col gap-1" role="toolbar" aria-label="Graph view controls">
        <button type="button" className={btn} onClick={fit} aria-label="Fit to view" title="Fit to view">
          Fit
        </button>
        <button type="button" className={btn} onClick={() => zoomBy(1.4)} aria-label="Zoom in" title="Zoom in">
          +
        </button>
        <button type="button" className={btn} onClick={() => zoomBy(1 / 1.4)} aria-label="Zoom out" title="Zoom out">
          −
        </button>
        <button type="button" className={btn} onClick={reset} aria-label="Reset layout" title="Reset layout">
          Reset
        </button>
      </div>
      <div className="absolute bottom-2 left-2">
        <Legend />
      </div>
      <div className="pointer-events-none absolute bottom-2 right-2 rounded bg-panel/80 px-2 py-0.5 text-xs text-muted">
        {graph.nodes.length} nodes · {graph.edges.length} edges
      </div>
      {tip && (
        <div
          className="pointer-events-none absolute z-10 max-w-xs rounded border border-line bg-panel p-2 text-xs shadow"
          style={{ left: Math.max(4, Math.min(tip.x + 12, 520)), top: tip.y + 12 }}
        >
          <div className={tip.text.startsWith("“") ? "italic" : "font-medium"}>{tip.text}</div>
          {tip.sub && <div className="text-muted">{tip.sub}</div>}
        </div>
      )}
    </div>
  );
}
