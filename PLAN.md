# Phase 2: AI intake, predictive insights, admin monitor, map, race test, CI, docs

## Context

Phase 1 (already shipped) replaced FCFS claiming with the ranked allocation engine
(`engine/scoring.ts`, `ranking.ts`, `fairness.ts`, `claimWindow.ts`) plus the accept/decline/cascade
API and receiver claims UI. What remains from the assignment brief and the target architecture,
excluding actual deployment (user's own): the AI-forward intake/urgency layer, predictive surplus
insights, an admin view into the live allocation queue, a map visualization, a real concurrency test
for the claim flow, CI, and a rewritten README with an architecture + security write-up. The footer
LinkedIn link is already fixed. This plan covers everything else in one pass.

## AI natural-language intake (`lib/ai.ts`, `/api/ai/parse-listing`, `/api/ai/urgency-score`)

- Add deps: `ai`, `@ai-sdk/google`.
- `lib/ai.ts`: `createGoogleGenerativeAI({ apiKey: process.env.GEMINI_API_KEY })` (the SDK's default
  env var is `GOOGLE_GENERATIVE_AI_API_KEY`, but `.env.example` already documents `GEMINI_API_KEY`,
  so pass it explicitly rather than renaming). Export a `MODEL_ID = "gemini-2.5-flash"` constant and
  the configured model instance.
- **Schema addition**: `listings.urgencyHint: doublePrecision("urgency_hint").notNull().default(0.5)`
  — today `engine/ranking.ts` hardcodes `DEFAULT_URGENCY_HINT = 0.5` for every listing; this makes the
  AI's urgency output actually feed the scoring engine instead of being cosmetic. Add `urgencyHint` to
  `createListingSchema`/`updateListingSchema` (`lib/validations/listing.ts`, optional, 0–1, default
  0.5), thread it through `POST /api/listings`, and change `rankCandidates` to read
  `listing.urgencyHint` instead of the constant.
- **`POST /api/ai/parse-listing`** (donor-only): body `{ text: string }`. Uses `generateObject` with a
  zod schema mirroring `createListingSchema`'s food fields (title, description, foodType, quantity,
  unit, allergens[], safetyNotes, urgencyHint 0–1) plus a `rationale` string. Returns the structured
  draft — the donor still reviews/edits and submits manually (human-in-the-loop, called out in the
  README's security section as a safety mitigation against bad AI output creating unsafe listings).
- **`POST /api/ai/urgency-score`** (donor-only): body `{ text: string, claimExpiresAt?: string }`.
  Smaller `generateObject` call returning just `{ urgency: number, rationale: string }` — used to
  re-score urgency without a full re-parse (e.g. donor tweaked the deadline after already parsing).
- **UI** (`components/donor/listing-form.tsx`): add a free-text textarea + "Parse with AI" button
  above the existing fields that calls `/api/ai/parse-listing` and fills in the form state (title,
  description, etc.); show the returned `rationale` and a "Re-check urgency" button (calls
  `/api/ai/urgency-score`) next to the claim-deadline field.

## Predictive surplus insights (`engine/surplusPredictor.ts`, `app/donor/insights/page.tsx`)

Dashboard-only per your call — no cron, no emails, computed on page load (no new table needed).

- **`engine/surplusPredictor.ts`** (pure): `detectPatterns(createdAtTimestamps: Date[])` — buckets
  each listing's creation time by day-of-week + 3-hour block, returns buckets with `count >= 2`
  sorted by count, e.g. `{ dayOfWeek: 5, hourBlock: "18:00–21:00", count: 4 }`. This is the "simple
  historical pattern model" the sketch describes — frequency counting, not an ML model.
- **`app/donor/insights/page.tsx`**: server component, `requireRole("donor")`, queries this org's own
  `listings.createdAt` history, runs `detectPatterns`, renders detected patterns as a simple list
  ("You tend to post surplus on Fridays, 6–9pm, based on 4 past listings — receivers who match this
  pattern will see it land fast"). Link it from `app/donor/page.tsx`.

## Admin allocation monitor (`app/admin/allocation-monitor/page.tsx`)

- **`GET /api/admin/allocation-monitor`** (admin-only): returns every listing with `status:
  "available"` that has at least one `claims` row, each with its ordered candidate queue (rank, org
  name, status, score, `respondBy`) — a straightforward join, no new tables.
- **`app/admin/allocation-monitor/page.tsx`** + a small client component polling that endpoint every
  5s (no websockets needed for a "live enough" feel) rendering each in-flight listing as a card with
  its ranked queue table, highlighting the currently `"offered"` row and its countdown. Link it from
  `app/admin/page.tsx`.

## Map view (`components/map-view.tsx`)

- Add deps: `leaflet`, `react-leaflet`, `@types/leaflet`. Uses OpenStreetMap tiles (free, no API key).
- Real consumer (avoiding a built-but-unused component): a "Map view" toggle in
  `components/receiver/nearby-listings.tsx` showing the receiver's own location plus pins for each
  listing in the current feed, using the `lat`/`lng` already returned by `findNearbyListings`
  (`lib/geo.ts`). Handle Leaflet's default-marker-icon bundling quirk with an inline `divIcon`.

## Concurrency test (Vitest integration, not Playwright)

Per your call: race conditions are about concurrent requests, not UI clicks, so this is a Vitest
integration test, not a browser e2e spec.

- New `tests/integration/claim-race-condition.test.ts` + separate `vitest.integration.config.ts`
  (include `tests/integration/**`) and an `npm run test:integration` script — kept out of the default
  `npm run test` / CI run since it needs a real `DATABASE_URL`.
- Test seeds a donor org, a receiver org, a listing, and one `claims` row with `status: "offered"`
  directly via `db`; mocks `@/auth`'s `auth()` (`vi.mock`) to return that receiver's session; imports
  the `POST` handler from `app/api/claims/[id]/respond/route.ts` directly (Next route handlers are
  plain async functions, callable with a constructed `Request` — no running server needed); fires two
  concurrent `accept` calls via `Promise.all`; asserts exactly one returns `{status:"accepted"}` and
  the other 409s, and the listing ends at `status: "claimed"` exactly once. Cleans up its inserted rows
  in a `finally` block.

## CI (`.github/workflows/ci.yml`)

Per your call: lint + typecheck + unit tests only, zero secrets required, green on first push.

- Triggers on `push`/`pull_request`. Steps: checkout, `actions/setup-node` (node 22, npm cache),
  `npm ci`, `npm run lint`, `npx tsc --noEmit`, `npm run test` (the existing `tests/unit/**` suite —
  pure functions, no DB). The DB-dependent integration test and `next build` are explicitly left out
  of CI per this scope (documented in the README's testing section as run locally/manually).

## README rewrite

Replace the default `create-next-app` boilerplate with: what RescuePlate is and who it's for; the
allocation engine explained (scoring weights, cascading offer state machine, fairness rotation —
the "let me walk you through the logic" section); setup instructions (env vars, `db:push`, seeding);
a **security** section (Auth.js JWT sessions + role middleware, zod validation at every API boundary,
parameterized queries via Drizzle preventing SQL injection, `SELECT FOR UPDATE` row locking against
claim races, `CRON_SECRET` bearer-auth on cron endpoints, human-in-the-loop review of AI-parsed
listings, secrets kept out of git via `.env.example`); testing instructions (unit vs the manual
integration test); and what's deployed where (left as a placeholder section for you to fill in once
you deploy).

## Verification

1. `npx tsc --noEmit` / `npx eslint .` clean after each area (schema+engine change, AI routes, map,
   admin monitor).
2. `npm run test` — existing unit suite still passes, unaffected.
3. `npm run test:integration` — new concurrency test passes against the real dev DB.
4. `npm run db:push` (or `--force` if prompted, same as Phase 1) to land the `urgencyHint` column.
5. `npm run build` succeeds with all new routes listed.
6. Manual: `npm run dev`, post a listing via the AI textarea and confirm it prefills correctly, check
   `/donor/insights` renders (even with sparse data), check `/admin/allocation-monitor` shows a live
   queue while a listing is mid-allocation, toggle the receiver feed's map view.
