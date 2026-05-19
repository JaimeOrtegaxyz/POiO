# Critique — editorial-cookbook (from eink-glance)

Read as someone who cares about density, calm, glanceability, and whether any of this could survive the trip to a 9.7" monochrome Inkplate.

## Strengths

- **Voice and prose are the best of the four.** The lede in `index.html:48-53` ("mangoes at the tianguis are dripping… media crema… chipotle in adobo whispering from the door shelf") is the closest any mockup gets to the SKILL.md persona. The pull-quote system is a genuinely good editorial idea.
- **Recipe spread layout is well-thought-out.** Sticky ingredient sidebar against scrolling method (`styles.css:564-570`) is the right ergonomic move for actually cooking from a screen, and the four ingredient groups map cleanly to the SKILL.md format.
- **Shopping section maps 1:1 to Mode 2.** Four cards with colored top-rules (`styles.css:821-824`) and the prose-style "unlock new dishes" copy is the cleanest articulation of the spec across the three mockups.

## Weaknesses

- **It's a brochure, not a cooking surface.** `padding: 96px 56px` on every section (`styles.css:126`), a 78vh hero photo (`styles.css:483`), a `clamp(60px, 9vw, 132px)` recipe title (`styles.css:516`) — the user scrolls past oceans of whitespace to find a timing or an ingredient. Pantry status, the only thing actually changing day-to-day, lives below the fold of a 5-section vertical scroll.
- **External CDN dependencies are load-bearing.** Google Fonts (`index.html:9`) and two Unsplash hero photos (`index.html:77`, `index.html:237`) — the README admits this. Open it offline and the typographic identity collapses to Georgia. For a "kitchen counter" tool this is a real failure.
- **`section.in-view` opacity-gated reveal (`styles.css:128-135`) is hostile to glanceability.** If you scroll fast or land via hash, sections are invisible until the IntersectionObserver fires. Calm doesn't mean withholding content.
- **Voice mismatch in chrome.** "Issue No. 07 — Late Spring" (`index.html:18`), "Pl. 01" (`index.html:79`), "Set in Fraunces & DM Serif Display" (`index.html:554`) — the magazine conceit imposes a posture the assistant doesn't have. SKILL.md is a friend talking; this is a curator narrating.
- **Stage-3 portability is zero.** Variable serif fonts, hot food photography, parallax (`app.js:251-272`), saturation filters (`styles.css:341`) — none of this survives the trip to an Inkplate. The README acknowledges no dark mode but the deeper issue is no monochrome mode, no thin client, no glance state.

## Top 3 must-fix

1. **Add a real "Today" glance.** The current Today section is a hero photo + lede — beautiful but not actionable. Put the dish name, time, "uses low: media crema, queso fresco," and a one-line action above the fold without scrolling. The pull quote can wait.
2. **Cut the section padding in half and kill the fade-in.** Drop `padding: 96px 56px` to ~48px and remove the `opacity: 0` baseline. The content is already good; let it be visible.
3. **Self-host or remove the photos and fonts.** Either ship Fraunces locally and use a single illustrated mark, or commit to a no-image variant. The current build is one Wi-Fi outage from looking broken.

## One thing I'd steal

The **sticky ingredient sidebar against a scrolling method column** (`styles.css:564-570`, `index.html:273-377`). Even on a paper-derived screen, that two-column relationship between the static "what you need" list and the running "what you do" steps is exactly how you actually use a recipe — and it maps cleanly to a split-pane e-ink layout where the left half is fixed and the right half is the next two method steps.
