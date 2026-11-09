# POiO — decisions

Dated product decisions. Decisions only: no meeting notes, no names, no personal details. Newest first. Format: decision · supersedes · status.

What's in scope today lives in [SCOPE.md](SCOPE.md); this file records when and why it changed.

## 2026-11-09

**Mockup brain and first run**
- **The brain stays on Haiku 5.5 with thinking off; quality comes from steering the prompt**, not a bigger model. A side-by-side on the same first-run context showed Sonnet 5.5 and Opus 5.5 playing it as safe as Haiku on the old prompt, and steered Haiku beating all three. The prompt cache lasts an hour · supersedes nothing (implementation default) · decided
- **The first round is creative, not pantry-safe**: with the pantry barely known, the first options go for range and flavor; guessed pantry items are never the reason for a dish; missing ingredients get swapped at the ingredient check · decided
- **The first-run questions change**: diet ("¿Comes de todo, o hay algo que no comas?") and a proposed kitchen to confirm ("Supongo que tienes estufa, horno, sartén y licuadora. ¿Así es?") replace the pantry question; still four questions, all skippable · supersedes the earlier Q3 (restrictions) and Q4 (what's at hand today) · decided
- **Their diet wins over chicken first.** A vegetarian or vegan gets no chicken, without comment · decided
- **Anything said, anywhere, adjusts.** One utterance can carry several things ("me gusta la primera pero no tengo perejil"); the brain returns them as a short list of actions, applied in order: what to remember, then one move. A change asked for on a recipe rewrites the dish, mid-cook at the same step · supersedes one action per utterance · decided

**Brand and site**
- **Brand colors are grey `#E7E7E7`, red `#E50001` and yellow `#FFC700`** (the hen's own), with ink and white for text. Green `#2FB463` and pink `#E4007C` (rosa mexicano) are proposed accents for the site. Listed in `assets/BRAND.md`; the site reads them from `mockup/src/brand.css`. The e-paper keeps the panel's pigments · supersedes the mockup's muted page colors · colors decided, accents proposed
- **The landing becomes color blocks**: a red hero with the Vaivén ring of wordmarks around a few words, then grey, pink and yellow sections with chunky outlined cards. Icons from Phosphor (MIT) · supersedes the single-column landing · decided for the mockup

**Mockup controls**
- **Pressing the star with the device off turns it on**, like the power button · decided

**Mockup screen**
- **The chicken is the device's static thinking and sleep image**: the ink silhouette while thinking, the red hen on yellow when off (e-paper holds it with no power). Both live in `assets/` · decided

## 2026-11-08

**Mockup device face**
- **The shell's screen opening follows the Kaleido 3 6" candidate** (about 122.5 × 90.7 mm, 1448×1072), and so does the mockup's default panel profile; Spectra 6 4" stays a URL option. The panel itself is still open until the bench test · supersedes the mockup's Spectra default (an implementation default, never a recorded decision) and the letterboxed 4:3 hole · decided for the mockup; panel open
- **The face is built from separate renders**: the shell alone as the base, the pills at rest and pushed in as layers, and the star knob as four rendered frames 15° apart (its highlights move with the light), with a modeled shadow fitted to the at-rest render · supersedes one render with the star cut out and turned by CSS · decided

## 2026-11-05

**Sharing the online mockup**
- **Invite links, not a shared password and not Google login, for the shared demo**: short-lived, single-use, opaque links; each one becomes an isolated browser profile (an HttpOnly session cookie). No accounts or email in this slice; cross-device continuity isn't promised · supersedes "Google login" in the mockup testing plan (2026-10-28) for this slice; a login can attach to a profile later · decided
- **The server is the source of truth for an invited profile's state** (pantry, poionotas, history, settings); the browser keeps a cache. Reset clears the current profile only. The access code and localhost keep working as local mode, state in the browser, for the interim iMac tunnel · — · decided
- **Budgets are enforced server-side with atomic holds**: the existing $3/day, $100/month and 60k tokens per session, plus caps per invited profile · — · decided
- **Site shape**: a public landing (`/`, the wordmark as a Vaivén figure, product copy in Mexican Spanish), `/invite/:token`, `/demo`, `/api` · — · decided
- **Hosting direction: Cloudflare Workers + D1**, prepared (notes, draft config, tested D1 seam) but not provisioned; the iMac tunnel stays until a cutover is approved · — · direction set, cutover open

**Mockup device face**
- **The demo's face is the frontal render**, cut into layers (transparent screen hole, the star as its own turning layer, hit targets over the pills); no hand-drawn substitute. The panel keeps its 3:2 design units and is letterboxed in the render's ~4:3 hole, never stretched · supersedes the CSS-drawn face · decided; layers and opening superseded 2026-11-08
- **Size on screen**: fit to the window by default, labeled uncalibrated; an optional ruler calibration shows the panel at the candidate panel's real size. Only the panel is to scale; no claim about the shell's size · — · decided

## 2026-11-04

**Recipe schema**
- Recipe schema: steps carry an optional checkpoint {afterSec, message} instead of a countdown timerSec · supersedes timerSec · decided

**Identity**
- Name is **POiO**, with no pronunciation notes · — · decided
- **Chicken-first kitchen companion**: chicken by default; other dishes when the user asks, when there's no chicken in the house, or when learned habits call for it · supersedes "the protein is always chicken" · decided
- Tagline: "A chicken-first kitchen companion. Pantry-aware, season-aware." · supersedes "A personalized chicken recipe assistant…" · decided
- "I fucking love chicken." stays · — · decided
- Product copy is Mexican Spanish (jitomate, chile poblano, elote, tú); docs stay in English · supersedes English-default output · decided
- Recipe conventions: Spanish dish names, metric units, Mexican ingredient names · — · decided

**Voice and output**
- **B-C voice everywhere**: practical first, playful only in small moments; no forced jokes or generic AI chatter, since it has to hold up at ~5 uses a week for months · supersedes "UI copy stays plain; voice of the chicken deferred" · decided
- Output is on-screen text plus a small set of learnable sounds. **Never speech (no TTS)** · supersedes "on-device TTS is a v2 question" · decided

**Input**
- **Front layout** (Nov 4, 2026): red star knob center (rotate, press, hold-to-talk), back and home pills either side, per the Rhino render. The red button and the encoder are one part: a short press selects or steps, a hold is push-to-talk. Pill functions (left back, right home) are provisional, pending the bench test · supersedes a separate red button plus encoder, and "a back button only if the bench test shows it's needed" · decided layout; pill functions open, pending bench test
- **Voice is required.** Push-to-talk on the **red button**: hold while speaking, release when done · supersedes "voice undecided, never required" (2026-07) · decided; fine details open
- The **encoder** (rotate + press) browses, selects and steps; it isn't a free-input path · — · decided
- The old "eye" *is* the red button; no separate wake/power button · supersedes "eye = power/wake" · decided
- Tap-to-advance, thumbwheel, cap slider and extra tactile buttons are parked in Future · supersedes the four-input bake-off · decided
- A back button gets added only if the bench test shows it's needed · supersedes "two tactile buttons (back / context)" · open, pending bench test

**Screen**
- **Fast-refresh color e-paper** is the leading option, confirmed after a bench test. **Panel TBD** pending the bench test; docs carry no model numbers · supersedes 4.2" mono e-paper (2026-07) · decided direction; panel open
- Images: realistic-ish food within color e-paper limits · supersedes "never halftone food photos" · decided
- Palette: food images use the panel's full color; UI chrome uses a small brand palette (ink, paper, yellow, red) · supersedes "black on white, no accent colors, ever" · decided; final after the bench test
- Pantry status (plenty / low / out) is shown as **color plus pattern**, the same everywhere · supersedes the 1-bit solid / hatch / dither grammar · decided
- Discrete repaints by default; the mockup A/B decides whether short animations earn a place · supersedes "zero animation" · open, pending mockup A/B
- **No spinners.** Listening and thinking are static states plus the press/release sounds · — · decided
- Type: **Quicksand + JetBrains Mono** are canonical, rechecked on the panel; Spectral is dropped · supersedes the Spectral + JetBrains Mono pairing in UI-LANGUAGE.md · decided
- Generic refresh/ghosting hygiene stays; panel-specific numbers TBD · — · decided

**Timer**
- No running countdown and no time on screen. **Checkpoints** only: a message ("voltea el pollo", "revisa que dore") plus a checkpoint sound · supersedes timer cues and frantic timer clucking · decided

**Sounds**
- The set: chirp on turn-on, press/release ticks (listening start/stop), checkpoint cluck, "didn't understand", finish cluck. Final sound design is the project owner's · supersedes wake cluck + step callouts + timer alarm · decided; sound design open
- Ambient hen noises and frantic timer clucking are cut · — · decided

**Hardware**
- **Always-on**, mains/USB-C for V1; battery is Future · supersedes battery-powered, months-per-charge · decided
- Shape: chicken-shaped, size and proportions per `hardware/POiO.3dm` · supersedes "palm-sized" · decided
- Mic: yes · — · decided; part and placement open
- PIR: cut (no greeting, and the device is always on) · supersedes PIR wake-on-approach · decided
- LEDs only as a listening indicator by the red button · supersedes ambient breathing / phase-color LEDs · decided
- No camera on the device; photos come through the app · — · decided
- All BOM and retail numbers removed until a panel is picked · supersedes the ~$56 BOM and $79–199 retail scenarios · decided
- A product render gets added once exported; until then docs link the `.3dm` · — · open

**Brain and roadmap**
- `SKILL.md` stays the base brain for the mockup, app and device · — · decided
- V1 device = **thin client to a hosted brain**; the **on-device LLM is the endgame** · supersedes "self-hosted server on a Pi / Mac mini" · decided
- Named phases: **Skill → Online mockup → Device → On-device brain**. V1/V2 tiers live in SCOPE.md, separate from phases · supersedes Stages 1–4 · decided
- "The bet" stays, plus one line: V1 and the mockup use a hosted brain as a stepping stone · — · decided
- Online mockup (next build): hosted, Google login, Anthropic API, text-first, voice input, A/B images+animation vs text, emulates the color e-paper screen · supersedes the local web app as the next step · decided
- Mockup code lives in this repo under `mockup/`, Apache-2.0, secrets in env · — · decided

**Repo**
- Stage 2 local Python app archived to `archive/stage2/` · — · decided
- Recipe schema, pantry model and sample recipes promoted to `reference/` (recipes translated to Mexican Spanish; the archive keeps its frozen copies) · — · decided
- Mockups, the copy review and the mono prototype plan archived under `archive/` · — · decided
- Collaborator credit line added to the README · — · decided

**Onboarding**
- First run asks four skippable questions (city, how many people, what you don't eat, what's at hand today), each with a one-line reason and a default, then three options right away. Script: [`setup/interview.md`](setup/interview.md#first-run) · supersedes the gated three-part interview · decided
- After the first cook, ten more topics surface one or two at a time; "pregúntame todo" does them at once · — · decided

**Tiers**
- V2: batch cooking, multi-axis taste feedback, habit/schedule learning, and the rest of the V2 list in SCOPE.md · — · decided
- Discarded: TTS, running countdown, greeting on turn-on, Alexa-style welcome test, pantry audit every few weeks, ticket printing, 4th "don't know" pantry state, expense tracking, battery-first, mono-only screen as the committed direction · — · decided
- Open questions: panel, mic hardware, connectivity / Wi-Fi setup method, on-device LLM feasibility, photo transfer without the app, batch cooking, push-to-talk details, how proactive is too proactive · — · open

## 2026-10-28

- **B-C personality**: practical first, playful in small moments · supersedes the "confident, playful, sensory" persona · decided
- **Turn-on**: a short chirp, no greeting, no instant suggestion · — · decided
- **Choosing**: three options (title, time, difficulty), no commentary, no narrowing follow-up · supersedes 5–7 directions + one narrowing question · decided
- **Discard**: a new list with no comment; the discard is a taste signal · — · decided
- **Missing ingredient**: short practical options (skip it, or substitute with the trade-off) · — · decided
- **Checkpoints** instead of a timer during cooking · — · decided
- **Finish**: one cluck, then silence; one optional taste question; predicted pantry diff to confirm · — · decided
- **Onboarding shape**: a few skippable questions, then a recipe right away; the rest surfaces gradually after the first cook; no hard gate · supersedes the up-front interview gate · decided
- **On-device LLM** is the goal · — · decided
- **Poionotas**: what POiO knows about you, visible and editable by asking · — · decided
- **Settings** live in the background and change by asking · — · decided
- **The device works without the app.** App V1 = camera input, minimal social, config · — · decided
- **Learning**: discards as signal; proactive check-ins on the cookbook screen later that day or the next, never at turn-on; habit learning comes with the mockup · — · decided
- **Adaptive UI** within bounds: 1-2 designer-set variants, POiO suggests switching · — · decided
- **Open cookbook screen**: always on, suggests a dish 1-2× a day (seasonal), ignore or tweak by voice · — · decided
- **Testing plan**: an online mockup, text-first, Google login, shared widely, voice input, A/B images+animation vs text · — · decided

## 2026-07 (backfilled)

- Pivot from a wall-mounted ambient broadsheet (9.7" e-ink) to a countertop companion with personality · supersedes the ambient-glance device · **live**
- 4.2" mono e-paper screen, decided · — · superseded 2026-11-04 (color e-paper)
- Encoder is in, for navigation · — · superseded 2026-11-04 (encoder kept, alongside required voice)
- Voice undecided and never required for the device to work · — · superseded 2026-11-04 (voice required)
- Camera unlikely (cost + complexity) · — · superseded 2026-11-04 (no device camera; photos via the app)
- Four-input bake-off (encoder, thumbwheel, cap slider, tap-to-advance) to pick the input by feel · — · superseded 2026-11-04 (extra inputs parked in Future)
- Local Python server + laptop-as-device web app as Stage 2 · — · superseded 2026-11-04 (archived; online mockup next)
- Battery-powered, palm-sized shell · — · superseded 2026-11-04 (always-on mains/USB-C; size per the `.3dm`)
