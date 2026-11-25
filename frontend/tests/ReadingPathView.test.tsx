import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import ReadingPathView from "@/components/ReadingPathView";
import { api } from "@/lib/api";
import { paper, step } from "./fixtures";

const target = paper({ id: 99, title: "Target Paper" });
const read = (id: number) => step({ paper: paper({ id, title: `P${id}`, reading_status: "read", in_library: true }) });

describe("ReadingPathView", () => {
  it("shows summary header and Regenerate", async () => {
    const spy = vi.spyOn(api, "getReadingPath").mockResolvedValue({ target, steps: [step(), read(6)] });
    render(<ReadingPathView paperId={99} />);
    expect(await screen.findByTestId("path-summary")).toHaveTextContent("2 papers · ~1 already read");
    expect(screen.queryByText("Path complete")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Regenerate" }));
    await waitFor(() => expect(spy).toHaveBeenCalledTimes(2));
  });

  it("shows a completion state when every step is read", async () => {
    vi.spyOn(api, "getReadingPath").mockResolvedValue({ target, steps: [read(5), read(6)] });
    render(<ReadingPathView paperId={99} />);
    expect(await screen.findByText("Path complete")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Target Paper" })).toHaveAttribute("href", "/papers/99");
  });
});
