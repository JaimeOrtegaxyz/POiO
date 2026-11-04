# hardware

Notes and plan for running POiO on a physical device in the kitchen. What's in V1 vs later: [`SCOPE.md`](../SCOPE.md).

> **License:** physical design files in this directory (the `.3dm` model, and future schematics, PCB layouts, meshes, and BOMs) are licensed under [CERN-OHL-S-2.0](../LICENSES/CERN-OHL-S-2.0.txt) — strongly reciprocal open hardware. The prose in these `.md` files is [CC-BY-SA-4.0](../LICENSES/CC-BY-SA-4.0.txt). See the root [`LICENSE`](../LICENSE).

## Direction

A chicken-shaped, always-on countertop companion. A **color e-paper** screen (the leading option; panel TBD after the [bench test](PROTOTYPE.md)), a **red push-to-talk button** and an **encoder**, a mic, and a speaker with a small set of learnable sounds. It never speaks. The V1 device is a thin client to a hosted brain.

Not the wall-mounted ambient glance device the earliest plan called for, and no longer the palm-sized mono companion of mid-2026 (see [Earlier direction](#earlier-direction-archived) below).

## The endgame

The V1 device is a *thin client*: the brain is hosted, and the chicken talks to it over HTTPS. That's the right call for what's buildable today, and it's the version that ships first.

It's aimed at a horizon. The endgame is the same device with the **LLM on-device**: a small model running on a chip inside the shell, no server, no cloud, no key — an AI appliance you own outright, like a blender owns its motor. The hardware to do that *well* (smart enough, fast enough, cheap enough) isn't here yet, but it's clearly coming.

What this means for the design now: **keep the brain swappable.** The device talks to "the brain" over a clean HTTP boundary (see the firmware shape below). As long as the boundary stays clean, moving the brain inside is a board swap, not a redesign. Nothing in the V1 build should hard-assume the brain lives off-device.

## Form factor

Chicken-shaped; size and proportions per [`POiO.3dm`](POiO.3dm). 3D-printed shell for the prototype, injection-molded for volume. A render gets added to `assets/` once one is exported.

Elements:
- Color e-paper screen, front and center
- **Red button** (the old "eye"): push-to-talk, with a listening LED beside it
- Rotary encoder with push
- Mic port
- Speaker grille
- USB-C power

## Components

### Screen

**Fast-refresh color e-paper, panel TBD.** The [bench test](PROTOTYPE.md) confirms the direction and picks the panel; the result lands as a dated entry in [`DECISIONS.md`](../DECISIONS.md).

- The lesson from the mono era still holds: **avoid slow, full-refresh-only panels for the cooking loop.** The recipe stepper repaints on every step, so step-to-step repaint time is the number that matters.
- The always-on **open cookbook screen** changes once or twice a day, so it tolerates slower repaints than the stepper.
- Food images are realistic-ish within the panel's color limits; UI chrome uses a small brand palette. See [`UI-LANGUAGE.md`](UI-LANGUAGE.md).

### MCU

ESP32-S3 class, likely with PSRAM (a color framebuffer plus audio capture buffers). Final pick after the panel, since the panel's interface decides how much memory and how many pins the display needs. Wi-Fi is required; BLE is available if setup goes that way.

### Input

- **Voice, via push-to-talk on the red button.** Hold while speaking, release when done. Required: the device doesn't work without it. The fine details (feel, length limits, edge cases) are open.
- **Rotary encoder with push.** Rotate to browse, press to select or step. Not a free-input path.

Parked in Future: tap-to-advance, side thumbwheel, capacitive slider, extra tactile buttons. A back button gets added only if the bench test shows it's needed.

### Mic

I²S MEMS mic. Placement and port in the shell are TBD (it has to hear a voice over a range hood and a sizzling pan).

### Audio

Small speaker + I²S amp. Chickens **cluck**, they don't beep, and they don't talk: **never speech.** The V1 sound set (meanings in [`VOICE.md`](../VOICE.md#sound-set); final sound design is Jaime's):

- Chirp on turn-on
- Press/release ticks (listening start/stop)
- Checkpoint cluck
- "Didn't understand"
- Finish cluck

Cut: ambient hen noises and frantic timer clucking.

### LEDs

A listening indicator by the red button. Nothing else.

### PIR

Cut. There's no greeting on approach, and the device is always on.

### Camera

None on the device. Photos (fridge, receipt, dish) come through the app.

### Power

Mains via USB-C, always-on. Battery is Future.

## BOM and price

BOM and price come after the panel is picked.

## Firmware shape

- ESP32-S3, Arduino or ESP-IDF.
- **The display driver sits behind a seam**: one isolated module behind a clean interface, with audio, the voice capture path, the recipe state machine and encoder/button handling on top. The driver library depends on the panel (SPI color panels and parallel-driven color-filter panels use different stacks), which is exactly why the seam matters.
- Talks HTTPS/JSON to the hosted brain. The device is a thin client; the brain, the pantry and the poionotas live behind that boundary.
- Wi-Fi setup is a V1 must-have; the method (captive portal vs BLE) is open.
- Recipe data follows [`reference/recipe.schema.json`](../reference/recipe.schema.json).

### Software readiness

- ✅ Skill works and is the base brain ([`SKILL.md`](../SKILL.md))
- 🗄️ Local Python prototype: archived ([`archive/stage2/`](../archive/stage2/))
- ⏳ Online mockup: next (`mockup/`, coming)
- ⏳ Device firmware: not started

## Open questions

Hardware open questions (panel, mic hardware, connectivity / Wi-Fi setup, on-device LLM feasibility, photo transfer without the app, push-to-talk details) are tracked in [`SCOPE.md`](../SCOPE.md#open-questions).

## Procurement

See [`PROTOTYPE.md`](PROTOTYPE.md) for the bench-test plan.

---

## Earlier direction (archived)

The original Stage-3 plan was an Inkplate 10 (9.7" monochrome e-ink, ESP32, ~$150) mounted on the kitchen wall as an ambient glance display — today's suggestion, pantry status, shopping list. That product was a dashboard, not a buddy: read-only, low-interaction, optimized for reading from across the room.

The kitchen-companion direction replaced it because it's a stronger product story (something with personality you reach for, not a screen that sits in your peripheral vision), supports a lower BOM (~$56 vs $150 for just the screen module), and gives the audio + gesture + lighting features room to matter. The ambient-glance idea isn't dead — it could come back as a v2 or a second product — but it's not what's being built now.

The eink-glance web prototype was built against the earlier direction and remains in the repo as part of the design history (see [`archive/mockups/eink-glance/`](../archive/mockups/eink-glance/)).

Mono 4.2" companion with encoder + four-input bake-off (Jul 2026) → [`archive/hardware/PROTOTYPE-mono.md`](../archive/hardware/PROTOTYPE-mono.md), [`archive/mockups/`](../archive/mockups/).
