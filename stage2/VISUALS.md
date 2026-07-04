# POiO companion — visuals & interaction notes

Design decisions for the live companion app (`stage2/web/`), and the running log
of Jaime's feedback from actually cooking with it. The visual contract for the
device screen itself is `hardware/UI-LANGUAGE.md`; this is about the working
prototype and the taste calls behind it.

## Kitchen-test feedback — 2026-07-04

From the first real cook-with-it session. What changed this pass, and what's
deliberately deferred.

### Done this pass
- **Typography → rounder, friendlier, and honest to 1-bit.** The old titling
  (Spectral, a high-contrast serif) read "pointy, old-cookbook — not enough poio."
  Swapped to **Quicksand** (geometric rounded sans) for all display/reading text,
  keeping **JetBrains Mono** for chrome, numbers, timers, and status (tabular,
  crisp). Rationale below.
- **Fonts bundled locally.** No more Google Fonts CDN — the woff2 files live in
  `web/fonts/` and load from `web/fonts/fonts.css`. "Clone what we use": the app
  is now self-contained and works offline.
- **Land on a recipe list, not a recipe.** Opening straight into tonight's single
  pick was surprising. Home is now a **list** — tonight's suggestion starred at
  the top, the rest below, then Pantry / Shopping as nav rows. Choose, then cook.
- **Lean centered.** Pulled content off the right edge: dish titles, status, the
  affordance hint bar, feedback options, and confirm headers now center. Scannable
  row-lists (pantry, shopping, recipe list) stay left-aligned on purpose.
- **First-run preview.** `python3 stage2/server.py --first-run` forces the
  onboarding screen without deleting your pantry, so the first-run experience can
  be previewed on a machine that's already provisioned.

### Deferred (Jaime's explicit call — later, not now)
- **Warmth, here and there.** The app is "a tad too simple, which is good —
  practical," but it wants moments of warmth. Keep the practical spine; add small
  warm touches later (not a redesign).
- **A voice for the chicken.** Eventually the UI copy should have *attitude* — a
  developed poio persona in the setup greeting, the low-pantry warnings, the little
  messages. Right now copy is plain and functional on purpose; the voice pass comes
  later so it lands as a deliberate layer, not scattered quips.

## Typography — why Quicksand (and the honest-to-e-ink constraint)

The screen is really a **1-bit mono e-paper panel** (no subtle antialiasing, no
gray). Fonts have to survive being rendered as pure black/white bitmaps, so:

- **Serifs and high stroke-contrast fragment** at 1-bit small sizes — that's part
  of why Spectral felt wrong beyond just "old-fashioned."
- **Rounded, even-weight geometric sans holds up** — closed, consistent strokes
  bitmap cleanly. Quicksand is Jaime's named register (rounded, friendly).
- **Mono stays for chrome/numbers** — JetBrains Mono is crisp and tabular, ideal
  for timers, quantities, and status where alignment matters.

Candidates considered (all free, all bundleable): **Quicksand** (picked — friendly,
his register), **Nunito** (rounded terminals, a touch more text-friendly at small
sizes), **Baloo 2 / Fredoka** (heavier, more playful — a fallback if Quicksand
reads too light on the real panel). Easy to swap: change the `@font-face` set in
`web/fonts/fonts.css` and the `--round` var in `web/styles.css`. On the real device
these become baked bitmap fonts; Quicksand's rounded geometry bitmaps reasonably,
but this is worth re-checking on actual hardware — a heavier weight may win there.

## Input mapping — every UI action to a physical control

Aligned with `hardware/PLAN.md`'s input spec (encoder-control build): a rotary
encoder with push, two tactile buttons flanking it, the soft TPU "eye," and
tap-to-advance via the accelerometer. In the laptop mockup each maps to a key /
mouse gesture so it *feels* like the device.

| UI action | physical control | mockup input |
|---|---|---|
| move selection / scroll | **rotary encoder — rotate** | scroll wheel · ↑ / ↓ · drag the knob |
| select / confirm / apply | **rotary encoder — press** | Enter · click the knob |
| next step (while cooking) | **tap-to-advance** — knuckle-tap the head (accelerometer) | Space · tap the head pad |
| back | **left tactile button** | Esc · click ◂ |
| home / wake | **eye button** (soft TPU dome) | `h` · click the eye |
| (context / quick action) | right tactile button | *reserved — unmapped for now* |

`tap-to-advance` is the dirty-hands verb (a knuckle, no targeting); `back` and
`select` are deliberate presses. This mapping is why the device needs no keyboard.

> **Next build:** make the on-screen control panel a real **interactive encoder
> widget** — a rotary knob you can drag/click that *also* visibly turns when you
> use the wheel or arrow keys — so the mapping is unmistakable. Tracked separately.

## Onboarding — where it shows up

First-run only fires when `data/pantry.json` doesn't exist (a fresh clone). If
you've already got a pantry (e.g. you seeded the demo), you go straight to the
list — that's why it didn't appear locally. Use `--first-run` to preview it, or a
fresh clone will greet a new machine. See `PANTRY-MODEL.md`.
