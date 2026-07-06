# POiO — orientation

A personalized chicken-recipe assistant, headed toward a chicken-shaped countertop
appliance with the AI on-device. This file is the working map: where things stand,
what's canonical, and what not to touch.

## The stages, and where each one is

1. **Claude Code skill** — *works.* `SKILL.md` at the repo root is the skill;
   install is a symlink (`ln -s <repo> ~/.claude/skills/poio`). First use runs
   `setup/interview.md` to generate the personal files.
2. **Local web app** — *first cut built, kitchen-tested once.* `stage2/server.py`
   (stdlib-only JSON API) + `stage2/web/` (a browser app that behaves like the
   device: encoder, tap-to-advance, e-paper constraints). This is the
   "laptop-as-device" prototype. Quickstart + API: `stage2/README.md`.
3. **Hardware companion** — *parts list ready, nothing ordered; shell model WIP.*
   4.2" mono e-paper (decided — see `hardware/PLAN.md`), ESP32-S3, encoder + tap.
   Screen design language: `hardware/UI-LANGUAGE.md`.
4. **On-device LLM** — *the endgame, not buildable yet.* Everything before it keeps
   the brain behind a clean HTTP boundary so it becomes a board swap. The thesis:
   README "The bet".

## What's canonical vs. archival

- **Canonical:** `stage2/` (the live app), `hardware/PLAN.md` + `UI-LANGUAGE.md` +
  `PROTOTYPE.md`, `SKILL.md`, `stage2/PANTRY-MODEL.md` (where the pantry lives).
- **Archival, kept on purpose:** everything under `mockups/` — friction probes and
  the retired 9.7" wall-device design (`eink-glance/`). They still use the Google
  Fonts CDN; that's intentional, only `stage2/web/` bundles its fonts.
- **Design/decision log:** `stage2/VISUALS.md` (taste calls + kitchen-test feedback),
  `JOURNAL.md` (Jaime's build log — read it for the *why*).

## Where the input bets stand (2026-07-06)

Encoder is in (navigation). Camera is unlikely (cost + complexity). Voice is
undecided — it must never be required for the device to work. The open design
question is **inventory input**: how the pantry gets encoded, updated, and
corrected with the least input. The Stage-2 app now has on-device paths for the
whole loop — post-cook depletion (predicted diff → one-press confirm), restock
(marking a shopping item bought writes `plenty` back), and corrections (the
pantry view can show the full inventory, not just low/out). Adding never-seen
items is deliberately conversation-side, through the API. Whether these paths
*feel* right in real cooking is the open part. Details: `mockups/README.md`
(friction map), `stage2/PANTRY-MODEL.md`.

## Run it

```bash
python3 stage2/server.py --port 8781    # → http://127.0.0.1:8781/
```

No dependencies, no API key. A fresh clone starts unprovisioned → first-run screen
→ "Try a demo pantry" seeds a cookable pantry in one press. The `claude` CLI on
PATH is optional (only suggestions use it; cooking never touches the LLM).
Preview onboarding without wiping state: `--first-run`. Port 8781 is Jaime's
standing choice for this app. The mockups gallery is separate:
`python3 -m http.server 8770` from `mockups/`, open `_gallery.html`.

## Rules that aren't obvious from the code

- **Never stage, commit, or revert `hardware/POiO.3dm`.** It's Jaime's live Rhino
  work and is often modified in the working tree.
- **Personal files are gitignored and stay that way:** `pantry.md`,
  `references/regional-context.md`, `references/equipment.md`. The committed
  `*.example.md` files are the templates. `stage2/data/pantry.json` is per-machine
  runtime state (also gitignored) — the server owns it; markdown only seeds it.
- **E-paper honesty is a hard constraint in all device UI:** 1-bit black on white,
  no animation, no spinners, dither/hatch instead of gray, discrete repaints. See
  `hardware/UI-LANGUAGE.md` before touching `stage2/web/` or any mockup.
- **Sparse by default.** Screens show the essentials; add an element only when its
  absence is felt in real use. When in doubt, leave it out.
- **UI copy stays plain for now.** The "voice of the chicken" (personality in copy)
  is a deliberately deferred layer — don't scatter quips (see `stage2/VISUALS.md`).
- Licensing is split three ways (code / hardware / content) — see `LICENSE` before
  adding new kinds of files.

## Known gaps (honest list)

- `POST /api/suggest` returns the deterministic feasible list; the LLM seam
  (`ask_llm()`, headless `claude` CLI) exists but isn't wired to it.
- `POST /api/pantry/apply` can add never-seen items (send a `label` instead of a
  known `item`), but no client calls that yet — the conversational assistant is
  the intended writer.
- Re-running `stage2/bootstrap_pantry.py` overwrites `data/pantry.json` — device
  edits since the last seed are lost. Fine for a prototype; don't rely on it.
- The conversational pantry bootstrap (interview → real kitchen) has never been
  run end-to-end; the demo seed is what everyone has cooked against.
