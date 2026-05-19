# POiO — Editorial Cookbook (Mockup)

A working HTML/CSS/JS prototype of POiO styled as a printed cookbook /
food zine. Single-page, hash-navigable, no build step. Open `index.html`
directly in a browser.

## Design rationale

POiO's voice in `SKILL.md` is sensory, opinionated, and a little
literary — "char it until it catches", "until it smells like toasted
cumin and you can't help leaning in." That's not app-speak. That's a
recipe column in a glossy. So the interface should feel like flipping
through one.

The five required views map cleanly onto the structure of a magazine
issue:

| View         | Magazine equivalent           |
|--------------|-------------------------------|
| Today        | The opening feature / cover   |
| Suggestions  | "The Menu" — a table of contents disguised as a numbered list |
| Recipe       | The hero recipe spread        |
| Pantry       | A back-of-book ingredient catalogue |
| Shopping     | A market guide, four columns  |

Each section is numbered (01–05) as a "chapter" with an italic
display-serif numeral, the way Apartamento and Cereal letter their
sections. Every section also gets a pull quote in the gutter — direct
lifts from `SKILL.md`, the recipe method, or the shopping conversation
— to keep the tone present even when you're scanning.

## Visual system

- **Type pairing:** DM Serif Display for headlines (high-contrast,
  almost Didone), Fraunces for body and italics (variable, warm,
  bookish), Inter for the small ALL-CAPS metadata. The italic serif
  numerals do most of the editorial heavy lifting.
- **Paper:** A warm off-white (`#F4EBDD`) with a subtle dotted grain
  generated via stacked radial gradients — gives the background the
  feel of uncoated stock without an image asset.
- **Accent palette** is pulled from food, not from a UI library:
  - `saffron` (`#D87B2A`) — glaze, toasted spice
  - `chipotle` (`#A23A1F`) — dried-chile red, used for emphasis
  - `charred` (`#3D241B`) — burnt edge, used for the footer & buttons
  - `lime` (`#8BA13E`) — fresh herbal, used for "plenty" pantry status
  - `crema` (`#F5E9CF`) — the cream itself, used for inverse text
- **Layout:** Asymmetric, generous whitespace, hairline rules between
  sections and ingredients (1px solid + 1px dotted, the way recipe
  tables actually read in print). The recipe page uses a sticky
  ingredients sidebar so the method scrolls past a fixed shopping list.
- **Photography:** Direct-URL Unsplash food shots at moderate
  saturation/contrast. The recipe cover is a full-bleed image with a
  bottom-weighted gradient overlay so the deck reads as a caption.

## Interactivity (deliberately restrained)

The prototype is "print-derived" — interactions should feel like turning
a page, not like a SaaS dashboard:

- **Hash nav** with scroll-spy: the sticky masthead highlights the
  current section.
- **Fade-up section reveals** on scroll via `IntersectionObserver`.
- **Light parallax** on the hero photo and recipe cover (4–5%, never
  more).
- **Clickable pantry items** — click any pantry row to cycle
  plenty → low → out → plenty. Demonstrates the live pantry-edit
  affordance from `SKILL.md` ("Updated — coconut milk is now plenty").

No transitions, no modals, no spring animations. The whole thing should
feel paper-like.

## Mock data

Populated from real POiO content:

- Pantry status mirrors `pantry.example.md` structure, with statuses
  chosen to make the suggested dishes feasible (chipotle in adobo is
  `low`, queso fresco is `low`, gochujang/tahini/salsa macha are `out`
  — feeding the Shopping > Unlock card).
- Seasonal callouts (mango peaking, poblanos arriving, squash blossoms
  starting) are drawn from `references/regional-context.example.md`'s
  May–June entry.
- Spanish food vocabulary used unapologetically per the style guide:
  *epazote*, *media crema*, *queso fresco*, *bolillo*, *tianguis*,
  *elote*, *jitomate*, *rajas con crema*, *caldo*.
- The hero recipe ("Chipotle-Mango Smashed Thighs") is invented but
  follows the SKILL.md recipe format and references the style guide's
  smashing technique, dried-chile adobo marinade archetype, and Latin
  flavor profile family.

## Mood board

- **Apartamento** — gutter pull quotes, italic chapter numerals, lots
  of whitespace, photos that breathe.
- **Bon Appétit (print era)** — recipe spreads with a hard left-rail
  ingredient list, generous deck under the title.
- **Cereal Magazine** — pared palette, calm typography, the willingness
  to let a photo sit alone.
- **Kinfolk's recipe pages** — sensory deck copy, italic captions,
  numbered method with display-size numerals.

## Trade-offs

- **No backend wiring.** Pantry edits are session-only. Real POiO
  rewrites `pantry.md` on disk — this prototype just demonstrates the
  affordance.
- **One recipe, not many.** The brief asked for one showpiece recipe;
  in a real product, every dish in "The Menu" would route to a recipe
  view of similar fidelity. The same layout components scale.
- **External font + image dependencies.** Google Fonts and Unsplash
  CDN URLs are used directly. If you open this offline, type falls
  back to Georgia/system serif and the photo blocks render empty.
  Acceptable for a mockup; production would self-host.
- **Editorial density is high.** Lots of pull quotes, chapter marks,
  marginalia. This is deliberate — leaning into the conceit — but it
  would need to be dialed back for daily-use software.
- **No dark mode.** Magazines aren't dark mode. If we ever ship this
  feel as a real interface, we'd build a "candlelight" variant rather
  than invert the palette.

## File layout

```
editorial-cookbook/
├── index.html    # All five views, single page, hash-anchored
├── styles.css    # Type system, color tokens, all section layouts
├── app.js        # Pantry data + render, scroll-spy, fade-in, parallax
└── README.md     # This file
```

## To view

Just open `index.html` in any modern browser. No server, no install.

## v2 changelog

Three peers reviewed v1 (`eink-glance`, `terminal-dense`, `chat-conversational`).
The notes overlap heavily, which made triage easy. Below: what I took, and
what I deliberately left on the floor.

### Accepted

- **Today is now a glance, not a brochure** *(all three critiques).* The
  Today section now leads with a `.glance` card: dish name, time, the
  specific `low` items it'll use, the mood, and the primary CTA — all
  above the fold on a 13" laptop. The hero photo and italic display line
  are still there, but they're below the actionable strip rather than in
  place of it. Section padding dropped from `96px 56px` to `56px 40px`.

- **Killed the fade-in opacity gate** *(eink-glance, terminal-dense).*
  Removed `section { opacity: 0 }` + `IntersectionObserver` reveal.
  Content is visible immediately. The page no longer feels broken when
  you hash-jump to `#pantry`.

- **Killed the parallax** *(terminal-dense).* The scroll-tied
  `transform` on the hero and recipe cover is gone. Five fewer lines of
  JS, no scroll jank.

- **Graceful image fallback** *(all three).* Every photo is now a
  `<div data-img="…">` that starts as a saffron→charred gradient with a
  stenciled plate number ("Pl. 01"). `app.js` preloads the URL with a
  5-second timeout; on success it swaps in the photo, on failure it
  keeps the gradient. Offline, rate-limited, or air-gapped, the design
  still has presence. Same trick applied to the recipe cover. Google
  Fonts now has real local fallbacks (Cormorant Garamond / Iowan Old
  Style / Palatino) instead of bare Georgia.

- **Conversational entry point — "Ask POiO"** *(chat-conversational,
  the strongest standalone point).* A persistent ask bar sits in the
  Menu section header: type intent ("something quick", "I bought
  poblanos", "what should I cook?") and the menu filters + a one-line
  reply appears. Four chip shortcuts seed common asks. This finally
  gives Mode 1 a real surface and lets Mode 3 ("make me tacos") land
  somewhere.

- **Step-4 narrowing dialog** *(chat-conversational).* Each menu item
  carries a `data-narrow` question. Clicking "Open recipe →" no longer
  jumps to the spread — it opens a modal with the SKILL.md-style binary
  question ("Crunchy and charred, or saucy and tender?"). Picking either
  side toasts the choice and then navigates. The distinctive beat of the
  skill is now visible.

- **Keyboard support** *(terminal-dense).* `1`–`5` jump to sections,
  `j`/`k` are next/prev, `/` focuses the ask bar, `?` toggles a help
  card, `g p` jumps to pantry, `Esc` closes any overlay. Pantry rows are
  now `role="button"`, `tabindex="0"`, with `Space`/`Enter` to cycle
  status and an `aria-label` that announces the current state. Nav
  links show the numeric shortcut in a small key cap.

- **Pantry edits are discoverable** *(all three critiques, implicitly).*
  Added a toolbar with three-state filter chips (All / Plenty / Low /
  Out), a one-line hint ("Click a row, or focus it with Tab and press
  Space…"), and a toast confirmation ("Chipotle in adobo is now low.").
  The mutation no longer happens silently.

- **Pantry mutation surfaces in the recipe** *(eink-glance hinted; SKILL.md
  asked for it).* "This'll use most of your chipotles in adobo" now has
  an inline "Mark it low →" button that updates the source data and the
  pantry view in one click, with a toast.

- **Shopping list became an actual list** *(everyone hinted at "more
  interactivity than passive scroll").* The Restock and Top Up
  checkboxes are real — checking strikes through the row. Session-only,
  but the affordance is right.

- **Accessibility cleanups** *(terminal-dense).* The decorative giant
  `&ldquo;` glyph from the pull-quote system was deleted entirely (see
  rejections). Every interactive element has a focus-visible ring in
  saffron. `prefers-reduced-motion` disables smooth-scroll and
  transitions.

- **Tightened editorial chrome** *(all three flagged "House style,
  Section II" attributions as posture).* The three pull quotes are
  removed — the voice now lives in the lede, the recipe deck, and the
  ask-bar replies, not in fake citations.

### Rejected (with reasoning)

- **"Drop stock photography entirely"** *(chat-conversational, partly
  eink-glance).* Rejected — the thesis of this mockup is *photo-forward
  magazine*. But the underlying complaint (the page collapses without
  Unsplash) is real, so it's addressed differently: the gradient
  fallback means the page never has empty boxes, and the figure has
  presence even when the CDN is missing. In production, per-recipe
  imagery would be generated or shot at engine time; for now, the
  gradient is the honest placeholder.

- **"Replace magazine framing with assistant framing"**
  *(chat-conversational).* Rejected. The brand thesis is "POiO sounds
  like a recipe column in a glossy" — abandoning that for a chat shell
  would just become a worse version of the `chat-conversational`
  mockup. But the legitimate gap — *the assistant never gets to talk* —
  is closed by the ask bar + narrowing dialog + toasts. Magazine voice
  for the editorial copy, assistant voice for the interactions.

- **"Disable `scroll-behavior: smooth`"** *(terminal-dense).* Rejected
  for the default case (smooth scrolling matches the paper-turning
  feel), but honored under `prefers-reduced-motion: reduce`.

- **"Section-at-a-time visibility toggle like eink-glance"**
  *(terminal-dense).* Rejected. The point of the editorial layout is
  that you can flip through it; killing the linear scroll would erase
  the whole conceit. Keyboard `1`–`5` and `j`/`k` give the fast-jump
  path without breaking the model.

- **"Remove the chapter numerals and the kicker dates"** *(implied by
  chat-conversational).* Kept. These are the visual identity. What I
  did remove is the *fake editorial attributions* ("House style,
  Section II"), which fight the assistant tone without contributing to
  the magazine read.

- **Inkplate portability concerns** *(eink-glance).* Acknowledged but
  out of scope for this mockup. The whole point of having three mockups
  is that `eink-glance` is the Stage-3 candidate; this one is the
  Stage-2 web app candidate. Trying to make a single design that serves
  both would water down both.
