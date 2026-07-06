<p align="center">
  <img src="assets/poio.gif" alt="POiO" width="480" />
</p>

<h1 align="center">POiO</h1>

<p align="center">
  A personalized chicken recipe assistant. Pantry-aware, season-aware, with a global flavor vocabulary.
</p>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/code-Apache--2.0-blue.svg" alt="Code: Apache-2.0" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/hardware-CERN--OHL--S--2.0-orange.svg" alt="Hardware: CERN-OHL-S-2.0" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/content-CC--BY--SA--4.0-lightgrey.svg" alt="Content: CC-BY-SA-4.0" /></a>
</p>

---

> **Heads up:** an early idea, lightly tested in exactly one kitchen by exactly one cook (me). Treat it as a sketch, not a product.

## What is POiO?

I fucking love chicken.

So I made POiO. Three little markdown files (the stuff in your kitchen, what's growing where you live, a flavor cheat sheet) and an assistant that reads them and has opinions. You tell it what you have. It tells you what to make. The protein is always chicken because that's the whole point.

Today it lives as a Claude Code skill. Down the road it'll be a small chicken-shaped countertop companion that walks you through tonight's recipe step by step, clucking at you along the way. Roadmap below.

## The bet

POiO is partly a kitchen toy and partly a bet on where things are going.

The bet is this: AI is about to stop being a *service* and start being a *component* — something you buy once, baked into an object, the way a motor is baked into a blender. Not a thing you rent by the month, not a thing that phones a cloud to work, not a thing that dies when a company sunsets it. Just a part, in a box, on your counter, that's yours.

That future isn't quite here. Build POiO with fully on-device intelligence *today* and it'd be too slow, too expensive, not smart enough — maybe all three. But the hardware that makes it cheap, fast, and smart enough is coming. It has to: the whole industry needs those parts to exist, so the market will drag them into being. The only real question is when, and nobody knows.

So POiO is a stab at imagining a product that the future will fully enable — and pointing at it now. It doesn't need the endgame hardware to be useful (the stages below are each real and buildable with what exists). But naming the destination is half the point. The cuteness is the Trojan horse; the argument underneath is that small, delightful, single-purpose AI appliances should belong to the people who own them.

A useful thing about being narrow: the general-purpose "local assistant" future is years out, but POiO doesn't need a general model. It needs a chicken-recipe companion. The future arrives early for narrow products — a tiny model that's *only* good at "suggest a dish from these six things and walk me through it" can cross the line into delightful long before the everything-machine does.

## Roadmap

Three buildable stages, each a real and usable thing on its own — plus a fourth that's the horizon they're aimed at.

### Stage 1: Claude Code skill *(this repo, today)*

Lives in `~/.claude/skills/poio` as a symlink to this repo. Type `/poio` in a Claude Code session, or just start talking about food. It reads your pantry, your regional context, and a flavor reference, then suggests dishes, walks you through a recipe, or builds you a shopping list.

Stage 1 is where the pantry model, the suggestion logic, and the recipe format get stress-tested before any of it gets wrapped in an app or burned to a microcontroller.

### Stage 2: Local web app *(first cut built — see [`stage2/`](stage2/))*

POiO out of Claude Code. A small Python server you run on your own machine (stdlib only, no install), exposing pantry / recipe / suggestion endpoints as JSON, plus a browser UI on `localhost` that behaves like the eventual device — encoder, tap-to-advance, e-paper constraints and all. No API key: the server rides your existing Claude Code auth through the headless `claude` CLI, and the cooking loop itself never touches the LLM. The markdown files seed the pantry once; after that the runtime store is `stage2/data/pantry.json` (see [`stage2/PANTRY-MODEL.md`](stage2/PANTRY-MODEL.md)).

Two reasons for Stage 2: feel the device's frictions on a laptop before committing to hardware, and lock down the HTTP API the eventual firmware will call. Quickstart in [`stage2/README.md`](stage2/README.md).

### Stage 3: Kitchen companion device

A small chicken-shaped countertop device, palm-sized, battery-powered, with a 4.2" mono e-paper screen, a rotary encoder, two buttons, and a soft "eye" you press to wake it. Walks you through a recipe step by step, taps-to-advance when your hands are covered in raw chicken, clucks at you when the timer's up. Talks to the same self-hosted server the web app uses. Open hardware, no vendor cloud, no subscription. Targeting a ~$55 electronics BOM — honest retail range is $79–99 lean DTC or $129–199 properly shipped.

See [`hardware/PLAN.md`](hardware/PLAN.md) for the product direction, [`hardware/UI-LANGUAGE.md`](hardware/UI-LANGUAGE.md) for the screen's design language, and [`hardware/PROTOTYPE.md`](hardware/PROTOTYPE.md) for the bench parts list.

### Stage 4: The brain moves in *(the endgame)*

Same chicken, same personality, but the intelligence lives *inside* it. No self-hosted server, no Anthropic key, no network round-trip — a tiny model running on-device, on a chip cheap and frugal enough to sit in a battery-powered appliance. Ask it what to make, and it just answers, on the counter, owing nothing to anyone's cloud.

This is the stage that explains the whole project. It's also the one that doesn't fully exist yet: the hardware to do it well, cheaply, at appliance power budgets is still on its way. POiO doesn't wait for it. The earlier stages keep the brain *swappable* — a socket, not a commitment — so the day the right part lands, it's a board swap, not a redesign. Until then, pointing clearly at this future is itself part of POiO's job.

## Architecture

The same shape across all three stages, with thinner or thicker clients:

```
┌─────────────────────────────────────────────┐
│  CLIENTS  (thin, swappable)                 │
│  • Stage 1: Claude Code skill (SKILL.md)    │
│  • Stage 2: local web app                   │
│  • Stage 3: countertop device firmware      │
└──────────────────┬──────────────────────────┘
                   │ HTTP / JSON  (Stage 2+)
                   ▼
┌─────────────────────────────────────────────┐
│  ENGINE  (Python, the "brain")              │
│  • Reads pantry + references                │
│  • Calls Claude (headless CLI today)        │
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

In Stage 1 the skill plays both client and engine, reading markdown directly and calling Claude through Claude Code. From Stage 2 onward, the engine runs as its own process; clients only talk to it over HTTP. The markdown files stay the human-readable seed at every stage; Stage 2's runtime pantry is `stage2/data/pantry.json`, bootstrapped from them once and kept current by the confirm loop (the full argument is [`stage2/PANTRY-MODEL.md`](stage2/PANTRY-MODEL.md)). Today the engine calls Claude through the headless `claude` CLI, riding your existing Claude Code auth — swapping to a direct API key is a one-function change.

Keeping the engine behind a clean HTTP boundary is also what makes Stage 4 a swap rather than a rewrite: the brain is whatever answers at that boundary. Today it's a Python process calling a cloud model; the endgame moves that same role onto a chip inside the device. The clients and the data don't care which.

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

First invocation runs a short setup interview (location, a pantry walkthrough, then your equipment) and writes your personal `pantry.md`, `references/regional-context.md`, and `references/equipment.md`. All three are gitignored. They're yours, they stay local.

After that, just talk to it:

- *"What should I cook?"*
- *"I'm going to the store."*
- *"Make me a chipotle-lime chicken bowl."*
- *"I bought a bunch of poblanos and some media crema."*

## Repository layout

```
poio/
├── SKILL.md                              # Persona, modes, output format (Stage 1 entrypoint)
├── JOURNAL.md                            # Build log — the reasoning behind decisions
├── pantry.example.md                     # Pantry template
├── references/
│   ├── regional-context.example.md       # Worked example (Guadalajara / Western Mexico)
│   └── style-guide.md                    # Flavor families, sauces, assembly patterns
├── setup/
│   └── interview.md                      # Onboarding script (reused across all stages)
├── stage2/                               # Stage-2 server + laptop-as-device app
│   ├── server.py                         # JSON API + static host (stdlib only)
│   ├── web/                              # The encoder companion app, wired to the API
│   ├── schema/ · data/                   # Stepper-recipe schema, recipes, runtime pantry
│   ├── README.md                         # Quickstart + API reference
│   └── PANTRY-MODEL.md                   # Where the pantry lives (and why no keyboard)
├── hardware/
│   ├── PLAN.md                           # Stage 3 product direction
│   ├── UI-LANGUAGE.md                    # The e-paper screen's design language
│   ├── PROTOTYPE.md                      # Bench parts list / input bake-off rig
│   └── POiO.3dm                          # Rhino shell model (WIP)
├── mockups/                              # Device-screen mockups + input friction probes
├── assets/                               # Logo, animation, journal images
├── LICENSES/                             # Full license texts (Apache-2.0, CERN-OHL-S, CC-BY-SA)
└── LICENSE                               # Which license covers what
```

Personal files (`pantry.md`, `references/regional-context.md`, `references/equipment.md`) are generated by the setup interview on first use and never committed.

## License

POiO is open, and meant to stay open — fitting for a thing about owning your tools rather than renting them. Three licenses, one per kind of material:

- **Software** (skill, engine, firmware) — [Apache-2.0](LICENSES/Apache-2.0.txt)
- **Hardware** (Rhino model, schematics, PCB, meshes, BOM) — [CERN-OHL-S-2.0](LICENSES/CERN-OHL-S-2.0.txt)
- **Content** (docs, recipe data, style guide, assets) — [CC-BY-SA-4.0](LICENSES/CC-BY-SA-4.0.txt)

All three are share-alike: use it, modify it, sell it — but keep derivatives open under the same license and credit the original. The POiO name and logo are not licensed for uses implying endorsement. See [`LICENSE`](LICENSE) for the full rundown.
