# Copy Review — POiO

**Product model:** POiO is Jaime's open personal project: a chicken-only recipe
assistant that knows your pantry, your region's seasons, and a flavor style guide.
Today it's a Claude Code skill plus a local web app that simulates the eventual
device; next it's a chicken-shaped e-paper countertop companion; the endgame is the
model running inside the device, no cloud. Reader: a curious developer/cook landing
on the repo (soon: one specific collaborator). The genuine voice is blunt, playful,
first-person ("I fucking love chicken"), Spanish food terms untranslated. The
alternative to POiO is recipe sites or asking ChatGPT.

**Top 3 problems:** (1) The manifesto sections ("The bet", Stage 4, License) run on
AI cadence — X-not-Y flips, balanced mirrors, "not a thing… not a thing… not a
thing" tricolons — where one concrete sentence would do. (2) Aphorisms that restate
the sentence before them, but fancier ("naming the destination is half the point",
"the future arrives early for narrow products"). (3) Doctrine lines repeated across
files at the same altitude (board-swap-not-redesign, files-seed-once) — kept where
they're canonical, trimmed where they're echoes.

---

## README — What is POiO? · shape: balanced mirror · words: 15→11 · P1

**Before**
> You tell it what you have. It tells you what to make.

**After**
> It looks at what you have and suggests what to cook.

**Why:** two-beat mirror is the tell; one flat clause says the same thing.

- [x] applied

---

## README — The bet, core paragraph · shape: X-not-Y + tricolon + fragment · words: 63→37 · P0

**Before**
> The bet is this: AI is about to stop being a *service* and start being a *component* — something you buy once, baked into an object, the way a motor is baked into a blender. Not a thing you rent by the month, not a thing that phones a cloud to work, not a thing that dies when a company sunsets it. Just a part, in a box, on your counter, that's yours.

**After**
> The bet: AI becomes a part you buy once, baked into an object the way a motor is baked into a blender. You don't rent it, it doesn't phone home, and it doesn't die when a company sunsets its servers.

**Why:** the "not a thing ×3 → Just a part" build is pure AI rhythm; the blender
fact carries the whole idea. (First draft of this rewrite swapped one tricolon for
another — caught on the re-read, replaced with normal grammar.)

- [x] applied

---

## README — The bet, Trojan horse · shape: setup→reveal + aphorism · words: 44→24 · P0

**Before**
> But naming the destination is half the point. The cuteness is the Trojan horse; the argument underneath is that small, delightful, single-purpose AI appliances should belong to the people who own them.

**After**
> The cuteness is bait. The argument is that small, single-purpose AI appliances should belong to the people who buy them.

**Why:** "naming the destination is half the point" restates the previous sentence,
fancier; "Trojan horse … argument underneath" is the reveal cadence.

- [x] applied

---

## README — The bet, narrow products · shape: aphorism · words: 71→43 · P1

**Before**
> A useful thing about being narrow: the general-purpose "local assistant" future is years out, but POiO doesn't need a general model. It needs a chicken-recipe companion. The future arrives early for narrow products — a tiny model that's *only* good at "suggest a dish from these six things and walk me through it" can cross the line into delightful long before the everything-machine does.

**After**
> Being narrow helps: POiO doesn't need a general model, just a chicken-recipe companion. A tiny model that's *only* good at "suggest a dish from these six things and walk me through it" gets good enough years before the everything-machine does.

**Why:** "the future arrives early for narrow products" is the profound-sounding
restatement of the concrete sentence that follows it.

- [x] applied

---

## README — Stage 4 · shape: socket fragment + poetic close · words: n/a · P1

**Before**
> The earlier stages keep the brain *swappable* — a socket, not a commitment — so the day the right part lands, it's a board swap, not a redesign. Until then, pointing clearly at this future is itself part of POiO's job.

**After**
> The earlier stages keep the brain *swappable*, so the day the right part lands it's a board swap, not a redesign.

**Why:** "a socket, not a commitment" is a second flip inside the same sentence,
and the closing line is job-of-the-project throat-clearing. ("Board swap, not a
redesign" stays — both halves are real engineering claims.)

- [x] applied

---

## README — Stage 4, cloud line · shape: poetic reveal · words: 30→22 · P2

**Before**
> Ask it what to make, and it just answers, on the counter, owing nothing to anyone's cloud.

**After**
> Ask it what to make and it just answers.

**Why:** "owing nothing to anyone's cloud" is lyric, and the sentence before it
already lists the concrete negations (no server, no key, no round-trip). Ending
flat is the whole point of the stage.

- [x] applied

---

## README — License intro · shape: X-not-Y echo · words: 24→9 · P1

**Before**
> POiO is open, and meant to stay open — fitting for a thing about owning your tools rather than renting them. Three licenses, one per kind of material:

**After**
> Open, and share-alike so it stays open. Three licenses, one per kind of material:

**Why:** "owning your tools rather than renting them" re-runs the thesis flip a
third time; the licenses say it with teeth.

- [x] applied

---

## CLAUDE.md — intro · shape: balanced mirror · words: n/a · P1

**Before**
> The README tells the public story; this file tells you where the project actually stands and how not to step on anything.

**After**
> This file is the working map: where things stand, what's canonical, and what not to touch.

**Why:** my own line from this morning — README-vs-this mirror is the shape; the
colon list is flatter and says more.

- [x] applied

---

## stage2/PANTRY-MODEL.md — the one-line version · shape: anaphora · words: 47→36 · P2

**Before**
> Files seed it once; the conversation and the confirm-loop keep it. The device is a screen and a knob that trusts the server — which is exactly why it can be cheap, and exactly why owning one never means opening a text editor.

**After**
> Files seed it once; the conversation and the confirm-loop keep it. The device is a screen and a knob that trusts the server — that's why it can be cheap, and why owning one never means opening a text editor.

**Why:** the doubled "exactly why" is rhythm, not information. The rest of the
line earns its keep.

- [x] applied

---

## hardware/PLAN.md — endgame close · shape: X-not-Y + coinage · words: 16→0 · P2

**Before**
> Pointing at this future is part of the product's intent, not a someday-maybe.

**After**
> *(delete — the paragraph already made this point twice)*

**Why:** third restatement in one section; "someday-maybe" is a cuteness spent on
a sentence that adds nothing.

- [x] applied

---

## setup/interview.md — tone note · shape: double fragment · words: 26→20 · P2

**Before**
> Same persona as the main skill: warm, confident, sensory. Not a form. Not a survey. A short conversation with someone who's about to cook for you regularly and needs to know your kitchen.

**After**
> Same persona as the main skill: warm, confident, sensory. A short conversation with someone who's about to cook for you regularly — never a form.

**Why:** "Not a form. Not a survey." is the clipped-fragment drumbeat.

- [x] applied

---

## Kept — justified against the test

- **"I fucking love chicken."** — the realest line in the repo. Untouchable.
- **"…lightly tested in exactly one kitchen by exactly one cook (me). Treat it as a
  sketch, not a product."** — the X-not-Y carries a real warning, and the
  parenthetical is human.
- **"chickens cluck, they don't beep"** (PLAN.md) — the brand in six words; the
  contrast is the joke, not decoration.
- **"That product was a dashboard; this one is a buddy on the counter."** (PLAN.md)
  — mirror-shaped, but it's the actual product distinction, said the way a person
  explains a pivot.
- **"it's a board swap, not a redesign"** — both halves are concrete engineering
  claims; kept in README and PLAN where it's load-bearing.
- **"Hairlines, not fills." / "Type does the work color usually does." / "When in
  doubt, leave it out."** (UI-LANGUAGE.md) — spec rules; the contrast *is* the
  content, and the last one is Jaime's own stated principle.
- **"If this feels fine, the mic earns nothing — that's the point of a control."**
  (mockups/README.md) — blunt, specific, states the experiment's logic.
- **"The point: don't anchor on the $79 figure as if shipping a real product is
  free."** (PLAN.md) — exactly the slightly-too-honest register the docs want.
- **JOURNAL.md, all of it** — personal log, genuine voice, out of scope on principle.

## Proof gaps to fill

- None. Every rewrite reuses facts already in the docs; nothing was invented.
