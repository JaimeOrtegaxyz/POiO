# POiO online mockup

A shareable site in three parts:

| Route | What |
|---|---|
| `/` | Public landing: the POiO wordmark as a Vaivén figure, a few lines in Mexican Spanish, the way into the demo. Static; it never reaches the brain. |
| `/invite/:token` | A short-lived, single-use invite. Opening it shows a button; pressing it mints an isolated browser profile (an HttpOnly cookie) and sends you to `/demo`. |
| `/demo` | The device: the frontal render's face with the live color e-paper screen in its screen hole, and one row of controls under it: a back pill, the red star knob (turn, press, hold to talk) with its LED, and a home pill. Voice in; text and a few sounds out, never speech. |
| `/api/*` | The brain proxy. It holds the Anthropic API key, runs the `SKILL.md` brain and enforces every budget server-side. |

Who gets in: an **invited profile** (state on the server, its own caps), or
**local mode**: this machine, or anyone with `POIO_ACCESS_CODE` (the interim
kitchen-test path through the iMac tunnel; state stays in that browser, as
before). No accounts, no email, no Google login in this slice.

The screen rules come from [`hardware/UI-LANGUAGE.md`](../hardware/UI-LANGUAGE.md),
the voice from [`VOICE.md`](../VOICE.md), the scope from [`SCOPE.md`](../SCOPE.md).

## Run it

```bash
cd mockup
cp .env.example .env          # add ANTHROPIC_API_KEY; never commit .env
npm install
npm run dev                   # http://localhost:5173 (landing), /demo (device); API on :8787, /api and /invite proxied
POIO_FAKE_BRAIN=1 npm run dev # zero API calls
npm test                      # Vitest, no network
npm start                     # build + one process on http://localhost:8787
npm run invites -- create --label "Angie"   # mint an invite link (see Invites)
```

Node 22.13 or newer (the database is the built-in `node:sqlite`).

With no `ANTHROPIC_API_KEY`, the server runs the **fake brain** automatically
(fixtures and keyword matching, zero calls) and the usage line says `modo demo`.

Use Chrome or Safari for speech (localhost counts as a secure context). Firefox
has no speech recognition: the page says so once and the typed field works the
same.

### Try this first

1. Click **Encender**: one chirp, no greeting.
2. Press **Enter** four times to skip the onboarding questions: three options appear.
3. Type `otras` in the field under the device and press Enter: three new ones.
4. Pick one with the arrows + Enter, then Enter through the intro and the ingredient check.
5. Open with `?speed=60&debug=1` to see a checkpoint fire within seconds, and use the debug panel's **+3 h** after finishing to see the cookbook check-in.

## Controls

The red star knob is one part: the encoder and the push-to-talk. A press shorter
than 300 ms is a press; past 300 ms without turning, it's a hold and listening
starts. The star turns one detent per step.

| Device | Keyboard / mouse / touch | Does |
|---|---|---|
| Star knob: turn | **← → ↑ ↓**, mouse wheel (over the knob or the screen), or drag around the knob | Browse, move the selection, peek at steps. |
| Star knob: press | **Enter**, or a click/tap on the knob | Select, advance, skip, confirm. |
| Star knob: hold | hold **Space**, or hold the knob (mouse or touch) | Push-to-talk, `es-MX`. Release to send. Space under 300 ms or silence = "No te entendí". |
| Left pill | **Esc** or **Backspace**, or click it | Back: what saying "atrás" does here; clears a band first. *Provisional.* |
| Right pill | **H**, or click it | Home: the cookbook. Leaves a recipe (drops its checkpoints). Ignored during the first-run questions. *Provisional.* |
| Typed fallback | the field under the device, **Enter** (Esc leaves the field) | Same as releasing the knob with that text. |
| Power | **Encender / Apagar** | A session runs from turn-on to turn-off (or 12 h idle). |

Keys are ignored while the typed field has focus, and with Ctrl/Cmd/Alt held.
The pill functions are provisional until the bench test
([`hardware/PROTOTYPE.md`](../hardware/PROTOTYPE.md)).

Things to say (the local parser catches these with no tokens): `siguiente`,
`listo`, `ya`, `atrás`, `otras`, `ninguna`, `la primera`, `2`, `sáltalo`,
`luego`, `sí`, `no`, `1`-`10` on the taste screen, `despensa`, `recetario`,
`¿qué sabes de mí?`, `¿qué hago de cenar?`. Everything else goes to the brain:
`no hay crema`, `se acabó la crema`, `compré poblanos y media crema`,
`algo más rápido`, `sin horno`, `olvida lo del cilantro`, `hazme unas tostadas de tinga`.

## Screen emulation

- **Panel profiles** live in [`src/screen/profiles.ts`](src/screen/profiles.ts). The panel is TBD, so the screen runs on profiles:

  | id | Resolution | Color | Real refresh |
  |---|---|---|---|
  | `spectra6-4in` (default) | 600×400 | 6 pigments: ink, paper, yellow, red, blue, green | full ~16 s, no partial |
  | `kaleido3-6in` | 1448×1072 text; color at half resolution | 4,096 muted colors, 16-level gray, grayish paper | ~550 ms full, partial OK |

  The Spectra palette (`#1a1816`, `#f4efe4`, `#e9c92a`, `#b8322a`, `#2d4f9e`, `#3a6b3c`) is a starting approximation, to be tuned after the bench test. UI chrome uses only ink, paper, yellow and red.
- **Honest by construction.** Each frame is drawn with canvas 2D at native resolution, food images are Floyd-Steinberg dithered to the pigments, and a panel pass snaps every pixel to what the panel can show (text comes out aliased). The canvas is scaled to the screen hole and drawn smooth: a 600 px panel can't land on an integer scale at these sizes. Nothing on the screen is DOM.
- **Letterboxed, never stretched.** The render's screen hole is about 4:3 (684×514 render px); the Spectra panel is 3:2. The panel keeps its 600×400 design units and sits full-width in the hole with bands of the panel's inactive border above and below. Kaleido (≈1.35) gets thinner bands. If the shell's recess changes in Rhino, re-export the render and rerun `npm run face`.
- **Refresh.** A view change is a full refresh (ink → paper → new frame); a small change is a partial repaint of the changed rectangle, where the panel allows it, with a full refresh every 8 partials. Timing `fast` (default) or `real` (profile numbers; on Spectra every change is a ~16 s full refresh). No spinners, no animation loops: listening and thinking are static states.
- **Status** is color plus pattern everywhere: `hay` solid ink, `poco` yellow + 45° ink hatch, `no hay` red + paper dots. Unknown items get a hollow keyline.

URL options (on `/demo`): `?profile=kaleido3-6in`, `?timing=real`, `?scale=3` (no visible effect for now: the frame fits the screen to the hole), `?variant=a|b`,
`?speed=10` (checkpoints and check-ins 10× faster), `?checkinQuiet=60` (seconds
check-ins stay hidden after turn-on; default 600), `?debug=1`, `?access=<code>`.

## The device face

The face is the frontal render itself, [`assets/render-frontal.png`](../assets/render-frontal.png),
cut by [`scripts/face/build-face.py`](scripts/face/build-face.py) (`npm run face`; needs
Python with numpy, opencv-python and Pillow) into:

- `public/face/face-{1240,720}.webp`: the body with a transparent background and a
  transparent screen hole (the render's own screen area, measured, not guessed),
  with the star knob painted out underneath;
- `public/face/star-{1240,720}.webp`: the star knob alone, so it can turn a detent;
- `src/device/face.json`: the geometry (hole, star and its pivot, pills, LED spot) in render pixels.

The page stacks the emulated panel behind the hole, the render over it, and hit
targets over the pills and the star (`src/device/dom.ts`). Every pixel of the
face comes from the render; the pills' positions were measured by eye on it
(they're the body's yellow, so no color split finds them). The LED isn't in the
render: it's the small dot by the star, as before.

**Size on screen** (`src/device/layout.ts`), behind **Tamaño** under the device:

- **Fit (default).** The face fits the window and says so: `Tamaño ajustado a la
  ventana, sin calibrar.` The hole stays readable (up to 440 px wide); when the
  whole chicken doesn't fit, it's cropped around the screen and the controls
  (comb and pedestal first; the sides on a phone).
- **Real size.** `Ver la pantalla a tamaño real` opens a ruler: match an on-screen
  bar to 5 cm on a real ruler. Then the **panel** is drawn at the candidate panel's
  real width (Spectra 4": 84.5 mm; Kaleido 6" for that profile). Only the panel is
  to scale: the shell's size lives in the Rhino model and isn't claimed here, and
  the label says so. The calibration is kept in this browser (`poio.size.v1`).
  It's a length only: no card, no form.

## A/B flag and event log

- Variant **a** = food images + at most 2-3 frame partial repaints at a checkpoint and the finish (only where the panel can partial-refresh). Variant **b** = text-led. Random per device, kept in localStorage; `?variant=a|b` overrides. These double as SCOPE's 1-2 adaptive-UI layouts.
- The **event log** is anonymous (random device id, no names, no free text): variant, onboarding answers and skips, discards, time to first recipe, steps completed, checkpoints fired, finishes, taste, pantry diffs, check-ins. It's appended to `data/events.jsonl` and tailed in the debug panel.

## The brain

- **Allowlist.** At startup the server reads exactly `SKILL.md`, `VOICE.md`, `references/style-guide.md`, `reference/recipe.schema.json` and `pantry.example.md` (plus the three sample recipes as fixtures), listed in [`server/allowlist.json`](server/allowlist.json). Personal files are never read. `npm run build` copies exactly these into `dist/brain/`.
- **Prompt.** A cached static prefix ([`server/prompts/adapter.md`](server/prompts/adapter.md), then the files above and the pantry keys; ~12k tokens) plus a short dynamic part per call (date and season, city, servings, poionotas, known pantry items, recent discards, the current screen, the utterance).
- **Output.** JSON-schema structured output, `effort: low` with thinking off, validated with ajv; one retry, then fixtures or "No te entendí". Every recipe is validated against `reference/recipe.schema.json` before use.
- **Endpoints.** `POST /api/suggest`, `POST /api/recipe`, `POST /api/utterance`, `POST /api/event`, `GET /api/usage`, plus `GET /api/me`, `GET|PUT|DELETE /api/state` (see Invites) and `POST /api/feedback`. The local intent parser runs first in the browser; the post-cook pantry diff is computed locally from `depletes`.

## Invites

Invite links, not a shared password. Each one becomes one isolated **browser
profile**: not an account. There's no email or login, so a profile lives in the
browser that redeemed the invite; another browser or device, or cleared cookies,
means a new invite and an empty profile. Cross-device continuity isn't promised.

```bash
npm run invites -- create --label "Angie"            # prints the link once; 72 h by default
npm run invites -- create --label "Prueba" --hours 4
npm run invites -- list                              # id, status (open/redeemed/expired/revoked), profile
npm run invites -- revoke inv_0a1b2c3d4e             # the invite, its profile, every session from it
```

Set `POIO_PUBLIC_URL` (in `.env`) to the tunnel or host origin so the printed
link is shareable. The CLI is safe to run while the server runs.

How it works:

- **Short-lived, single-use, opaque.** 32 random bytes (base64url). Only the
  SHA-256 is stored, for invites and for session cookies; the raw token is
  printed once by the CLI and never written anywhere else.
- **Redeem on a button, not on open.** `GET /invite/:token` only shows a page
  with *Entrar al demo*; chat apps fetch links for previews, and a GET that
  redeemed would burn the invite before the person sees it. `POST` redeems with
  one conditional `UPDATE`, so of two racing tabs exactly one wins.
- **Token hygiene.** Invite responses send `Referrer-Policy: no-referrer` and
  `Cache-Control: no-store`; the redeem answers `303` to a token-free `/demo`.
  The server keeps no request log. (The used link stays in that browser's history,
  where it's worthless.)
- **Cookie.** `poio_sid`: `HttpOnly`, `Secure` (except plain-http `localhost`,
  where Safari would drop it), `SameSite=Lax`, `Path=/`, 30 days
  (`POIO_PROFILE_SESSION_DAYS`). Lax, not Strict: the invite arrives as a link
  from another site, and Strict would drop the cookie on the redirect that
  follows it. Cross-site POSTs still go without it, which covers CSRF for the API.
- **Who is who.** `/api/*` takes, in order: a valid profile cookie; this machine
  (loopback **and** no proxy headers); `POIO_ACCESS_CODE`. A tunnel connects
  from 127.0.0.1, so a loopback request carrying `cf-connecting-ip`,
  `x-forwarded-for`, `forwarded`, `x-real-ip` or `cf-ray` is treated as remote.
  Old `/?access=<code>` links redirect to `/demo?access=<code>`.
- **No brain without access.** The landing is static; `/demo` without access shows
  the invite gate and makes no brain call; the API answers `403` before any
  budget or model code runs.

## Under the device

Kept quiet on purpose: the power button and the typed field, then small links:

- **Cómo se usa** starts the **tutorial**, a practice run on the screen itself
  ([`src/flows/tutorial.ts`](src/flows/tutorial.ts)). The masthead reads
  `Tutorial · n de 6`; each step asks for one real action and the screen answers:
  press the star → turn it through three practice rows → press to pick one → the
  left pill goes back → hold the star (or Space, or type) and say anything → the
  right pill → done. The control being asked for gets a static red ring on the
  face; the wrong one gets a short band saying which. Under the device, the links
  give way to one line: `TUTORIAL · Salir del tutorial`. Nothing in it is saved,
  logged or sent to the brain. An invited profile's very first turn-on starts it;
  closing it or finishing it goes on to the first-run questions (or the cookbook).
- **Tamaño** (fit vs. real size, the ruler) and **Comentarios** (feedback) each
  open one small panel; all start closed.
- **Mis datos** (invited profiles only) holds the reset.

Notices show only when there's something to say.

## Feedback

**Comentarios** sends a short text (up to 1,000 characters) with the screen and
A/B variant the person was on, into the `feedback` table. A few per profile per
10 minutes. Read it with:

```bash
npm run feedback          # the latest 50: time, who (the invite's label), where, text
npm run feedback -- 200
```

## Profiles and data

- **Invited profile:** the server is the source of truth. Device state (pantry,
  poionotas, discards, cooked, check-ins, settings) is stored per profile in the
  database and loaded at boot; this browser keeps a cache under its own key
  (`poio.device.v1.p.<tag>`), so a second invite in the same browser starts
  empty. Saves are debounced to one `PUT /api/state`; leaving the page flushes
  it. Last write wins between two tabs of one profile.
- **Local mode** (this machine, the access code): unchanged. State lives in this
  browser's `poio.device.v1`, the server stores none.
- **Reset** clears the current profile only: **Mis datos** → *Borrar mis datos del
  demo* under the device (invited profiles), or the debug panel's **reset device** (local mode).
- **The database** is `data/poio.sqlite` (gitignored; `POIO_DB_PATH` to move it):
  invites, profiles, sessions, profile state and the spend ledger. Schema:
  [`server/db/schema.sql`](server/db/schema.sql). Nothing in it is a secret at
  rest (hashes only), but it is personal data about invitees' kitchens: never commit it.
- **No voice recordings.** Speech is recognized by the browser; only the text
  of what was said reaches the server, for that call, and isn't stored.
- **Cloudflare later.** The database code is behind a small seam with a tested D1
  adapter; see [`docs/CLOUDFLARE.md`](docs/CLOUDFLARE.md). Nothing is provisioned.

## Cost controls

| Env var | Default | Does |
|---|---|---|
| `ANTHROPIC_API_KEY` | (empty) | Empty = fake brain. Lives only in `mockup/.env` or the shell. |
| `POIO_MODEL` | `claude-haiku-5-5` | Model for everything. |
| `POIO_MODEL_RECIPE` | `claude-haiku-5-5` | Recipes only; `claude-sonnet-5-5` is the upgrade. |
| `POIO_FAKE_BRAIN` | `0` | `1` = fixtures only, zero calls. |
| `POIO_SESSION_TOKEN_CAP` | `60000` | Per session. Input, cache writes and output count fully; cache reads at 10%. |
| `POIO_DAILY_BUDGET_USD` | `3` | All profiles and local mode together. |
| `POIO_MONTHLY_BUDGET_USD` | `100` | All profiles and local mode together. |
| `POIO_PROFILE_DAILY_USD` | `0.5` | Per invited profile, so one invite can't drain the key. |
| `POIO_PROFILE_MONTHLY_USD` | `5` | Per invited profile. |
| `POIO_ACCESS_CODE` | (empty) | Lets non-local clients in without an invite (`x-poio-access` header or `?access=`): local mode. |
| `POIO_INVITE_HOURS` | `72` | Default invite lifetime (`--hours` overrides). |
| `POIO_PROFILE_SESSION_DAYS` | `30` | Session cookie lifetime. |
| `POIO_PUBLIC_URL` | `http://localhost:8787` | Origin for the links `npm run invites` prints. |
| `PORT` | `8787` | API port. |

Also: `POIO_IP_LIMIT` (30) and `POIO_IP_WINDOW_MS` (600000) for the per-IP limit,
and `POIO_TZ` (`America/Mexico_City`) for day/month accounting.

- The guard runs server-side before every call. Over a cap there's no call: the screen shows `Por hoy llegué a mi límite. Las recetas guardadas siguen aquí.` and the brain answers from fixtures.
- **Atomic holds.** Before a call the server reserves its worst case (the whole prompt prefix as a cache write, ~3k input, `max_tokens` out) with one conditional `INSERT` into the spend ledger that only lands if every cap (month, day, this profile's day and month, this session's tokens) still has room, counting finished calls plus holds in flight. Parallel tabs can't slip past a cap together; overshoot is bounded by the calls already in flight, as before. The hold becomes the actual usage when the call ends, is released on an error, and lapses after 3 minutes if the process dies.
- Sessions are per profile: the same app-session id in two profiles is two sessions.
- **Invitees never see costs.** The usage line, `/api/usage` and the debug panel are local mode only; an invited profile's caps apply silently (over a cap they just get the limit line on the screen).
- Every call is in the ledger (`data/poio.sqlite`) and also appended to `data/usage.jsonl` (time, profile, session, endpoint, model, the four token counts, USD). Older `usage.jsonl` lines are folded into the ledger at start, once. In local mode a faint line under the device shows `Sesión 12.4k / 60k tokens · Hoy US$0.04 · Mes US$1.20 / US$100`.
- Prices live in [`server/pricing.ts`](server/pricing.ts) with the date they were checked. Haiku 5.5: $0.10 / $0.50 per MTok in/out, cache writes $0.125, cache reads $0.01.
- **Use a dedicated key** in its own Console workspace with a **$100 monthly spend limit** as the hard backstop. The guard only sees this app's spend.

## Device state

Pantry, poionotas, discards, cooked dishes, check-ins and settings: on the
server for an invited profile, in localStorage (`poio.device.v1`) in local mode
(see Profiles and data). The pantry is seeded from `pantry.example.md`'s item
keys; everything starts unknown except what onboarding sets (skipped Q4 assumes
salt, oil, onion, garlic and chicken, marked `supuesto`).

## Acceptance before sharing live

`npm test` covers invites, isolation, the atomic budget holds and the D1 seam
with no network. Before telling invitees the live brain works, also check by
hand against the running server: two invites in two browsers stay isolated
(state, reset, usage); parallel tabs hit a small cap together and only one call
goes out; desktop and phone screenshots of `/` and `/demo`; keyboard only
(arrows, Enter, Space, Esc, H) drives the demo; one live call per endpoint
through an invited profile shows `fake: false` and lands in that profile's usage.

## Not yet

- **Accounts and hosting.** Invites cover sharing for now. Email or Google login, if it comes, attaches to an existing profile in `requireAccess` and brings cross-device continuity. Hosting: Cloudflare Workers + D1 is the direction; the compatibility notes, a draft `cloudflare/wrangler.example.toml` and the D1 migration are in the repo, and nothing is provisioned ([`docs/CLOUDFLARE.md`](docs/CLOUDFLARE.md)). Until then the iMac tunnel serves the demo.
- An invite admin page (the CLI is the admin for v1), and invite forwarding limits beyond single use (a forwarded unredeemed link is a forwarded seat; revoke it).
- The phone app and photos, Wi-Fi setup, POiO *suggesting* a layout switch, batch cooking, habit learning beyond the event log.
- The ten "after the first cook" onboarding topics (`pregúntame todo` answers `Pronto.`).
- Final sounds (these are WebAudio placeholders), the final palette (after the bench test) and food photos (see [`public/food/README.md`](public/food/README.md)).

## Credits and license

- Code: Apache-2.0, per the root [`LICENSE`](../LICENSE).
- Device face: cut from the frontal render (`assets/render-frontal.png`, Jaime Ortega), CC-BY-SA-4.0 like the other assets.
- Landing hero: [Vaivén](https://github.com/JaimeOrtegaxyz/vaiven) (`@jaimeortega/vaiven`, MIT), preset `poio-hero` in `public/vaiven.presets.json` made from `assets/logo-bw.svg`. Tune it with `npx vaiven` (the playground edits that file).
- Fonts: [Quicksand](https://github.com/andrew-paglinawan/QuicksandFamily) and [JetBrains Mono](https://github.com/JetBrains/JetBrainsMono), SIL Open Font License 1.1, self-hosted in `public/fonts/` (copied from the archived Stage 2 app).
- Step glyphs: ported from the archived Stage 2 app (`archive/stage2/web/app.js`).
- Food images: none yet; CC0 or public domain only, credited in [`public/food/CREDITS.md`](public/food/CREDITS.md).
