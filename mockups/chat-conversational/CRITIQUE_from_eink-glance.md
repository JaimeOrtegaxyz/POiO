# Critique — chat-conversational (from eink-glance)

Read as someone who cares about density, calm, glanceability, and whether any of this could survive the trip to a 9.7" monochrome Inkplate.

## Strengths

- **Voice survives intact.** Lower-case opener "hey. pantry's loaded, regional file says it's May…" (`app.js:290`), Spanish food terms left untranslated in the consolidated list — `aguacates`, `bolillo`, `pote chico` (`app.js:415-422`) — and prose like "mango-habanero glazed thighs" land closer to SKILL.md's tone than anything chrome-heavy could.
- **Pantry-as-ambient-side-panel is the right pattern for Stage 2.** The 340px panel (`styles.css:116`) with chip-per-item and a shopping list pinned at the bottom (`index.html:68-71`) is glanceable, persistent, and doesn't require a view change to check stock. The inline `.pchips` strip above the recipe card (`app.js:184-186`) showing relevant pantry items right where you need them is a smart secondary surface.
- **State mutations are wired through.** "mark avocado low" (`app.js:379-387`) actually flips the side-panel chip and appends to the shopping list. "I'm back" (`app.js:478-488`) bulk-restocks. This is the only mockup where the demo behaves like the product would, instead of just rendering it.

## Weaknesses

- **Three of the five required "views" don't exist as views.** Today is a greeting message, Suggestions is a card buried in a chat scroll, Shopping is another card buried below that, Pantry is a side panel, and Recipe is the only one that gets its own dedicated layout. If a user wants to *re-check* tonight's suggestion after scrolling past it, they have to scroll the thread back up — there's no "Today" surface. For ambient/glanceable use this is the biggest miss of the four mockups.
- **Spec compliance gap, openly admitted.** README:52 — "Only suggestion #3 has a fully wired recipe." `app.js:309-317` literally funnels picks 1, 2, 4–7 to recipe #3 with a "pretend we picked" disclaimer. The other three mockups at least *render* one realistic example; this one breaks the fourth wall in the demo flow.
- **`flowMachaSub` and `flowKickoff` orphan the user.** `flowMachaSub` (`app.js:388-390`) ends without `setQuickReplies` — the chips just vanish and the user is left with the composer. `flowKickoff` only offers two exits. After a chat-driven mockup builds the user's expectation that quick-replies are always there, the dead ends feel like bugs.
- **Composer hint is a lie.** "enter to send · shift+enter for newline (not really, this is a prototype)" at `index.html:45` is a cute admission but a weird thing to ship in the chrome of a polished demo. Either wire it or remove the line.
- **Stage-3 portability is the worst of the four.** Chat is fundamentally a scrollback medium. An Inkplate updates once every few minutes — there is no scrollback, no composer, no typing indicator (`styles.css:486-498`), no `fadeUp` animation (`styles.css:144-148`). The README points at Stage 2 fit; the design is essentially incompatible with Stage 3 unless rebuilt from scratch.
- **Color load on the four shopping cards is heavy.** `.shop-col.restock` peach, `.topup` amber, `.seasonal` green, `.unlock` lilac (`styles.css:376-379`) — four saturated backgrounds adjacent in a 2×2 grid is more carnival than calm. The status-pill palette already encodes urgency; the card backgrounds re-encode it louder.

## Top 3 must-fix

1. **Build a "Today" pane that lives outside the chat thread.** Either a third column or a collapsible header above the thread, persistently showing: tonight's pick, time, pantry-low callouts, and a "open shopping" / "open recipe" pair. Right now the only persistent surface is the pantry side panel — Today needs a peer.
2. **Stop funneling all 7 suggestions to recipe #3.** Either write three more realistic recipes (1, 4, 6 would cover the spread of cuisines and times) or hide the unimplemented picks behind a disabled state with honest copy. The current `app.js:309-317` is worse than either option.
3. **Tone down the four shopping card backgrounds.** Switch to a single neutral card background per column with a colored 2px top-rule or a single colored dot in the `h5`. The dot is already there (`styles.css:389-395`) — let it do the work alone.

## One thing I'd steal

The **inline `.pchips` strip above the recipe** (`app.js:184-186`, `styles.css:401-413`) — a row of six pantry chips with status dots, showing only the items relevant to *this recipe* right where the user is about to cook from it. It's pantry-awareness without pantry-checking, and it translates directly to a Stage-3 e-ink layout: a horizontal strip of dot-prefixed item names along the top of the recipe panel, no color required, dots becoming solid/hatched/outline circles.
