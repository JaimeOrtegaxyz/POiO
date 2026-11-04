# Onboarding interview

This is the onboarding script for the skill and the brain. The online mockup and the device reuse the same questions; only the surface changes (chat, mockup screen, device screen + push-to-talk). Product decisions behind it: [`SCOPE.md`](../SCOPE.md), voice rules: [`VOICE.md`](../VOICE.md).

It fills the personal files the assistant relies on:

- `pantry.md`: what's in the kitchen
- `references/regional-context.md`: what's in season where the user lives
- `references/equipment.md`: what they cook on
- `poionotas.md`: what POiO knows about the user (restrictions, servings, leanings, taste signals)

All four are gitignored (personal state). Templates for the first three live alongside as `*.example.md` and are the structural reference. `poionotas.md` has no template; it's created on the first note (see `SKILL.md`, "Poionotas").

---

## Shape

1. **First run:** four questions, then a recipe right away.
2. **After the first cook:** ten more topics, surfaced one or two at a time over the next sessions.
3. The user can say **"pregúntame todo"** at any point to go through everything left in one sitting.

Rules:
- **No hard gate.** Nothing blocks a suggestion. Skipped answers get a default.
- **Never re-ask** something POiO already knows (from any personal file).
- **Every answer can be changed later by asking** ("ya no vivo en Guadalajara", "ahora cocinamos para 4").

## Tone

Practical. A few minutes at most. Every question says in one line *why* it's asked, and every question can be skipped ("sáltalo", "luego", or just not answering). Never a form, never a wall of questions.

---

## First run

Run this when any personal file is missing. Ask only what's still unknown. Each question is answerable by voice and **skippable**; say the "why" line with it.

| # | Asks | Why (shown/said briefly) | Default if skipped |
|---|---|---|---|
| 1 | "¿En qué ciudad cocinas?" | "Para sugerirte lo que está de temporada y lo que encuentras cerca." | Season inferred from the date; no regional bias |
| 2 | "¿Para cuántas personas cocinas normalmente?" | "Para ajustar las cantidades." | 2 servings |
| 3 | "¿Hay algo que no comas o que no te guste?" (allergies, dislikes, picante) | "Para no sugerirte algo que vas a descartar." | No restrictions; medium picante |
| 4 | "¿Qué tienes hoy a la mano? Dime unas cosas, o sáltalo." (optional fridge photo via the app) | "Para que la primera receta use lo que ya tienes." | Assume basics (sal, aceite, cebolla, ajo) + chicken; pantry otherwise unknown |

Then go **straight to three options** (SKILL.md, Mode 1). No summary of what was learned, no "¿listo para cocinar?".

### Writing the files after the first run

- **`references/regional-context.md`**
  - City given: generate it as described in [Region](#region) below.
  - Skipped: write a short file that says the region is unknown and the season comes from the date. Don't copy the example's region.
- **`poionotas.md`**: servings (Q2) and restrictions, dislikes and picante level (Q3), or the defaults, as short dated bullets.
- **`pantry.md`**: copy `pantry.example.md`, set "Last updated" to today, then:
  - Mark what the user named in Q4 as `plenty`.
  - Skipped or partial: also mark the basics (salt, oil, onion, garlic) and chicken (the boneless thigh and boneless breast rows) as `plenty` with the note `assumed`.
  - Leave every other row as the template has it. The pantry is context, not a requirement: the ingredient check before cooking catches what's actually missing.
  - A fridge photo, if one arrives, goes through the [photo path](#photo-path).
- **`references/equipment.md`**: copy `references/equipment.example.md`, assuming stovetop + oven until the equipment topic comes up.

---

## After the first cook

Surface these **gradually**: one or two at a time, at a natural moment (after a cook, when a suggestion would depend on the answer), never as a wall. Skip anything already known. "Pregúntame todo" runs through all the remaining ones now.

| # | Topic | Example line | Stored in |
|---|---|---|---|
| 1 | What to call you | "¿Cómo te llamo?" | `poionotas.md` |
| 2 | Main goal: use up food / eat better / save money | "¿Qué te importa más: aprovechar lo que hay, comer mejor o ahorrar?" | `poionotas.md` |
| 3 | Equipment | "¿Con qué cocinas? Horno, estufa, freidora de aire, olla de presión, licuadora…" | `references/equipment.md` ([detail](#equipment)) |
| 4 | Weeknight time budget | "Entre semana, ¿cuánto tiempo tienes para cocinar?" | `poionotas.md` |
| 5 | Spice / salt / sweet leanings | "¿Cómo le vas al picante, a la sal y a lo dulce?" | `poionotas.md` |
| 6 | Household: who eats, kids, schedules | "¿Quién come en casa? ¿Hay niños, horarios distintos?" | `poionotas.md` |
| 7 | Favorite and avoided cuisines; how adventurous | "¿Qué cocinas te gustan y cuáles no? ¿Qué tan aventurero?" | `poionotas.md` |
| 8 | Diet goals beyond restrictions | "¿Algún objetivo con lo que comes? Más proteína, menos harinas…" | `poionotas.md` |
| 9 | Where you shop and how often | "¿Dónde compras y cada cuánto? Tianguis, mercado, súper, Costco…" | `references/regional-context.md` ("Where to shop") + `poionotas.md` |
| 10 | Fill pantry gaps | "¿Recorremos tu cocina rápido para llenar huecos? También sirve una foto del refri o del ticket." | `pantry.md` ([detail](#pantry)) |

Each one still says why in one line when asked ("Para sugerirte cosas que te den tiempo entre semana.").

---

## Detail: how each topic gets filled

### Region

From first-run Q1. Use the answer to generate a seasonal-produce calendar in the same shape as `references/regional-context.example.md`. The example is structured around Guadalajara / Western Mexico; mirror that structure for any region:

- **Seasonal produce calendar**: month by month or season by season, peak produce + peak fruit + a "good for" cooking note
- **Local staples**: vegetables, herbs, dairy, proteins that are common and cheap
- **Local cooking idioms**: short notes on what the region is known for, what's worth leaning into
- **Where to shop**: relevant local markets/stores (tianguis, mercado, supermarket chains, specialty shops). Fill it in when topic 9 comes up, or ask then.

Draw on general knowledge for well-known regions. For less common ones, ask at most 2–3 targeted follow-ups, later, not on first run. Never make up a market name; ask.

### Pantry

From first-run Q4 and topic 10. The pantry is context, so this is about filling gaps, not reaching completeness. Three paths, offered when topic 10 comes up:

> "Tres formas de llenar tu despensa:
> 1. **Foto**: mándame fotos del refri, la alacena o un ticket del súper desde la app.
> 2. **Juntos**: te pregunto por categoría y me dices qué tienes.
> 3. **Rápido**: dime las 10 o 15 cosas que siempre tienes y lo demás lo vamos llenando.
>
> ¿Cuál prefieres?"

#### Photo path

Optional, via the app (or an uploaded image in the skill). Read the photos, identify items, map them onto the categories in `pantry.example.md`. Mark visible items `plenty`; infer `low` only if visibly running out (less than ¼ left). A receipt marks what's on it as `plenty`. Leave the rest as it was. Then:

> "Esto es lo que vi. ¿Me faltó algo o algo está mal? ¿Tienes cosas guardadas en otro lado?"

#### Walk-through path

Go category by category, in this order (matches `pantry.example.md`):

1. Proteins (chicken cuts first, then eggs and other proteins)
2. Fresh vegetables & aromatics: the daily drivers first (cebolla, ajo, limón, jitomate, chile jalapeño, cilantro)
3. Spices & seasonings: bulk first ("¿tienes especiero? más o menos, ¿qué hay?"), then region-specific ones (chiles secos, orégano mexicano)
4. Oils, vinegars & acids
5. Sauces, pastes & condiments
6. Starches & grains
7. Dairy & cheese
8. Canned, frozen, nuts, baking

Batch questions per category; never one item at a time:

> "Especias: ¿qué hay en tu especiero? Dime lo que te acuerdes, sin pensarle mucho."

#### Quick path

> "Dime lo que siempre hay en tu cocina, lo que notarías si se acaba."

Mark those `plenty`. Leave the rest as it was. Then:

> "Listo. Lo demás lo vamos llenando cuando me digas que compraste algo o que se acabó."

#### Writing it

Write `pantry.md` preserving the category structure from `pantry.example.md`, with a "Last updated: YYYY-MM-DD" line at the top. Confirm in one line:

> "Despensa lista."

### Equipment

From topic 3. One batched question:

> "¿Con qué cocinas? Doy por hecho estufa y horno; dime si hay algo más: olla de lento cocimiento, freidora de aire, asador, olla de presión, licuadora… y cualquier detalle (horno chico, sin campana, ese tipo de cosas)."

Take the answer as it comes and follow up only on what changes recipe-writing (oven size if they roast whole birds, whether the grill is a weeknight tool or a weekend ritual, whether they actually *like* the air fryer).

Write `references/equipment.md` following the structure of `references/equipment.example.md`: what exists and, more usefully, how POiO should treat it (default to it, offer it, or never push it). Confirm in one line:

> "Anotado."

---

## Ongoing maintenance

After onboarding, the skill keeps the files current as a side effect of conversation: pantry updates and the post-cook diff live in `SKILL.md` ("Updating the Pantry"), and what POiO learns about the user lives in `SKILL.md` ("Poionotas"). This file only covers onboarding.
