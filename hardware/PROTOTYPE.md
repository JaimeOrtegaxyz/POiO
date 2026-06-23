# Prototype parts list

A deliberate **kitchen bake-off rig** for the Stage-3 companion. The point isn't a minimal viable prototype — it's to put every realistic *input* option on the counter, live with them for a couple of weeks while actually cooking, and let the winner reveal itself by feel. The screen is settled (a 4.2" mono e-paper); the final product picks one (maybe two) input model from the menu.

See [`PLAN.md`](PLAN.md) for the product direction this prototype is testing.

## Strategy

- **One screen:** the 4.2" 400×300 plain mono e-paper, driven over SPI.
- **Four input options** wired simultaneously: rotary knob, thumbwheel, capacitive touch slider, and tap-to-advance via accelerometer. Each owns a different region of the rig so you can try them mid-recipe without rewiring.
- Every other peripheral (buttons, speaker, accelerometer, PIR, LEDs, buzzer) sits on the same breadboard.
- Run from USB power during bench work. Defer LiPo + charging until the inputs are locked.
- The e-paper driver lives in one firmware module behind a clean interface, so a later screen swap stays contained.

### Wiring: GPIO is comfortable

The e-paper drives over SPI (~6 pins: SCK, MOSI, CS, DC, RST, BUSY) and leaves the ESP32-S3's GPIO budget wide open — no pin starvation, no I/O expanders. So the prototype wires the mechanical inputs and buttons straight to GPIO, and keeps I²C for just the two parts that are natively I²C:

- LIS3DH accelerometer → I²C native (+ 1 GPIO for its interrupt/wake line)
- CAP1188 touch slider → I²C native
- Rotary encoder (EC11) → direct GPIO (A, B, push = 3 pins)
- Thumbwheel encoder → direct GPIO (A, B = 2 pins)
- Buttons (back / select / eye) → direct GPIO (1 pin each)

The outputs take direct pins too: I²S audio out (3), PIR (1), WS2812 data (1), piezo buzzer (1). Add it up — ~23 GPIO with all four inputs live at once — which is why the rig uses a **roomy ESP32-S3 dev board** (e.g. ESP32-S3-DevKitC-1, ~36 broken-out GPIO), not the 11-pin XIAO. The pin-limited integrated e-paper driver board is skipped for the same reason: the 4.2" panel is a plain SPI module, so any ESP32-S3 with headers can drive it.

### Cost framing

Total to prototype the full input bake-off: **~$120–140 delivered** including Adafruit and Waveshare shipping. Versus a minimum-viable single-input build (~$80–90): the extra ~$40 buys you the answer to "which input actually feels right in *my* kitchen" instead of guessing.

## Display — mono e-paper + MCU

| Part | SKU / search term | Source | Price |
|---|---|---|---|
| ESP32-S3 dev board, full GPIO breakout | `ESP32-S3-DevKitC-1` (Espressif / Waveshare) | Amazon / Waveshare | $12 |
| Waveshare 4.2" 400×300 **plain mono** e-paper module (SPI) | `4.2inch e-Paper Module` (the non-B, non-C variant — black/white only) | Waveshare US / Amazon | $35 |

The 4.2" module carries its own driver and exposes a standard 8-pin SPI header (DIN/CLK/CS/DC/RST/BUSY + power), so it wires straight to the dev board — no separate e-paper driver board. The dev board doubles as the prototype's MCU.

**Critical:** buy the **plain mono** 4.2" module, not the `(B)` (black/white/red tri-color) or `(C)` (yellow) variants. The tri-color variants are full-refresh-only with multi-second update times, which kills the recipe-stepping UX. Plain mono supports partial refresh in ~0.4 s.

Use a roomy dev board (the DevKitC-1 breaks out ~36 GPIO), not the 11-pin XIAO — the four-input bake-off needs the headroom (see [Wiring](#wiring-gpio-is-comfortable)).

## Peripheral breadboard

The two I²C parts first, then the inputs and outputs that wire straight to GPIO.

| Part | SKU / search term | Source | Price |
|---|---|---|---|
| LIS3DH accelerometer breakout (I²C) | Adafruit #2809 (or clone) | Adafruit / Amazon | $5 |
| CAP1188 8-channel capacitive touch breakout (I²C) | Adafruit #1602 | Adafruit / Amazon | $8 |
| Copper foil tape, conductive adhesive (for cap-slider pads) | `copper foil tape conductive adhesive 6mm` | Amazon | $6 |
| EC11 rotary encoder with push (raw, to GPIO) | `EC11 rotary encoder module` (a multipack is fine) | Amazon | $2 |
| Side-actuated thumbwheel encoder + 30mm disc knob (to GPIO) | `side actuated rotary encoder` / Bourns PEC11 side-mount | Amazon / DigiKey | $6 |
| 3× tactile buttons + soft caps (back / select / eye-button) | 12mm tactile switches + caps | Amazon | $2 |
| MAX98357A I²S amplifier breakout | Adafruit #3006 | Adafruit / Amazon | $5 |
| 8 Ω 1 W mini speaker, 28 mm | `8 ohm 1W mini speaker 28mm` | Amazon | $3 |
| 2× WS2812 RGB LED module (or 8-LED stick) | `WS2812 LED module` | Amazon | $4 |
| AM312 PIR motion module (smaller than HC-SR501) | `AM312 PIR module` | Amazon | $2 |
| Passive piezo buzzer 3 V | `passive piezo buzzer 3V Arduino` | Amazon | $1 |
| Breadboard + jumper wire kit (M-M, M-F, F-F) | `MB-102 breadboard kit jumper wires` | Amazon | $12 |
| **Peripheral subtotal** | | | **~$56** |

## Grand total (delivered, with shipping)

| Line | Cost |
|---|---|
| Display + MCU | $47 ($12 dev board + $35 e-paper module) |
| Peripheral breadboard | ~$56 |
| Subtotal | ~$103 |
| **Delivered, with Adafruit + Waveshare shipping** | **~$120–140** |

Going direct-GPIO trims the earlier figure: dropping the Adafruit Seesaw encoder breakout (~$10 → a $2 raw EC11) and the MCP23017 I/O expander (~$4) more than pays for the roomier dev board. What's left is honest — corrected e-paper pricing ($35 module + a dev board), copper foil for the cap slider, and real shipping.

## What's deliberately deferred

These get added once the screen and inputs are locked:

| Part | Why deferred |
|---|---|
| LiPo (3000 mAh) | USB power covers bench work. |
| TP4056 charging module | Bundled with LiPo decision. |
| Custom PCB | Pointless before screen + final peripheral set is frozen. |
| 3D-printed shell | Same — designed around the e-paper screen + final PCB footprint. |

## Order recipe

1. **Amazon, ~2 day delivery:** ESP32-S3-DevKitC-1, AM312 PIR, side-actuated thumbwheel encoder + disc knob, EC11 encoder, tactile switches, 8 Ω speaker, WS2812 module, piezo, breadboard kit, copper foil tape.
2. **Adafruit direct, ~3–5 days US:** LIS3DH (#2809), CAP1188 (#1602), MAX98357A (#3006). One order, ~$10 shipping. The breakouts have proper libraries and "just work" — pay the markup for first-prototype debug savings.
3. **Waveshare US warehouse, ~5–7 days (or Amazon for marked-up version):** 4.2" plain mono e-paper module.
4. **Defer:** LiPo, TP4056, PCB, shell.

Start firmware as soon as the dev board and e-paper module land — the rest of the rig can fill in around them.

## Realistic prototype expectations

These set honest expectations vs. the final-product targets in [`PLAN.md`](PLAN.md):

- **Battery life on the bench rig is not the final-product battery life.** A dev board plus e-paper module on a breadboard pulls tens to low-hundreds of mA — orders of magnitude worse than a custom PCB with a power-managed ESP32-S3 SoM would achieve. The "months between charges" target in PLAN.md is a final-product claim that needs a custom PCB to validate; the prototype just answers how the inputs and the e-paper stepper feel.
- **The device doesn't yet have a server to talk to.** The Stage-2 web app + HTTP/JSON API and the SKILL.md → JSON stepper schema are parallel work, not done yet. The prototype will run against **fixture data** baked into firmware until the Stage-2 server lands.
- **The shell is later.** The bake-off rig is naked on a breadboard. The chicken-shaped enclosure gets designed once the screen, inputs, and PCB are frozen.

## Bake-off checklist

Live with the rig in the kitchen for ~2 weeks of real cooking. Answer these by feel:

### Screen (does the e-paper hold up)
- [ ] Does dithered B&W food imagery look appetizing, or does it kill the recipe vibe?
- [ ] How disruptive is the occasional full-refresh flash (ghost-clearing) vs. the ~0.4 s partial refresh between steps?
- [ ] Sunlit countertop — still readable? (e-paper should win here; confirm it.)
- [ ] Does PIR wake-on-approach — the chicken already showing tonight's step as you walk up — feel delightful or creepy?

### Inputs (try each as the *primary* scroll for a few recipes)
- [ ] **Rotary knob (EC11)** (front, tactile, click-to-select) — deliberate, satisfying. Right for menu navigation? Awkward for long shopping lists?
- [ ] **Side thumbwheel** (disc, one-thumb scroll, no click) — iconic feel. Does side-mount work on a counter, or fiddly?
- [ ] **Capacitive touch slider** (hidden copper-foil pads under shell mock-up, smooth slide) — clean and modern. **Does it survive greasy / damp fingers**, or become useless mid-recipe?
- [ ] **Tap-to-advance** (knuckle on top, accelerometer) — the dirty-hands superpower. Magical or gimmicky? Any false triggers from heavy pans on the counter?
- [ ] **Combos:** which two work well together? (e.g., tap-to-advance for "next step" + knob for menu nav, or thumbwheel for scroll + tap for advance.)
- [ ] **What's the input you stop reaching for after a week?** That one gets cut.

Once those are answered, lock the screen and inputs, then move on to PCB + shell design.
