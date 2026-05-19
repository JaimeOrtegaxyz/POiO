# Prototype parts list

A deliberate **kitchen bake-off rig** for the Stage-3 companion. The point isn't a minimal viable prototype — it's to put every realistic option on the counter, live with them for a couple of weeks while actually cooking, and let the winners reveal themselves by feel. The final product picks one screen and one (maybe two) input model from the menu.

See [`PLAN.md`](PLAN.md) for the product direction this prototype is testing.

## Strategy

- **Two display options** in parallel: square color LCD vs. mono e-paper. Swap dev boards on the shared breadboard.
- **Four input options** wired simultaneously: rotary knob, thumbwheel, capacitive touch slider, and tap-to-advance via accelerometer. Each owns a different region of the rig so you can try them mid-recipe without rewiring.
- Share every passive peripheral (buttons, speaker, accelerometer, PIR, LEDs, buzzer) across both screen rigs.
- Run from USB power during bench work. Defer LiPo + charging until screen and inputs are locked.
- One firmware project, two compile targets, `#ifdef SCREEN_EPAPER` switches the display driver.

### Pin-budget reality: I²C-first

The 4" 480×480 LCD dev board uses a 16-bit parallel RGB interface, which consumes ~20 of the ESP32-S3's GPIO pins for the display alone. Combined with the board's SD slot, audio routing, and USB lines, only **5–8 GPIO** remain exposed on the header. Wiring every peripheral as raw GPIO would starve the budget fast.

Strategy: **everything that can go on I²C, does.** That collapses ~12 GPIO worth of peripherals onto 2 pins (SDA + SCL):
- LIS3DH accelerometer → I²C native
- CAP1188 touch slider → I²C native
- Rotary encoder → Adafruit Seesaw I²C rotary encoder breakout (not raw EC11)
- Thumbwheel encoder → second Seesaw, or wire its 3 pins through an MCP23017 I/O expander
- Buttons → MCP23017 I/O expander (16 GPIO over I²C, ~$2)

That leaves the few free GPIO for things that *can't* go on I²C and need direct pins: I²S audio out (3 pins), PIR (1), WS2812 data (1), piezo buzzer (1). Comfortable fit.

The e-paper rig is easier: SPI for the display (~4 pins) leaves the e-paper ESP32 driver board with lots of headroom. The same I²C-first peripheral header still works there, unchanged.

### Cost framing

Total to prototype everything: **~$150–180 delivered** including Adafruit and Waveshare shipping. Versus a minimum-viable single-path build (~$80–100): the extra spend buys you the answer to "which screen and which inputs actually feel right in *my* kitchen" instead of guessing.

## Display rig A — square color LCD

| Part | SKU / search term | Source | Price |
|---|---|---|---|
| Waveshare or Sunton ESP32-S3 4" 480×480 IPS dev board | `ESP32-S3-Touch-LCD-4` (Waveshare) or `ESP32-S3-4848S040` (Sunton/Guition) | Waveshare / Amazon / AliExpress | $28–33 |
| Matte anti-glare film, 4" cut | `4 inch matte screen protector film` | Amazon | $3 |

Integrated on the dev board: ESP32-S3 + PSRAM + 4" square IPS panel + capacitive touch (unused here) + USB-C + LiPo connector + I²S audio out.

Prefer the Waveshare variant for documentation quality; Sunton/Guition are cheaper but doc-light.

## Display rig B — mono e-paper

| Part | SKU / search term | Source | Price |
|---|---|---|---|
| Waveshare 4.2" 400×300 **plain mono** e-paper module | `4.2inch e-Paper Module` (the non-B, non-C variant — black/white only) | Waveshare US / Amazon | $35 |
| Waveshare ESP32 e-Paper Driver Board | `e-Paper ESP32 Driver Board` | Waveshare US / Amazon | $15 |
| (Optional) XIAO ESP32-S3 if using the universal e-paper HAT instead | `XIAO ESP32-S3` | Seeed / Amazon | $5 |

**Critical:** buy the **plain mono** 4.2" module, not the `(B)` (black/white/red tri-color) or `(C)` (yellow) variants. The tri-color variants are full-refresh-only with multi-second update times, which kills the recipe-stepping UX. Plain mono supports partial refresh in ~0.4 s.

Recommended assembly: bundled Waveshare driver board + plain mono panel = **$50**, single board, all wired. Faster to first light than the modular HAT + XIAO ESP32-S3 path.

## Shared peripheral breadboard (reused across both rigs)

I²C peripherals listed first since they're the pin-budget winners.

| Part | SKU / search term | Source | Price |
|---|---|---|---|
| LIS3DH accelerometer breakout | Adafruit #2809 (or clone) | Adafruit / Amazon | $5 |
| CAP1188 8-channel capacitive touch breakout | Adafruit #1602 | Adafruit / Amazon | $8 |
| Copper foil tape, conductive adhesive (for cap-slider pads) | `copper foil tape conductive adhesive 6mm` | Amazon | $6 |
| Adafruit Seesaw I²C rotary encoder breakout + EC11 encoder | Adafruit #4991 | Adafruit / Amazon | $10 |
| Side-actuated thumbwheel encoder + 30mm disc knob | `side actuated rotary encoder` / Bourns PEC11 side-mount | Amazon / DigiKey | $6 |
| MCP23017 I/O expander breakout (for buttons + thumbwheel pins over I²C) | `MCP23017 breakout` | Amazon / Adafruit | $4 |
| 3× tactile buttons + soft caps (back / select / eye-button) | 12mm tactile switches + caps | Amazon | $2 |
| MAX98357A I²S amplifier breakout | Adafruit #3006 | Adafruit / Amazon | $5 |
| 8 Ω 1 W mini speaker, 28 mm | `8 ohm 1W mini speaker 28mm` | Amazon | $3 |
| 2× WS2812 RGB LED module (or 8-LED stick) | `WS2812 LED module` | Amazon | $4 |
| AM312 PIR motion module (smaller than HC-SR501) | `AM312 PIR module` | Amazon | $2 |
| Passive piezo buzzer 3 V | `passive piezo buzzer 3V Arduino` | Amazon | $1 |
| Breadboard + jumper wire kit (M-M, M-F, F-F) | `MB-102 breadboard kit jumper wires` | Amazon | $12 |
| **Shared subtotal** | | | **~$68** |

## Grand total (delivered, with shipping)

| Path | Cost |
|---|---|
| LCD rig only | $31 (LCD + film) + $68 shared + shipping ≈ **$110–125** |
| E-paper rig only | $50 (e-paper bundle) + $68 shared + shipping ≈ **$130–145** |
| **Both rigs (full bake-off)** | $31 + $50 + $68 + shipping ≈ **$160–185** |

The higher cost vs. the earlier $107 figure reflects: corrected e-paper pricing ($50 bundled, not $37), I²C encoder breakout for pin-budget sanity ($10 vs $2), MCP23017 I/O expander ($4), matte LCD film ($3), copper foil tape for the cap slider ($6), and realistic Adafruit + Waveshare shipping. The earlier number was too low.

## What's deliberately deferred

These get added once the screen and inputs are locked:

| Part | Why deferred |
|---|---|
| LiPo (3000–5000 mAh) | USB power covers bench work. Battery sizing depends on screen choice. |
| TP4056 charging module | Bundled with LiPo decision. |
| Custom PCB | Pointless before screen + final peripheral set is frozen. |
| 3D-printed shell | Same — designed around the chosen screen footprint. |

## Order recipe

1. **Amazon, ~2 day delivery:** Sunton/Guition 4" LCD board (if you go the cheaper LCD route over Waveshare), AM312 PIR, side-actuated thumbwheel encoder + disc knob, tactile switches, 8 Ω speaker, WS2812 module, piezo, MCP23017 breakout, breadboard kit, copper foil tape, matte LCD film.
2. **Adafruit direct, ~3–5 days US:** LIS3DH (#2809), CAP1188 (#1602), Seesaw rotary encoder (#4991), MAX98357A (#3006). One order, ~$10 shipping. The breakouts have proper libraries and "just work" — pay the markup for first-prototype debug savings.
3. **Waveshare US warehouse, ~5–7 days (or Amazon for marked-up version):** ESP32-S3-Touch-LCD-4 (if you go the Waveshare LCD route), ESP32 e-Paper Driver Board, 4.2" plain mono e-paper module.
4. **Defer:** LiPo, TP4056, PCB, shell.

Start firmware on whichever rig arrives first — the I²C peripheral header is identical between the two display rigs (just swap the dev board).

## Realistic prototype expectations

These set honest expectations vs. the final-product targets in [`PLAN.md`](PLAN.md):

- **Battery life on the bench rig is not the final-product battery life.** The Waveshare ESP32 e-paper driver board pulls 50–150 mA active and ~2 mA in low-power mode — orders of magnitude worse than a custom PCB with a power-managed ESP32-S3 SoM would achieve. The "weeks / months between charges" target in PLAN.md is a final-product claim that needs a custom PCB to validate; the prototype just answers "which screen feels right."
- **The device doesn't yet have a server to talk to.** The Stage-2 web app + HTTP/JSON API and the SKILL.md → JSON stepper schema are parallel work, not done yet. The prototype will run against **fixture data** baked into firmware until the Stage-2 server lands.
- **The shell is later.** The bake-off rig is naked on a breadboard. The chicken-shaped enclosure gets designed once the screen, inputs, and PCB are frozen.

## Bake-off checklist

Live with the rig in the kitchen for ~2 weeks of real cooking. Answer these by feel:

### Screen
- [ ] Does dithered B&W food imagery look appetizing on the e-paper, or does it kill the recipe vibe?
- [ ] Does the LCD with matte film feel "paper-like enough" to read the brand the same way?
- [ ] How disruptive is the e-paper full-refresh flash when changing recipe steps?
- [ ] Does LCD wake-on-PIR + auto-sleep feel responsive, or annoying?
- [ ] Is the LCD's instant response noticeably nicer when tapping through steps with dirty hands?
- [ ] Sunlit countertop — can you still read each one?

### Inputs (try each as the *primary* scroll for a few recipes)
- [ ] **Seesaw rotary knob** (front, tactile, click-to-select) — deliberate, satisfying. Right for menu navigation? Awkward for long shopping lists?
- [ ] **Side thumbwheel** (disc, one-thumb scroll, no click) — iconic feel. Does side-mount work on a counter, or fiddly?
- [ ] **Capacitive touch slider** (hidden copper-foil pads under shell mock-up, smooth slide) — clean and modern. **Does it survive greasy / damp fingers**, or become useless mid-recipe?
- [ ] **Tap-to-advance** (knuckle on top, accelerometer) — the dirty-hands superpower. Magical or gimmicky? Any false triggers from heavy pans on the counter?
- [ ] **Combos:** which two work well together? (e.g., tap-to-advance for "next step" + knob for menu nav, or thumbwheel for scroll + tap for advance.)
- [ ] **What's the input you stop reaching for after a week?** That one gets cut.

Once those are answered, lock the screen and inputs, then move on to PCB + shell design.
