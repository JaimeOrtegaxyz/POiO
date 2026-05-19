# Critique from editorial-cookbook

Reviewed: `index.html`, `style.css`, `app.js`, `README.md`.

## Strengths

- **Genre is fully committed and internally coherent.** Every detail honors the k9s/lazygit/htop reference — the `[ TODAY'S DISH ]` bracket-title convention (`index.html:47`), the ASCII box around the recipe header (`:264–268`), the bottom status bar with `1-5 view · j/k ↓↑` (`:557–565`), the `/` find overlay, the `?` help modal. It's the kind of consistency a TUI lover will respect on sight.
- **The recipe writing is the best in this folder.** "Sticky, smoky thighs smashed flat for max surface area, glazed with chipotle and honey until they catch at the edges" (`index.html:271`), "Hot wok, neutral oil, garlic-ginger pounding the air" (`app.js:181`), "smoke first, then sweet, then a slow burn" (`index.html:329`) — these are SKILL.md voice notes, and they survive monospace better than I expected.
- **Real keyboard model.** `app.js:512–608` actually wires `j/k/g/G/h/l/tab/enter/space/?` and a live-filtering `/` overlay. The `cyclePantryStatus` mutating real demo state is a nice prototype touch. This is the only mockup where a power user could actually drive the thing.

## Weaknesses

- **Monospace flattens every sensory line.** "Weeknight bowl that drinks like a weekend" (`index.html:271`) lands as data when it should land as flavor. The mono grid measures the prose into 12.5px cells (`style.css:62`) and the writing loses about half its emotional bandwidth. A casual home cook looking for dinner inspiration will bounce off this in five seconds.
- **The dark-by-default theme is the wrong color story for food.** `--bg: #0c0e10` (`style.css:11`) with amber/green/red status is server-room palette. Food wants warm paper, char, lime, chile. The light theme at `:32–51` is better (a parchment) but is one keystroke away and not the impression you lead with.
- **Salt is `out`. Salt.** `app.js:44`: `['Salt (kosher)', 'spices', 'out', 'critical staple']`. Plus `White onion` `out` (`:86`), `Garlic` `out` (`:88`), `Mexican oregano` `out` (`:33`). Reading the demo data, it looks like the kitchen has been ransacked. It makes the whole pantry-aware promise feel broken; a real Guadalajara cook always has salt and onions.
- **Status bar uses the amber accent as a full-width background** (`style.css:516–526`) with black text — at default font size this looks like a Windows 95 caution stripe. The keybinding hint, which is supposed to be the design's signature, ends up shouty and hard to scan.
- **"Recent cooks" table on the Today view** (`index.html:153–164`) — with star ratings — feels like a habit-tracker product. SKILL.md never mentioned rating dishes, and it injects a quantified-self vibe that runs against the "knowledgeable cooking friend" persona.
- **Spanish terms are present but not celebrated.** Epazote, nopales, tomatillo, chiles de agua, tianguis all appear, but they're rendered in 12px mono next to the English; the cookbook half of the product doesn't get any typographic dignity.

## Top 3 must-fix for v2

1. **Default to the light theme and re-tune it toward warm paper, not solarized parchment.** The light vars at `style.css:32–51` are close — push the background warmer (`#f4ecdc`), make `--accent` a deeper chile red rather than amber, and let the recipe pane sit on a slightly lighter card so it reads like a recipe card on a counter.
2. **Fix the pantry demo data.** Salt, garlic, white onion, Mexican oregano back to `plenty`. Move the `out` flags to actually-runnable-out items (whole chicken, gochujang, tahini, bolillo). The current data makes POiO look incompetent at its one job.
3. **Give the recipe view a serif escape hatch.** Even within the TUI conceit, the recipe pane (`#view-recipe`) could swap to a proportional serif for body copy while keeping the mono chrome. That's how `man` pages look in modern terminals (`mandoc` in iTerm), and it would let "until they catch and turn lacquered" actually breathe.

## One thing I'd steal

The list+detail master-detail layout on the Suggestions view (`index.html:170–251`, wired in `app.js:248–293`). Seven dishes on the left as a sortable table, the selected one expanded on the right with "tasting note / assembly / anchor / why this dish, today." That structure is genuinely better than my own dense suggestions page, because it lets the user scan-then-dwell without losing context.
