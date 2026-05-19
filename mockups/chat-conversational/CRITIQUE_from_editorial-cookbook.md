# Critique from editorial-cookbook

Reviewed: `index.html`, `styles.css`, `data.js`, `app.js`, `README.md`.

## Strengths

- **The conversation is the product, and the design knows it.** The whole chrome — sticky top bar, single thread, composer, ambient pantry side panel — gets out of the way. Quick-reply chips ("I'll have #3", "more like #2 but quicker", "what's the time on #4?", `app.js:301–306`) are the most accurate translation of SKILL.md Mode 1 step 4 of any mockup in this folder. The narrowing question itself ("char it hard and bright with salsa macha, or soft, saucy, finished with media crema?", `data.js:161`) is a direct lift from the brief and it sings.
- **Warm, food-leaning palette that earns its keep.** `--chile: #c14b2a`, `--lime: #7ea33a`, `--amber: #c9852a` (`styles.css:21–24`) actually mean something — they're used on suggestion tags ("adventurous" / "quick" / "slow", `:249–252`) and shopping columns (`:376–379`) so the color carries information without becoming decorative. The plum for "Unlock new dishes" is a smart cross-cultural cue.
- **Genuine sensory copy throughout the data.** "tomatillos blistered until they collapse, blitzed with serrano and cilantro, thighs braised in it until they pull apart. epazote at the end." (`data.js:118`). "white miso + chipotle in adobo + honey + lime, rubbed under the skin, oven-roasted until lacquered" (`app.js:343`). "eat one walking home" on the mangoes in the compiled tianguis list (`app.js:416`) — that line is the single most POiO-voiced moment in any of the four mockups.

## Weaknesses

- **The all-lowercase voice undermines the warmth.** "hey. pantry's loaded, regional file says it's May in Guadalajara…" (`app.js:290`), "okay — pulled up your pantry" (`data.js:104`). SKILL.md voice is *confident, playful, sensory* — not iMessage-lowercase. Lowercased prose reads as casual-by-default; the brief asks for opinionated. A confident cooking friend uses capitals.
- **Recipe card aesthetics fight the chat aesthetics.** The recipe card head uses `linear-gradient(180deg, #fff8ec 0%, #ffffff 100%)` (`styles.css:268`) and the recipe name is 22px Inter at -0.02em tracking (`:271–276`). It's clean but reads as a SaaS dashboard, not a cookbook. The product calls itself a "personalized chicken recipe assistant" — the recipe deserves a serif and a hero moment.
- **No imagery, no illustration, no food** anywhere. A chat UI gives you a perfect frame to drop a photograph or even a single line drawing into the recipe card; instead the recipe is type-only on a white card. For the "casual home cook" persona, this is the bigger miss than in the e-ink mockup because here you have full color and screen real estate.
- **The pantry side panel is a tag cloud.** `styles.css:537–552` renders every item as a pill with a status dot, wrapped freely. Once you have 50+ items (the demo data has ~45) it becomes a visually noisy block of chips and the eye can't find anything. A list-with-status, grouped by use-this-first, would read better than chip-soup.
- **The "Pollo en Salsa Verde" pick funnels to chipotle-lime** (`app.js:309–314`). The fallback prose ("in the prototype only #3 has a fully wired recipe") breaks the persona harder than necessary — POiO speaking about itself as a prototype is the one place it should never break character. The README admits this trade-off but the fallback copy itself could lie better.
- **`brand-mark: P` in a charcoal rounded square** (`styles.css:74–82`) is generic startup chrome. The repo has a real wordmark/logo (`assets/poio.gif`) — use it.

## Top 3 must-fix for v2

1. **Drop the all-lowercase prose.** Keep the casual rhythm, restore sentence case. The voice in `SKILL.md` ("char it until it catches") is lowercase only when the rhythm calls for it — not as house style. The current treatment makes POiO read as another iMessage-style consumer chatbot rather than the opinionated cook the brief describes.
2. **Give the recipe card a real cookbook moment.** Swap the recipe name to a serif (Spectral, Fraunces, or even Playfair) at 30px+; replace the off-white gradient with a textured paper background; add a single food image slot at the top of the card. The chat can stay sans-serif; the recipe is the payoff and should *feel* like one.
3. **Rebuild the pantry side panel as a grouped, prioritized list.** "Use these first" (low items) at the top, then plenty by category. Drop the chip pills for thin rows with a status dot, item name, and optional note. Show 8–10 items, not 50. The current panel is the most-glanced surface and the least-considered.

## One thing I'd steal

The inline `pchips` row above the recipe card (`app.js:184–186`, `styles.css:401–413`). Six chips — "chipotle in adobo · plenty / thighs · plenty / elote · low / avocado · low / limes · plenty / salsa macha · plenty" — that show pantry feasibility at the exact moment the recipe arrives. It's a tiny gesture that visibly connects the pantry model to the recipe output in a way my editorial layout doesn't. I'd port that straight into my recipe header as a "from your shelf:" row.
