# Bootstrap Interview

This is the onboarding script poio runs the first time it's used. It collects just enough information to generate the two personal files the assistant relies on:

- `pantry.md` — what the user has in their kitchen
- `references/regional-context.md` — what's in season where they live

Both files are gitignored (personal state). Templates of each live alongside as `*.example.md` and serve as the structural reference.

This file is the single source of truth for onboarding. Stage 1 (the Claude skill) follows it as a conversational script. Stage 2 (the local web app) will reuse it as the setup-wizard content. Stage 3 (the hardware device) will reuse it as the pairing flow over Bluetooth or a captive-portal page.

---

## When to run the interview

Before doing anything else in a poio session, check:

1. Does `pantry.md` exist in the skill's directory?
2. Does `references/regional-context.md` exist?

If **both** exist, skip the interview and proceed normally.

If **either** is missing, run the interview for the missing file(s) only. Don't re-ask about something the user already configured.

---

## Tone

Same persona as the main skill: warm, confident, sensory. Not a form. Not a survey. A short conversation with someone who's about to cook for you regularly and needs to know your kitchen.

Keep the whole interview under five minutes for a motivated user. Offer shortcuts at every step.

---

## Part 1 — Regional Context

Skip this part if `references/regional-context.md` already exists.

### Step 1.1 — Greet and frame

> "Quick setup before we start cooking. I need to know where you are (so I can suggest what's actually in season) and what's in your kitchen. Takes a few minutes — we can do it now or you can hand-edit the files later if you'd rather. Want to walk through it?"

If user declines: copy `references/regional-context.example.md` to `references/regional-context.md` unmodified, copy `pantry.example.md` to `pantry.md`, tell the user where the files live, and stop the interview. They can fill them in by hand.

### Step 1.2 — Ask for location

> "Where do you cook? City or region is enough — I'll figure out the rest."

Use the answer to generate a seasonal-produce calendar in the same shape as `references/regional-context.example.md`. The example is structured around Guadalajara / Western Mexico; mirror that structure for any region:

- **Seasonal produce calendar** — month-by-month or season-by-season, peak produce + peak fruit + a "good for" cooking note
- **Local staples** — vegetables, herbs, dairy, proteins that are common and cheap
- **Local cooking idioms** — short notes on what dishes the region is known for, what's worth leaning into
- **Where to shop** — names of relevant local markets/stores (tianguis, mercado, supermarket chains, specialty shops). Ask the user if you're not confident.

Draw on general knowledge for well-known regions. For less common ones, ask the user 2–3 targeted follow-up questions to fill gaps. Never make up a market name — ask.

### Step 1.3 — Write the file

Write `references/regional-context.md` with the generated content. Confirm briefly:

> "Wrote your regional context. We can refine it any time — just tell me if I got something wrong about what's actually in season for you."

---

## Part 2 — Pantry

Skip this part if `pantry.md` already exists.

### Step 2.1 — Offer three paths

> "Now the pantry. Three ways we can do this:
> 1. **Photo tour** — take a few photos of your shelves, fridge, spice rack and I'll fill it in from those
> 2. **Walk through together** — I'll ask category by category, you tell me what you have
> 3. **Quick start** — tell me the 10–15 things you always keep around and I'll mark everything else as `out`; we'll fill it in as we go
>
> Which one?"

### Step 2.2a — Photo path

If user uploads photos: read them, identify items, map onto the categories in `pantry.example.md`. Mark visible items `plenty`, infer `low` only if visibly running out (less than 1/4 full). Anything not visible defaults to `out`. After the first pass, summarize what you found and ask:

> "Here's what I spotted. Anything I missed or got wrong? Anything you have stashed elsewhere I wouldn't have seen?"

### Step 2.2b — Walk-through path

Go category by category, in this order (matches `pantry.example.md`):

1. Proteins (chicken cuts + eggs)
2. Fresh vegetables & aromatics — the daily-driver ones first (onion, garlic, lime, tomato, jalapeño, cilantro)
3. Spices & seasonings — bulk first ("do you have a working spice rack? roughly what's on it?"), then probe for region-specific ones (chiles dried, oregano variants)
4. Oils, vinegars & acids
5. Sauces, pastes & condiments
6. Starches & grains
7. Dairy & cheese
8. Canned, frozen, nuts, baking

Batch questions per category. Don't ask one item at a time. Example:

> "Spices — what's on your rack? Just rattle off what comes to mind, don't think about it too hard."

### Step 2.2c — Quick start path

> "Just list the staples that are always in your kitchen — the things you'd notice if they ran out."

Mark those `plenty`. Everything else in `pantry.example.md` defaults to `out`. Tell the user:

> "Marked everything else as `out` — we'll flip things to `plenty` as you mention them in conversation, or whenever you tell me you went to the store."

### Step 2.3 — Write the file

Write `pantry.md` based on the answers, preserving the category structure from `pantry.example.md`. Add a "Last updated: YYYY-MM-DD" line at the top with today's date.

Confirm briefly and move on:

> "Pantry's in. Ready to cook?"

---

## Ongoing maintenance (post-interview)

After the interview, the skill keeps the files current as a side effect of conversation:

- When the user mentions buying something → flip to `plenty`, no re-asking
- When a recipe uses most of a key item → ask "want me to mark X as `low`?"
- When the user says something is out → flip to `out`
- When the user moves or travels (e.g., "I'm in Mexico City for the month") → ask if they want a temporary regional override; don't overwrite the canonical file silently

These rules belong in `SKILL.md`, not here. This file is just for the cold-start onboarding.
