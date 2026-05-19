# Critique of `editorial-cookbook/` — from `terminal-dense`

Reviewed: `index.html`, `styles.css`, `app.js`, `README.md`.

## Strengths

- **Voice and visual identity match.** SKILL.md's prose really is "a recipe column in a glossy," and the type pairing (DM Serif Display for headlines, Fraunces for body, Inter for ALL-CAPS meta) carries that. The pull-quotes lifted from the skill spec (`index.html:86-91`) are a clever way of putting the brand voice on every page without it feeling like marketing.
- **The pantry data layer is the right shape.** `app.js:13-146` defines pantry categories as a JS array and renders from it (`app.js:159-206`), with a click-to-cycle `plenty → low → out` interaction. That's how every mockup should structure its source-of-truth; it's the only one of the three that did.
- **Recipe hero spread is genuinely striking.** Full-bleed photo with a bottom-weighted gradient (`styles.css:497-511`) plus an italic display-serif title at `clamp(60px, 9vw, 132px)` is the most committed art-direction in the set.

## Weaknesses

- **It is a scroll novel.** Five sections at `padding: 96px 56px` (`styles.css:125-126`) plus a `78vh` recipe cover (`styles.css:481-486`) means hitting "Pantry" from a cold load requires roughly 4–5 screens of scroll past hero, menu, and a full recipe spread, even with hash links. The "no-mouse, get to data fast" path doesn't exist.
- **Every section fades in via `IntersectionObserver`** (`app.js:233-248`, CSS `opacity:0; transform:translateY(14px)` at `styles.css:128-131`) **and the hero and recipe cover have a JS scroll-parallax** (`app.js:251-272`). On an e-ink follow-on it's irrelevant, but for a recipe surface you'll be looking at with chicken fat on your fingers, animation-while-scrolling actively gets in the way. None of it earns its CPU.
- **Sticky masthead + sticky ingredients sidebar** (`styles.css:54-62`, `styles.css:564-570`) eat ~210 vertical pixels of a 1080p screen before the method even starts. On a 13" MacBook the recipe method's effective viewport is comically short.
- **External hard dependencies.** Two `images.unsplash.com` URLs (`index.html:77`, `:237`) and a Google Fonts request (`index.html:9`) with five families and many weights. Offline → empty image blocks and Georgia fallback. The README acknowledges this; it's still the wrong call for a kitchen-wall product whose Stage 3 is explicitly offline.
- **Zero keyboard interaction beyond browser defaults.** Click-to-cycle pantry (`app.js:191-205`) is mouse-only; no `Tab` order on items (they're `<li>`s without `tabindex`), no keyboard equivalent for cycling status, no nav shortcuts. The pantry is the highest-frequency interaction in real use, and it requires a pointer.
- **Pull-quote "pullquote-open"** is a `<span>` rendering a giant 110px `"` glyph (`styles.css:205-213`). It's purely decorative but is read aloud by screen readers as a quotation mark. Use `aria-hidden`.
- **Card-cycle behavior is opaque.** Clicking a pantry item silently mutates its label with no undo, no confirmation, and no indication that the click was the gesture. First-time users will not discover it.

## Top 3 must-fix

1. **Kill the parallax and section fade-in.** Five-line deletion in `app.js`, ten-line deletion in `styles.css`. The design is strong enough to stand without motion, and the cost (scroll jank, animation-while-cooking) is real.
2. **Add a sticky compact navigation that actually jumps without 800ms of scroll-smooth + fade.** Either disable `scroll-behavior: smooth` (`styles.css:29`) for in-page anchors, or make the nav links toggle visibility of one section at a time the way `eink-glance` does. Right now you can't get from "Today" to "Pantry" in under two seconds.
3. **Keyboard the pantry.** Each row gets `tabindex="0"`, `role="button"`, `aria-label="Cilantro, plenty, press space to cycle"`, and a `keydown` handler on Space/Enter. Five more lines of JS, makes the only stateful surface usable without a mouse.

## One thing I'd steal

The **pantry data structure in `app.js:13-146`** — a flat array of `{category, items: [{name, status}]}` rendered to HTML on boot. That's the cleanest separation in any of the three mockups; mine has the pantry baked into the markup the same way `eink-glance` does, and I should refactor toward this shape so my filter logic stops fighting the DOM.
