# Critique — terminal-dense (from eink-glance)

Read as someone who cares about density, calm, glanceability, and whether any of this could survive the trip to a 9.7" monochrome Inkplate.

## Strengths

- **Density is real and earned.** The Today view (`index.html:42-168`) puts the dish, pantry health bar, shopping bucket counts, seasonal availability, and last-week's cook history on a single screen. Of the four mockups this is the only one I could actually glance at and absorb in one second.
- **Status vocabulary is honest and color-blind aware.** Triple-encoded status (color + glyph `● ◐ ○` + word) at `index.html:138-144` and `style.css:262-271` is genuinely accessible. The same vocabulary recurs in tables, bars, and dots — that consistency is the whole game for ambient UI.
- **The pantry table works.** Filter + category + sort chips, live `/` find overlay (`app.js:419-452`), keyboard navigation, status-cycle on space — this is the only pantry view in the four mockups that treats pantry as data to operate on, not decoration. 71 items in one scrollable table beats grouped cards on every metric.

## Weaknesses

- **The amber status bar is the loudest thing in the room and never goes away.** `#statusbar` is `background: var(--accent)` (`style.css:521-526`) — a saturated amber strip pinned to the bottom of every view. In a "calm" interface the chrome should yield to the content; this does the opposite. It also fights the same amber used for `low` status and the `[ TODAY'S DISH ]` pane title, so semantic amber loses meaning.
- **Voice gets crushed by the format.** The recipe vibe at `index.html:271` ("Sticky, smoky thighs smashed flat…") is good prose locked inside a 12.5px monospace `<p>` with a 2px amber left border. Compare against SKILL.md's "until it smells like toasted cumin and you can't help leaning in" — that line wants air, not `border-left: 2px solid var(--accent)`. The ASCII header `╔══╗` at `index.html:264-268` is the tell: it's cosplaying a man page over a recipe.
- **`overflow: hidden` on `html, body` (`style.css:56-66`) locks the whole app to viewport height.** That's a TUI tic that breaks the actual cooking case (long recipe + ingredient panel on a laptop screen). On a 13" MacBook the recipe pane gets its own scrollbar inside a fixed shell — fine for `k9s`, awkward for prose.
- **Data duplication smells like a real bug.** The Today pane says "chipotle in adobo plenty" (`index.html:61`) but the pantry table has chipotle as "plenty" with a "star ingredient" note (`app.js:74`), while the Shopping > Restock list claims chipotle is restock-worthy implicitly via "for the braise riff" notes. The summary counts (42/11/18 at `index.html:83-85`) are also hardcoded in HTML and don't match what `app.js` would compute from the array.
- **Stage-3 portability is mid.** The monospace grid, dots/glyphs, and ASCII chrome translate beautifully to a 1200×825 monochrome panel. But the entire interaction model is keyboard-first — and Stage 3 is a wall-mounted e-ink screen with no keyboard. The README says the typography translates; the *affordances* don't.

## Top 3 must-fix

1. **Make the status bar quiet.** Use the dark/light bg with an amber `NORMAL` mode chip, not a saturated amber slab. Reserve full-amber for actual modal state (FIND, HELP) so the brightness encodes "you are in a mode" instead of "you are running this app."
2. **Compute the summary counts from the data.** `index.html:83-85` and `index.html:122-126` are hardcoded numbers that will silently drift from the `PANTRY` array. `app.js` already computes counts at line 357 — render them into the Today panes too, or move that markup into JS-rendered partials.
3. **Sketch a no-keyboard fallback for the Today view.** If this design is the Stage-2 client and a model for Stage 3, the Today screen needs to be readable and complete with zero keypresses. Right now the entire affordance set (`[3]` open · `[s]` swap · `[m]` cooked at `index.html:67-69`) is keyboard-coded and the e-ink device will have none of that. Add tap targets or just admit the design is laptop-only.

## One thing I'd steal

The **pantry health bar + 3-stat row** in the Today view (`index.html:81-95`). Three big numerals (42/11/18) above a single-row stacked-bar visualization is the most information-dense, glanceable pantry summary in any of the four mockups. On a monochrome Inkplate this works as solid/dithered/empty fill in the same bar, with the numerals doing the literal work. It's the only "ambient stat" I'd steal verbatim.
