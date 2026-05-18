<p align="center">
  <img src="assets/poio.gif" alt="poio" width="320" />
</p>

<h1 align="center">poio</h1>

<p align="center">
  A personalized chicken recipe assistant — pantry-aware, season-aware, with a global flavor vocabulary.
</p>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="MIT License" /></a>
</p>

---

> **Heads up:** this is an early idea, only lightly tested with one cook (the author) in one kitchen. Treat it as a sketch, not a product. I'm building it in public — fork it, break it, tell me what doesn't work.

## What is poio?

poio is a cooking companion that knows what's in your pantry, what's in season where you live, and how to talk about food without sounding like a recipe site. You tell it what you have, it suggests what to make. Today it runs as a Claude Code skill. The longer-term aim is a small ambient device in the kitchen — an e-ink screen showing today's suggestion, your pantry status, and the shopping list.

The protein is always chicken. That's deliberate.

## Roadmap

poio is being built in three stages. Each stage is a real, usable thing — not a prototype that gets thrown away.

### Stage 1 — Claude Code skill *(this repo, today)*

A skill that lives in `~/.claude/skills/poio` (symlinked from this repo). You invoke it with `/poio` or by asking about cooking. It reads your pantry, your regional context, and a global flavor reference, then suggests dishes, walks you through recipes, or builds a shopping list.

This stage is the testbed: it's where the pantry model, the suggestion logic, and the recipe format get pressure-tested before any other surface is built.

### Stage 2 — Local web app

A small self-hosted app you run on your own machine. A Python HTTP engine that exposes the same suggestion / recipe / shopping-list endpoints poio uses today, plus a thin browser UI on `localhost`. Same markdown files as the canonical data. Same Anthropic API under the hood — bring your own key.

The goal of Stage 2 is to take poio out of Claude Code so non-technical cooks can use it, *and* to lock in the HTTP API that Stage 3 will eventually call.

### Stage 3 — Ambient kitchen device

An Inkplate 10 e-ink display (9.7", ESP32-based, battery-powered) mounted in the kitchen, polling the same self-hosted engine over Wi-Fi. Glanceable suggestion of the day, pantry status, shopping list. Open hardware, no vendor cloud. See [`hardware/PLAN.md`](hardware/PLAN.md) for the current thinking.

## Architecture

The shape is the same across all three stages, with thinner or thicker clients:

```
┌─────────────────────────────────────────────┐
│  CLIENTS  (thin, swappable)                 │
│  • Stage 1: Claude Code skill (SKILL.md)    │
│  • Stage 2: local web app                   │
│  • Stage 3: Inkplate 10 firmware            │
└──────────────────┬──────────────────────────┘
                   │ HTTP / JSON  (Stage 2+)
                   ▼
┌─────────────────────────────────────────────┐
│  ENGINE  (the "brain", Python)              │
│  • Reads pantry + references                │
│  • Calls the Anthropic API                  │
│  • Returns suggestions / recipes / lists    │
│  • Stateless per request                    │
└──────────────────┬──────────────────────────┘
                   │ filesystem
                   ▼
┌─────────────────────────────────────────────┐
│  DATA  (markdown, canonical, git-friendly)  │
│  • pantry.md                                │
│  • references/regional-context.md           │
│  • references/style-guide.md                │
└─────────────────────────────────────────────┘
```

In Stage 1, the skill plays both client and engine — it reads the markdown directly and calls Claude through Claude Code. From Stage 2 onward, the engine is its own process, and clients only talk to it over HTTP.

Markdown stays the source of truth at every stage. The files are hand-editable, diff-friendly, and survive whatever happens to the surrounding code.

## Quickstart (Stage 1)

You need Claude Code installed.

```bash
# 1. Clone somewhere you don't mind keeping it long-term
git clone https://github.com/JaimeOrtegaxyz/poio.git ~/Documents/GitHub/poio

# 2. Symlink it into your Claude skills directory
ln -s ~/Documents/GitHub/poio ~/.claude/skills/poio

# 3. Start a Claude Code session anywhere, then:
/poio
```

The first time you invoke it, poio runs a short setup interview (location + a pantry walkthrough) and writes your personal `pantry.md` and `references/regional-context.md`. Both files are gitignored — they're yours, they stay local.

After that, just talk to it:

- *"What should I cook?"*
- *"I'm going to the store."*
- *"Make me a chipotle-lime chicken bowl."*
- *"I bought a bunch of poblanos and some media crema."*

## Repository layout

```
poio/
├── SKILL.md                      # Persona, modes, output format (Stage 1 entrypoint)
├── pantry.example.md             # Pantry template — structure for the live file
├── references/
│   ├── regional-context.example.md   # Worked example (Guadalajara / Western Mexico)
│   └── style-guide.md            # Flavor families, sauces, assembly patterns (universal)
├── setup/
│   └── interview.md              # Onboarding script (reused across all stages)
├── hardware/
│   └── PLAN.md                   # Stage 3 thinking — Inkplate 10 device
├── assets/                       # Logo, animation
└── LICENSE                       # MIT
```

Files under personal control (`pantry.md`, `references/regional-context.md`) are generated by the setup interview on first use and never committed.

## Building in public

This is a hobby project I'm working on out in the open while I figure out whether the idea has legs. Issues, ideas, forks, all welcome. No promises of polish or backward compatibility — things will move around as the shape settles.

If something here resonates with you, the most useful thing you can do is try it in your own kitchen and tell me what fell apart.

## License

[MIT](LICENSE) — do whatever you want with it.
