# Critique of `eink-glance/` — from `terminal-dense`

Reviewed: `index.html`, `styles.css`, `app.js`, `README.md`.

## Strengths

- **The constraints make the design honest.** Ink-on-paper, no animations, dither/hatch instead of gray (`styles.css:344-362`) — the visual language is internally consistent and would map cleanly to the Inkplate 10 it's designed for. The same encoding (solid / hatch / dither) repeats in pantry pills, snapshot bars, and shopping dots. That's real design discipline.
- **Information density per view is genuinely good.** The "Today" hero packs vibe, four stats, three callouts, a pantry snapshot, a shopping count, and seasonal produce above the fold (`index.html:42-112`). For a glance surface, that's a lot of useful signal without feeling busy.
- **Recipe layout uses the print idiom correctly.** Two columns (ingredients left, method right, `styles.css:543-555`) with mono quantities aligned in a 60px gutter (`styles.css:583-596`) — scans the way a paper recipe scans, no inline-flex wrapping nonsense.

## Weaknesses

- **Zero keyboard navigation.** `app.js:23-28` only wires a click handler delegated from `data-view`. No arrow keys, no `1..5` to jump tabs, no `/` to filter the pantry. For a "glance, not scroll" design, the irony is that on a desktop browser you must reach for the mouse to switch any view.
- **Tabs have a `role="tablist"` but no ARIA wiring.** Buttons (`index.html:33-39`) are missing `role="tab"`, `aria-selected`, `aria-controls`, and tab keys do nothing in JS. Screen readers will announce "tab list" then five unrelated buttons.
- **All five views render to the DOM at boot and toggle via `display: none`** (`styles.css:168-169`). The recipe view alone is ~100 lines of markup; pantry has ~60 hardcoded `<li>` items (`index.html:340-444`). It's fine for a single-screen e-ink, but the architecture promised "partial refresh per panel" in the README and the DOM doesn't reflect that — it's one giant payload.
- **Pantry filter hides categories with `cat.style.display = 'none'`** (`app.js:48-50`), mutating inline styles instead of a class. It works, but it leaks state — `display: ''` later won't restore a non-default `display`. Minor, but it's the kind of thing that bites you.
- **Snapshot bar widths are hardcoded** (`index.html:80-82`: `width:62%`, `18%`, `20%`) and don't match the numbers (38/11/12 = 62.3/18.0/19.7, but `18%` for 11 of 61 is closer to 18% — actually fine, but easy to drift out of sync with the pantry list since one is JSON-less HTML and the other is also HTML).
- **"Filters are click-only" is admitted in the README**, but the trade-off shouldn't apply on the Stage-2 desktop preview. Hardware buttons are months away — the desktop deserves keyboard parity now.

## Top 3 must-fix

1. **Wire `1`/`2`/`3`/`4`/`5` to switch views and `j`/`k` (or arrows) to move between suggestion items / pantry rows.** This is the single biggest gap between the design's stated calmness and how it actually feels in a browser.
2. **Fix the tabs ARIA.** `role="tab"` on the buttons, `aria-selected="true"` on the active one, `aria-controls` pointing at the panel ids, focus management on activation. Five lines of JS.
3. **Make pantry data a JS array** (like `editorial-cookbook/app.js:13` does) instead of 100 lines of literal `<li>` HTML. The render path stays static, the data stays editable, and the snapshot percentages can compute themselves.

## One thing I'd steal

The **status-encoding language** — solid ink / 45° hatch / sparse dither — applied consistently across the snapshot bars, the pantry pills, and the shopping dots. It does the work color would normally do, without color. Terminal palettes already have an equivalent (bright / dim / strikethrough), and I should commit to using mine that consistently instead of leaning on whatever ANSI hue happens to be left over.
