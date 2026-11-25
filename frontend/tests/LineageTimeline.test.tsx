import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import LineageTimeline from "@/components/LineageTimeline";
import type { Lineage } from "@/lib/api";
import { paper } from "./fixtures";

const lineage: Lineage = {
  concept: { id: 1, name: "Attention", aliases: [], description: null, kind: "technique" },
  papers: [
    paper({ id: 3, title: "Later Paper", year: 2020 }),
    paper({ id: 1, title: "Original Paper", year: 2014 }),
    paper({ id: 2, title: "Middle Paper", year: 2017 }),
  ],
  relations: [
    { from_paper_id: 1, to_paper_id: 1, concept_id: 1, relation: "introduces", basis: "citation", confidence: 1, evidence: [] },
    {
      from_paper_id: 1, to_paper_id: 2, concept_id: 1, relation: "extends", basis: "citation", confidence: 0.9,
      evidence: [{ paper_id: 2, quote: "We extend additive attention.", section: "3.1" }],
    },
    { from_paper_id: 2, to_paper_id: 3, concept_id: 1, relation: "improves", basis: "inferred", confidence: 0.6, evidence: [] },
  ],
};

describe("LineageTimeline", () => {
  it("orders papers chronologically", () => {
    render(<LineageTimeline lineage={lineage} />);
    const titles = screen.getAllByTestId(/timeline-paper-/).map((li) => li.querySelector("a")!.textContent);
    expect(titles).toEqual(["Original Paper", "Middle Paper", "Later Paper"]);
  });

  it("distinguishes inferred (dashed) from citation (solid) relations", () => {
    render(<LineageTimeline lineage={lineage} />);
    const rels = screen.getAllByTestId("relation");
    const inferred = rels.filter((r) => r.getAttribute("data-basis") === "inferred");
    const cited = rels.filter((r) => r.getAttribute("data-basis") === "citation");
    expect(inferred).toHaveLength(1);
    expect(cited).toHaveLength(2);
    expect(inferred[0].style.borderLeft).toContain("dashed");
    expect(cited[0].style.borderLeft).toContain("solid");
    expect(within(inferred[0]).getByText(/inferred/)).toBeInTheDocument();
  });

  it("includes evidence quotes in expandable details", () => {
    render(<LineageTimeline lineage={lineage} />);
    expect(screen.getByText("Evidence (1)").closest("details")).toBeInTheDocument();
    expect(screen.getByText(/We extend additive attention/)).toBeInTheDocument();
  });

  it("shows empty state", () => {
    render(<LineageTimeline lineage={{ ...lineage, papers: [], relations: [] }} />);
    expect(screen.getByText(/No papers in this concept/)).toBeInTheDocument();
  });
});
