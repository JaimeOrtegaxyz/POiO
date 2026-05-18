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

> **Heads up:** an early idea, lightly tested in exactly one kitchen by exactly one cook (me). Treat it as a sketch, not a product.

## What is POiO?

I fucking love chicken.

But I hate the dance. Open the fridge, open some recipe app, scroll past sponsored content, find a recipe that calls for buttermilk and tarragon, close it, open another one, give up, eat cereal. I just want a friend who knows what's in my pantry, knows what's at the mercado this month, and tells me what to cook.

So I made POiO. Three little markdown files (the stuff in your kitchen, what's growing where you live, a flavor cheat sheet) and an assistant that reads them and has opinions. You tell it what you have. It tells you what to make. The protein is always chicken because that's the whole point.

Today it lives as a Claude Code skill. Down the road it'll be a small e-ink screen by the stove with today's suggestion, your pantry status, and the shopping list. Roadmap below.

## Roadmap

Three stages. Each one is a real, usable thing on its own.

### Stage 1: Claude Code skill *(this repo, today)*

Lives in `~/.claude/skills/poio` as a symlink to this repo. Type `/poio` in a Claude Code session, or just start talking about food. It reads your pantry, your regional context, and a flavor reference, then suggests dishes, walks you through a recipe, or builds you a shopping list.

Stage 1 is where the pantry model, the suggestion logic, and the recipe format get stress-tested before any of it gets wrapped in an app or burned to a microcontroller.

### Stage 2: Local web app

POiO out of Claude Code. A small Python server you run on your own machine, exposing the same suggestion / recipe / shopping-list endpoints, plus a thin browser UI on `localhost`. Same markdown files as the source of truth. Bring your own Anthropic key.

Two reasons for Stage 2: get POiO in front of cooks who don't live in a terminal, and lock down the HTTP API the eventual hardware will call.

### Stage 3: Ambient kitchen device

A small e-ink display (Inkplate 10, 9.7", battery-powered) on the kitchen wall, glancing at the same self-hosted server over Wi-Fi. Today's suggestion, what's running low, what's on the shopping list. Open hardware, no vendor cloud, no subscription. See [`hardware/PLAN.md`](hardware/PLAN.md).

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
