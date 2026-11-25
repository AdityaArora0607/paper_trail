# PaperTrail frontend

Next.js 16 (App Router, TypeScript) + Tailwind 4 + Cytoscape.js + react-pdf. Talks to the API described in `../docs/api.md`.

## Run

```bash
npm install
npm run dev          # http://localhost:3000
```

Env (optional): `NEXT_PUBLIC_API_URL` (default `/api`, same-origin).

### Auth

Auth is a session cookie (`pt_session`, httpOnly) set by the API. The client sends `credentials: "include"` and
`X-Requested-With: papertrail` on every request (CSRF check); there is no API token. The API base is the
same-origin `/api`: in dev `next.config.ts` rewrites `/api/*` to `http://localhost:8000/api/*` (so cookies are
first-party and there is no CORS); in production the reverse proxy (Caddy) routes `/api/*` to the API. Any 401
(other than `auth/me` / `auth/login`) fires an `auth:expired` window event; `AuthProvider` (`lib/auth.tsx`) then
sends the user to `/login?next=<path>`. `/login` and `/signup` are public; everything else is guarded.

With the API's `AUTH_DEV_AUTOLOGIN=true` (local dev default) `/auth/me` returns the dev admin user without a
cookie, so no login is needed; the user menu shows a small "dev" badge. Pages: `/login`, `/signup` (invite code,
prefilled from `?invite=`), `/account` (change password), `/admin` (admin only: users, revoke sessions, create
invites; the code is shown once).
If the backend is down, pages show an "API unreachable" banner instead of crashing.

## Scripts

`npm run lint` · `npm run typecheck` · `npm test` (vitest + Testing Library) · `npm run build`

## Routes

- `/` — dashboard: import box, "Up next" recommendations (balanced / foundations / frontier) with compact, linked reasons
- `/library` — your papers: status tabs, search (`/`), sort, collections, list/table density toggle
- `/path?paper=<id>` — reading path to a target paper: summary, progress, per-step actions, completion state, Regenerate
- `/papers/[id]` — paper page: Overview (metadata, abstract, concepts with introduces/uses badges and extraction status), Read (PDF), Graph (Cytoscape citation graph, year axis), Reading path, and a "Read next" sidebar
- `/concepts/[id]` — concept lineage timeline, "I know this" toggle, prerequisites (empty states explain that lineage fills in as more papers are extracted)
- `/profile` — knowledge profile: filterable table of concepts with known / partial / unknown state

## Layout

- `lib/api.ts`, `lib/types.ts` — typed client, types mirrored from the API doc; `lib/reasons.ts` links quoted titles in recommendation reasons to evidence papers
- `app/` — the routes above
- `components/ui/` — design-system primitives (Button, Badge, Card, Tabs, Toast, EmptyState, ...)
- `components/` — `RecommendationCard`/`RecReasons`, `ReadNext`, `ReadingPathView`/`ReadingStep`, `CitationGraph`/`GraphTab`, `PaperTable`, `LineageTimeline`, `KnowledgeToggle`, `PdfViewer`, etc.
- `tests/` — API client and component tests

Notes: graph edges point citing -> cited; the graph always labels the root, in-library papers and the top-degree nodes, others on hover; the PDF viewer loads through the backend PDF endpoint with the session cookie (handles 200, redirects, and 202 "fetching" by polling the job) (otherwise use the "Open PDF" link).
