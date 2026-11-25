import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import Dashboard from "@/components/Dashboard";
import { api } from "@/lib/api";
import { paper, rec } from "./fixtures";

describe("Dashboard", () => {
  it("shows import-first empty state and no-recs explanation for an empty library", async () => {
    vi.spyOn(api, "listPapers").mockResolvedValue({ items: [], total: 0 });
    vi.spyOn(api, "getRecommendations").mockResolvedValue({ items: [], mode: "balanced", seed_paper_ids: [] });
    render(<Dashboard />);
    expect(await screen.findByText("Import your first paper")).toBeInTheDocument();
    expect(screen.getByLabelText("Import identifier")).toBeInTheDocument();
  });

  it("renders continue reading and up next", async () => {
    vi.spyOn(api, "listPapers").mockResolvedValue({ items: [paper({ title: "Reading One", reading_status: "reading" })], total: 1 });
    vi.spyOn(api, "getRecommendations").mockResolvedValue({ items: [rec()], mode: "balanced", seed_paper_ids: [1] });
    vi.spyOn(api, "getPaper").mockResolvedValue(paper());
    render(<Dashboard />);
    expect(await screen.findAllByText("Reading One")).not.toHaveLength(0);
    expect(screen.getByRole("link", { name: "Reading path" })).toHaveAttribute("href", "/path?paper=1");
    expect(await screen.findByText("Deep RL from Human Preferences")).toBeInTheDocument();
  });
});
