import { describe, expect, it } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { parseReason } from "@/lib/reasons";
import RecReasons from "@/components/RecReasons";
import type { RecReason } from "@/lib/api";

describe("parseReason", () => {
  it("turns quoted titles into links by matching fetched titles", () => {
    const parts = parseReason('Cited together with “Attention Is All You Need” and "BERT"', [1, 2], {
      1: "Attention Is All You Need",
      2: "BERT: Pre-training of Deep Bidirectional Transformers",
    });
    expect(parts.filter((p) => p.type === "link")).toEqual([
      { type: "link", text: "“Attention Is All You Need”", paperId: 1 },
      { type: "link", text: '"BERT"', paperId: 2 },
    ]);
  });

  it("falls back to position when titles are not loaded and counts agree", () => {
    const parts = parseReason('Cites “Foo”', [7], {});
    expect(parts).toContainEqual({ type: "link", text: "“Foo”", paperId: 7 });
  });

  it("appends one evidence link when the text quotes nothing", () => {
    const parts = parseReason("Cited together with", [1, 2], { 1: "A", 2: "B" });
    expect(parts.filter((p) => p.type === "link")).toHaveLength(1);
  });
});

describe("RecReasons", () => {
  const reasons: RecReason[] = [
    { kind: "cocitation", text: 'Co-cited with “Attention Is All You Need”', evidence_paper_ids: [1] },
    { kind: "similar", text: "Similar topic", evidence_paper_ids: [] },
    { kind: "impact", text: "Highly cited", evidence_paper_ids: [] },
  ];

  it("shows title once as a link, 2 reasons, and a +1 more toggle", () => {
    render(<RecReasons reasons={reasons} titles={{ 1: "Attention Is All You Need" }} />);
    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveAttribute("href", "/papers/1");
    expect(screen.queryByText("Highly cited")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "+1 more" }));
    expect(screen.getByText("Highly cited")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Show less" }));
    expect(screen.queryByText("Highly cited")).toBeNull();
  });
});
