<p align="center">
  <img src="assets/poio.gif" alt="POiO" width="480" />
</p>

<h1 align="center">POiO</h1>

<p align="center">
  A personalized chicken recipe assistant. Pantry-aware, season-aware, with a global flavor vocabulary.
</p>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="MIT License" /></a>
</p>

---

> **Heads up:** an early idea, only lightly tested with one cook (the author) in one kitchen. Treat it as a sketch, not a product.

## What is POiO?

I fucking love chicken.

POiO is a cooking companion that knows what's in your pantry, what's in season where you live, and how to talk about food without sounding like a recipe site. You tell it what you have; it tells you what to make. Today it runs as a Claude Code skill. The longer-term aim is a small ambient device in the kitchen: an e-ink screen showing today's suggestion, your pantry status, and the shopping list.

The protein is always chicken. That's deliberate.

## Roadmap

POiO is being built in three stages. Each stage is a real, usable thing.

### Stage 1: Claude Code skill *(this repo, today)*

A skill that lives in `~/.claude/skills/poio` (symlinked from this repo). Invoke it with `/poio` or just ask about cooking. It reads your pantry, your regional context, and a global flavor reference, then suggests dishes, walks you through recipes, or builds a shopping list.

This is the testbed for the pantry model, the suggestion logic, and the recipe format before any other surface is built.

### Stage 2: Local web app

A self-hosted app you run on your own machine. A Python HTTP engine exposing the same suggestion / recipe / shopping-list endpoints, plus a thin browser UI on `localhost`. Same markdown files as canonical data. Bring your own Anthropic key.

Stage 2 takes POiO out of Claude Code so non-technical cooks can use it, and locks in the HTTP API that Stage 3 will eventually call.

### Stage 3: Ambient kitchen device

An Inkplate 10 e-ink display (9.7", ESP32, battery-powered) mounted in the kitchen, polling the same self-hosted engine over Wi-Fi. Glanceable suggestion of the day, pantry status, shopping list. Open hardware, no vendor cloud. See [`hardware/PLAN.md`](hardware/PLAN.md).

## Architecture

The same shape across all three stages, with thinner or thicker clients:

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
│  ENGINE  (Python, the "brain")              │
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

In Stage 1 the skill plays both client and engine, reading markdown directly and calling Claude through Claude Code. From Stage 2 onward, the engine runs as its own process; clients only talk to it over HTTP. Markdown stays the source of truth at every stage.

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

First invocation runs a short setup interview (location, then a pantry walkthrough) and writes your personal `pantry.md` and `references/regional-context.md`. Both files are gitignored. They're yours, they stay local.

After that, just talk to it:

- *"What should I cook?"*
- *"I'm going to the store."*
- *"Make me a chipotle-lime chicken bowl."*
- *"I bought a bunch of poblanos and some media crema."*

## Repository layout

```
poio/
├── SKILL.md                              # Persona, modes, output format (Stage 1 entrypoint)
├── pantry.example.md                     # Pantry template
├── references/
│   ├── regional-context.example.md       # Worked example (Guadalajara / Western Mexico)
│   └── style-guide.md                    # Flavor families, sauces, assembly patterns
├── setup/
│   └── interview.md                      # Onboarding script (reused across all stages)
├── hardware/
│   └── PLAN.md                           # Stage 3 thinking
├── assets/                               # Logo, animation
└── LICENSE                               # MIT
```

Personal files (`pantry.md`, `references/regional-context.md`) are generated by the setup interview on first use and never committed.

## License

[MIT](LICENSE). Do whatever you want with it.
