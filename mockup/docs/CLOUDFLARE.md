# Cloudflare Workers + D1: compatibility notes (prep only)

**Status: investigation and prep. Nothing is provisioned, nothing deploys.**
No Cloudflare account setup, DNS, payment or production deploy is part of this
work, and the iMac tunnel stays the way invitees reach the demo until a cutover
is explicitly approved. Everything below is either already in the repo (and
tested) or a plan to verify at cutover time.

## What already ports (in the repo, tested)

| Piece | File | Why it ports | Proof |
|---|---|---|---|
| Database seam | `server/db/sql.ts` | Async `run/get/all`, one statement per call, `?` params, no interactive transactions | `test/workers-compat.test.ts` |
| D1 adapter | `server/db/d1.ts` | Maps the seam onto `prepare().bind().run()/first()/all()` | Runs the full invite → profile → state → ledger flow against a D1-shaped shim |
| Schema | `server/db/schema.sql` = `cloudflare/migrations/0001_init.sql` | Plain SQLite, idempotent | A test pins the two files identical |
| Invites, sessions | `server/auth.ts` | Web Crypto (`crypto.subtle`, `getRandomValues`), no `node:` imports | Import scan test |
| Budgets | `server/usage.ts` | The hold is one conditional `INSERT … SELECT … WHERE` (atomic per statement in SQLite and D1) | Concurrency tests in `test/invites.test.ts` |
| Profile state | `server/state.ts` | Plain SQL upsert | Import scan + D1 shim test |
| Invite page | `server/pages.ts` | String templates | Import scan test |

## What is Node-only today, and the Workers replacement

| Today (Node) | Where | On Workers |
|---|---|---|
| `@hono/node-server` `serve` + `serveStatic` | `server/index.ts`, `server/app.ts` | Hono runs natively on Workers (`export default app`). Static files come from Workers static assets (`[assets]` in `wrangler.toml`), with the Worker running first for `/api/*` and `/invite/*`. `createApp` needs its static block moved out (inject it, or leave it to the assets binding). |
| `node:sqlite` file under `data/` | `server/db/sqlite.ts` | D1 binding → `new D1Sql(env.DB)`. Schema via `wrangler d1 migrations apply`. |
| JSONL appends (`data/events.jsonl`, `data/usage.jsonl`) | `server/storage.ts` | No filesystem. Usage is already in the `ledger` table (the JSONL is only an audit copy). Events need a D1 `events` table (add as migration `0002`) or Workers Analytics Engine. |
| Brain files read from disk at start | `server/allowlist.ts` | Bundle the allowlisted files at build time (a generated module of strings, or wrangler text-module rules). The allowlist itself stays the gate. |
| `.env` + `process.env` | `server/config.ts` | Worker `env`: `[vars]` for settings, `wrangler secret put` for `ANTHROPIC_API_KEY` and `POIO_ACCESS_CODE`. `loadConfig` already takes an env object. |
| Client IP from the Node socket; "this machine" = loopback without proxy headers | `server/access.ts` | `CF-Connecting-IP` is set by Cloudflare itself there, so it can be trusted. There is no "this machine" on a host: local mode becomes the access code only. |
| Per-IP limiter in memory | `server/usage.ts` (`IpLimiter`) | Per isolate, so weak. Use the Workers rate-limiting binding, or a small D1 counter table. The ledger caps don't depend on it. |
| `@anthropic-ai/sdk` | `server/brain/real.ts` | Fetch-based; expected to work, possibly with the `nodejs_compat` flag. **Unverified**: test with one call before cutover. |

## Things that change by being on HTTPS

- **Voice.** Web Speech recognition needs a secure context. On a host it's
  HTTPS, so it works as it does on localhost; the mic prompt is per origin.
- **Cookies.** `poio_sid` is `Secure` already everywhere but plain-http
  localhost.
- **Time zones.** Day and month accounting uses `Intl.DateTimeFormat` with
  `America/Mexico_City`, which Workers support.

## Concurrency on D1

D1 runs one writer per database, and each statement is atomic. The budget hold
is a single statement that checks every cap and inserts, so two tabs, or two
Worker isolates, can't both slip under one cap. Settling (insert the actual
usage, then delete the hold) is two statements in that order, so the ledger can
over-count for a moment but never under-count. A hold left by a crashed
invocation lapses after three minutes (`hold_until`).

## A cutover, when approved (not now)

1. `wrangler d1 create poio`, put its id in `wrangler.toml` (start from
   `cloudflare/wrangler.example.toml`), `wrangler d1 migrations apply poio`.
2. Write the Worker entry: `createApp` with `D1Sql(env.DB)`, bundled brain
   files, config from `env`, static left to the assets binding. Add the
   `events` migration.
3. `wrangler secret put ANTHROPIC_API_KEY` (a dedicated key with a Console
   spend limit, as now) and `POIO_ACCESS_CODE` if the code path stays.
4. Deploy to a `*.workers.dev` preview; run `npm test` and the manual
   acceptance list in the README against it; one live call per endpoint.
5. Mint fresh invites with `POIO_PUBLIC_URL` set to the new origin. Profiles
   don't move between hosts (cookies are per origin), so invitees start fresh.
6. Only then retire the tunnel.

Check current Workers and D1 limits and pricing before step 1; they aren't
pinned here.
