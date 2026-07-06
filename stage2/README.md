# POiO — Stage-2 server

The brain the e-paper companion talks to. It wraps the poio skill (pantry +
recipes) behind a small JSON API and serves the encoder app as a static front
end. **Zero dependencies** — Python 3 stdlib only. This is the "laptop-as-device"
stack: run it, open the app, and the laptop behaves like the device will.

```
stage2/
  server.py            # the API + static host (stdlib http.server)
  bootstrap_pantry.py  # pantry.md -> data/pantry.json (one-time seed; see PANTRY-MODEL.md)
  schema/recipe.schema.json   # the stepper-recipe schema
  data/pantry.json     # runtime pantry store (gitignored — created on first run)
  data/recipes/*.json  # stepper recipes (validated against the schema)
  web/                 # the encoder companion app, wired live to this API
  PANTRY-MODEL.md      # design note: where the pantry lives, why the device needs no keyboard
```

## Quickstart (clone → cook)

Needs `python3`. No install, no build, no API key. (The `claude` CLI on `PATH`
is optional — only suggestions/generation use it; the cooking loop runs without it.)

```bash
git clone https://github.com/JaimeOrtegaxyz/poio.git && cd poio
python3 stage2/server.py --port 8781
# open http://127.0.0.1:8781/
```

A fresh clone has **no pantry yet**, so the app opens on a **First run** screen:

- **Try a demo pantry** — one press seeds a plausible Guadalajara pantry and drops
  you straight into cooking. Best for testing the loop on a new machine.
- **Set up my kitchen** — the real path: tell the `poio` skill what you have
  ("set up my pantry") so it fills `pantry.md` as a conversation, then run
  `python3 stage2/bootstrap_pantry.py` and reload. Files are a one-time seed;
  after that the conversation and the device keep the pantry current. See
  `PANTRY-MODEL.md`.

Then put the laptop on the counter and cook. **Scroll wheel = the encoder**
(arrows too), `Enter` selects/confirms, `Space` is tap-to-advance. The loop:
**pick → tap through the steps → finish → rate → confirm the predicted pantry
changes** — that confirm is a real `POST /api/pantry/apply`, so reload and the
change is there. Cycling a pantry status writes straight to the server too.

## API

| method + path | does |
|---|---|
| `GET /api/health` | liveness; reports recipe count + whether the LLM is reachable |
| `GET /api/pantry` | full pantry (`?filter=attention` → only `low`/`out`) |
| `GET /api/recipes` | recipe summaries, each with a `feasible` flag + any `missing` items |
| `GET /api/recipes/{id}` | full stepper recipe, live pantry status stamped on each ingredient |
| `GET /api/recipes/{id}/consumed` | **the "used tonight?" prediction** — post-cook diff |
| `GET /api/today` | tonight's pick (deterministic feasible recipe for now; LLM later). `provisioned:false` before first-run |
| `POST /api/pantry/apply` | `{changes:[{item,to}]}` — writes the pantry update back |
| `POST /api/pantry/bootstrap` | `{mode:"demo"}` — first-run provisioning (seeds the demo pantry) |
| `POST /api/suggest` | Mode-1 "what should I cook" (deterministic now; LLM-wired seam) |

`GET /api/health` reports `provisioned` (whether `data/pantry.json` exists) so the
app knows to show the first-run screen.

The **post-cook diff needs no LLM**: each recipe ingredient carries `depletes`
(`none`/`light`/`some`/`heavy`/`finishes`), and the server maps that against the
live pantry status (`heavy`: plenty→low, low→out; `finishes`: →out; `some`:
low→out). That determinism is why the kitchen loop is instant and the device can
be `+$0` — the whole encoder-control bet.

## How the LLM is invoked (decision — flag)

The server shells out to the **headless `claude` CLI** (`claude -p`), not the
Anthropic API. Rationale: it rides your existing Claude Code auth (no API key to
manage), and `SKILL.md` can be loaded as the brain. It's kept **off the hot
path** — only `POST /api/suggest` and future recipe-generation use it, so cooking
never waits on a round-trip. `CLAUDE_BIN` is resolved from `PATH` (`shutil.which`),
so it's portable across machines; `GET /api/health` reports whether it's reachable.

*If you'd rather use the API* (a key + lower latency), it's a one-function swap in
`ask_llm()`. Say the word and I'll wire it — it would need `ANTHROPIC_API_KEY`.

## Notes for a fresh machine

- **The pantry is not committed.** A fresh clone starts unprovisioned → the
  first-run screen. Use **Try a demo pantry** to cook immediately, or the
  conversational setup for your real kitchen.
- **The committed template is `pantry.example.md`** (all-`out`; your personal
  `pantry.md` is gitignored and starts as a copy of it). Hand-filling it is the
  friction we're designing away (see `PANTRY-MODEL.md`). The bootstrap script
  reads `pantry.md` if you have one, else falls back to the template; `--demo`
  overlays a cookable seed on either.
- **Recipes:** three are wired (Tinga de Pollo, Pollo a la Crema con Rajas,
  Gochujang-Glazed Thighs), all feasible against the demo pantry.
- **Needs only** `python3` + the `claude` CLI on `PATH`. The cooking loop works
  without the CLI; only suggestions/generation need it. Fonts are bundled in
  `web/fonts/` — the app is self-contained and works offline (the archival
  `mockups/` still use the Google Fonts CDN; intentional, they're not "what we use").
