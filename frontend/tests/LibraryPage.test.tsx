import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import LibraryPage from "@/app/library/page";
import { api } from "@/lib/api";
import { paper } from "./fixtures";

describe("Library view toggle", () => {
  it("switches between list and a table with the compact columns", async () => {
    vi.spyOn(api, "listPapers").mockResolvedValue({ items: [paper({ updated_at: "2026-05-01T10:00:00Z" })], total: 1 });
    vi.spyOn(api, "listCollections").mockResolvedValue([]);
    render(<LibraryPage />);
    expect(await screen.findByText("Attention Is All You Need")).toBeInTheDocument();
    expect(screen.queryByRole("table")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "table" }));
    const table = screen.getByRole("table");
    for (const h of ["Title", "Year", "Status", "Cites", "Added"]) expect(table).toHaveTextContent(h);
    expect(table).toHaveTextContent("2026-05-01");
    fireEvent.click(screen.getByRole("button", { name: "list" }));
    expect(screen.queryByRole("table")).toBeNull();
  });
});
