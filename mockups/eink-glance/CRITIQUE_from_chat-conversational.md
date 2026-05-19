# Critique — from `chat-conversational`

Reviewing `eink-glance/` through the lens of conversational, intent-driven UX and fidelity to the SKILL.md persona.

## Strengths

- **The voice survives the constraint.** The hero vibe ("The kind of bowl that tastes like you tried harder than you did", `index.html:47`) and Spanish vocabulary used unapologetically (elote, media crema, cotija, bolillo, salsa macha) read exactly like the SKILL.md persona. The recipe page in particular — "until the skin is golden and crackling", "the colour of a wet brick" (`index.html:289, 293`) — is the closest any of the four mockups gets to "confident, playful, sensory."
- **The dither/hatch encoding of `plenty`/`low`/`out` is genuinely smart.** Solid ink, 45° hatch, dot dither (`styles.css:344-362`) carries the same meaning across the snapshot bars, status pills and shopping-list dots. It's a real design idea, not decoration.
- **The Mode 2 shopping view is the best of the three I reviewed.** Four panes mapping exactly to SKILL.md's four lists, with prose hooks like "mangoes are peaking — unlocks mango-habanero tacos" (`index.html:500-501`). That's the only mockup that nails the "ingredient → dish unlock" affordance the skill explicitly calls for.

## Weaknesses

- **No conversation, anywhere.** SKILL.md Mode 1 is a five-step dialog: scan → suggest 5–7 → user picks → ONE narrowing follow-up → recipe. This UI shows steps 2 and 5 as static printed pages. There is no input field, no way for the user to say "I'm tired" or "make me a chipotle-lime bowl" (Mode 3). The masthead footer literally says "Glance · not a screen to scroll" (`index.html:108`) — fine for Stage 3, but Stage 2 lives in a browser where the user *can* type, and the design just refuses to listen.
- **Step 4 (the narrowing question) is missing entirely.** Suggestions footer says "Pick one and ask — we'll narrow it down with one question" (`index.html:209`) but clicking a suggestion doesn't ask anything; it jumps to a static recipe. The most distinctive interaction the skill defines is absent.
- **No pantry update affordance mid-flow.** SKILL.md spends a whole section on "Updating the Pantry" — "I bought a bunch of poblanos" → file gets edited → assistant confirms briefly. The pantry view (`index.html:323-452`) is read-only; the only interactivity in the entire app is `app.js:38-52`'s filter buttons. The pantry footer even says "Edit on device or via the skill" (`index.html:450`) — punting the core write affordance.
- **The "Today" hero is a foregone conclusion.** It picks one dish and presents it as fait accompli (`index.html:44-74`). For a home cook the whole point is "what should I cook tonight?" — a question, with options. Skipping straight to a hero answer collapses Mode 1 into Mode 3 and removes the user's agency.
- **Tabs assume desktop literacy.** Five horizontal tabs labeled TODAY / SUGGESTIONS / RECIPE / PANTRY / SHOPPING (`index.html:33-39`) work fine on a 1200px screen, but on the 9.7" Inkplate target with no hardware buttons wired up, the README admits filters are click-only — meaning a home cook standing at the stove with greasy hands has no way to ask anything.

## Top 3 must-fix items (v2)

1. **Add a conversational input.** Even on an e-ink-styled surface, a single "Ask POiO…" prompt at the bottom of every view would let a user type "what if I'm out of crema?" or "I bought poblanos." Without it, this is a printed newspaper, not an assistant.
2. **Implement the Step-4 narrowing question.** Clicking a suggestion should reveal one focused question ("Crunchy and charred, or saucy and tender?") before the full recipe. That's the single most identity-defining interaction in SKILL.md and it's currently absent.
3. **Make the pantry editable in-place.** Click a status pill to cycle plenty → low → out (the editorial mockup does this in five lines of JS at `app.js:189-205`). Steal that. The skill's whole architecture assumes the pantry mutates.

## One thing I'd steal

The **dither/hatch/dot vocabulary for status** (`styles.css:344-362`). It's a real design system — it works monochrome, it works in print, it reads at a glance, and it gives `plenty`/`low`/`out` a memorable visual grammar that color alone never quite earns. I'd port this directly into my chat cards as the pantry-chip glyph language.
