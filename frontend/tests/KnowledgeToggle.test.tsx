import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import KnowledgeToggle from "@/components/KnowledgeToggle";
import { api } from "@/lib/api";

describe("KnowledgeToggle", () => {
  it("PUTs the new state and marks it pressed", async () => {
    const spy = vi.spyOn(api, "setConceptState").mockResolvedValue({
      concept: { id: 7, name: "x", aliases: [], description: null, kind: "other" },
      state: "known",
    });
    render(<KnowledgeToggle conceptId={7} state="unknown" />);
    fireEvent.click(screen.getByRole("button", { name: "known" }));
    await waitFor(() => expect(spy).toHaveBeenCalledWith(7, "known"));
    expect(screen.getByRole("button", { name: "known" })).toHaveAttribute("aria-pressed", "true");
  });

  it("reverts and shows error on failure", async () => {
    vi.spyOn(api, "setConceptState").mockRejectedValue(new Error("nope"));
    render(<KnowledgeToggle conceptId={7} state="unknown" />);
    fireEvent.click(screen.getByRole("button", { name: "partial" }));
    expect(await screen.findByText("nope")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "unknown" })).toHaveAttribute("aria-pressed", "true");
  });
});
