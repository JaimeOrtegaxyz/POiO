# poio

A personalized chicken recipe assistant — pantry-aware, season-aware, with a global flavor vocabulary.

Today this lives as a Claude skill (`SKILL.md`, `pantry.md`, `references/`). The longer-term aim is a small ambient device in the kitchen — an e-ink screen showing what's in the pantry, what's in season, and a "what to cook tonight" suggestion of the day.

## Layout

- `SKILL.md` — assistant persona, modes, output format
- `pantry.md` — current pantry state (source of truth)
- `references/`
  - `regional-context.md` — what's in season locally, by month
  - `style-guide.md` — flavor families, sauce archetypes, assembly patterns
- `hardware/` — notes and prototypes for the physical device (TRMNL / DIY ESP32 + e-ink)

## How the skill is wired

`~/.claude/skills/poio` is a symlink to this repo, so editing files here updates the skill in place. If/when this gets packaged as a standalone product, the symlink can be removed and the skill folder repopulated with a frozen copy.

## Usage

In Claude Code: `/poio` — or just ask "what should I cook?", "I'm going to the store", or name a dish directly.
