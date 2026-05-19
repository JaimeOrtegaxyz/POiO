# POiO — UI Mockups

> **WIP, side exploration.** These are early Stage-2 web-app prototypes committed as work-in-progress. They predate the current Stage-3 direction (a chicken-shaped countertop companion — see [`hardware/PLAN.md`](../hardware/PLAN.md)). The `eink-glance/` mockup in particular was designed as a dress rehearsal for the earlier 9.7" ambient e-ink concept that has since been retired. The other three (editorial / terminal / chat) remain conceptually independent of the screen choice.

Four working prototypes for POiO's Stage 2 web app. Each was built by a separate design agent, then revised after a cross-critique round. They are deliberately divergent — different theses, not different skins.

Each is a static, no-build, no-framework HTML/CSS/JS prototype. Open `index.html` directly in a browser.

## The four directions

### 1. [`eink-glance/`](eink-glance/) — Stage-3 dress rehearsal
Monochrome ink-on-paper, no animation, dither/hatch language instead of color. Designed so Stage 2 doubles as a faithful preview of the eventual Inkplate 10 kitchen display. Keyboard nav (`1`–`5`, `j/k`, `/`, `?`), Ask-POiO input on Today, Mode-1 narrowing question on suggestion pick.

### 2. [`editorial-cookbook/`](editorial-cookbook/) — Print food zine
Serif display type (DM Serif Display / Fraunces), warm paper palette, saffron/chipotle/charred/lime/crema accents, Unsplash photography with gradient fallbacks if the CDN fails. Numbered chapter marks, sticky scroll-spy nav. Editorial voice that still answers to the keyboard (`1`–`5`, `j/k`, `/`, `?`). Click any pantry row to cycle status.

### 3. [`terminal-dense/`](terminal-dense/) — TUI in the browser
Monospaced (JetBrains Mono), light parchment by default with a dark theme on `t`. Real vim-style keyboard model (`1`–`5`, `j/k/g/G`, `enter`, `space`, `/`, `?`). Five panes mapped to the five views. Live `/`-to-find pantry overlay, `space` to cycle status, ingredient diff against pantry on the recipe view.

### 4. [`chat-conversational/`](chat-conversational/) — Conversation as front door
Six destinations in a left nav rail (Today / Suggestions / Recipe / Pantry / Shopping / Chat). Today is the boot view; Chat is one of the destinations, not the whole app. Quick-reply chips numbered with keyboard hints. Pantry mutations from chat propagate visibly. Four wired recipes; honest stubs for unwired picks.

## What's in each folder

```
<direction>/
├── index.html          # single-page prototype
├── styles.css          # (terminal-dense uses style.css)
├── app.js              # vanilla JS
├── data.js             # (chat-conversational only)
├── README.md           # design rationale + v2 changelog
├── CRITIQUE_from_eink-glance.md
├── CRITIQUE_from_editorial-cookbook.md
├── CRITIQUE_from_terminal-dense.md
└── CRITIQUE_from_chat-conversational.md
```

The three `CRITIQUE_from_*.md` files in each folder are the peer reviews received in round 2 — the design's `README.md` ends with a `## v2 changelog` listing which were accepted and which were rejected (with reasoning).

## How they were built

1. **Round 1 — parallel design.** Four agents, four briefs, four folders. Each built a v1 prototype demonstrating Today / Suggestions / Recipe / Pantry / Shopping with realistic mock data drawn from `pantry.example.md` and `references/style-guide.md`.
2. **Round 2 — cross-critique.** Each agent reviewed the other three through the lens of its own design values, dropping a uniquely-named critique file into each target folder (no write conflicts).
3. **Round 3 — revision.** Each agent read its three incoming critiques and produced v2 in place. Recurring complaints (no Mode-1 narrowing question, no keyboard nav, voice flattened, Spanish food terms translated, unrealistic pantry data) got fixed across the board; thesis-violating suggestions got documented rejections.

All four prototypes survived round 3 with their original theses intact and the recurring weaknesses addressed.
