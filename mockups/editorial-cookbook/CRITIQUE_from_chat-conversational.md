# Critique — from `chat-conversational`

Reviewing `editorial-cookbook/` through the lens of conversational, intent-driven UX and fidelity to the SKILL.md persona.

## Strengths

- **Tone is the strongest of the three I reviewed.** "A bowl that *catches* on the edges", "the mangoes at the tianguis are dripping", "half-jar of chipotle in adobo whispering from the door shelf" (`index.html:47-52`). This is the only mockup where the writing actually reaches the sensory register SKILL.md asks for, and Fraunces italics in chipotle red (`styles.css:201-203`) earns the literary feel.
- **Pantry click-to-cycle is the closest any mockup gets to "Updating the Pantry."** The plenty → low → out → plenty handler in `app.js:189-205` is exactly the affordance SKILL.md describes. It's also the only direct write-interaction in any of the three designs.
- **The chapter-numeral system is a real visual identity.** The italic display-serif `01–05` (`styles.css:156-163`) tied to chapter labels gives the whole product a recognizable rhythm, and the gutter pull quotes (`index.html:86-90, 390-395, 538-542`) reinforce voice in places where users are merely scanning.

## Weaknesses

- **There is no conversation, only a magazine.** SKILL.md's Mode 1 is a five-step dialog. Here, "The Menu" is a static `<ol>` of seven items (`index.html:108-230`) with the first one already crowned "Tonight" (`index.html:122`). The user never picks; the magazine picked for them. No input field, no chat, no "I'm tired tonight" — `app.js` is 285 lines and zero of them accept user intent.
- **Step 4 (the one narrowing question) is completely missing.** SKILL.md is explicit: user picks, then assistant asks ONE focused question before delivering. Here `Open recipe →` (`index.html:125`) jumps straight from menu to full spread. The single most identity-defining interaction in the skill is skipped.
- **Magazine framing fights the assistant framing.** Everything is keyed to "Issue No. 07 — Late Spring" (`index.html:18`), a "Mood" of "Smoky · Sweet · Crackling" (`index.html:66`), section headers like "The cupboard, *catalogued*" (`index.html:416`). It's beautiful but it treats POiO as a publication that arrives, not as a friend in the kitchen you can interrupt. SKILL.md's Mode 3 ("make me a chipotle-lime chicken bowl") has nowhere to live.
- **Photography burns trust the moment a real user opens it.** The hero (`index.html:77`) and cover (`index.html:237`) are hard-coded Unsplash URLs. SKILL.md never delivers a photo — it delivers prose. Stock images of a *generic* dish under the headline "Chipotle-Mango Smashed Thighs" sets up a contract the engine cannot keep, and offline (or rate-limited Unsplash) the design collapses to empty boxes. The README acknowledges this and shrugs.
- **Density tips into noise.** Pull quotes that repeat copy already on the page (the recipe pull-quote at `index.html:391-394` repeats Step 2), `Pl. 01` plate numbers (`index.html:79`), italic decks under every heading. A home cook standing at the stove with chicken in the pan does not want "House style, Section II" attribution lines. The README admits "Editorial density is high… would need to be dialed back."

## Top 3 must-fix items (v2)

1. **Add a conversational entry point.** A persistent "Ask POiO…" field — top-of-page, bottom-of-page, even floating — so a user can type "what should I cook?", "I bought poblanos," or "make me tacos." Right now the only verb the UI offers is "scroll."
2. **Wire the Step-4 narrowing question.** Clicking a Menu item should reveal one focused question ("Quick weeknight, or up for a slower cook?", "Crunchy and charred, or saucy and tender?") before opening the spread. The skill's most distinctive beat is currently absent.
3. **Drop the stock photography or stop pretending the recipe matches.** Either commit to no imagery (eink-glance does this honestly) or generate per-recipe images at engine time. A generic Unsplash glamour shot under an invented recipe title is the one place the magazine conceit actively lies.

## One thing I'd steal

The **click-to-cycle pantry interaction** at `app.js:189-205`. Eight lines of vanilla JS, instantly demonstrates the "Updated — coconut milk is now `plenty`" affordance from SKILL.md, and reframes the pantry from "read-only catalogue" to "thing the assistant and the cook both write to." I'd port that exact pattern into the inline pantry-chip cards in my chat design.
