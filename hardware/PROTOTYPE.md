# Color e-paper bench test

**Goal:** confirm color e-paper as the screen direction and pick the panel. Product direction: [`PLAN.md`](PLAN.md). Screen language: [`UI-LANGUAGE.md`](UI-LANGUAGE.md).

The earlier rig (4.2" mono e-paper + four-input bake-off) is archived at [`../archive/hardware/PROTOTYPE-mono.md`](../archive/hardware/PROTOTYPE-mono.md).

## Parts

No SKUs or prices here until the panel is picked.

- **Candidate color e-paper panel(s)**, TBD. Compare one of each family side by side:
  - a fast **color-filter** panel (quick repaints, muted color)
  - a high-saturation **multi-pigment** panel (vivid color, slow repaints)
- ESP32-S3 dev board with PSRAM
- I²S MEMS mic
- Red momentary button + LED
- Rotary encoder with push
- Small speaker + I²S amp
- USB-C power

## Tests

Cook real recipes with it on the counter, not just bench demos.

- [ ] **Food images:** do they look appetizing at arm's length, in real kitchen light (day, night, under the range hood)?
- [ ] **Stepper repaint:** step-to-step repaint time and ghosting over a full recipe.
- [ ] **Cookbook screen:** how the always-on idle screen looks over a day; ghosting after hours static.
- [ ] **Text legibility:** Quicksand and JetBrains Mono at the candidate sizes, mid-cook.
- [ ] **Status legibility:** plenty / low / out as color plus pattern, including in dim light.
- [ ] **Push-to-talk:** button feel; mic pickup with kitchen noise (extractor fan, sizzling pan, running tap).
- [ ] **Encoder:** browse, select and step feel right with wet or greasy hands.
- [ ] **Back button:** is one needed, or do the encoder and voice cover it?
- [ ] **Sounds:** each of the five sounds is audible and distinct over kitchen noise.

## Output

- A dated entry in [`DECISIONS.md`](../DECISIONS.md) naming the panel, with what the tests showed.
- Then fill in the BOM and price in [`PLAN.md`](PLAN.md), the panel specs in [`UI-LANGUAGE.md`](UI-LANGUAGE.md) (sizes, palette values, refresh numbers), and close the panel question in [`SCOPE.md`](../SCOPE.md#open-questions).
