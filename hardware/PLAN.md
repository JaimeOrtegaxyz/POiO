# hardware

Notes and plan for running POiO on a physical device in the kitchen.

> **License:** physical design files in this directory (the `.3dm` model, and future schematics, PCB layouts, meshes, and BOMs) are licensed under [CERN-OHL-S-2.0](../LICENSES/CERN-OHL-S-2.0.txt) — strongly reciprocal open hardware. The prose in these `.md` files is [CC-BY-SA-4.0](../LICENSES/CC-BY-SA-4.0.txt). See the root [`LICENSE`](../LICENSE).

## Direction

A small, chicken-shaped countertop companion. Palm-sized, battery-powered, built around a 4.2" e-paper screen with a rotary encoder and a couple of buttons. Walks you through a recipe step by step, with personality — clucks at you, glows softly, taps-to-advance when your hands are covered in raw chicken. Polls the same self-hosted server the web app uses.

Not the wall-mounted ambient glance device the earlier plan called for (see [Earlier direction](#earlier-direction-archived) below). That product was a dashboard; this one is a buddy on the counter.

## The endgame (Stage 4)

Everything below builds a *thin-client* device: the brain stays on a self-hosted server, the chicken polls it over HTTP. That's the right call for what's buildable today, and it's not going away — it's the version that ships.

But it's aimed at a horizon. The endgame is the same device with the **intelligence on-device**: a small model running on a chip inside the shell, no server, no cloud, no key — an AI appliance you own outright, like a blender owns its motor. The hardware to do that *well* (smart enough, fast enough, cheap enough, at battery-powered appliance power budgets) isn't here yet, but it's clearly coming; the market needs those parts to exist. POiO doesn't wait for it.

What this means for the design now: **keep the brain swappable.** The device talks to "the engine" over a clean HTTP boundary (see the firmware shape below). Today that engine is a Python process on a Pi calling a cloud model. The endgame moves that same role onto silicon inside the device. As long as the boundary stays clean, that's a board swap, not a redesign — so nothing in the Stage-3 build should hard-assume the brain lives off-device. Pointing at this future is part of the product's intent, not a someday-maybe.

## Form factor

- Chicken-shaped 3D-printed (proto) → injection-molded (volume) shell, yellow, palm-sized.
- ~4.2" mono e-paper screen (4:3) front and center.
- Rotary encoder with push, flanked by two tactile buttons.
- A soft TPU "eye" on the head that presses a tactile button behind it. Doubles as power / wake.
- Small speaker grille hidden in the body.

## Components

### Screen

**4.2" 400×300 plain mono e-paper.** A Waveshare 4.2" module (~$35), paper-like under any kitchen light, dithered B&W food imagery, 4:3 aspect — square e-paper doesn't exist in commodity panels above ~2", and the horizontal proportion suits a recipe step better anyway. It holds its image with zero power between updates, which is what earns the months-not-hours battery story below.

**Critical:** the plain *mono* module, **not** the (B) tri-color (black/white/red) variant. Tri-color is full-refresh-only at multiple seconds per update, which ruins the recipe stepper. Plain mono does a partial refresh in ~0.4 s with no flash — fast enough to tap through steps.

See [`PROTOTYPE.md`](PROTOTYPE.md) for the parts and ordering.

### MCU

ESP32-S3. The e-paper framebuffer is tiny (~15 KB), so the display doesn't need PSRAM — it stays free for audio buffers and recipe data. Built-in capacitive-touch pins (a $0 path for the slider input in the final product) and BLE for future phone pairing.

### Input

The product will ship with one or two input methods. The prototype carries **four** in parallel so the choice gets made by living with it in the kitchen, not by guessing:

- **Rotary encoder with push** (EC11, center front) — scroll + click-to-select. Deliberate, tactile.
- **Side thumbwheel** — side-actuated rotary encoder with a 30mm disc knob protruding through a slot. One-thumb scroll, no click. Iconic feel.
- **Capacitive touch slider** — hidden conductive strip under the shell, slide a finger to scroll. No moving parts, invisible until touched. Real risk: greasy / damp fingers in a kitchen. Either Adafruit CAP1188 ($8 breakout) for the prototype or the ESP32-S3's built-in touch pins ($0) for the final product.
- **Tap-to-advance via accelerometer** — LIS3DH, ~$1, hardware tap + double-tap detection on the Z axis. Tap top of the device with a knuckle = next step; shake = previous; tilt-to-wake. Wakes the ESP32 from deep sleep on its INT pin. The hands-dirty cooking UX that makes this product specifically *for* the kitchen.

Plus two always-there inputs:

- **2 tactile buttons** flanking the front face — back / context action.
- **Eye button** — soft TPU dome over a tactile switch. Power / wake / long-press menu.

### Audio

Small speaker + I²S amp (MAX98357A + 8Ω 1W speaker, ~$4 total). This is the brand-defining add: chickens **cluck**, they don't beep. Wake cluck, step-number callouts, frantic clucking on timer alarm, optional ambient hen noises while idle. Pre-recorded WAV on flash for v1; on-device TTS is a v2 question.

Also a passive piezo buzzer ($0.30) for low-power timer chirps when the speaker amp is shut down to save battery.

### Ambient lighting

2× WS2812 RGB LEDs inside the translucent yellow shell (~$1). Slow breathing idle, pulse red on timer-done, color cue per cooking phase. Gives the chicken a heartbeat.

### Presence

PIR module (HC-SR501 mini or AM312, ~$1.50). The e-paper holds its image with no power, so this isn't about saving a backlight — it wakes the chicken from deep sleep on approach so it can greet you (a cluck, a glow, tonight's step already on screen) as you walk up, instead of waiting for a button press. Paired with the accelerometer's tilt-to-wake as cheap redundancy. Easy to drop if it doesn't earn its keep in testing.

### Power

LiPo, 3000 mAh, with a TP4056 charger and USB-C input. Wireless Qi charging considered and skipped for v1 (nice for greasy-hands kitchen use but adds ~$4–5 BOM for marginal benefit at this stage).

Battery-life targets are split honestly between prototype and production:

- **Final product (custom PCB, power-managed ESP32-S3 SoM):** months between charges — the e-paper holds its image with zero draw, so the MCU deep-sleeps and the panel only pulls power during a refresh. This depends on a custom PCB doing real power management, not a generic dev board.
- **Prototype (dev board + e-paper module on a breadboard):** hours to a day on a charge. The bench rig pulls tens to low-hundreds of mA active — orders of magnitude worse than what a final PCB will manage. The prototype is for input + stepper feel-testing, not for validating battery life.

## Sellable BOM target

Aiming for a **~$55 electronics BOM** at small-batch quantities, with two honest scenarios for what that supports at retail:

| Item | Cost |
|---|---|
| Screen (4.2" mono e-paper) | $30 |
| MCU (ESP32-S3 module) | $5 |
| Battery + charger | $6 |
| Inputs (encoder + 2 btn + eye, wired to GPIO) | $2.50 |
| Speaker + I²S amp | $4 |
| Accelerometer (LIS3DH) | $1 |
| PIR | $1.50 |
| 2× WS2812 | $1 |
| Piezo buzzer | $0.30 |
| PCB + shell + misc | $5 |
| **Electronics BOM total** | **~$56** |

### Two retail scenarios

The electronics BOM is the floor. What you can actually charge depends on how the product ships:

- **Lean direct-to-consumer (single-founder, online-only, no retail, exempt-volume FCC):** $79–99 retail is reachable. Assumes the ~$56 BOM + ~$10–15 assembly/packaging/shipping per unit, ~30–40% margin, and that you absorb support and returns yourself. Works at small volumes (hundreds to low thousands).
- **Properly shipped product (FCC + CE certification, retail distribution, customer support, returns, marketing):** $129–199 retail is the honest range. The ~$56 BOM is unchanged but everything else around it adds cost, and retail channels want their own 30–40% margin on top.

These numbers are directional, not a finance plan. The point: don't anchor on the $79 figure as if shipping a real product is free.

## Firmware shape

- ESP32-S3, Arduino or ESP-IDF. The mono e-paper UI is drawn with GxEPD2 + Adafruit GFX — the standard mono e-paper stack; LVGL is overkill for a partial-refresh mono panel.
- The display driver is one isolated module behind a clean interface; audio, gesture detection, the recipe state machine, PIR wake, and encoder/button handling sit on top of it. Keeping the panel behind that seam means a future screen swap is a module change, not a rewrite.
- **Peripheral wiring.** The e-paper drives over SPI (~6 pins) and leaves the ESP32-S3's GPIO budget wide open, so the encoder and buttons wire straight to GPIO. Only the two natively-I²C parts — the LIS3DH accelerometer and the CAP1188 touch slider — share the I²C bus. No I/O expander needed (see [`PROTOTYPE.md`](PROTOTYPE.md#wiring-gpio-is-comfortable)).
- Talks HTTP/JSON to the Stage-2 self-hosted server. Device is a thin client; the engine and pantry stay on the server.
- Recipe data: SKILL.md today defines a *human-readable markdown* recipe format. Before the device can render steppered recipes, that needs a structured-JSON stepper schema (steps array, durations, timer cues, ingredient deltas). Designing that schema is a Stage-2 task, not Stage-3.

### Software readiness

The hardware bake-off can start before the Stage-2 server exists, but be clear about what's ready and what isn't:

- ✅ Stage 1 skill works (this repo)
- ⏳ Stage 2 local HTTP server + JSON API — **not built yet**
- ⏳ Structured recipe-stepper schema (JSON, with step indices, timers, ingredient cues) — **not designed yet**, SKILL.md is markdown-for-humans
- ⏳ Wi-Fi onboarding flow on device — open question (BLE pairing vs. captive portal)
- ⏳ OTA update path — defer past v1

The prototype will run against **fixture recipes baked into firmware** until the Stage-2 server and stepper schema land. That's fine for the kitchen-feel bake-off, which is about inputs + audio + lighting + how the e-paper stepper reads, not the data path.

## Open questions

- **Voice.** Pre-recorded clucks/lines only, or on-device TTS for arbitrary step text? Pre-recorded for v1 is the safe call.
- **Server location.** Local on a Pi / Mac mini in the kitchen, or hosted? Probably local for v1 — privacy + no monthly cost.
- **Onboarding.** Wi-Fi setup via BLE pairing from a phone, or a captive portal? BLE is nicer but more firmware.
- **Updates.** OTA from the local server, or USB-C reflash? OTA eventually, USB-C for prototype.
- **Pricing.** $79 vs $99 vs $129. Depends on shell finish, packaging, audio quality.

## Procurement

See [`PROTOTYPE.md`](PROTOTYPE.md) for the full parts list, SKUs, sources, and ordering recipe.

---

## Earlier direction (archived)

The original Stage-3 plan was an Inkplate 10 (9.7" monochrome e-ink, ESP32, ~$150) mounted on the kitchen wall as an ambient glance display — today's suggestion, pantry status, shopping list. That product was a dashboard, not a buddy: read-only, low-interaction, optimized for reading from across the room.

The kitchen-companion direction replaced it because it's a stronger product story (something with personality you reach for, not a screen that sits in your peripheral vision), supports a lower BOM (~$56 vs $150 for just the screen module), and gives the audio + gesture + lighting features room to matter. The ambient-glance idea isn't dead — it could come back as a v2 or a second product — but it's not what's being built now.

The `mockups/eink-glance/` web prototype was built against the earlier direction and remains in the repo as part of the design history (see [`mockups/README.md`](../mockups/README.md)).
