# POiO — scope

Source of truth for what's in V1, V2, Future and Discarded. Figma is for exploring; when they disagree, this file wins. Dated decisions: [DECISIONS.md](DECISIONS.md).

## What POiO is

- A chicken-first kitchen companion: chicken by default, other dishes when you ask, when there's no chicken in the house, or when your habits call for it.
- An always-on countertop device with a color e-paper screen (panel TBD).
- You speak (push-to-talk on the red button) and it answers with text on screen and a few sounds. Never speech.

## Phases

Phase and scope are separate: phases say *where* POiO runs, the tiers below say *what* it does.

1. **Skill** *(today)*: [`SKILL.md`](SKILL.md) in Claude Code. The base brain for everything after it.
2. **Online mockup** *(next)*: hosted web app that emulates the device screen. Code will live in `mockup/`.
3. **Device V1**: the chicken-shaped countertop device, a thin client to a hosted brain.
4. **On-device brain** *(endgame)*: the same device with the model running inside it.

## Who it's for

From someone cooking for themselves on weeknights up to the person who cooks for a household. Batch cooking and people who cook to sell are a V2 question (see [Open questions](#open-questions)).

## Principles

- **Practical first, playful in small moments.** It has to hold up at ~5 uses a week for months. Details: [VOICE.md](VOICE.md).
- **Useful within minutes, no hard gate.** Four skippable questions, then a recipe.
- **Sparse screens, one job per screen.**
- **A small, learnable sound set. Never speech.**
- **The device works without the app.**
- **Mexican Spanish first.**
- **Settings change by asking.**

## V1 by journey moment

| Moment | V1 behavior |
|---|---|
| **Turn on** | A short chirp. No greeting, no instant suggestion. |
| **Open cookbook screen** | Always on. Suggests a dish 1-2× a day, seasonal. Ignore it, or tweak it by voice ("algo más ligero"). Proactive check-ins ("¿qué tal la tinga?") show up here later that day or the next day, never at turn-on. |
| **Onboarding** | First run: four questions, each answerable by voice and skippable, each with a one-line reason, then three options right away. After the first cook: ten more topics surfaced one or two at a time, or all at once on "pregúntame todo". No hard gate, never re-asks what it knows, every answer changeable by asking. Questions, reasons and defaults: [`setup/interview.md`](setup/interview.md#first-run). |
| **Choosing** | Three options, each title · time · difficulty. No commentary, no narrowing follow-up. Discard = three new options, no comment, logged as a taste signal. |
| **Missing ingredient** | Short practical options: skip it, or substitute it, each with its trade-off. |
| **Cooking** | Ingredient check before the first step. Then step by step (encoder press or "siguiente" to advance). No running countdown and no time on screen: **checkpoints** only, a message ("voltea el pollo", "revisa que dore") plus the checkpoint sound. "Se acabó el X" / "we're out of X" is logged by voice mid-cook. |
| **Finish** | One cluck, then silence. One optional taste question by voice ("¿Cómo quedó, del 1 al 10?"). Then the predicted pantry diff to confirm. |
| **Learning** | **Poionotas**: what POiO knows about you, visible and editable by asking ("¿qué sabes de mí?"). Discards count as a taste signal. Check-ins live on the cookbook screen. Habit learning starts with the mockup (see V2). |
| **Pantry** | Context, not a requirement: POiO suggests with whatever it knows. Fridge/receipt photos come through the app. Kept current by the predicted post-cook diff and "se acabó" by voice. |
| **Settings** | In the background, changed by asking. |
| **App** | Camera input (fridge, receipt, dish photo), minimal social (share a recipe, no feed) and config. Optional: the device works without it. |
| **Adaptive UI** | 1-2 designer-set layout variants. POiO suggests switching; you decide. |
| **Wi-Fi setup** | A V1 must-have. Method (captive portal vs BLE) is open. |

## V1 hardware

Details in [`hardware/PLAN.md`](hardware/PLAN.md).

- Color e-paper screen (panel TBD after the [bench test](hardware/PROTOTYPE.md))
- Mic
- Red push-to-talk button with a listening LED
- Encoder (rotate + press)
- Speaker
- Mains / USB-C power, always-on
- No camera, no PIR

## V2

- Batch cooking
- Multi-axis taste feedback
- Habit and schedule learning
- Voice note on the way home
- Perishables alert
- Weekly menu
- Natural-language amounts
- Consumption pace
- Proactive diet discovery
- Learning from corrections
- Richer social
- More adaptive-UI variants

## Between V1 and V2

- Widget / quick mic
- Inbox-style capture
- Personal + shared recipe book
- PDF export
- Recipe from video
- Private/public recipes

## Future

- Battery power
- Tap-to-advance, thumbwheel, cap slider, extra tactile buttons
- Multi-device setups
- Several recipes in parallel
- Connected appliances
- Shared household list/pantry
- Kids/adults profiles
- Meal plans

## Discarded

| Idea | Why not |
|---|---|
| Text-to-speech output | Text on screen plus a few learnable sounds covers it; a talking device wears thin at ~5 uses a week. |
| Running countdown timer | Checkpoints tell you what to do next; a ticking number on screen adds pressure without adding information. |
| Greeting on turn-on | Gets old fast. The chirp is enough. |
| Alexa-style welcome test | A generic assistant ritual. First run goes straight to a recipe instead. |
| Pantry audit every few weeks | A chore. The pantry is context, kept current by the post-cook diff and voice. |
| Ticket printing | Extra hardware and paper for lists the screen and the app already show. |
| 4th "don't know" pantry state | plenty / low / out is enough; items POiO doesn't know about are simply unknown. |
| Expense tracking | Outside a cooking companion's job. |
| Battery-first design | The always-on cookbook screen and the mic want mains power. Battery is Future. |
| Mono-only screen as the committed direction | Food images need color. Color e-paper is the leading option. |

## Open questions

- **Panel.** Which color e-paper panel. Settled by the [bench test](hardware/PROTOTYPE.md).
- **Mic hardware.** Part, placement and port in the shell.
- **Connectivity / Wi-Fi setup method.** Captive portal vs BLE.
- **On-device LLM feasibility.** When a small model is good, fast and cheap enough to live in the shell.
- **Photo transfer without the app.** Bluetooth/AirDrop-like transfer straight to the device.
- **Batch cooking.** Whether and how to support it; probe in the mockup.
- **Push-to-talk details.** Hold/release feel, max length, what happens on a too-short press.
- **How proactive is too proactive.** Frequency and tone of suggestions and check-ins.
- **Sound design.** Final sounds are Jaime's call.
- **Product render.** To be exported from [`hardware/POiO.3dm`](hardware/POiO.3dm) into `assets/`.

## Testing plan (online mockup)

- Text-first
- Google login
- Shared widely
- Voice input
- A/B: images + animation vs text
- Emulates the color e-paper device screen
