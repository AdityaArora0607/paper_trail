import type {
  AdminInvite,
  AdminUser,
  AuthConfig,
  User,
  Collection,
  Concept,
  GraphDirection,
  GraphResponse,
  Job,
  KnowledgeState,
  Lineage,
  Paper,
  PaperConceptItem,
  PaperSort,
  PaperEdgeItem,
  PrerequisiteItem,
  ProfileItem,
  ReadingPath,
  ReadingStatus,
  RecAction,
  RecMode,
  Recommendation,
} from "./types";

export * from "./types";

/** Same-origin by default (proxied: Next rewrite in dev, Caddy in prod) so the session cookie is first-party. */
export const API_URL = (process.env.NEXT_PUBLIC_API_URL || "/api").replace(/\/+$/, "");

/** Window event fired when any API call (except auth/me and auth/login) returns 401. */
export const AUTH_EXPIRED_EVENT = "auth:expired";

export class ApiError extends Error {
  status: number;
  /** true when the request never reached the server (offline / CORS / DNS) */
  unreachable: boolean;
  /** seconds from a Retry-After header (429), if present */
  retryAfter: number | null = null;
  constructor(message: string, status: number, unreachable = false) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.unreachable = unreachable;
  }
}

type Query = Record<string, string | number | boolean | undefined | null>;

function qs(params?: Query): string {
  if (!params) return "";
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
}

async function request<T>(
  method: string,
  path: string,
  opts: { query?: Query; body?: unknown } = {},
): Promise<T> {
  const headers: Record<string, string> = { Accept: "application/json", "X-Requested-With": "papertrail" };
  if (opts.body !== undefined) headers["Content-Type"] = "application/json";
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}${qs(opts.query)}`, {
      method,
      headers,
      credentials: "include",
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    });
  } catch (e) {
    throw new ApiError(
      `API unreachable at ${API_URL}${e instanceof Error ? ` (${e.message})` : ""}`,
      0,
      true,
    );
  }
  if (!res.ok) {
    let detail = `${res.status} ${res.statusText}`.trim();
    try {
      const j = await res.json();
      if (j && typeof j.detail === "string") detail = j.detail;
      else if (j && j.detail !== undefined) detail = JSON.stringify(j.detail);
    } catch {
      /* non-JSON error body */
    }
    const err = new ApiError(detail, res.status);
    const ra = Number(res.headers.get("Retry-After"));
    if (Number.isFinite(ra) && ra > 0) err.retryAfter = ra;
    if (res.status === 401 && path !== "/auth/me" && path !== "/auth/login" && typeof window !== "undefined") {
      window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT));
    }
    throw err;
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export const api = {
  health: () => request<{ status?: string }>("GET", "/health"),

  // Auth
  authConfig: () => request<AuthConfig>("GET", "/auth/config"),
  login: (email: string, password: string) => request<User>("POST", "/auth/login", { body: { email, password } }),
  logout: () => request<void>("POST", "/auth/logout"),
  me: () => request<User>("GET", "/auth/me"),
  signup: (body: { email: string; password: string; invite_code?: string }) =>
    request<User>("POST", "/auth/signup", { body }),
  changePassword: (current_password: string, new_password: string) =>
    request<void>("POST", "/auth/password", { body: { current_password, new_password } }),

  // Admin
  adminUsers: () => request<AdminUser[]>("GET", "/admin/users"),
  adminInvites: () => request<AdminInvite[]>("GET", "/admin/invites"),
  createInvite: (expires_in_hours?: number) =>
    request<{ code: string; expires_at: string }>("POST", "/admin/invites", { body: { expires_in_hours } }),
  revokeSessions: (userId: number) =>
    request<{ revoked: number }>("DELETE", `/admin/users/${userId}/sessions`),

  // Library / ingest
  importPaper: (identifier: string) =>
    request<{ paper: Paper; job: Job }>("POST", "/papers/import", { body: { identifier } }),
  listPapers: (
    p: {
      in_library?: boolean;
      q?: string;
      limit?: number;
      offset?: number;
      reading_status?: Exclude<ReadingStatus, null> | string;
      sort?: PaperSort;
    } = {},
  ) => request<{ items: Paper[]; total: number }>("GET", "/papers", { query: p }),
  getPaper: (id: number) => request<Paper>("GET", `/papers/${id}`),
  patchPaper: (id: number, body: { reading_status?: ReadingStatus; in_library?: boolean }) =>
    request<Paper>("PATCH", `/papers/${id}`, { body }),
  getJob: (id: number) => request<Job>("GET", `/jobs/${id}`),

  // Collections
  listCollections: () => request<Collection[]>("GET", "/collections"),
  createCollection: (name: string) => request<Collection>("POST", "/collections", { body: { name } }),
  addToCollection: (collectionId: number, paperId: number) =>
    request<unknown>("POST", `/collections/${collectionId}/papers`, { body: { paper_id: paperId } }),
  removeFromCollection: (collectionId: number, paperId: number) =>
    request<unknown>("DELETE", `/collections/${collectionId}/papers/${paperId}`),

  // Citation graph
  getReferences: (id: number) =>
    request<{ items: PaperEdgeItem[] }>("GET", `/papers/${id}/references`),
  getCitations: (id: number, limit?: number) =>
    request<{ items: PaperEdgeItem[] }>("GET", `/papers/${id}/citations`, { query: { limit } }),
  getGraph: (id: number, p: { direction?: GraphDirection; depth?: number; max_nodes?: number } = {}) =>
    request<GraphResponse>("GET", `/papers/${id}/graph`, { query: p }),
  getCite: (citingId: number, citedId: number) =>
    request<PaperEdgeItem>("GET", `/papers/${citingId}/cites/${citedId}`),

  // Concepts & lineage
  extractConcepts: (id: number) =>
    request<{ job: Job }>("POST", `/papers/${id}/concepts/extract`),
  getPaperConcepts: (id: number) =>
    request<{ items: PaperConceptItem[] }>("GET", `/papers/${id}/concepts`),
  searchConcepts: (q?: string) => request<{ items: Concept[] }>("GET", "/concepts", { query: { q } }),
  getConcept: (id: number) => request<Concept>("GET", `/concepts/${id}`),
  mergeConcepts: (keep_id: number, merge_ids: number[]) =>
    request<Concept>("POST", "/concepts/merge", { body: { keep_id, merge_ids } }),
  getLineage: (id: number) => request<Lineage>("GET", `/concepts/${id}/lineage`),

  // Personal layer
  getProfile: () => request<{ items: ProfileItem[] }>("GET", "/profile/concepts"),
  setConceptState: (conceptId: number, state: KnowledgeState) =>
    request<ProfileItem>("PUT", `/profile/concepts/${conceptId}`, { body: { state } }),
  getPrerequisites: (id: number) =>
    request<{ items: PrerequisiteItem[] }>("GET", `/concepts/${id}/prerequisites`),
  getReadingPath: (id: number, max_papers?: number) =>
    request<ReadingPath>("GET", `/papers/${id}/reading-path`, { query: { max_papers } }),

  // Recommendations
  getRecommendations: (p: { mode?: RecMode; limit?: number; seed_paper_id?: number } = {}) =>
    request<{ items: Recommendation[]; mode: string; seed_paper_ids: number[] }>("GET", "/recommendations", {
      query: p,
    }),
  sendRecFeedback: (body: { paper_id: number; action: RecAction }) =>
    request<void>("POST", "/recommendations/feedback", { body }),
  getSimilar: (id: number, limit?: number) =>
    request<{ items: Recommendation[] }>("GET", `/papers/${id}/similar`, { query: { limit } }),
};
