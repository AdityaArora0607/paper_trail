import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import { StrictMode } from "react";
import { AuthProvider } from "@/lib/auth";
import { api } from "@/lib/api";

const docFiles: string[] = [];
vi.mock("react-pdf", () => ({
  pdfjs: { GlobalWorkerOptions: {} },
  Document: ({ file }: { file: string }) => {
    docFiles.push(file);
    return <div data-testid="doc">{file}</div>;
  },
  Page: () => null,
}));
vi.mock("react-pdf/dist/Page/TextLayer.css", () => ({}));
vi.mock("react-pdf/dist/Page/AnnotationLayer.css", () => ({}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn() }),
  usePathname: () => "/papers/2",
}));

import ReadTab from "@/components/ReadTab";
import { paper } from "./fixtures";

const revoked: string[] = [];
let n = 0;

beforeEach(() => {
  docFiles.length = 0;
  revoked.length = 0;
  n = 0;
  URL.createObjectURL = vi.fn(() => `blob:test/${++n}`);
  URL.revokeObjectURL = vi.fn((u: string) => void revoked.push(u));
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response(new Blob(["%PDF"]), { status: 200 })),
  );
});
afterEach(() => vi.unstubAllGlobals());

describe("PdfViewer via ReadTab", () => {
  it("fetches once under StrictMode, keeps a stable un-revoked file, and does not loop while auth revalidates", async () => {
    vi.spyOn(api, "me").mockResolvedValue({ id: 1, email: "a@b.co", is_admin: false, created_at: "2026-01-01T00:00:00Z" });
    vi.spyOn(api, "authConfig").mockResolvedValue({ allow_signup: false, invite_signup: true, dev_autologin: false });
    const p = paper({ id: 2, pdf_url: "https://example.org/x.pdf" });
    const { unmount } = render(
      <StrictMode>
        <AuthProvider>
          <ReadTab paper={p} />
        </AuthProvider>
      </StrictMode>,
    );
    const doc = await screen.findByTestId("doc");
    await act(async () => {
      await new Promise((r) => setTimeout(r, 400));
    });
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(new Set(docFiles).size).toBe(1);
    expect(revoked).toEqual([]);
    expect(screen.getByTestId("doc")).toBe(doc);
    unmount();
    await waitFor(() => expect(revoked).toEqual([docFiles[0]]));
  });
});

describe("AuthProvider revalidation", () => {
  it("keeps children mounted while refresh() re-validates", async () => {
    const { useAuth } = await import("@/lib/auth");
    let resolveMe!: (u: never) => void;
    vi.spyOn(api, "authConfig").mockResolvedValue({ allow_signup: false, invite_signup: true, dev_autologin: false });
    const me = vi.spyOn(api, "me").mockResolvedValueOnce({ id: 1, email: "a@b.co", is_admin: false, created_at: "x" });
    let refresh!: () => Promise<void>;
    const Probe = () => {
      refresh = useAuth().refresh;
      return <div data-testid="kid" />;
    };
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );
    const kid = await screen.findByTestId("kid");
    me.mockReturnValueOnce(new Promise((r) => (resolveMe = r as typeof resolveMe)));
    let p!: Promise<void>;
    act(() => {
      p = refresh();
    });
    expect(screen.getByTestId("kid")).toBe(kid);
    await act(async () => {
      resolveMe({ id: 1, email: "a@b.co", is_admin: false, created_at: "x" } as never);
      await p;
    });
    expect(screen.getByTestId("kid")).toBe(kid);
  });
});
