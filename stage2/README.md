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
  data/pantry.json     # runtime pantry store (server reads + writes this)
  data/recipes/*.json  # stepper recipes (validated against the schema)
  web/                 # the encoder companion app (wired in the next milestone)
  PANTRY-MODEL.md      # design note: where the pantry lives, why the device needs no keyboard
```

## Run

```bash
python3 stage2/bootstrap_pantry.py      # first time: seed data/pantry.json
python3 stage2/server.py --port 8781    # start the brain
# open http://127.0.0.1:8781/
```

## API

| method + path | does |
|---|---|
| `GET /api/health` | liveness; reports recipe count + whether the LLM is reachable |
| `GET /api/pantry` | full pantry (`?filter=attention` → only `low`/`out`) |
| `GET /api/recipes` | recipe summaries, each with a `feasible` flag + any `missing` items |
| `GET /api/recipes/{id}` | full stepper recipe, live pantry status stamped on each ingredient |
| `GET /api/recipes/{id}/consumed` | **the "used tonight?" prediction** — post-cook diff |
| `GET /api/today` | tonight's pick (deterministic feasible recipe for now; LLM later) |
| `POST /api/pantry/apply` | `{changes:[{item,to}]}` — writes the pantry update back |
| `POST /api/suggest` | Mode-1 "what should I cook" (deterministic now; LLM-wired seam) |

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
never waits on a round-trip. `GET /api/health` reports whether `claude` is on
PATH (it was at build time: `~/.local/bin/claude`, v2.1.201).

*If you'd rather use the API* (a key + lower latency), it's a one-function swap in
`ask_llm()`. Say the word and I'll wire it — it would need `ANTHROPIC_API_KEY`.

## Before the first kitchen session

- **`pantry.md` is stale** — it's the all-`out` template (last touched
  2026-04-12). The prototype seeds a plausible Guadalajara pantry so you can cook
  tonight; **skim `data/pantry.json` and fix anything obviously wrong**, or (the
  real move) do a 5-minute conversational bootstrap of your actual pantry — see
  `PANTRY-MODEL.md`. You don't have to hand-edit files; that's the point.
- **Recipes:** three are wired (Tinga de Pollo, Pollo a la Crema con Rajas,
  Gochujang-Glazed Thighs). All feasible against the seed pantry.
- **That's it** — no key, no install. `python3` and the `claude` CLI (already
  present) are all it needs.
