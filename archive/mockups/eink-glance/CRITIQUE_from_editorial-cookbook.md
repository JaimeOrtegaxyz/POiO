# Critique from editorial-cookbook

Reviewed: `index.html`, `styles.css`, `app.js`, `README.md`.

## Strengths

- **The newspaper conceit is committed-to and elegant.** The masthead at `index.html:18–30` — kicker "No. 142 · The Kitchen Wall," brand at 88px Spectral, meta-row in JetBrains Mono — frames the screen as a daily edition rather than an app, and that framing actually changes how the eye moves. Spectral + JetBrains Mono is a smart, restrained pairing.
- **Hatched/dithered status encoding is genuinely clever.** The fact that `low` is a 45° hatch and `out` is a sparse dot dither (`styles.css:347–362`, `:733–738`) — repeated across the snapshot bar, pantry pills, and shopping dots — is the kind of visual grammar that pays off the longer you look at it. It's the rare e-ink decision that's also beautiful.
- **The recipe page genuinely sings.** Vibe line at `index.html:221` ("Smoky and creamy, lime-bright, weeknight-fast"), the imperative method ("Pickle the onion first, walk away.", "Season the thighs hard."), and the finish paragraph at line 302 ("eat immediately while the skin is still loud") hit the SKILL.md voice cleanly. The "wet brick" color note at line 293 is the kind of sensory writing this product needs more of.

## Weaknesses

- **No photography, no illustration, no food at all.** The README at line 35 declares "No imagery. The recipe is described in language, not pictures" — and on a Stage-3 e-ink wall this is defensible, but as a Stage-2 browser preview it leaves the design feeling austere where it could feel appetizing. A casual home cook lands here and sees a broadsheet about food, not food itself.
- **The hero title typography is doing too much work alone.** At `styles.css:218–225` the hero is 54px Spectral with -0.02em tracking, and on the Today view (`index.html:46`) it carries the entire emotional weight of "tonight's dinner" with no visual anchor below it. The 8px black `hero-bar` (`:263–268`) is meant to anchor but reads as an industrial divider, not a culinary one.
- **Voice slips into infographic in places.** "FEASIBILITY: Full pantry hit" (`index.html:53`), "Strong on Latin + Asian anchors. Light on Mediterranean dairy." (`:84`), and the masthead's "REFRESH: 06:14 today" feel like a dashboard, not a friend. SKILL.md says "never clinical" — these read clinical.
- **Pantry view is a phonebook.** Three CSS columns of dotted-rule rows (`styles.css:687–720`) with mono status pills. Functional, dense, but joyless. No grouping by what's about to expire, no "you've got everything for X" thread back to suggestions.
- **The "Pre-rainy · Wk 21" masthead meta is too abstract.** Real cooks think "mango season," not "Wk 21." The right copy is already on the page lower down ("Mangoes are at peak") — push it up.

## Top 3 must-fix for v2

1. **Add one piece of imagery per recipe** — a single high-contrast monochrome line illustration or halftone food photo above the hero title. The print-paper conceit actually invites it (think Edward Tufte / *Apartamento* / Lucky Peach). Keeps the e-ink discipline; breaks the austerity.
2. **Rewrite the dashboard chrome in POiO voice.** Replace "FEASIBILITY: Full pantry hit" with "you have everything"; "Pre-rainy · Wk 21" with "mango season, just starting." The recipe body proves you can write — let the chrome speak the same language.
3. **Make the pantry feel alive.** Group `low` items at top with a one-line "use these first" prompt; let each `out` item link to "what would this unlock?" Right now the pantry view is the weakest copy on the page because there isn't any.

## One thing I'd steal

The dither/hatch language for status (`styles.css:347–362`). It's a non-color vocabulary that scales from a tiny dot to a full bar and back, and it would translate beautifully onto a cookbook spread as a printer's mark.
