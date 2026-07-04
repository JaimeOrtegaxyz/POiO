# POiO — mockups

> **Direction, as of 2026-07-03.** The e-paper **companion is the product**. These
> browser mockups are no longer candidate web apps to ship — they're **friction
> probes**: laptop abstractions of how the device will behave, so the frictions
> can be felt on a screen before committing to hardware. Everything here is meant
> to migrate to the poio firmware later, not to become a website. The four Stage-2
> web-app mockups that used to live here (chat / editorial / terminal / broadsheet)
> were retired on the pivot; git history keeps them.

## What's here

| folder | role | input bet |
|---|---|---|
| [`eink-companion/`](eink-companion/) | **canonical** device screen — reference build of [`../hardware/UI-LANGUAGE.md`](../hardware/UI-LANGUAGE.md) | encoder + tap |
| [`companion-voice/`](companion-voice/) | probe · **hero** | push-to-talk (speech) |
| [`companion-encoder/`](companion-encoder/) | probe · **control** | encoder only (prediction) |
| [`companion-photo/`](companion-photo/) | probe · **sketch** | camera (an image) |
| [`eink-glance/`](eink-glance/) | history — the retired 9.7" broadsheet; kept for its visual grammar | keyboard |
| [`_gallery.html`](_gallery.html) | browse them side by side | — |

All are static, no-build HTML/CSS/JS. Serve the folder and open, or open a file
directly. The logo is inlined as 1-bit SVG in each (the committed source is
[`../assets/logo-bw.svg`](../assets/logo-bw.svg)).

---

## The friction map

The probes exist to answer one question honestly: **where does using this device
actually cost the user input, and which of those moments justify new hardware?**
So first, every input moment across one night's lifecycle:

| # | moment | what the user must do | input load | could an LLM take it raw? |
|---|---|---|---|---|
| 1 | wake / greet | approach, or one tap | ~none (PIR / tap) | — |
| 2 | pick tonight's dish | accept the default, or scroll + select | low | yes — "what should I cook?" |
| 3 | servings / a swap | scale 2→4, sub a missing item | low but fiddly | yes — "make it for four" |
| 4 | pre-flight check | glance: do I have everything? | read-only | partly |
| 5 | **cook / step through** | advance N steps, re-read, go back — **hands dirty** | medium, repeated | mostly no (tap) |
| 6 | timers | start (auto), dismiss | low, interrupts | no |
| 7 | **pantry update (post-cook)** | mark what you consumed | **HIGH — N items, one-by-one** | yes — "out of X, low on Y" |
| 8 | recipe feedback | rate / note for next time | low, easily skipped | yes — "great, bit dry" |

Two things fall out of the map:

- **Moment 5 is shared and physical.** Every probe carries the same cooking flow —
  one big instruction, a dithered line-art glyph per step for a bit of soul (mood:
  [`../hardware/poio-eink-mockscreen.png`](../hardware/poio-eink-mockscreen.png)), a
  stopwatch timer, tap-to-advance. Hands are dirty here; **tap stays the primary
  verb mid-cook in all three** — it's the one moment none of the input bets improve.
- **Moment 7 is the motivating friction** (the one that surfaced clicking the
  canonical companion). Crossing off consumed items one-by-one on a 4-input device
  is the future blocker. That's what each probe attacks differently — and it's the
  **only** moment where the three genuinely diverge.

### The convergence

All three probes funnel into the **same "proposed pantry diff → confirm / undo"
screen**. The bet being tested is *only how the diff gets proposed*:

```
   voice    →  say it     ──┐
   encoder  →  predict it ──┼──►  [ proposed diff ]  ──►  confirm ● / discard ◂
   photo    →  show it     ──┘        (shared)
```

That's what makes them comparable: same outcome, same last screen, three paths to it.

---

## The three probes

### companion-voice — the hero (bet: speech)
Hold **talk**, say *"we're out of tostadas, chipotle's low, I finished the crema."*
Feel the states e-paper makes awkward: **recording** (a coarse block meter that steps,
never a smooth waveform) → **thinking** (the LLM round-trip — a static dithered
placeholder and a `~2s` latency note, never a spinner) → **proposed diff** → confirm.
- **Hardware:** + I²S MEMS mic (~$1); push-to-talk reuses the eye button ($0). **~+$1–2**
  over `PROTOTYPE.md` — the one part it doesn't list. Real cost is firmware (audio +
  streaming STT) and latency.
- **Wet hands:** best — one big forgiving button, no targeting. Risk: kitchen noise vs. STT, and the wait.

### companion-encoder — the control (bet: prediction, +$0)
The opposite bet: the device knows the recipe, so it knows what you probably used.
At plate-up it shows a **pre-ticked checklist**, computed while you cooked — one press
confirms the lot; scroll to un-tick a wrong one. N edits collapse to 1 confirm.
**If this feels fine, the mic earns nothing** — that's the point of a control. (Try the
one-at-a-time path in Pantry to feel the baseline it dodges.)
- **Hardware:** nothing new. **+$0** — exactly `PROTOTYPE.md`. No audio, no round-trip.
- **Wet hands:** one confirming press is forgiving; only a wrong prediction costs you a scroll.

### companion-photo — the sketch (bet: an image)
Scan the shelf / the empty jars; a vision model reads back the diff. Also probes
whether the *seeing* should live on your **phone**, leaving the device to only confirm.
Capture → read (`~3s`) → propose → confirm.
- **Hardware:** on-device camera (OV2640 ~$3–5) + a real framing problem (a countertop
  chicken can't see your fridge), **or $0 on-device** but a phone app + BLE/Wi-Fi handoff.
  Highest complexity, or a cross-device dependency.
- **Wet hands:** worst mid-mess — you need a clean hand to frame a shot. Fine once you've washed up.

---

## The question under all of it

**Does pantry editing even belong on the device?** It could stay *read-mostly* on the
companion, with the actual editing happening on a phone (or not at all — infer silently
from cooked recipes and only surface exceptions). The **encoder** probe leans "the device
is enough, just predict"; the **photo** probe's phone flavor leans "let it live elsewhere";
the **voice** probe leans "the device is the natural place to just say it." Living with
the three should make the honest answer obvious — no fourth mockup until one earns it.

## e-paper honesty (all probes)

- View change = **full refresh** (the brief invert flash; toggle with `f`). Stepping, the
  cursor, the record meter = **partial refresh**, no flash.
- **No smooth animation.** Every change is a discrete repaint. The "thinking" and "recording"
  states are deliberately static — that's the real affordance, and feeling the latency is part
  of the point.
- **1-bit only** — no color, dither/hatch for status. The single non-1-bit element is the
  voice probe's red record LED, and it's on the *shell*, never on the screen.
- The per-second cooking timer is a mockup convenience; a shipping panel would coarse-refresh
  it (every ~10s, or minutes only) to spare the e-paper.

## Run

```bash
python3 -m http.server 8770 --bind 127.0.0.1   # from this mockups/ dir
# then open http://127.0.0.1:8770/_gallery.html
```

Each probe's keys are on its own page (right-hand legend). Shared: `↑`/`↓` encoder ·
`Enter` press · `Space` tap-to-advance · `Esc` back · `h` home · `f` toggle refresh flash.
Voice adds `V` (talk); photo adds `S` (scan).

**To feel the whole loop in any probe:** Cook → tap through the steps → finish → pick a
rating → do the pantry update. That walks moments 5 → 8 — the cooking experience and the
motivating friction back to back.
