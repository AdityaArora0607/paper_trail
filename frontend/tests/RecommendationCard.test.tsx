import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import RecommendationCard from "@/components/RecommendationCard";
import { api } from "@/lib/api";
import { rec } from "./fixtures";

describe("RecommendationCard", () => {
  it("renders paper, reasons and evidence links", () => {
    render(<RecommendationCard rec={rec()} evidenceTitles={{ 1: "Attention Is All You Need" }} />);
    expect(screen.getByText("Deep RL from Human Preferences")).toBeInTheDocument();
    expect(screen.getByText(/Similar in topic/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Attention Is All You Need" })).toHaveAttribute("href", "/papers/1");
  });

  it("makes quoted titles in reasons the links (title appears once)", () => {
    const r = rec({
      reasons: [{ kind: "graph", text: 'Cited directly by “Attention Is All You Need”', evidence_paper_ids: [1] }],
    });
    render(<RecommendationCard rec={r} evidenceTitles={{ 1: "Attention Is All You Need" }} />);
    expect(screen.getAllByText(/Attention Is All You Need/)).toHaveLength(1);
    expect(screen.getByRole("link", { name: /Attention Is All You Need/ })).toHaveAttribute("href", "/papers/1");
  });

  it.each([
    ["Save to library", "save"],
    ["Dismiss", "dismiss"],
    ["Not relevant", "not_relevant"],
  ])("%s calls feedback API optimistically", async (label, action) => {
    const spy = vi.spyOn(api, "sendRecFeedback").mockResolvedValue(undefined);
    const onOptimistic = vi.fn();
    const onDone = vi.fn();
    render(<RecommendationCard rec={rec()} onOptimistic={onOptimistic} onDone={onDone} />);
    fireEvent.click(screen.getByRole("button", { name: label }));
    expect(onOptimistic).toHaveBeenCalled();
    await waitFor(() => expect(onDone).toHaveBeenCalled());
    expect(spy).toHaveBeenCalledWith({ paper_id: 10, action });
  });

  it("rolls back on failure", async () => {
    vi.spyOn(api, "sendRecFeedback").mockRejectedValue(new Error("boom"));
    const onRollback = vi.fn();
    render(<RecommendationCard rec={rec()} onRollback={onRollback} />);
    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));
    await waitFor(() => expect(onRollback).toHaveBeenCalled());
  });
});
