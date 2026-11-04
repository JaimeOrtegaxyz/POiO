# Where the pantry lives — and why the device never needs a keyboard

> A design note prompted by a real question: to use the prototype you first have
> to fill in pantry files by hand. **Does that mean owning the finished device
> would always require a computer to keep its files up to date?** The answer has
> to be no, and getting there cleanly is what this note commits to.

## The short answer

**The pantry lives server-side and every edit flows through the LLM.** Files
(`pantry.md`, `pantry.json`) are a *bootstrap seed*, never the steady-state
editor. Hand-editing a markdown table is a scaffolding artifact of the prototype,
not a thing a device owner would ever do. The skill conversation — and the
device's own confirm loop — *is* the pantry editor.

This isn't a new burden; it falls straight out of the encoder decision. The
device is a **thin client to the Stage-2 server** (the brain owns the pantry, the
recipes, the skill logic). Since the brain is server-side, the pantry is too — so
the device needs no file system the user touches, and no keyboard to touch it
with. That's exactly why the cheap encoder-only device is the right bet: the
intelligence that makes hand-editing unnecessary lives on the server, not in the
user's text editor.

## Pantry data has three phases, and only one is heavy

| phase | when | how much input | where it happens |
|---|---|---|---|
| **bootstrap** | once, at setup | heavy (empty → a real kitchen) | laptop / phone, conversational |
| **upkeep** | daily | light (a few deltas) | on-device, encoder-confirm |
| **correction** | occasional | tiny (fix one wrong guess) | on-device, or a sentence to the assistant |

The mistake is treating all three as "edit the file." Bootstrap is the only heavy
one, it happens **once**, and it should never be a 200-row form.

### Bootstrap — the one-time heavy lift (do it *off* the device)
Three ways to get from empty to a stocked pantry, best-first:

1. **Conversational onboarding (primary).** "Walk me through your kitchen once."
   The skill interviews by category — proteins, chiles, dairy, produce — and
   writes the pantry as you talk. `setup/interview.md` already exists for exactly
   this; it becomes a guided chat, not a file the user opens. 10 minutes, once.
2. **Photo bootstrap (accelerant).** The retired `companion-photo` probe earns
   its keep here: snap your shelves / fridge once, a vision model drafts the
   pantry, you confirm. Not routine input — a one-shot cold-start speed-up that
   folds into the same confirm screen.
3. **Provisioning surface = laptop/phone.** Whichever of the above, bootstrap is
   a big-screen, big-input moment. The **device stays out of it** — it wakes up
   already knowing your kitchen because the server does.

### Upkeep — the daily loop (this is what the device is for)
- After cooking: the encoder control's predicted **"used tonight?"** checklist —
  one press. No typing, no files. (Built and working in this milestone.)
- "I bought poblanos" / "we're out of crema": a sentence to the assistant (phone,
  laptop, or eventually the device's own voice), and the LLM writes it. Never a
  file edit.
- The server keeps `pantry.json`; the device just reads it and confirms deltas.

## What this commits the hardware/firmware to

- **The device needs:** a network path to the Stage-2 server, the read + confirm
  UI, and the encoder/tap it already has. That's it.
- **The device does NOT need:** a keyboard, a user-facing file system, or a text
  editor — ever. A mic or camera are *enhancements* to upkeep and bootstrap, not
  requirements, because conversational input can happen on the phone and the
  daily loop is encoder-confirm.
- **The server must be always-on and reachable** — a Pi / Mac mini in the kitchen,
  per `hardware/PLAN.md`. It holds the pantry, runs the skill, calls the model.
- **Onboarding is a first-class product surface, not an afterthought.** Budget
  firmware/app time for: Wi-Fi setup + the one-time pantry bootstrap (chat, and/or
  photo). Ship without it and the device is dead on arrival for a new owner.

## The honest gap today

The committed pantry template (`pantry.example.md`) ships **all-`out`**, and the
personal `pantry.md` it seeds (gitignored, per-machine) has never been filled in
by hand — i.e. nobody has ever actually done the manual pass. That's the whole
point: hand-filling it is precisely the friction we're designing away.
(`bootstrap_pantry.py` reads `pantry.md` when it exists and falls back to the
template on a fresh clone.) For the prototype the server's
`pantry.json` is seeded with a plausible Guadalajara mid-week pantry (via
`bootstrap_pantry.py`) so you can cook *tonight* and correct as you go. Before the
device is real, the **conversational bootstrap has to exist** — it's the piece
that turns "requires a computer to maintain files" into "talk to it once, then
never think about files again."

## The one-line version

> Files seed it once; the conversation and the confirm-loop keep it. The device
> is a screen and a knob that trusts the server — that's why it can be cheap,
> and why owning one never means opening a text editor.
