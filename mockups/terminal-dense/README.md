# POiO :: terminal-dense (UI mockup)

A working HTML/CSS/JS prototype for POiO in a **Terminal Dense** style — `k9s` / `lazygit` / `htop` / `gh` rendered in a browser. Monospace everywhere, ASCII-bordered panes, vim-style keyboard navigation, no icons, one accent color (amber) with green/amber/red status semantics.

Open `index.html` directly in any modern browser. No build step. No frameworks. Vanilla JS.

```
mockups/terminal-dense/
├── index.html   markup + content (one realistic recipe, populated pantry, etc.)
├── style.css    theme tokens (dark + light), pane chrome, tables, chips, status bar
├── app.js       keyboard handling, view switching, pantry filter/sort/find, state
└── README.md    this file
```

## Design rationale

POiO is, at heart, a small data tool that lives at the boundary of "personal markdown files" and "an opinionated cook." A TUI maps cleanly onto that:

- **Pantry is a table.** Status, category, note. Filter and sort are the dominant operations.
- **Suggestions are a ranked list.** `j/k` to scan, `enter` to open.
- **Recipes are structured documents.** The format is already defined in `SKILL.md`; the only job of the UI is to render it densely and let the eye scan.
- **Shopping is four bucketed lists.** The four lists from Mode 2 map one-to-one onto four panes.
- **Today is a dashboard.** Pure scan: dish summary, pantry health, shopping count, season, recent cooks.

The TUI vocabulary also matches POiO's voice in Stage 1: it lives in Claude Code, in a terminal. A browser UI that *feels* like the terminal is less of a context switch than a "real" web app — and is honest about the prototype being a sketch.

### Color and type

- **Type:** JetBrains Mono → IBM Plex Mono → SF Mono / Menlo fallbacks. ~12.5px base, tight line-height.
- **Accent:** amber (`#f5a623`) — also doubles as the `low` status color, intentional.
- **Status:** green for `plenty`, amber for `low`, red for `out`. Same palette across stats blocks, tables, bars, and dots (`● ◐ ○`).
- **Two themes:** dark (default, near-black background) and light (parchment/solarized-leaning). Toggle with `t`.
- **No icons.** Status uses dots/glyphs. ASCII box-drawing for the recipe header.

### Density

Every view tries to put the maximum useful information on one screen. The Today view is a 5-pane grid; Suggestions is list + detail (à la mutt / ranger); Pantry is one full-width sortable table; Shopping is a 2×2 of the four mandated lists. Recipe is the only place we let things breathe a little — that content is the payoff.

## Keyboard commands

Visible at all times in the status bar. The full set:

| key            | action                                            |
|----------------|---------------------------------------------------|
| `1` .. `5`     | jump to view (today / suggestions / recipe / pantry / shopping) |
| `h` / `l`      | previous / next view                              |
| `←` / `→`      | same                                              |
| `tab` / `S-tab`| cycle views                                       |
| `j` / `k`      | move selection down / up                          |
| `↓` / `↑`      | same                                              |
| `g` / `G`      | jump to top / bottom of list                      |
| `enter`        | open recipe (from today/suggestions); cycle status (pantry) |
| `space`        | cycle pantry status (`plenty` → `low` → `out`)    |
| `/`            | open find overlay (filters pantry live as you type) |
| `s`            | swap today's suggestion                           |
| `m`            | mark today's dish as cooked (status-bar flash)    |
| `t`            | toggle theme (dark / light)                       |
| `?`            | help modal with all bindings                      |
| `esc`          | close overlay / help                              |

Click is supported everywhere (tabs, rows, chips, checkboxes), but the prototype is designed to be fully operable from the keyboard.

## What's mocked (and what isn't)

**Mocked, but plausible:**

- Pantry data is drawn from `pantry.example.md` with statuses set to give a realistic mix (42 plenty / 11 low / 18 out). Real production would read `pantry.md`.
- Seven dish suggestions, each anchored to a flavor family and assembly pattern from `references/style-guide.md`. Star ingredients reference real pantry items (chipotle in adobo, chile ancho, gochujang, etc.).
- One fully written recipe — *Chipotle-Honey Smashed Thighs, Charred Elote Bowl* — following the exact format from `SKILL.md` (Vibe → What You Need → Method → The Finish → Pantry Notes), with sensory cues, technique flags, and a swap section.
- Shopping view: the four mandated lists (Restock / Top up / Seasonal picks / Unlock new dishes), each populated with items that round-trip back to the pantry data.

**Not mocked:**

- No actual call to the engine. There's no Anthropic client; suggestions are static.
- No persistence. Status changes via `space` mutate in-memory state only and reset on refresh.
- No real `pantry.md` parsing. The pantry array is hand-curated in `app.js`.

## Trade-offs

- **Monospace cuts both ways.** It's perfect for dense tabular data and ASCII chrome, but recipe prose loses a little warmth. We lean into it by treating the recipe like a `man` page rather than a magazine spread — the alternate style ("editorial-cookbook") covers the other extreme.
- **No icons** means status is always color + glyph. Color-blind users get the glyph (`● ◐ ○`) and the word (`plenty / low / out`) every time the status appears.
- **Keyboard-first** means new users need a moment to read the status bar. `?` is one keystroke away, and click works as an escape hatch.
- **Single-screen density** means very small viewports collapse to one column; below ~960px the multi-pane layout stacks vertically. The prototype is built for desktop / laptop screens — which matches where Stage 1 lives today (the terminal).
- **No build step** means everything is hand-written CSS/JS in three files. There's some duplication (e.g., the recipe ingredient list also appears in the right-side ingredient-check panel), which a real implementation would derive from a single source of truth.

## Where this design would fit

This treatment is a strong fit for **Stage 2** (local web app) when the target user is the same person who already lives in Claude Code — opinionated, keyboard-driven, fast. For Stage 3 (e-ink kitchen device) the density and color use need to thin out dramatically, but the typographic grid and dot/glyph status vocabulary translate well to a 1200×825 monochrome panel.

## v2 changelog

Three peer critiques came in (from `eink-glance`, `editorial-cookbook`, `chat-conversational`). What follows is what changed and what didn't.

### Accepted

- **Quieter status bar.** Every critique flagged the full-amber slab pinned to the bottom as a "Windows 95 caution stripe." v2 makes the status bar match the rest of the chrome (`var(--bg-2)` with muted text), and reserves the amber/red highlight for the `[MODE]` chip *only when* a modal state is active (`FIND`, `HELP`). Brightness now encodes "you are in a mode," not "you are running this app." (`style.css` `#statusbar`, `app.js` `setMode()`)

- **Light theme is the default, retuned warmer.** Editorial called the dark-by-default a "server-room palette" and the old light theme "solarized parchment." v2 swaps the default to a warmer paper (`#f4ecdc`), a deeper chile-red accent (`#b1442a`) instead of amber, and leaf-green / amber / chile-red status colors that read like food rather than a Grafana dashboard. Dark is still one keystroke away (`t`).

- **Pantry data feels lived-in.** Editorial and eink both pointed out that salt, garlic, white onion, and Mexican oregano marked `out` made the kitchen look ransacked. v2 moves all four back to `plenty`, plus limes (which the recipe insists on). The `out` items now read realistically: whole chicken (no weekend project queued), bone-in thighs (used the last for tinga), bolillo (bakery run), gochujang (unlock ingredient), chile pasilla, epazote (seasonal). The kitchen now reads like an actual Guadalajara cook's pantry between shop runs.

- **Stop translating Spanish food words.** Chat critique was direct about this — SKILL.md is explicit. v2 drops every parenthetical gloss: `elote (corn on the cob)` → `elote`; `Tomatoes (jitomate)` → `Jitomate`; `Canela (Ceylon cinnamon)` → `Canela`; `Tajin` → `Tajín`; `Chile de arbol` → `Chile de árbol`. The user knows what these are; the UI no longer apologizes for them.

- **Voice restored in the recipe.** Editorial said monospace was flattening sensory copy and the ASCII box header was "cosplaying a man page over a recipe." v2 drops the `╔══╗` box and the `chipotle-honey-smashed-thighs.md` filename, gives the recipe a real title at 20px with a sub-meta line, lifts the `vibe` paragraph to a hero block with a thicker accent border, gives method steps more line-height and a `max-width: 70ch` so prose breathes. Specific sensory lines added back: "char it until it catches," "until the kitchen smells toasted and a little smoky," "drag it, don't dollop." Kept monospace as the body — the TUI thesis is the whole point — but loosened the grid so the writing can land.

- **Today summary counts are computed from data.** Eink flagged this as a bug-in-waiting — `42/11/18` was hardcoded in HTML and the shopping counts didn't round-trip. v2 renders all of it (`#today-stats`, `#today-bar`, `#today-legend`, `#today-low`, `#today-shop-stats`, `#today-shop-kv`) from the `PANTRY` array on every view-switch. Cycling status with `space` now updates the Today dashboard, the shopping lists, and the recipe ingredient check live.

- **Pane titles softened.** Chat called `[ TODAY'S DISH ]` and `[ SEASON ]` "developer-console" affect. v2 keeps the `pane-title` accent color (a TUI hallmark) but drops the brackets and the all-caps screaming: `today's dish`, `pantry`, `tianguis · may`, `recent cooks`. The keyboard model survives; the chrome translates from `[ SECTION ]` to `section ·`.

- **Recent cooks: stars out, notes in.** Editorial flagged the 5-star ratings as a habit-tracker tic that ran against the "knowledgeable cooking friend" persona. v2 replaces `★★★★☆` with a one-line voice note per cook: "glaze caught hard, repeat," "good, not memorable," "tomatillo / cotija / done." Reads like a cooking diary instead of an app review.

- **Mode 1 step-4 narrowing question added to suggestions.** Chat correctly identified this as the most distinctive interaction in SKILL.md, short-circuited in v1 (pressing enter went straight to recipe). v2 adds a `narrowing` block to the suggestion-detail pane: a focused question (per-dish, voice-matched) and two/three answer chips. Keyboard: `1` / `2` / `3` on the suggestions view picks an answer; `enter` then opens the recipe. The chip ships with a sub-note so the cook understands what each branch means ("hard sear, almost-burnt glaze" vs "lower oven, longer glaze").

- **Shopping lists derive from PANTRY.** Eink noted the duplication between Today's bucket counts, the Shopping panes, and the underlying array. v2 renders Restock from `PANTRY.filter(p => p[2] === 'out')` and Top Up from `'low'`, with a `STAPLE_NOTES` lookup that preserves the voice-y annotations ("wait for it at the tianguis — worth it"). Seasonal picks and Unlock-new-dishes stay hand-written — those need editorial judgment, not pantry filtering.

- **Recipe ingredient check rendered live.** The right-pane diff now reads from `PANTRY` via a `RECIPE_INGREDIENTS` mapping, so cycling a pantry status updates the diff and the bottom summary ("all required items in stock" / "missing one or more required items"). Closes the duplication eink flagged.

### Rejected (with reasoning)

- **"Add a chat / command input as the primary verb."** (chat-conversational) — Rejected. A `>` prompt at the bottom that accepts natural language is the entire thesis of the `chat-conversational` mockup. If terminal-dense adopts it, the two designs collapse into one. The keyboard-first TUI is the differentiating bet here; the narrowing-question flow (now in place) honors the spirit of "let the user steer the conversation" without trading away the genre. SKILL.md's three modes can be reached via direct keyboard verbs (`1-5` for views, `s` to swap, `space` to update pantry, `/` to search) and via the narrowing chips on suggestions.

- **"Sketch a no-keyboard fallback for the Today view."** (eink-glance) — Rejected for this prototype. Eink is right that Stage 3 is wall-mounted and has no keyboard, but Stage 3 is *what the eink-glance mockup itself is for*. Terminal-dense is explicitly the Stage 2 client for the laptop-in-the-kitchen / power-user case. Putting tap targets here would water down both designs. The README's "Where this design would fit" section already says this; v2 keeps the line.

- **"Give the recipe a serif body."** (editorial-cookbook) — Rejected, partially accepted. A proportional serif inside the TUI shell would feel like a CSS reset bug. Instead, v2 widens the line-height, raises the font-size from 12.5px to 13px on recipe body, sets a 70ch max-width on method steps, and lifts the vibe to a hero. The prose breathes inside the monospace; the genre stays intact. If the cook wants a magazine layout, `editorial-cookbook` is one repo over.

- **"Remove `overflow: hidden` on html/body entirely."** (eink-glance, partial) — Partially accepted. v1 locked the whole app to viewport height (TUI tic). v2 changes `html, body` to `min-height: 100vh` and lets the stage scroll naturally — so a long recipe on a 13" MacBook is now a normal page scroll instead of a nested inner scrollbar. The dashboard still feels like a single screen on desktop because the grid is sized to fit, but it no longer fights the cook on smaller laptops.

- **"Drop `m` / `s` for mark-cooked / swap because they're vim-shaped solutions to sentences."** (chat-conversational) — Rejected. These are exactly the keyboard verbs the genre exists to provide. They appear in the bottom status bar and the `?` help modal; they are not hidden. Removing them to push the cook toward natural-language input would betray the design's whole reason for existing. The chat-conversational mockup is right to have those as sentences; terminal-dense is right to have them as keys.
