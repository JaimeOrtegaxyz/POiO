# POiO — orientation

A chicken-first kitchen companion, headed toward a chicken-shaped countertop
device with the AI on-device. This file is the working map: where things stand,
what's canonical, and what not to touch.

Scope: [`SCOPE.md`](SCOPE.md). Decisions: [`DECISIONS.md`](DECISIONS.md).
Voice/copy/sounds: [`VOICE.md`](VOICE.md).

## The phases, and where each one is

1. **Skill** — *works.* `SKILL.md` at the repo root is the skill and the base
   brain; install is a symlink (`ln -s <repo> ~/.claude/skills/poio`). First use
   runs the short first-run part of `setup/interview.md`.
2. **Online mockup** — *in progress: first local build in `mockup/`.* Hosted,
   Google login, Anthropic API, text-first, voice input, emulates the device
   screen (Apache-2.0, secrets in env). Login and hosting come after the local
   loop feels right; see `mockup/README.md` → "Not yet".
3. **Device** — *direction set, nothing ordered.* Color e-paper (panel TBD; the
   bench test in `hardware/PROTOTYPE.md` is next), voice via push-to-talk on the
   red star knob (turn, press, hold to talk) between back/home pills, always-on, thin client to the hosted brain. Shell model
   in `hardware/POiO.3dm`. Direction: `hardware/PLAN.md`; screen language:
   `hardware/UI-LANGUAGE.md`.
4. **On-device brain** — *the endgame, not buildable yet.* Everything before it
   keeps the brain behind a clean HTTP boundary so it becomes a board swap. The
   thesis: README "The bet".

The local Python app (the old Stage 2) is archived in `archive/stage2/`.

## What's canonical vs. archival

- **Canonical:** `SKILL.md`, `SCOPE.md`, `DECISIONS.md`, `VOICE.md`,
  `hardware/*.md`, `reference/` (recipe schema, pantry model, sample recipes),
  and `mockup/`.
- **Archival, frozen:** everything under `archive/` (the Stage 2 app, the
  mockups, the copy review, the mono prototype rig). Archived files only get a
  banner; don't rewrite them or chase their old internal links. Index:
  `archive/README.md`.
- **Fonts:** Quicksand + JetBrains Mono are canonical. The archived mockups still
  use the Google Fonts CDN; that's intentional.
- **Build log:** `JOURNAL.md` (Jaime's personal log — read it for the *why*,
  don't edit it).

## Current status (Nov 2026)

- The product direction was reset on 2026-11-04: voice required, color e-paper,
  always-on, hosted brain for V1. The reasons are dated in `DECISIONS.md`.
- Next builds: the online mockup (`mockup/`) and the color e-paper bench test
  (`hardware/PROTOTYPE.md`).
- Still open: panel, mic hardware, Wi-Fi setup method, on-device LLM
  feasibility, push-to-talk details, batch cooking, how proactive is too
  proactive. The full list: `SCOPE.md` → Open questions.
- When something is undecided, write it as open in `SCOPE.md` rather than
  guessing.

## Run it

The skill is the only live phase:

```bash
ln -s ~/Documents/GitHub/poio ~/.claude/skills/poio   # then /poio in Claude Code
```

The archived local app still runs from the repo root; see
`archive/stage2/README.md`.

The mockup: `cd mockup && npm install && npm run dev` → http://localhost:5173
(API on :8787). No `ANTHROPIC_API_KEY` in `mockup/.env` = fake brain, zero API
calls. `npm test` before committing. `?debug=1` opens the debug panel; full
notes, env vars and cost controls in `mockup/README.md`.

## Rules that aren't obvious from the code

- **Never stage, commit, or revert `hardware/POiO.3dm`** unless Jaime asks. It's
  Jaime's live Rhino work and is often modified in the working tree.
- **Personal files are gitignored and stay that way:** `pantry.md`,
  `references/regional-context.md`, `references/equipment.md`, `poionotas.md`.
  The committed `*.example.md` files are the templates.
  `archive/stage2/data/pantry.json` is per-machine runtime state for the archived
  app (also gitignored).
- **Secrets go in env.** `.env` is gitignored; never commit keys.
- **Color e-paper honesty is a hard constraint in all device UI** (and in the
  mockup's screen emulation): design within the panel's real limits, discrete
  repaints, no spinners, color plus pattern for status. See
  `hardware/UI-LANGUAGE.md` before touching any screen.
- **Sparse by default.** Screens show the essentials; add an element only when its
  absence is felt in real use. When in doubt, leave it out.
- **B-C voice everywhere; see `VOICE.md`.**
- **Docs in English; product copy in Mexican Spanish.**
- **`SCOPE.md` wins over Figma.**
- **Meeting notes never go in the repo**; only decisions, with no personal details
  about anyone.
- Licensing is split three ways (code / hardware / content) — see `LICENSE` before
  adding new kinds of files.
