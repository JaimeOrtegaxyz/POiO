# POiO e-paper UI — design language

The visual contract for POiO's screen. It governs two things: the firmware UI on the device, and the [`mockups/eink-companion/`](../mockups/eink-companion/) prototype that serves as its reference implementation.

The *grammar* here is lifted wholesale from the [`eink-glance/`](../mockups/eink-glance/) mockup — pure ink-on-paper, dither/hatch instead of gray, zero animation. What's thrown away is everything that assumed a 9.7" broadsheet you read from across the room. The companion's screen is small and close, and its main job is walking you through one recipe, not laying five panels on a page. So this doc keeps eink-glance's *look* and rebuilds its *layout and interaction* for the real hardware.

## The screen we're designing for

- **4.2" 400×300 plain mono e-paper**, 4:3, **1-bit (pure black/white)**, ~120 dpi.
- Read at **arm's length** on a kitchen counter — not across the room. Type is bigger, density is lower than a broadsheet would allow.
- **Partial refresh ~0.4 s** per region, no flash. Occasional **full refresh** to clear ghosting.
- No keyboard, no pointer, no hover. Inputs are physical: **encoder** (rotate to move, press to select), **tap-to-advance** (knuckle on the head → next step), **eye button** (wake / menu), and **two tactile buttons** (back / context).

## First principles

1. **Two tones, no gray.** On the panel it's literally 1-bit black on white. The brand tones — ink `#1a1816`, paper `#f4efe4` — are the *mockup's* fidelity targets and the enclosure palette; the panel renders them as pure black/white.
2. **Type does the work color usually does.** Two typefaces, set against each other, carry the hierarchy.
3. **Dither and hatch instead of gray** for any "in-between" state.
4. **Hairlines, not fills.** Rules and dotted dividers organize the screen. Solid black is reserved for emphasis.
5. **Zero animation.** Every change is a discrete repaint. No transitions, no spinners, no movement.
6. **One job per screen.** The single biggest departure from eink-glance. At 400×300 you cannot stack five views — each screen does one thing, and you move between them with the encoder/buttons.
7. **Sparse by default.** Show the essentials and nothing more. Add an element only when something genuinely feels missing in use — never to fill space. It's easier to add later than to claw density back. When in doubt, leave it out.

## Color

Black on white. That's it. No accent colors, ever.

Emphasis comes from **weight, size, inversion** (a white-on-black badge), or **rule thickness** — never hue. If a thing needs to shout, it gets a solid-black bar or an inverted pill, the way eink-glance marks "today's pick."

## Typography

Two faces, same split as eink-glance:

- **Spectral (serif)** — reading and display: dish titles, the current step's instruction, big numerals.
- **JetBrains Mono** — all chrome: kickers, quantities, status pills, timers, footer meta. Tabular figures so numbers align.

**Type scale.** Each size has to be baked as a bitmap font in firmware (GxEPD2 + Adafruit GFX), so keep the set small — six sizes, no ad-hoc values:

| Role | px @ ~120 dpi | Face |
|---|---|---|
| Hero / dish title | 36 | Spectral |
| Step number `3 / 7` | 28 | JetBrains Mono |
| **Step body (most-read)** | **22** | Spectral |
| Ingredient + quantity rows | 18 | Spectral name / Mono qty |
| Kicker / label / status | 14 | JetBrains Mono, tracked caps |
| Footer meta | 12 | JetBrains Mono |

Floor for anything you must read while cooking: **~18 px**. Quantities right-align in a mono gutter (carried straight from the eink-glance recipe layout).

## Status grammar

The dither/hatch vocabulary, unchanged — it's the part of eink-glance that's most worth keeping, and it's free on 1-bit:

- `plenty` → **solid ink**
- `low` → **45° diagonal hatch**
- `out` → **sparse dot dither**

Same three patterns everywhere they appear (pantry pills, the snapshot bar, shopping markers) so the eye learns the encoding once. Define them as fixed-pitch 1-bit patterns (hatch line every 4 px; dither dot on a 4 px grid) so they snap to the panel grid and don't shimmer. See `mockups/eink-glance/styles.css` for the CSS expression of the same patterns.

## Layout

A 400×300 frame, three bands:

```
┌────────────────────────────────────┐  ← 16 px margin all around
│ MASTHEAD   POiO · context · refresh │  ~36 px: mark + where-you-are + meta
├────────────────────────────────────┤  hairline
│                                     │
│            BODY                     │  the one job: a step, a list, a screen
│                                     │
├────────────────────────────────────┤  hairline
│ AFFORDANCES  ▸ tap · ● select · ◂ back │  ~28 px: what the controls do, as static glyphs
└────────────────────────────────────┘
```

- **Masthead-lite.** The eink-glance broadsheet nameplate, shrunk to one line: small POiO mark, the current context (dish name / "Pantry" / "Shopping"), and refresh/clock meta in mono on the right.
- **Body is the screen.** One job. The five eink-glance "views" become a small set you navigate one at a time.
- **Affordances band** replaces eink-glance's keyboard hints. Static glyphs label what the physical controls do *here* — never hover tooltips.

### The recipe stepper is the primary screen

It's what the device is *for*. One step per screen:

- Step `X / N` (mono, top of body).
- The instruction in **22 px Spectral**, the largest comfortable reading size.
- Only the ingredients/quantities relevant to *this* step, with status dots if stock matters.
- A timer cue if the step has one.
- Tap-to-advance is the implied verb; the affordance band says so.

## Motion & refresh

- **No transitions.** A state change is a repaint, full stop.
- **Partial-refresh the region that changed** — the step number and step body — so advancing a step doesn't flash the whole panel.
- **Schedule a full refresh** every several steps or on idle wake, to clear accumulated ghosting.
- No loading spinners. If something is genuinely pending, show a static `…` or a deliberate dithered placeholder block — not motion.

## Affordances (no keyboard, no hover)

Map eink-glance's keyboard model onto the physical controls:

| eink-glance (keyboard) | companion (physical) |
|---|---|
| `j` / `k`, arrows | encoder rotate |
| `enter` / click | encoder press |
| (next step) | **tap-to-advance** (accelerometer) |
| `esc` / back | back button |
| `?` / menu, wake | eye button |

State lives in the screen, not in a cursor. Selection is shown by **inversion or a solid caret**, not a hover color.

## What does *not* carry from eink-glance

- The **broadsheet density** — five panels on one page. Too much for 400×300.
- The **1200 px masthead and 54 px hero** scale — re-scaled to the six-size type scale above.
- **Desktop hover and keyboard hints** — replaced by the physical-control affordance band.
- **Smooth grays / photography** — the panel is 1-bit; lean on dither/hatch and type, never halftone food photos (they ghost and look noisy).

## Reference implementation

[`mockups/eink-companion/`](../mockups/eink-companion/) is the canonical visual reference for this language at the true 400×300 spec. The firmware UI should match its layout intent within bitmap-font limits — the mockup is allowed nicer font rendering than the panel will manage, but nothing in it may rely on color, animation, or sub-pixel grays.
