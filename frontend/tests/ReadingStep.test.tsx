import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import ReadingStepCard from "@/components/ReadingStep";
import { api } from "@/lib/api";
import { paper, step } from "./fixtures";

describe("ReadingStepCard", () => {
  it("shows number, reason, concepts", () => {
    render(<ReadingStepCard step={step()} index={0} />);
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText(/Introduces attention/)).toBeInTheDocument();
    expect(screen.getByText("Attention")).toBeInTheDocument();
  });

  it("Mark read PATCHes reading_status=read and reports the update", async () => {
    const updated = paper({ id: 5, reading_status: "read" });
    const spy = vi.spyOn(api, "patchPaper").mockResolvedValue(updated);
    const onChange = vi.fn();
    render(<ReadingStepCard step={step()} index={0} onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: "Mark read" }));
    await waitFor(() => expect(onChange).toHaveBeenCalledWith(updated));
    expect(spy).toHaveBeenCalledWith(5, { reading_status: "read" });
  });

  it("Reading now and Add to library patch correctly", async () => {
    const spy = vi.spyOn(api, "patchPaper").mockResolvedValue(paper({ id: 5 }));
    render(<ReadingStepCard step={step()} index={0} />);
    fireEvent.click(screen.getByRole("button", { name: "Reading now" }));
    await waitFor(() => expect(spy).toHaveBeenCalledWith(5, { reading_status: "reading" }));
    fireEvent.click(screen.getByRole("button", { name: "Add to library" }));
    await waitFor(() => expect(spy).toHaveBeenCalledWith(5, { in_library: true }));
  });

  it("collapses a read step", () => {
    render(<ReadingStepCard step={step()} index={0} paper={paper({ id: 5, reading_status: "read", in_library: true })} />);
    expect(screen.queryByText(/Introduces attention/)).toBeNull();
    expect(screen.queryByRole("button", { name: "Mark read" })).toBeNull();
  });

  it("clamps long reasons behind a toggle", () => {
    const long = "Cited directly by the target paper. ".repeat(6);
    render(<ReadingStepCard step={step({ reason: long })} index={0} />);
    fireEvent.click(screen.getByRole("button", { name: "Show more" }));
    expect(screen.getByRole("button", { name: "Show less" })).toBeInTheDocument();
  });
});
