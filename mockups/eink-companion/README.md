# E-paper Companion — POiO UI Prototype

The 400×300 reference implementation of [`hardware/UI-LANGUAGE.md`](../../hardware/UI-LANGUAGE.md). Open `index.html` in a browser — no build step, no dependencies beyond two Google Fonts.

Where [`eink-glance/`](../eink-glance/) was a 9.7" broadsheet for the retired wall device, this is the **actual Stage-3 screen**: a 4.2" 400×300 mono e-paper companion you read at arm's length and drive with an encoder + tap-to-advance. It keeps the eink-glance *visual grammar* (ink-on-paper, dither/hatch status, zero animation) and throws away the broadsheet *density* and its desktop keyboard model.

## The idea

One job per screen, **sparse by default** — show the essentials, add only if something genuinely feels missing. The device's reason to exist is the **recipe stepper**, so that's the screen everything else feeds into.

## What's here

- The 400×300 screen at 1.7×, in a minimal yellow bezel with the real controls (eye, encoder, tap, back).
- **Three-band layout:** masthead-lite / body / affordance band.
- **Recipe stepper** as the primary screen — one step at a time, 22px Spectral instruction, only this step's ingredients, a timer chip when the step has one, tap-to-advance as the implied verb.
- **Today / Pantry / Shopping** as the secondary screens. Today is honest about a missing ingredient (you're out of tostadas); Pantry shows only what needs attention; Shopping derives from pantry status.
- **Status grammar** straight from eink-glance: solid `plenty` / 45° hatch `low` / dot-dither `out`, as fixed-pitch 1-bit patterns.

## Controls

| Keyboard | Device | Action |
|---|---|---|
| ↑ / ↓ · scroll | encoder turn | move selection |
| Enter | encoder press | open · cycle status · mark bought |
| Space | tap head | next step (recipe) |
| Esc / Backspace | back | back to Today |
| `h` | eye | wake / home |
| `f` | — | toggle the e-paper refresh flash |

No hover, no pointer cursor in the UI — selection shows as a caret or inversion, exactly as it will on the device.

## Refresh fidelity

This mockup demonstrates the refresh strategy the design language prescribes:

- **View change → full refresh** (a brief ~90ms invert flash, like real e-paper clearing the panel).
- **Advancing a step → partial refresh** — only the step region repaints, no flash.

Toggle the flash off with `f` to see the pure static UI.

## Carries / dropped (vs. eink-glance)

- **Carries:** two tones (`#1a1816` ink / `#f4efe4` paper), two typefaces (Spectral + JetBrains Mono), dither/hatch status, hairlines-not-fills, zero animation.
- **Dropped:** broadsheet density, the 54px hero scale, hover and keyboard hints, photography/grays.

## Caveats

- The browser renders Spectral more crisply than a ~120 dpi 1-bit panel will. Nothing here relies on that — no color, no animation, no sub-pixel gray. On device, the type scale becomes a small set of baked bitmap fonts (see UI-LANGUAGE.md).
- Mock data is a single night (Tinga de Pollo). The point is the *shape* of each screen, not a wired engine.
