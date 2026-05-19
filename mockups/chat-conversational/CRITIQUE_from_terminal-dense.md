# Critique of `chat-conversational/` — from `terminal-dense`

Reviewed: `index.html`, `styles.css`, `data.js`, `app.js`, `README.md`.

## Strengths

- **The metaphor matches what POiO actually is in Stage 1.** SKILL.md *is* a chat persona; wrapping it in a thread + cards (`app.js:134-264`) honors that better than retrofitting it into pages. The recipe card, the seven-item suggestion deck, and the four-column shopping card map 1:1 onto the SKILL.md output sections.
- **Real data flow.** `data.js` is a single source for pantry + suggestions + recipe + shopping; `app.js:380-387` updates the pantry array AND re-renders the side panel AND mutates the shopping list when "mark avocado low" runs. It's the only mockup where state actually moves through the UI in response to user input.
- **Ambient pantry panel** (`index.html:49-72`, `styles.css:500-552`) is the right call — it puts the highest-frequency reference next to the conversation, doesn't demand a tab switch, and the inline `pchips` above recipes (`app.js:184-186`) cleverly reinforce pantry awareness at decision time.

## Weaknesses

- **Everything good costs a click and a wait.** `botSay()` (`app.js:271-277`) adds an unconditional `DELAY_SHORT` (480ms) or `DELAY_LONG` (950ms) before *any* assistant reply, including canned navigation like "show me the recipe again." For a power user who knows what they want, the interface artificially slows itself down by almost a full second per turn to simulate typing. That's the opposite of fast.
- **No keyboard shortcuts at all.** Composer has Enter-to-send and that's it (`app.js:499-504`). No `/` to focus the input, no `Cmd-K` for the prompt palette, no `1..7` to pick a suggestion (the `data-pick` attribute is set on `app.js:137` but only listens to clicks at `app.js:282`), no `Esc` to dismiss the pantry. The top-bar pills are mouse-only buttons.
- **Quick-reply chips kill discoverability.** The "scriptable feel" the README describes (`README.md:18`) means the only obvious next moves are the 2-4 buttons surfaced under the last assistant turn. Want to type something between turns? You can, but the freeform path is a regex switch (`app.js:465-497`) that funnels every unmatched phrase to a "try one of the chips above" fallback. The actual conversational surface is narrower than the chat metaphor implies.
- **Composer hint is a lie.** `index.html:45` literally tells the user "shift+enter for newline (not really, this is a prototype)." Either implement it or remove the line — leaving an admittedly-broken affordance in the UI is worse than not promising it.
- **`fadeUp` keyframe on every turn** (`styles.css:144-148`) plus the typing-indicator `blink` animation (`styles.css:495-498`) plus the `transform: translateY(-1px)` on every `.pill-btn:hover` (`styles.css:98`). On a kitchen tablet with greasy fingers and lower-end GPU, none of this earns its frame budget.
- **DOM grows unbounded.** Every turn appends a new `.turn` element with avatars, names, bubbles, and (for recipes) the full ingredient + method tree. Long sessions will accumulate megabytes of nodes with no virtualization, no archive, and `scroll-behavior: smooth` (`styles.css:133`) on the thread will start to lag.
- **`flowPickSuggestion()` is dishonest** (`app.js:309-323`). Picking suggestion #1, #2, #4, #5, #6, or #7 all route to "pretend we picked #3" with a meta-apology. The mockup is selling the gesture but the data is one recipe deep. The README admits this but the UI doesn't.

## Top 3 must-fix

1. **Remove the artificial delays for navigation-style replies** (recipe re-show, mode switches, follow-up confirmations). Keep them only for the *first* assistant turn after a real question, where they read as "thinking." Right now the prototype feels slower than the real Claude skill, which is backwards.
2. **Wire keyboard parity.** `/` focuses composer, `Cmd-K` opens the prompt palette (the three top-bar pills, plus more), `1..7` selects a suggestion when the deck is on screen, `Esc` toggles the pantry. The infrastructure (`data-pick`, `data-prompt`) is already in the markup — it just needs a `keydown` handler.
3. **Make the freeform input do real work** or remove the composer. Either make the regex matcher honest about what it accepts ("try: store, verde, tinga, weirder, i'm back") via the placeholder, or hide the composer and lean into the chip-only conversation. The current half-state lies about its own capability.

## One thing I'd steal

The **inline `pchips` above the recipe card** (`app.js:184-186`, rendered between the assistant text and the card itself). Showing the three or four pantry items the recipe leans on, with their live status dots, right above the recipe — that's pantry awareness *at the moment of decision*, not via a separate tab. In a terminal UI I'd render the same idea as a one-line `[plenty: media-crema, chipotle] [low: cotija] [out: cilantro]` strip pinned above the recipe pane.
