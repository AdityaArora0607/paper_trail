import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import CitationCard from "@/components/CitationCard";
import { api, ApiError } from "@/lib/api";
import { edge, paper } from "./fixtures";

describe("CitationCard", () => {
  it("renders cited paper, intents and context sentences as quotes", async () => {
    const spy = vi.spyOn(api, "getCite").mockResolvedValue({
      paper: paper({ title: "Neural Machine Translation", year: 2015, authors: ["D. Bahdanau"] }),
      edge: edge({
        intents: ["methodology"],
        contexts: ["We follow the attention mechanism of [3].", "Similar to [3], we use soft alignment."],
      }),
    });
    render(<CitationCard citingId={2} citedId={1} />);
    expect(await screen.findByText("Neural Machine Translation")).toBeInTheDocument();
    expect(spy).toHaveBeenCalledWith(2, 1);
    expect(screen.getByText("methodology")).toBeInTheDocument();
    expect(screen.getByText(/We follow the attention mechanism/)).toBeInTheDocument();
    expect(screen.getByText(/soft alignment/)).toBeInTheDocument();
    expect(screen.getAllByText(/“/).length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText(/2015 · D. Bahdanau/)).toBeInTheDocument();
  });

  it("shows empty message when no contexts", async () => {
    vi.spyOn(api, "getCite").mockResolvedValue({ paper: paper(), edge: edge() });
    render(<CitationCard citingId={2} citedId={1} />);
    expect(await screen.findByText(/No citation context/)).toBeInTheDocument();
  });

  it("shows an unreachable banner on failure", async () => {
    vi.spyOn(api, "getCite").mockRejectedValue(new ApiError("API unreachable at x", 0, true));
    render(<CitationCard citingId={2} citedId={1} />);
    expect(await screen.findByRole("alert")).toHaveTextContent("API unreachable");
  });
});
