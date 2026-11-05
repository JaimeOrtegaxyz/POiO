# POiO screen — design language

The visual contract for POiO's screen. It governs two things: the device UI, and the online mockup's emulation of the device screen. Voice and copy rules live in [`VOICE.md`](../VOICE.md); what's in V1 lives in [`SCOPE.md`](../SCOPE.md).

Lineage: the grammar started in the archived [`eink-glance/`](../archive/mockups/eink-glance/) broadsheet (ink on paper, patterns instead of gray, no motion) and was rebuilt for a small, close screen in the archived mono [`eink-companion/`](../archive/mockups/eink-companion/). This version keeps the restraint and moves it to color e-paper.

## The screen we're designing for

- **Color e-paper, panel TBD** (picked by the [bench test](PROTOTYPE.md)). Size, resolution, color depth and repaint times get filled in once the panel is chosen.
- Read at **arm's length** on a kitchen counter, often mid-task. Type is big, density is low.
- **Always on.** When nothing is cooking, it shows the open cookbook screen.
- No keyboard, no pointer, no hover. Inputs: **voice** (hold the **red star knob** to talk) and the same knob as an **encoder** (rotate to browse, press to select or step), plus two pills either side (back, home; provisional).

## First principles

1. **Design within the panel's real limits.** Color e-paper is not an LCD: fewer, softer colors, slower repaints. Nothing may depend on a color or speed the panel can't deliver.
2. **Food gets the color; chrome stays quiet.** Images use the panel's full color. UI chrome uses a small brand palette.
3. **Type does most of the hierarchy.** Two typefaces, set against each other.
4. **Status is color plus pattern**, never color alone.
5. **Discrete repaints by default.** No spinners, ever.
6. **One job per screen.** Each screen does one thing; you move between them with the knob or by voice.
7. **Sparse by default.** Show the essentials and nothing more. Add an element only when something genuinely feels missing in use — never to fill space. It's easier to add later than to claw density back. When in doubt, leave it out.

## Color

- **Food images:** the panel's full color.
- **UI chrome:** four brand tones: **ink**, **paper**, **yellow** and **red**. Exact values are set on the panel, since e-paper renders color differently from a monitor. The old mockup targets (ink `#1a1816`, paper `#f4efe4`) are the starting point for the first two.
- Emphasis comes first from **weight, size and inversion** (an inverted pill, a solid bar). Red is for the few things that must catch the eye; yellow is the brand accent.
- Final palette after the bench test.

## Typography

- **Quicksand**: reading and display. Dish titles, the current step's instruction, the cookbook suggestion.
- **JetBrains Mono**: chrome. Kickers, quantities, status labels, step numbers, footer meta. Tabular figures so numbers align.

Both are rechecked on the panel during the bench test. *Fix: this doc previously named Spectral as the reading face; Quicksand is what the app actually used and is now canonical.*

**Type roles.** Keep the set small, no ad-hoc sizes. Pixel sizes get re-scaled after the bench test, once the panel's resolution and viewing distance are known.

| Role | Face |
|---|---|
| Hero / dish title | Quicksand |
| Step number `3 / 7` | JetBrains Mono |
| **Step body (most-read)** | **Quicksand** |
| Ingredient + quantity rows | Quicksand name / Mono qty |
| Kicker / label / status | JetBrains Mono, tracked caps |
| Footer meta | JetBrains Mono |

Anything you must read while cooking has a size floor, set on the panel. Quantities right-align in a mono gutter.

## Status grammar

`plenty` / `low` / `out` are shown as **color plus pattern**, the same everywhere they appear (pantry pills, the pantry diff, shopping markers), so the eye learns the encoding once and it still reads in poor light or for color-blind users.

Starting proposal, final after the bench test:

- `plenty` → **solid ink**
- `low` → **yellow with a 45° diagonal hatch**
- `out` → **red with a sparse dot pattern**

Patterns are fixed-pitch and snap to the panel's pixel grid so they don't shimmer.

## Layout

Three bands:

```
┌────────────────────────────────────┐
│ MASTHEAD   POiO · context · meta    │  one line: mark + where-you-are + meta
├────────────────────────────────────┤  hairline
│                                     │
│            BODY                     │  the one job: a step, a list, a screen
│                                     │
├────────────────────────────────────┤  hairline
│ AFFORDANCES  ● hablar · ◎ elegir    │  what the controls do here, as static glyphs
└────────────────────────────────────┘
```

- **Masthead-lite.** Small POiO mark, the current context (dish name / "Despensa" / "Lista"), meta in mono on the right. No clock: time isn't shown.
- **Body is the screen.** One job.
- **Affordances band.** Static glyphs label what the star knob does *here*: ● = hold to talk, ◎ = turn, "pulsa" = a short press.

### The open cookbook screen

The resting screen, always on. It looks like a cookbook left open on the counter:

- Suggests a dish **1-2× a day**, seasonal, with its image.
- Ignore it, or tweak it by voice ("algo más rápido"). No prompts, no badges.
- Proactive check-ins ("¿qué tal la tinga?") appear here later that day or the next, never at turn-on.
- It changes rarely, so it can afford slower repaints than the stepper.

### The recipe stepper

The primary cooking screen. One step per screen:

- Step `X / N` (mono, top of body).
- The instruction in the step-body size, the largest comfortable reading size.
- Only the ingredients/quantities relevant to *this* step, with status markers if stock matters.
- **Checkpoints instead of a timer cue.** No time on screen and no countdown. When a checkpoint arrives, the step shows its message ("Voltea el pollo.") and the checkpoint sound plays.
- The advance verb is **knob press** or saying **"siguiente"**; the affordance band says so.

## Voice-state feedback

Text plus sound, never motion:

| State | Screen | Sound |
|---|---|---|
| Idle | Whatever screen you're on | — |
| Listening (star knob held) | A static listening state; LED by the knob on | Press tick |
| Thinking (button released) | A static "thinking" state | Release tick |
| Didn't understand | "No te entendí. Mantén el botón y dilo otra vez." | "Didn't understand" sound |
| Answered | The resulting screen, repainted once | — |

## Motion & refresh

- **Discrete repaints by default.** A state change is a repaint.
- Short animations get a place only if the online mockup's A/B shows they earn it, and only within what the panel can do.
- **No spinners.** Pending states are static (see voice-state feedback).

### Refresh hygiene

Generic rules; panel-specific numbers TBD after the bench test.

- **Partial-refresh the region that changed** (the step number and step body) where the panel supports it, so advancing doesn't repaint the whole screen.
- **Schedule a full refresh** every several steps, and at least daily on the cookbook screen, to clear accumulated ghosting.
- Avoid leaving the same high-contrast element in the same spot for days; the cookbook screen's daily change helps.

## Affordances (no keyboard, no hover)

| Control | Does |
|---|---|
| **Voice** (while the star knob is held) | Free input: ask, tweak, "siguiente", "se acabó el X", "¿qué sabes de mí?" |
| **Star knob hold** | Push-to-talk: hold while speaking, release when done |
| **Star knob rotate** | Browse: options, steps, lists |
| **Star knob press** | Select / advance a step / confirm |
| **Left pill** | Back *(provisional, pending the bench test)* |
| **Right pill** | Home: the cookbook *(provisional, pending the bench test)* |

State lives in the screen, not in a cursor. Selection is shown by **inversion or a solid caret**, not a hover color. The front layout (red star knob center, pills either side) is in [`PLAN.md`](PLAN.md#form-factor).

## Adaptive UI

V1 ships **1-2 designer-set layout variants** (for example, image-led vs text-led). POiO may suggest switching ("¿Prefieres las recetas sin foto?"); the user decides. Variants stay inside this language; nothing is generated on the fly.

## Images

Realistic-ish food within color e-paper limits: dithered to the panel's palette, simple compositions, food large in frame. The online mockup mirrors this look rather than showing screen-quality photos.

## Reference implementation

The online mockup (coming, `mockup/`) will be the visual reference for this language. The old mono reference is archived at [`../archive/mockups/eink-companion/`](../archive/mockups/eink-companion/).
