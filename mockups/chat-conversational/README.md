# POiO — Conversational mockup

Chat-first prototype that brings the Stage 1 skill UX to the browser. Open `index.html` in any modern browser — no build, no framework, no install.

## What this is

A single primary surface: a conversation. The user types ("what should I cook?", "I'm going to the store", "make me a chipotle-lime chicken bowl") and POiO replies with messages and rich inline cards — a 7-direction suggestion deck, a full recipe card, a four-column shopping card, pantry chips referenced inline.

The pantry lives in an ambient side panel that can be toggled in and out. The shopping list lives at the bottom of that panel and updates as the conversation produces one.

Think Claude.ai × Linear command bar × Apple Messages, for cooking.

## Design rationale

- **Conversation is the product.** SKILL.md is already a chat persona. Anything that wraps it in heavy navigation fights the model. The page is one long thread with a composer at the bottom and quick-reply chips that make the next move obvious without forcing it.
- **Cards earn their place.** The two structured outputs from SKILL.md (the suggestion list, the recipe format, the four shopping lists) are real cards inline in the chat — not separate views. Everything else stays as plain assistant prose so the rhythm feels like a friend, not a form.
- **Pantry as ambient state, not a chore.** The side panel is glanceable. Each item is a chip with a colored dot (`plenty` / `low` / `out`). When the assistant references items in a recipe, the same chip shows inline above the recipe card so pantry awareness is visible in two places without the user having to look anything up.
- **Scriptable feel.** Under every assistant turn that has a natural next move, a row of quick-reply pills surfaces ("I'll have #3", "what's the time on that one?", "mark avocado low", "compile a single list"). It nods to Apple Messages tapbacks and Linear's command palette — feels fast, never spammy.
- **Tone is the brand.** Copy is lifted from the SKILL.md voice — sensory, opinionated, Spanish food terms (epazote, media crema, elote, tianguis, tomatillos, salsa macha, chiles de agua, bolillo, aguacate) untranslated and unstyled. "char it hard", "until they catch", "in a bright pink pile on top." The visual chrome is calm and warm so the prose can carry the personality.
- **Color and material.** Warm paper background (#f6f1ea), charcoal ink, accents pulled from food itself — chile red, lime green, toasted-cumin amber, a plum for cross-cultural unlocks. Inter / SF Pro stack for a modern but friendly read. No emoji.

## Demo script

The mockup boots into a greeting. From there:

1. **Greet** — POiO opens with a region-aware hello (Guadalajara, May).
2. **"what should I cook?"** — top-bar pill, primary quick reply, or freeform typing → the 7-direction suggestion deck. Each suggestion shows a title, a one-line sensory hook, tag chips ("weeknight", "one-pot", "in season", "adventurous"), and is itself clickable.
3. **Pick #3** — quick reply "I'll have #3" or click the suggestion → POiO acknowledges and asks **one** narrowing follow-up (the SKILL.md Mode 1 step 4 pattern): char hard with salsa macha, or soft and saucy with media crema?
4. **Full recipe** — both branches land at the **Smashed Chipotle-Lime Chicken Bowl** card: vibe sentence, time and serves, four ingredient groups (Protein / Veg & Aromatics / Pantry & Spices / Sauce), numbered method with sensory cues, "The Finish" assembly block, "Pantry Notes" (swaps for `low` items, leftovers, batch advice). The recipe is preceded by inline pantry chips so you can see at a glance what's in/out.
5. **Side-quests** under the recipe — quick replies for "swap rice for tortillas", "mark avocado low" (which actually updates the pantry panel and adds Avocados to the shopping list), and "what's a salsa macha substitute?".
6. **Shopping mode** — "going to the store" pill or quick reply → the four-list shopping card: **Restock / Top up / Seasonal picks / Unlock new dishes**, color-coded, with practical seasonal context (mangoes peaking, tomatillos abundant, chiles de agua starting). One more click compiles a single ordered tianguis list and writes it into the side panel's shopping list.
7. **Direct recipe** — "make me a chipotle-lime chicken bowl" pill (Mode 3) → POiO confirms feasibility from pantry and goes straight to the recipe card.
8. **Pantry toggle** — the icon button in the top bar collapses the side panel for a wider chat view.

The composer at the bottom is wired with intent regexes for "store", "verde", "tinga", "weirder", "i'm back" etc. Unknown input gets a graceful fallback that points to the canned flows.

## File layout

```
chat-conversational/
├── index.html      # markup + brand bar + chat + pantry shell
├── styles.css      # all visual styling
├── data.js         # pantry, suggestions, recipe, shopping data
├── app.js          # flow controller (vanilla JS)
└── README.md       # this file
```

`data.js` is the single source of canned data. It's drawn directly from `pantry.example.md` and `references/style-guide.md` so swapping in a different pantry would be a content-only change.

## Trade-offs

- **Only suggestion #3 has a fully wired recipe.** Picking another suggestion routes to the same card with a brief acknowledgement. In production, every direction would produce its own recipe — but writing 7 realistic recipes wasn't the design exercise.
- **Freeform input is canned.** A handful of regexes route typed phrases to the right flow; everything else gets a polite fallback. The composer is there to prove the gesture works, not to be an LLM.
- **No persistence.** Pantry edits ("mark avocado low") and shopping list mutations stick for the page session and reset on reload. That's appropriate for a mockup; Stage 2 would persist to `pantry.md`.
- **No mobile-first work beyond a basic breakpoint.** The pantry hides on narrow screens and chat padding tightens, but the design is optimized for a kitchen-counter laptop or tablet.
- **No streaming.** Assistant messages reveal as a single block after a typing indicator. Real Claude streaming would be nicer but adds prototype complexity without changing the design story.
- **Hardcoded region.** "May · Guadalajara" is baked into copy and tags. In production this comes from `references/regional-context.md`.

## v2 changelog

v2 was reviewed against three peer critiques (`CRITIQUE_from_eink-glance.md`, `CRITIQUE_from_editorial-cookbook.md`, `CRITIQUE_from_terminal-dense.md`). The biggest shift: the five required surfaces (Today / Suggestions / Recipe / Pantry / Shopping) are now real first-class views in a left rail, not just cards buried in chat scrollback. The conversation remains, but as one of six destinations rather than the only one.

### Accepted

- **The five views are now navigable as first-class destinations.** *(All three critiques, lead from eink-glance #1.)* A persistent left nav rail exposes Today / Suggestions / Recipe / Pantry / Shopping as keyboard-numbered destinations. Chat is one of them, not the entire app. Today is now the boot view: tonight's pick at the top, low/out/peak callouts, tiles into Pantry / Shopping / Chat. Cards inside the chat are now previews with an "open the recipe →" CTA into the dedicated view.
- **Four recipes are wired, not one.** *(All three critiques.)* Recipes #1 (Chipotle-Honey Glazed Thighs), #2 (Pollo en Salsa Verde), #3 (Smashed Chipotle-Lime Bowl), and #6 (Korean-Style Gochujang Tacos) all render with full ingredients, method, finish, notes, and pantry chips. The other three (#4, #5, #7) show an honest stub explaining the demo scope rather than silently re-rendering #3.
- **Typing delays cut to a single first-turn beat.** *(terminal-dense #1.)* Only the *first* assistant response per flow gets the 420ms "thinking" pause. Navigation replies, follow-ups, and "show me again" land immediately.
- **Keyboard parity.** *(terminal-dense #2.)* `1`–`5` switch views, `/` focuses the chat composer, `?` opens a shortcuts dialog, `Esc` returns to Today, `←/→` cycle wired recipes inside Recipe view, `1`–`9` fire quick-reply chips when chat is focused, `Cmd/Ctrl+1..9` fires them from the composer. Quick-reply chips show numbered kbd hints and have proper focus rings.
- **Cookbook moment for the recipe.** *(editorial-cookbook #2.)* Recipe name now Fraunces serif at 34px, italic vibe sentence in serif, paper-toned head background, gradient hero block with a food-emoji glyph standing in for photography in the prototype. Each ingredient row separates name and qty with a dotted leader, group labels are serif italic. The chat-card preview is small and sans-serif; the dedicated view is the cookbook.
- **Quieter shopping cards.** *(eink-glance #3.)* Switched from four saturated card backgrounds to one neutral card per column with a 3px colored top-rule and a single colored dot in the header. The palette still encodes urgency (restock=out red, top-up=low amber, seasonal=lime, unlock=plum) but the eye finds the column titles first.
- **Pantry is grouped by priority, not chip-soup.** *(editorial-cookbook #3.)* The Pantry view now leads with a "Use these first" panel that surfaces only low/out items in a two-column list with dot+name+status. The full grouped pantry sits below as serif-headed group cards. Clicking any item flips its status and auto-adds it to the shopping list. The 50+ chip cloud is gone.
- **Broader freeform input coverage.** *(terminal-dense #3.)* The regex matcher gained intents for: gochujang/Korean/taco (→ recipe #6), bone-in/honey/glazed (→ recipe #1), mango/habanero, seasonal/peak/this week, swap, "what should I swap", "help/shortcuts", thanks, plus literal view names ("open pantry", "show shopping"). The fallback message is shorter and honest about scope rather than apologetic.
- **Composer hint corrected.** *(eink-glance + terminal-dense.)* The "shift+enter (not really)" lie is gone. Hint now reads "Enter to send · 1–5 to switch views · ? for shortcuts" — every claim is wired.
- **Real logo, not a generic brand square.** *(editorial-cookbook.)* Brand mark in the rail is the actual `assets/poio.png` plus a Fraunces italic wordmark.
- **No orphan flows.** *(eink-glance.)* Every flow that used to dead-end (`flowMachaSub`, `flowKickoff`, `flowSwap`) now sets quick replies so the user always has a visible next move.
- **Sentence case where it matters.** *(editorial-cookbook #1, partial acceptance.)* Headlines, view titles, recipe names, and the assistant's leading sentences are now in proper sentence case. Casual rhythm and lowercase chips ("what should I cook?") remain on chat-side affordances where they read as deliberate texting-tone — but the recipe and view chrome no longer reads as iMessage.
- **Stole my own best idea everywhere.** All three critiques flagged the inline `.pchips` "from your shelf" strip as the thing they'd port. It's now labeled (`from your shelf`), present in the full recipe view, and in the chat preview card.

### Rejected (with reasoning)

- **"Chat is fundamentally incompatible with Stage 3 e-ink."** *(eink-glance #5.)* Rejected as scope. This mockup explicitly targets Stage 2 (the local web app); the eink-glance mockup is the one designed for the Inkplate, and rightly so. Different surface, different mockup, intentional. The Today view's structure is, however, more portable than v1's chat-only design — its tonight's-pick + callouts + tile pattern would translate to e-ink.
- **DOM virtualization for long sessions.** *(terminal-dense.)* Rejected as premature optimization for a prototype. A real Stage 2 build would add it; the mockup's job is to prove the design, not the engineering.
- **Full lowercase abandonment.** *(editorial-cookbook #1, partial reject.)* SKILL.md's voice does use lowercase rhythm intentionally ("char it until it catches"). The casual texting feel of the quick-reply chips is the right register for a chat affordance. Sentence case was restored where capitals carry meaning (recipe names, view titles, headlines) but kept lower on chat-side chips and casual asides. That's a tonal split, not a wholesale change of voice.
- **Removing the composer entirely or going chip-only.** *(terminal-dense #3 alt.)* Rejected — it would kill the core thesis (conversation-first, intent-driven). The fix is *wider* freeform coverage and an honest fallback, which v2 delivers.
- **Heavy animation removal.** *(terminal-dense + eink-glance.)* Kept a single light view-fade (220ms) and dropped per-turn `fadeUp`, the smooth-scroll on the thread, and the hover-translateY on pills. The remaining animation is the typing-dot indicator on the first beat only. Calm enough for a kitchen tablet, expressive enough not to feel inert.
