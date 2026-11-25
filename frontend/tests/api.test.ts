import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api, ApiError } from "@/lib/api";
import { paper } from "./fixtures";

const jsonRes = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

let fetchMock: ReturnType<typeof vi.fn>;
beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

describe("api client", () => {
  it("builds URL with query and sends credentials and CSRF header, no token", async () => {
    fetchMock.mockResolvedValue(jsonRes({ items: [], total: 0 }));
    await api.listPapers({ in_library: true, q: "attention", limit: 50 });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/papers?in_library=true&q=attention&limit=50");
    expect(init.method).toBe("GET");
    expect(init.credentials).toBe("include");
    expect(init.headers["X-Requested-With"]).toBe("papertrail");
    expect(init.headers.Authorization).toBeUndefined();
  });

  it("omits empty query params", async () => {
    fetchMock.mockResolvedValue(jsonRes({ items: [], total: 0 }));
    await api.listPapers({ q: "", in_library: true });
    expect(fetchMock.mock.calls[0][0]).toBe("/api/papers?in_library=true");
  });

  it("POSTs JSON body for import", async () => {
    fetchMock.mockResolvedValue(jsonRes({ paper: paper(), job: { id: 3 } }, 202));
    const r = await api.importPaper("1706.03762");
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/papers/import");
    expect(init.method).toBe("POST");
    expect(init.headers["Content-Type"]).toBe("application/json");
    expect(JSON.parse(init.body)).toEqual({ identifier: "1706.03762" });
    expect(r.paper.id).toBe(1);
  });

  it("uses correct paths for cite card, graph, profile PUT", async () => {
    fetchMock.mockImplementation(async () => jsonRes({}));
    await api.getCite(2, 1);
    await api.getGraph(5, { direction: "up", depth: 2, max_nodes: 200 });
    await api.setConceptState(9, "known");
    expect(fetchMock.mock.calls[0][0]).toBe("/api/papers/2/cites/1");
    expect(fetchMock.mock.calls[1][0]).toBe(
      "/api/papers/5/graph?direction=up&depth=2&max_nodes=200",
    );
    expect(fetchMock.mock.calls[2][0]).toBe("/api/profile/concepts/9");
    expect(fetchMock.mock.calls[2][1].method).toBe("PUT");
    expect(JSON.parse(fetchMock.mock.calls[2][1].body)).toEqual({ state: "known" });
  });

  it("dispatches auth:expired on 401 except for me/login", async () => {
    const fn = vi.fn();
    window.addEventListener("auth:expired", fn);
    fetchMock.mockImplementation(async () => jsonRes({ detail: "Not authenticated" }, 401));
    await api.getPaper(1).catch(() => {});
    expect(fn).toHaveBeenCalledTimes(1);
    await api.me().catch(() => {});
    await api.login("a@b.co", "x").catch(() => {});
    expect(fn).toHaveBeenCalledTimes(1);
    window.removeEventListener("auth:expired", fn);
  });

  it("captures Retry-After on 429", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ detail: "Too many" }), { status: 429, headers: { "Retry-After": "42" } }),
    );
    const err = await api.login("a@b.co", "x").catch((e) => e);
    expect(err.status).toBe(429);
    expect(err.retryAfter).toBe(42);
  });

  it("auth/admin endpoints use the right paths and methods", async () => {
    fetchMock.mockImplementation(async () => jsonRes({}));
    await api.login("a@b.co", "pw");
    await api.signup({ email: "a@b.co", password: "pppppppppp", invite_code: "X" });
    await api.createInvite();
    await api.revokeSessions(4);
    const calls = fetchMock.mock.calls.map((c) => [c[1].method, c[0]]);
    expect(calls).toEqual([
      ["POST", "/api/auth/login"],
      ["POST", "/api/auth/signup"],
      ["POST", "/api/admin/invites"],
      ["DELETE", "/api/admin/users/4/sessions"],
    ]);
  });

  it("throws ApiError with server detail on non-2xx", async () => {
    fetchMock.mockResolvedValue(jsonRes({ detail: "Paper not found" }, 404));
    await expect(api.getPaper(99)).rejects.toMatchObject({ name: "ApiError", status: 404, message: "Paper not found", unreachable: false });
  });

  it("falls back to status text for non-JSON errors", async () => {
    fetchMock.mockResolvedValue(new Response("boom", { status: 500, statusText: "Server Error" }));
    await expect(api.getPaper(1)).rejects.toMatchObject({ status: 500, message: "500 Server Error" });
  });

  it("flags network failures as unreachable", async () => {
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));
    const err = await api.getPaper(1).catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err.unreachable).toBe(true);
    expect(err.message).toMatch(/API unreachable/);
  });

  it("passes reading_status and sort to listPapers", async () => {
    fetchMock.mockResolvedValue(jsonRes({ items: [], total: 0 }));
    await api.listPapers({ in_library: true, reading_status: "reading", sort: "recent", limit: 6 });
    expect(fetchMock.mock.calls[0][0]).toBe(
      "/api/papers?in_library=true&reading_status=reading&sort=recent&limit=6",
    );
  });

  it("getRecommendations builds query", async () => {
    fetchMock.mockResolvedValue(jsonRes({ items: [], mode: "frontier", seed_paper_ids: [] }));
    await api.getRecommendations({ mode: "frontier", limit: 5, seed_paper_id: 7 });
    expect(fetchMock.mock.calls[0][0]).toBe(
      "/api/recommendations?mode=frontier&limit=5&seed_paper_id=7",
    );
  });

  it("sendRecFeedback POSTs body and tolerates 204", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
    await expect(api.sendRecFeedback({ paper_id: 4, action: "dismiss" })).resolves.toBeUndefined();
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/recommendations/feedback");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body)).toEqual({ paper_id: 4, action: "dismiss" });
  });

  it("getSimilar uses the paper path", async () => {
    fetchMock.mockResolvedValue(jsonRes({ items: [] }));
    await api.getSimilar(3, 8);
    expect(fetchMock.mock.calls[0][0]).toBe("/api/papers/3/similar?limit=8");
  });
});
