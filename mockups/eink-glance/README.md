# E-ink Glance — POiO UI Prototype

A Stage-2 web prototype designed as if it were already running on the Stage-3 target hardware: a 9.7" Inkplate 10 e-ink display by the kitchen wall.

Open `index.html` in a browser. No build step, no dependencies beyond two Google Fonts.

## The idea

A surface you **glance at while cooking**, not a thing you tap through. Newspaper-meets-Kindle, with the pantry and tonight's dish laid out like a single broadsheet page. The five views (Today / Suggestions / Recipe / Pantry / Shopping) all share one visual grammar so the eye learns it once.

## Design rationale

- **Newspaper masthead.** "POiO" sits as a big nameplate with date, region, season, and last refresh time aligned in monospace on the right. It frames the screen as a *daily edition* rather than an app.
- **Single-page mindset per view.** No scroll-driven reveal. Information is composed so the most useful pieces (tonight's dish, pantry snapshot, shopping count) live above the fold of a 9.7" screen.
- **Pure ink, pure paper.** Two colors only: ink `#1a1816` on paper `#f4efe4`. The desk surface around the device is a slightly darker paper tone so the screen feels lifted.
- **Two typefaces.** Spectral (serif) carries all reading content; JetBrains Mono carries all UI chrome (kickers, stats, status pills, footer). The contrast between the two does the visual work that color usually does.
- **Hairlines, not fills.** Borders, rules, and dotted dividers organize the page. Solid black is reserved for emphasis: today's hero bar, the active tab, the "today's pick" badge, status pills for `plenty` items.
- **Dither and hatch in place of gray.** The Stage-3 device doesn't have smooth grays available cheaply, so the prototype already avoids them. The pantry-snapshot bars on the Today view use:
  - solid ink for `plenty`
  - 45° diagonal hatch for `low`
  - sparse dot dither for `out`
  This same pattern language repeats in the pantry status pills and shopping-list `dot-low` / `dot-out` markers, so the visual encoding is consistent across every view.
- **Generous whitespace + dense type.** Standing in the kitchen at arm's length, you need to absorb a recipe step or a shopping section in one look. Bigger leading and ingredient-quantity columns aligned in mono make it scannable.

## E-ink constraints respected

| Constraint                                | How the design honors it                                      |
|-------------------------------------------|---------------------------------------------------------------|
| Monochrome / 16-level grayscale at best   | Two tones only. Dither/hatch where "gray" would be tempting.  |
| Slow refresh, ghosting                    | Zero transitions, zero animations, no hover-state movement.   |
| Partial refresh only                      | Each view is composed as a static page; tab switches are full repaints that would map cleanly to a partial refresh region per panel. |
| No backlight, ambient viewing             | High contrast, big type, calm composition. No glow effects.   |
| Battery-conscious                         | Static content, no polling or live tickers in the UI.         |
| 1200 × 825 native resolution              | Layout caps at 1200px wide; type sizes chosen for ~150 dpi.   |
| Black-and-white photo would feel jarring  | No imagery. The recipe is described in language, not pictures.|

## Voice and content

All copy is in POiO's voice — sensory, confident, Spanish food terms left untranslated (epazote, media crema, elote, cotija, bolillo, salsa macha). The sample recipe ("Chipotle & Media Crema Thighs over Charred Elote Rice") follows the exact format defined in `SKILL.md`: Vibe / Time / Serves / What You Need (by category) / Method (with sensory cues) / The Finish / Pantry Notes. The suggestion list demonstrates Mode 1: 6 directions with a quick option, a slow-cook option, a seasonal option, and an adventurous fusion option. Shopping demonstrates Mode 2: Restock / Top up / Seasonal picks / Unlock new dishes.

Mock data is drawn from `pantry.example.md` categories and the Guadalajara / Western Mexico regional context (May = pre-rainy season, mango peaking, elote starting, squash blossoms appearing).

## Trade-offs

- **Filters are click-only.** On the real device you'd want hardware buttons; in the browser the filter chips give an honest preview of what those button labels would say.
- **A "Today" view that mixes hero + side panels** is busier than a strict e-ink purist would attempt. The compromise is intentional — Stage 2 is a desktop browser and the user wants more density there. The same layout on Inkplate would split into two slightly simpler frames you toggle between.
- **`link-button` hover state inverts to ink.** Hover doesn't exist on the e-ink device, but for the browser prototype I kept a single readable affordance. It's the *only* color-change interaction anywhere in the UI.
- **The "Snapshot" bar fills use CSS dither patterns** that render imperfectly in some browsers (subpixel rounding). On real e-ink with crisp pixel-snapping they'd look sharp; this is a faithful-but-imperfect preview.
- **No print stylesheet effort beyond basics.** A future pass could make `cmd-P` produce a clean shopping-list printout — the structure is already there.

## Files

- `index.html` — single page, five views, hash-nav (`#today`, `#suggestions`, `#recipe`, `#pantry`, `#shopping`)
- `styles.css` — all of the visual language
- `app.js` — view switching + pantry filter, ~50 lines, no framework

## Run

```bash
open index.html
```

Or serve any way you like — no build step.

## v2 changelog

Three peer mockups reviewed this one (`editorial-cookbook`, `terminal-dense`, `chat-conversational`). The common ground across critiques was clear, and a few single-source critiques were strong enough to act on alone. What follows is what changed and why, then what didn't and why not.

### Accepted

- **Keyboard nav + ARIA tabs** *(terminal-dense, must-fix #1 and #2)*. The tabs now carry `role="tab"`, `aria-selected`, `aria-controls`, and a roving tabindex. Keys `1`–`5` switch views; `j`/`k` and `↑`/`↓` move between suggestions; `enter` picks the focused suggestion; `/` focuses the Ask POiO field; `p` jumps to pantry filters; `?` opens a help overlay; `esc` closes it. Each tab also shows its number in a small badge so the shortcut is discoverable. This was the biggest single gap in v1 — for a "glance not scroll" design, having to reach for the mouse on a desktop browser undermined the thesis.

- **Pantry as data, not literal HTML** *(terminal-dense, must-fix #3)*. `app.js` now holds a `PANTRY` array; columns, the priority strip, snapshot bars, filter chip counts, and the shopping count are all computed from it. Snapshot bar widths come from real percentages instead of hardcoded values. Adding or moving an item is a one-line edit.

- **POiO voice in the dashboard chrome** *(editorial-cookbook, must-fix #2)*. `FEASIBILITY: Full pantry hit` → `Pantry · You have everything`. `Pre-rainy · Wk 21` → `mango season, just starting`. `REFRESH: 06:14 today` → `last look · 06:14 this morning`. Meta keys (`DATE`, `SEASON`, `REGION`) drop the all-caps mono shoutiness for small-caps lowercase. The hero kicker now reads `Tonight · a Tuesday cook`. The recipe method gained explicit SKILL.md cues ("char it until it catches", "until it smells nutty and you can't help leaning in"). Spanish food terms stay untranslated everywhere (epazote, elote, media crema, salsa macha, bolillo, mercado, tianguis, panadería, queso Oaxaca).

- **"Use these first" priority strip on Pantry** *(editorial-cookbook, must-fix #3)*. Pantry now opens with a hatched-background block listing all `low` items at the top, each annotated with a short reason to cook them now ("crumble over tonight's thighs", "drizzle, finish the jar over mango tacos"). This is the missing thread between *what you have* and *what to do about it* the editorial critique pointed at.

- **Mode-1 Step-4 narrowing question** *(chat-conversational, must-fix #2)*. Picking a suggestion (click or `enter`) reveals one focused question inline, with two options framed in POiO voice ("Crunchy and charred / Saucy and tender"; for the gochujang-out suggestion, "Swap to chile-honey glaze / Skip — pick another"; for the salsa-macha-low one, "Full pour, finish the jar / Stretch it — just a drizzle"). Choosing an option opens the recipe view. The most identity-defining interaction in SKILL.md now exists.

- **Intent entry on Today** *(chat-conversational, must-fix #1)*. A single "Ask POiO" field at the bottom of the hero accepts free text and echoes it back as an acknowledgement, with placeholder examples matching SKILL.md ("what should I cook?", "I bought poblanos", "make me a chipotle-lime bowl"). Pressing `/` from anywhere focuses it. Kept to one location — every-view input would have clobbered the glance discipline.

- **Lightweight pantry status cycle** *(chat-conversational, must-fix #3)*. Clicking a pantry status pill cycles `plenty → low → out → plenty`. Snapshot, priority strip, and counts recompute. Treated as a preview-only affordance (`pantry.md` is still the source of truth, the engine writes it), but the gesture exists so the architecture's "pantry mutates" assumption is visible in the prototype.

- **Pantry data realism** *(prompt note)*. Added Salt, Black pepper, and Olive oil as explicit `plenty` staples. Cleaned the spice list so foundational items are obviously stocked. The `out` set now reads like reasonable shopping (specialty Oaxaca cheese, gochujang, tahini, sumac, couscous, bolillo, pasilla, whole chicken, olives, epazote, cilantro) — not "the salt is gone."

- **`m-warn` hatched chip on suggestions whose key ingredient is `out` or `low`** *(synthesis)*. Suggestions 02 (gochujang), 05 (tahini), 06 (epazote) wear a hatched warning chip pointing at the missing item, which is what the narrowing question then addresses. Reuses the existing dither/hatch vocabulary instead of inventing a new color.

- **Snapshot widths driven by real counts** *(terminal-dense, weakness #5)*. The "62% / 18% / 20%" hardcoded widths are gone; the bars compute from the same data the columns render from.

- **`hero-actions` row** *(synthesis from chat + editorial)*. The hero now offers both "Open full recipe →" *and* a dashed "Not this — show me others" button that jumps to Suggestions. The Today view stops feeling like a fait accompli without breaking the at-a-glance shape.

- **Shopping checkboxes that actually check** *(synthesis)*. Click a checkbox to mark items off; the row strikes through. Small but the v1 boxes were inert.

### Rejected (with reasoning)

- **Add photography / illustration to the recipe** *(editorial-cookbook, must-fix #1)*. Rejected. The whole Stage-3 thesis is monochrome ambient on a 9.7" Inkplate where photos would render as harsh bitonal blobs or noisy halftones that ghost on partial refresh. The README explicitly took the "no imagery, the recipe is described in language" position, and the recipe copy is doing the work imagery would. A line-illustration option was considered, but adding it to the Stage-2 preview while excluding it from Stage-3 would create two divergent designs and undermine the "Stage 2 is the dress rehearsal for Stage 3" framing. The editorial critique is right that the page is austere — that's the trade.

- **"Conversational input on every view"** *(chat-conversational, expansive read of must-fix #1)*. Partially accepted: kept to one prominent entry on Today. Putting an input on every panel would turn an ambient glance surface into a chat app and contradict the design's central claim. The Ask field on Today plus `/` as a global shortcut covers the intent without cluttering Pantry / Shopping / Recipe.

- **"Step-4 narrowing should be a separate page, not inline reveal"** *(implied by chat-conversational)*. Rejected — the e-ink target wants minimal repaints. Revealing the question in place on the Suggestions page is one partial refresh; navigating to a separate step-4 page would be two and the journey would feel longer than a five-step dialog should.

- **Auto-collapsing inline display:none for filters** *(terminal-dense, weakness #4)*. Accepted in spirit, not in form — kept inline `display` mutations off entirely and switched to a `.hidden` class. The fix is in `applyFilter` now.

- **`role="tablist"` ARIA quibble that hover-state inverts** *(implied by terminal-dense)*. The link-button hover is the only color-change interaction in the UI. The README already names it as a deliberate desktop affordance. The Inkplate firmware will simply omit `:hover` entirely. Kept as-is.

### Footnotes

- The design's core thesis — Stage-3 portability, two-color, ambient, no animation, dither/hatch instead of gray — was not relaxed anywhere in v2. Every new element (priority strip, narrow box, ask bar, help card) uses the same ink/paper/rule/dither vocabulary.
