# RescuePlate

A food-rescue platform that connects donor businesses (restaurants, caterers, grocery stores) with
verified receiver NGOs. The product is **not** "donor posts, receiver claims first-come-first-served."
When a listing goes live, a constrained allocation engine ranks every eligible receiver and offers the
listing to the best match first, on a short response window, cascading down the ranked list if that
receiver declines or times out.

## The allocation engine

This is the core of the project — everything else (auth, CRUD, geolocation) exists to support it.

**Scoring (`engine/scoring.ts`)** — every candidate receiver gets a weighted composite score:

| Factor | Weight | What it captures |
|---|---|---|
| Distance | 0.35 | Closer receivers get food fresher |
| Urgency | 0.30 | Blends a static hint (from AI intake or a manual slider) with time-decay as the claim deadline approaches |
| Fairness | 0.20 | `1 / (1 + recentClaimCount)` — receivers who've claimed a lot this week are down-weighted, so allocation rotates rather than always favoring the same NGO |
| Capacity fit | 0.15 | Receivers without enough storage capacity are hard-excluded (when the unit is kg-denominated); among eligible ones, a right-sized match scores higher than dumping a small listing on a receiver with far more capacity than it needs |

**Ranking (`engine/ranking.ts`)** loads every verified receiver within 50km, scores them, and produces
an ordered candidate list.

**Cascading claim windows (`engine/claimWindow.ts`)** — when a listing is posted
(`POST /api/listings/[id]/allocate`), one `claims` row is inserted per ranked candidate; the top-ranked
one is immediately promoted to `"offered"` with a 15-minute response window
(`POST /api/claims/[id]/respond`). If the receiver declines, the next candidate is offered
immediately in the same transaction. If nobody responds in time, a cron
(`/api/cron/resolve-claim-windows`) marks the offer `"expired"` and cascades to the next candidate —
a real state machine, not a status field flipped by a single actor. In production this cron runs once
daily (`vercel.json`), since Vercel's Hobby plan only allows daily cron execution; on Pro it could run
every few minutes to make the cascade near-instant.

**Explainability** — every offer stores its `scoreBreakdown` (the four factors above), rendered in the
UI (`components/allocation-trace.tsx`) so a receiver or admin can see exactly why a given NGO was
ranked where it was.

**Fairness/rotation is deterministic, not literally random** — the brief describes it as "like a
weighted lottery," but this implementation scores fairness as a real, testable component rather than
adding actual randomness, which would make outcomes non-reproducible and hard to explain to a
receiver who wants to know why they were or weren't offered a listing.

## AI-forward intake

Free-text donor input ("bunch of leftover catering trays, some dairy, need gone tonight") is parsed
by Gemini (via the Vercel AI SDK's `generateObject`, `app/api/ai/parse-listing`) into structured,
safety-flagged fields — allergens, safety notes, and an urgency hint that feeds directly into the
scoring engine above (`listings.urgencyHint`). `app/api/ai/urgency-score` lets a donor re-score
urgency alone (e.g. after changing the pickup deadline) without a full re-parse.

**Human-in-the-loop by design**: the donor always reviews and can edit every AI-parsed field before
submitting — the model never creates a listing directly. This is a deliberate security/safety
mitigation against a bad or hallucinated parse (wrong allergen list, wrong quantity) silently
reaching receivers.

## Predictive surplus insights

`engine/surplusPredictor.ts` buckets a donor's own listing history by day-of-week and 3-hour block and
surfaces recurring patterns ("you tend to post Fridays, 6–9pm") on `/donor/insights`. This is
intentionally simple frequency counting, not a trained model — appropriate for the amount of
historical data a real donor accumulates early on.

## Other features

- **Auth & RBAC**: Auth.js v5, credentials + GitHub OAuth, JWT sessions, role-gated middleware
  (`proxy.ts`) plus `requireRole()` server guards. Roles: donor, receiver, volunteer, admin.
- **Org verification**: admins review and approve/reject donor and receiver orgs before they can post
  or claim; repeat no-shows automatically flag an org for admin attention.
- **Geolocation**: haversine-based nearby search (`lib/geo.ts`), an optional Leaflet/OpenStreetMap map
  view of nearby listings.
- **Admin allocation monitor** (`/admin/allocation-monitor`): a live (polling) view into every
  in-flight ranked queue — who's been offered what, current rank/score, response deadline.
- **Cron jobs** (`vercel.json`): expiring stale listings, cascading timed-out offers.

## Security

- **AuthN/AuthZ**: JWT-based sessions via Auth.js; every server page uses `requireRole()`
  (`lib/auth-helpers.ts`) and every mutating API route re-checks `session.user.role` /
  `session.user.orgId` server-side — the client is never trusted for authorization.
- **Input validation**: every API route validates its body with a `zod` schema
  (`lib/validations/*`) before touching the database; invalid input is rejected with 400, never
  passed through.
- **SQL injection**: all queries go through Drizzle's parameterized query builder; the one raw-SQL
  query (`lib/geo.ts`'s haversine search) uses tagged-template `sql` interpolation, which
  parameterizes values rather than string-concatenating them.
- **Race conditions**: claim acceptance uses `SELECT ... FOR UPDATE` row locking
  (`app/api/claims/[id]/respond/route.ts`) so two concurrent accepts on the same offer can't both
  succeed — verified by a real concurrency test, see Testing below.
- **Cron endpoints**: protected by a `CRON_SECRET` bearer token, not public.
- **AI safety**: AI-parsed listing data is always shown to the donor for review before submission
  (see above) — the model is an assistant, not an autonomous actor with write access.
- **Secrets**: all credentials live in environment variables (`.env.example` documents every key
  needed); nothing is committed to git.
- **Known gaps / future work**: no rate limiting on public endpoints yet (would mitigate brute-force
  login attempts and AI-endpoint cost abuse); flagged organizations aren't yet blocked from claiming
  (visible to admins, not yet enforced); no volunteer pickup-assignment flow yet.

## Setup

```bash
npm install
cp .env.example .env.local   # fill in DATABASE_URL, AUTH_SECRET, AUTH_GITHUB_ID/SECRET,
                              # GEMINI_API_KEY, GMAIL_USER/APP_PASSWORD, CRON_SECRET
npm run db:push               # sync the schema to your Postgres database
npm run db:seed-admin         # create an initial admin user
npm run dev
```

## Testing

```bash
npm run test              # unit tests — pure engine functions (scoring, fairness, claim window)
npm run test:integration  # concurrency test against a real database (needs DATABASE_URL)
```

The integration suite is kept separate from CI (`.github/workflows/ci.yml`) because it needs a real
Postgres connection; CI runs lint, typecheck, and the unit suite on every push, with zero secrets
required.

## Deployment

Deployed on Vercel — _link and any deployment-specific notes go here._
