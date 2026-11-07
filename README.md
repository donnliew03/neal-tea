# NEAL TEA

A live, in-classroom web app: students join on their phones, rate a fictional
drink, spin a weighted Lucky Spin wheel, get offered one more spin, and then
the instructor reveals how all three mechanics actually worked under the
hood (real odds, a staged "at scale" comparison, and the takeaway).

Routes: `/` (landing), `/join` (student), `/admin` (instructor, requires
login), `/display` (projector view). There is always at most one *active*
session, so `/join` and `/display` never need a session code in the URL.

## Architecture

- **Frontend**: React 18 + TypeScript + Vite + React Router + Tailwind CSS.
- **Backend**: Netlify Functions (TypeScript). All game logic — prize
  selection, balance changes, admin actions, stage transitions — runs here,
  never in the browser.
- **Database**: Supabase (Postgres) with Row Level Security enabled on every
  table. Only `sessions` has a public read policy (so the UI can react live
  to stage changes); every other table has **no** anon/authenticated
  policies at all. All reads/writes to participants, reviews, spins,
  purchase decisions and config go exclusively through Netlify Functions
  using the Supabase **service role** key, which never reaches the browser.
- **Realtime**: Supabase Realtime (`postgres_changes` on `sessions`), with a
  polling fallback so the app still works if a realtime subscription drops.
- **Identity**: students get an opaque random session token; the server
  only ever stores its SHA-256 hash. The raw token lives in the browser's
  `localStorage` purely so a refresh doesn't log you out — it is never the
  source of truth for balances or decisions.
- **Concurrency/idempotency**: spin consumption and purchase decisions are
  recorded through `SECURITY DEFINER` Postgres functions (`consume_spin`,
  `record_purchase_decision`) using row locks and unique constraints, so a
  double-click or a flaky network retry can't grant extra spins or double-
  count a decision.
- **Randomness**: prize selection uses `crypto.randomBytes` (never
  `Math.random`), and happens server-side before the result is ever written
  to the database.
- **Audio**: fully synthesized in the browser with the Web Audio API — an
  original looping track (bass/chords/melody/light percussion) plus a set
  of sound effects. No external audio files, nothing copyrighted.

## Project layout

```
src/                      Frontend (pages, components, hooks, lib)
netlify/functions/        Backend (one file per API operation)
supabase/migrations/      Database schema + RLS policies + RPC functions
tests/                    Vitest unit tests for the pure game-logic functions
```

## Local development

```bash
npm install
cp .env.example .env     # fill in your own Supabase values (see below)
npm run dev               # frontend only, http://localhost:5173
```

To run the Netlify Functions locally too (so `/join`, `/admin`, `/display`
actually work end-to-end, not just render), install the Netlify CLI once
and use it instead of `vite dev`:

```bash
npm install -g netlify-cli
netlify dev
```

## Setting up your own Supabase project

This app needs a Supabase project that **you** create and own — nothing
here was generated with access to your account, and nothing in this
codebase holds a real key.

1. Create a project at [supabase.com](https://supabase.com).
2. In the SQL editor, run `supabase/migrations/0001_init.sql`, then
   `supabase/migrations/0002_functions.sql`, in that order.
3. Under **Authentication → Users**, add yourself (and any co-instructors)
   as a user with a password you choose. This is the login for `/admin` —
   Claude never had and never generated this password.
4. Under **Project Settings → API**, copy:
   - `Project URL` and the `anon` `public` key → these go in `.env` as
     `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` (safe to expose in the
     browser bundle).
   - The `service_role` `secret` key → this goes in Netlify's environment
     variables (never in `.env`, never committed) as
     `SUPABASE_SERVICE_ROLE_KEY`. It bypasses Row Level Security, so it must
     only ever live server-side.
5. Set `ADMIN_EMAILS` (also a Netlify environment variable, server-side
   only) to a comma-separated list of the email(s) from step 3.

## Deploying to Netlify

1. Push this repository to GitHub/GitLab/Bitbucket (or use `netlify deploy`
   directly from this folder).
2. In Netlify, "Add a new site" → connect the repo. Build command and
   publish directory are already set in `netlify.toml`
   (`npm run build` / `dist`); functions are picked up automatically from
   `netlify/functions`.
3. Under **Site configuration → Environment variables**, set:
   - `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (same values as `.env`)
   - `SUPABASE_URL` (same project URL), `SUPABASE_SERVICE_ROLE_KEY`,
     `ADMIN_EMAILS`
4. Deploy. Once it's live, open `/admin`, sign in, and click **Start New
   Session** — that creates the one active session everyone else joins.

**I did not perform this deployment myself and have no deployed URL to give
you.** Doing so would require your real Supabase and Netlify account
credentials, which I'm not able to handle — you'll need to run the steps
above yourself. Everything below this point is what I *could* verify
without those credentials.

## What's actually been verified, and how

I don't have a Supabase or Netlify account to deploy against, so "it builds"
and "it works end-to-end against live infra" are different claims. Here's
exactly what was checked, in this environment, today:

| Check | Status | How |
|---|---|---|
| Frontend type-checks (`tsc -b`) | ✅ Verified | Ran directly, zero errors |
| Frontend production build (`vite build`) | ✅ Verified | Ran directly, produces `dist/` with hashed assets, favicon, manifest |
| Full `npm run build` (what Netlify actually runs) | ✅ Verified | Ran directly, succeeds |
| Netlify Functions type-check | ✅ Verified | `tsc -p netlify/functions/tsconfig.json`, zero errors |
| Every function bundles with esbuild the way Netlify bundles it | ✅ Verified | Bundled all 14 functions individually with esbuild (bundling in `@supabase/supabase-js`, matching Netlify's default), confirmed each produced a loadable CommonJS module exporting a `handler` function |
| Prize-selection math, percentage math, weight validation | ✅ Verified | 15 Vitest unit tests, including a 200,000-draw statistical convergence check against the configured odds |
| Row Level Security policies actually block unauthorized reads/writes | ⬜ Not verified | Requires a live Supabase project to test against — I did not create one |
| `consume_spin` / `record_purchase_decision` are genuinely race-safe under concurrent requests | ⬜ Not verified | Logic reviewed (row locks + unique constraints) but not load-tested against a live Postgres instance |
| Realtime subscriptions actually sync `/join` ↔ `/admin` ↔ `/display` live | ⬜ Not verified | Requires a live Supabase project with Realtime enabled |
| Full student flow in a real browser (join → review → spin → reveal) | ⬜ Not verified | Requires the above plus a deployed or `netlify dev` environment |
| Netlify deployment itself | ⬜ Not done | Requires your Netlify account |

In short: **the code compiles, builds, bundles, and its pure logic is unit
tested — but I have not run it against a live database or watched it work
in a browser**, because that needs your Supabase/Netlify accounts. The
manual QA checklist below is what I'd run through myself if I had test
credentials, and what I'd suggest you (or a teammate) do once you deploy.

## Manual QA checklist (do this once deployed)

- [ ] `/admin` login rejects an email not in `ADMIN_EMAILS`
- [ ] Starting a session, then opening `/join` on a second device, joining
      with a nickname, and seeing it show up on `/display`
- [ ] Submitting a review twice from the same device is rejected the second
      time with a friendly message, not a crash
- [ ] Rapidly double-clicking "Spin" doesn't grant two spins for one click
      (open the Network tab — you should see the retry/duplicate return the
      same result rather than consuming a second spin)
- [ ] Running out of free spins triggers the "one more spin?" prompt exactly
      once per participant, even after further spins
- [ ] Editing Lucky Spin weights that don't sum to 100% is rejected in the
      admin UI
- [ ] After the first real spin of a session, Lucky Spin Settings become
      locked until "Reset Session" is used
- [ ] `/display` shows nothing from `reviews_reveal`/`spin_reveal`/odds
      until the admin actually advances the stage — try calling
      `get-public-results` directly (e.g. with `curl`) before advancing the
      stage and confirm it returns `null` fields
- [ ] Resetting a session lets everyone rejoin cleanly without old spin/
      review data leaking into the new one

## Testing

```bash
npm run test        # vitest — prize math, percentages, weight validation
npm run typecheck   # tsc -b
npm run build       # full production build
npm run functions:build   # type-check the Netlify Functions
```
