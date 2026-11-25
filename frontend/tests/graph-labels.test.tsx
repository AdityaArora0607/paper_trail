import { describe, expect, it } from "vitest";
import { boxesOverlap, labelPriority, placeLabels, wrapLabel } from "@/components/graph/labels";
import type { LabelCandidate } from "@/components/graph/labels";

function rng(seed: number) {
  let s = seed;
  return () => (s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296;
}

describe("placeLabels", () => {
  const make = (n: number): LabelCandidate[] => {
    const r = rng(7);
    return Array.from({ length: n }, (_, i) => ({
      id: `n${i}`,
      box: { x: r() * 300, y: r() * 200, w: 60 + r() * 60, h: 16 + r() * 16 },
      priority: labelPriority(i === 5, r() < 0.2, Math.floor(r() * 20)),
    }));
  };

  it("never returns overlapping boxes and always includes root", () => {
    const cands = make(120);
    const kept = placeLabels(cands, "n5");
    const boxes = cands.filter((c) => kept.includes(c.id));
    expect(kept).toContain("n5");
    expect(kept.length).toBeGreaterThan(1);
    expect(kept.length).toBeLessThan(120);
    for (let i = 0; i < boxes.length; i++)
      for (let j = i + 1; j < boxes.length; j++) expect(boxesOverlap(boxes[i].box, boxes[j].box)).toBe(false);
  });

  it("prefers higher priority when two collide", () => {
    const box = { x: 0, y: 0, w: 50, h: 20 };
    const kept = placeLabels(
      [
        { id: "lo", box, priority: 1 },
        { id: "hi", box: { ...box, x: 10 }, priority: 5 },
      ],
      "none",
    );
    expect(kept).toEqual(["hi"]);
  });

  it("keeps the root even when lower-priority labels sit on top of it", () => {
    const box = { x: 0, y: 0, w: 50, h: 20 };
    const kept = placeLabels([{ id: "a", box, priority: 999 }, { id: "root", box, priority: 0 }], "root");
    expect(kept).toEqual(["root"]);
  });
});

describe("wrapLabel", () => {
  it("wraps to at most 2 lines of 28 chars", () => {
    const out = wrapLabel("Attention is all you need for very long sequence modelling tasks in practice today");
    const lines = out.split("\n");
    expect(lines.length).toBeLessThanOrEqual(2);
    for (const l of lines) expect(l.length).toBeLessThanOrEqual(28);
    expect(out.endsWith("…")).toBe(true);
  });
  it("leaves short titles alone", () => {
    expect(wrapLabel("Short title")).toBe("Short title");
  });
});
