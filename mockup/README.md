# POiO online mockup (first local build)

A browser emulation of the POiO device's face (after the Rhino render): a matte
yellow panel with a color e-paper screen at real resolution and palette in a
recessed frame, and one row of controls under it: a back pill, the red star knob
(turn, press, hold to talk) with its LED, and a home pill. Voice in; text and a few sounds out, never speech. A small Node
server holds the Anthropic API key and runs the `SKILL.md` brain. Device state
lives in the browser's localStorage: the device works without the app.

The screen rules come from [`hardware/UI-LANGUAGE.md`](../hardware/UI-LANGUAGE.md),
the voice from [`VOICE.md`](../VOICE.md), the scope from [`SCOPE.md`](../SCOPE.md).

## Run it

```bash
cd mockup
cp .env.example .env          # add ANTHROPIC_API_KEY; never commit .env
npm install
npm run dev                   # http://localhost:5173 (API on :8787, /api proxied)
POIO_FAKE_BRAIN=1 npm run dev # zero API calls
npm test                      # Vitest, no network
npm start                     # build + one process on http://localhost:8787
```

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
- **Honest by construction.** Each frame is drawn with canvas 2D at native resolution, food images are Floyd-Steinberg dithered to the pigments, and a panel pass snaps every pixel to what the panel can show (text comes out aliased). The result is shown at an integer scale with `image-rendering: pixelated`. Nothing on the screen is DOM.
- **Refresh.** A view change is a full refresh (ink → paper → new frame); a small change is a partial repaint of the changed rectangle, where the panel allows it, with a full refresh every 8 partials. Timing `fast` (default) or `real` (profile numbers; on Spectra every change is a ~16 s full refresh). No spinners, no animation loops: listening and thinking are static states.
- **Status** is color plus pattern everywhere: `hay` solid ink, `poco` yellow + 45° ink hatch, `no hay` red + paper dots. Unknown items get a hollow keyline.

URL options: `?profile=kaleido3-6in`, `?timing=real`, `?scale=3`, `?variant=a|b`,
`?speed=10` (checkpoints and check-ins 10× faster), `?checkinQuiet=60` (seconds
check-ins stay hidden after turn-on; default 600), `?debug=1`, `?access=<code>`.

## A/B flag and event log

- Variant **a** = food images + at most 2-3 frame partial repaints at a checkpoint and the finish (only where the panel can partial-refresh). Variant **b** = text-led. Random per device, kept in localStorage; `?variant=a|b` overrides. These double as SCOPE's 1-2 adaptive-UI layouts.
- The **event log** is anonymous (random device id, no names, no free text): variant, onboarding answers and skips, discards, time to first recipe, steps completed, checkpoints fired, finishes, taste, pantry diffs, check-ins. It's appended to `data/events.jsonl` and tailed in the debug panel.

## The brain

- **Allowlist.** At startup the server reads exactly `SKILL.md`, `VOICE.md`, `references/style-guide.md`, `reference/recipe.schema.json` and `pantry.example.md` (plus the three sample recipes as fixtures), listed in [`server/allowlist.json`](server/allowlist.json). Personal files are never read. `npm run build` copies exactly these into `dist/brain/`.
- **Prompt.** A cached static prefix ([`server/prompts/adapter.md`](server/prompts/adapter.md), then the files above and the pantry keys; ~12k tokens) plus a short dynamic part per call (date and season, city, servings, poionotas, known pantry items, recent discards, the current screen, the utterance).
- **Output.** JSON-schema structured output, `effort: low` with thinking off, validated with ajv; one retry, then fixtures or "No te entendí". Every recipe is validated against `reference/recipe.schema.json` before use.
- **Endpoints.** `POST /api/suggest`, `POST /api/recipe`, `POST /api/utterance`, `POST /api/event`, `GET /api/usage`. The local intent parser runs first in the browser; the post-cook pantry diff is computed locally from `depletes`.

## Cost controls

| Env var | Default | Does |
|---|---|---|
| `ANTHROPIC_API_KEY` | (empty) | Empty = fake brain. Lives only in `mockup/.env` or the shell. |
| `POIO_MODEL` | `claude-haiku-5-5` | Model for everything. |
| `POIO_MODEL_RECIPE` | `claude-haiku-5-5` | Recipes only; `claude-sonnet-5-5` is the upgrade. |
| `POIO_FAKE_BRAIN` | `0` | `1` = fixtures only, zero calls. |
| `POIO_SESSION_TOKEN_CAP` | `60000` | Per session. Input, cache writes and output count fully; cache reads at 10%. |
| `POIO_DAILY_BUDGET_USD` | `3` | From `data/usage.jsonl`. |
| `POIO_MONTHLY_BUDGET_USD` | `100` | From `data/usage.jsonl`. |
| `POIO_ACCESS_CODE` | (empty) | Lets non-localhost clients in (`x-poio-access` header or `?access=`). |
| `PORT` | `8787` | API port. |

Also: `POIO_IP_LIMIT` (30) and `POIO_IP_WINDOW_MS` (600000) for the per-IP limit,
and `POIO_TZ` (`America/Mexico_City`) for day/month accounting.

- The guard runs server-side before every call. Over a cap there's no call: the screen shows `Por hoy llegué a mi límite. Las recetas guardadas siguen aquí.` and the brain answers from fixtures.
- Every call appends time, session, endpoint, model, the four token counts and USD to `data/usage.jsonl`. The line under the device always shows `Sesión 12.4k / 60k tokens · Hoy US$0.04 · Mes US$1.20 / US$100`.
- Prices live in [`server/pricing.ts`](server/pricing.ts) with the date they were checked. Haiku 5.5: $0.10 / $0.50 per MTok in/out, cache writes $0.125, cache reads $0.01.
- **Use a dedicated key** in its own Console workspace with a **$100 monthly spend limit** as the hard backstop. The guard only sees this app's spend.

## Device state

Pantry, poionotas, discards, cooked dishes, check-ins and settings live in
localStorage (`poio.device.v1`). The pantry is seeded from `pantry.example.md`'s
item keys; everything starts unknown except what onboarding sets (skipped Q4
assumes salt, oil, onion, garlic and chicken, marked `supuesto`). The debug
panel's **reset device** clears it.

## Not yet

- **Google login and hosting.** Login mostly protects the API budget once the mockup is shared, and sharing comes after the loop feels right locally. The seam exists: `requireAccess` on every `/api/*` (localhost, or `POIO_ACCESS_CODE`); Google OAuth plugs in there. The server is Hono on Node with storage behind an interface, so Vercel / Cloudflare / Fly is a deploy, not a rewrite.
- The phone app and photos, Wi-Fi setup, POiO *suggesting* a layout switch, batch cooking, habit learning beyond the event log.
- The ten "after the first cook" onboarding topics (`pregúntame todo` answers `Pronto.`).
- Final sounds (these are WebAudio placeholders), the final palette (after the bench test) and food photos (see [`public/food/README.md`](public/food/README.md)).

## Credits and license

- Code: Apache-2.0, per the root [`LICENSE`](../LICENSE).
- Fonts: [Quicksand](https://github.com/andrew-paglinawan/QuicksandFamily) and [JetBrains Mono](https://github.com/JetBrains/JetBrainsMono), SIL Open Font License 1.1, self-hosted in `public/fonts/` (copied from the archived Stage 2 app).
- Step glyphs: ported from the archived Stage 2 app (`archive/stage2/web/app.js`).
- Food images: none yet; CC0 or public domain only, credited in [`public/food/CREDITS.md`](public/food/CREDITS.md).
