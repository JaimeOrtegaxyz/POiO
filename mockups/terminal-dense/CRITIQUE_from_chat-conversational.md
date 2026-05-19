# Critique — from `chat-conversational`

Reviewing `terminal-dense/` through the lens of conversational, intent-driven UX and fidelity to the SKILL.md persona.

## Strengths

- **Information density and keyboard fluency are real.** The Today dashboard fitting dish hero, pantry stats with stacked bars, shopping summary, season list and recent-cooks log on one screen (`index.html:42-168`) is genuinely impressive — a power user could absorb tonight's state in two seconds. `j/k/g/G/`-style nav (`app.js`, README) is honest about who it's for.
- **The pantry view is the best of the three for a power user.** Live `/` find, three filters, three sorts, in-line `space`-to-cycle status (`index.html:406-449`) actually delivers SKILL.md's "Updating the Pantry" loop more directly than the editorial mockup does — the cook can fix bad data without leaving the view.
- **Recipe ingredient-check side panel is a smart, original idea.** The right pane (`index.html:353-390`) shows every ingredient against current pantry status so the cook sees the green/amber/red diff at a glance before starting. None of the other mockups thought of this and it's worth keeping.

## Weaknesses

- **The persona is gone.** SKILL.md asks for "confident, playful, sensory… never clinical." This UI labels its panes `[ TODAY'S DISH ]`, `[ PANTRY STATS ]`, `[ SEASON ]` (`index.html:47, 77, 132`) and renders the recipe as `chipotle-honey-smashed-thighs.md` (`index.html:259`). The vibe sentence ("Sticky, smoky, with a bright lime-crema swoosh", `index.html:54`) is there but drowning in `kv table` chrome. A non-technical home cook opening this would think they hit a developer console.
- **No conversation, and the dialog Mode 1 step 4 is missing.** Suggestions are a sortable seven-row table (`index.html:180-238`); pressing `enter` on a row opens the recipe directly. There is no input prompt, no narrowing question, no Mode 3 ("make me a chipotle-lime bowl"). The README lists 14 keybindings; none of them is "ask POiO something." That's the whole product.
- **`m` to "mark cooked" and `s` to "swap suggestion" are tells.** These are vim-shortcut-shaped solutions for what should be sentences. "Mark cooked" should be the assistant noticing you mention you ate the dish; "swap" should be "give me something else, lighter." The keyboard vocabulary replaces the linguistic one SKILL.md built.
- **Spanish food vocabulary is technically present but stripped of warmth.** "elote (corn on the cob)" with the gloss in parens (`index.html:292`), "Tomatoes (jitomate)" (`app.js:90`), `(canela (Ceylon cinnamon))`. SKILL.md is explicit: *don't translate these; they are what they are.* The translations leak the design's worry that the user won't know the word — exactly the opposite of the skill's posture.
- **Intimidation cost is real.** ASCII box-drawing for the recipe header (`index.html:264-268`), `[NORMAL]` mode indicator in the status bar (`index.html:553`), 12.5px monospace on dark `#0c0e10` (`style.css:11, 62`). The target user is "exactly one cook (me)" per the README — but Stage 2 explicitly exists to "get POiO in front of cooks who don't live in a terminal." This UI is the opposite of that brief.

## Top 3 must-fix items (v2)

1. **Add a chat / command input as the primary verb.** Even keeping the TUI aesthetic — a single `>` prompt at the bottom that accepts natural language ("what should I cook?", "I bought poblanos", "lighter please") would let SKILL.md's three modes actually run. `?` for help is fine; `>` for talking is the missing one.
2. **Implement the Mode 1 narrowing step.** Pressing `enter` on a suggestion row should reveal one focused question and two/three answer chips before opening the recipe. Currently the most distinctive interaction in the skill is short-circuited.
3. **Translate the chrome, not the food.** Drop "(corn on the cob)" and "(tomato)" parenthetical glosses (`index.html:292`, `app.js:90`); keep the Spanish words bare. Soften pane titles from `[ SEASON ]` to `season:` or just `season`, and lowercase the all-caps headers. The keyboard model can stay; the developer-tool affect needs to go.

## One thing I'd steal

The **ingredient-check side panel** on the recipe view (`index.html:353-390`) — a live pantry-diff next to the method, with green/amber/red dots per ingredient. It surfaces feasibility (Mode 3's whole opening move) without making the cook flip back to the pantry tab. I'd render this as a compact inline card under every recipe answer in my chat design.
