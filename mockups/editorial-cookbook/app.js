/* =========================================================
   POiO — Editorial Cookbook (v2)
   Prototype interactivity:
     1. Pantry data (drawn from pantry.example.md)
     2. Pantry rendering: click + keyboard cycle, filters, toast
     3. Scroll-spy nav highlighting
     4. Image fallback: detect Unsplash failure, keep gradient
     5. Ask bar: Mode-1 conversational entry
     6. Step-4 narrowing dialog
     7. Keyboard shortcuts: 1-5, j/k, /, ?, g+p, esc
     8. Inline "mark low" action from recipe notes
   Deliberately removed in v2: parallax, fade-in opacity gate.
   ========================================================= */

// ---------- 1. Pantry data ----------
const PANTRY = [
  { category: "Proteins", items: [
    { name: "Chicken thighs (boneless)", status: "plenty" },
    { name: "Chicken thighs (bone-in, skin-on)", status: "plenty" },
    { name: "Chicken drumsticks", status: "plenty" },
    { name: "Whole chicken", status: "low" },
    { name: "Chicken breast (boneless)", status: "out" },
    { name: "Eggs", status: "plenty" },
  ]},
  { category: "Spices & Seasonings", items: [
    { name: "Cumin (ground)", status: "low" },
    { name: "Mexican oregano", status: "low" },
    { name: "Smoked paprika", status: "plenty" },
    { name: "Canela (Ceylon)", status: "plenty" },
    { name: "Garam masala", status: "plenty" },
    { name: "Tajin", status: "plenty" },
    { name: "Za'atar", status: "out" },
    { name: "Five-spice powder", status: "out" },
    { name: "Maldon (flaky salt)", status: "plenty" },
  ]},
  { category: "Dried Chiles", items: [
    { name: "Chile ancho", status: "plenty" },
    { name: "Chile guajillo", status: "plenty" },
    { name: "Chile de arbol", status: "plenty" },
    { name: "Chile morita", status: "low" },
    { name: "Chile pasilla", status: "out" },
  ]},
  { category: "Oils, Vinegars & Acids", items: [
    { name: "Olive oil (cooking)", status: "plenty" },
    { name: "Sesame oil", status: "low" },
    { name: "Apple cider vinegar", status: "plenty" },
    { name: "Rice vinegar", status: "plenty" },
    { name: "Limes", status: "plenty" },
    { name: "Lemons", status: "out" },
  ]},
  { category: "Sauces, Pastes & Condiments", items: [
    { name: "Chipotle in adobo", status: "low" },
    { name: "Soy sauce", status: "plenty" },
    { name: "Fish sauce", status: "plenty" },
    { name: "Honey", status: "plenty" },
    { name: "Dijon mustard", status: "plenty" },
    { name: "Salsa macha", status: "out" },
    { name: "Gochujang", status: "out" },
    { name: "Tahini", status: "out" },
    { name: "Peanut butter", status: "plenty" },
  ]},
  { category: "Fresh Vegetables", items: [
    { name: "White onion", status: "plenty" },
    { name: "Red onion", status: "plenty" },
    { name: "Garlic", status: "plenty" },
    { name: "Jitomate (tomato)", status: "plenty" },
    { name: "Tomatillo", status: "plenty" },
    { name: "Jalapeños", status: "plenty" },
    { name: "Poblano peppers", status: "plenty" },
    { name: "Avocado", status: "plenty" },
    { name: "Cabbage (purple)", status: "plenty" },
    { name: "Nopales", status: "low" },
    { name: "Elote (corn)", status: "plenty" },
    { name: "Spring onions", status: "plenty" },
  ]},
  { category: "Fresh Herbs", items: [
    { name: "Cilantro", status: "plenty" },
    { name: "Mint", status: "low" },
    { name: "Epazote", status: "low" },
    { name: "Thyme (fresh)", status: "out" },
    { name: "Basil", status: "out" },
  ]},
  { category: "Starches & Grains", items: [
    { name: "Corn tortillas", status: "plenty" },
    { name: "Rice (jasmine)", status: "plenty" },
    { name: "Rice (basmati)", status: "low" },
    { name: "Bolillo / telera", status: "plenty" },
    { name: "Pasta (rigatoni)", status: "plenty" },
    { name: "Couscous", status: "out" },
    { name: "Black beans (dried)", status: "plenty" },
  ]},
  { category: "Dairy & Cheese", items: [
    { name: "Media crema", status: "plenty" },
    { name: "Crema (Mexican)", status: "plenty" },
    { name: "Greek yoghurt", status: "plenty" },
    { name: "Queso fresco", status: "low" },
    { name: "Queso Oaxaca", status: "plenty" },
    { name: "Cotija", status: "plenty" },
    { name: "Butter (unsalted)", status: "plenty" },
  ]},
  { category: "Canned & Jarred", items: [
    { name: "Canned tomatoes (whole)", status: "plenty" },
    { name: "Chicken broth", status: "plenty" },
    { name: "Coconut milk", status: "plenty" },
    { name: "Black beans (canned)", status: "plenty" },
    { name: "Pickled jalapeños", status: "low" },
    { name: "Capers", status: "out" },
  ]},
  { category: "Nuts & Seeds", items: [
    { name: "Peanuts", status: "plenty" },
    { name: "Sesame seeds", status: "plenty" },
    { name: "Pepitas", status: "plenty" },
    { name: "Almonds", status: "low" },
    { name: "Pine nuts", status: "out" },
  ]},
];

const STATUS_CYCLE = { plenty: "low", low: "out", out: "plenty" };
const STATUS_LABEL = { plenty: "plenty", low: "low", out: "out" };

// ---------- 2. Pantry render ----------
function pantryCount(items) {
  return items.reduce((acc, i) => {
    acc[i.status] = (acc[i.status] || 0) + 1;
    return acc;
  }, { plenty: 0, low: 0, out: 0 });
}

function renderPantry() {
  const grid = document.getElementById("pantry-grid");
  if (!grid) return;

  grid.innerHTML = PANTRY.map((cat, ci) => {
    const counts = pantryCount(cat.items);
    const summary = `${counts.plenty}/${cat.items.length} stocked`;
    const items = cat.items.map((item, ii) => `
      <li class="pantry-item is-${item.status}"
          data-name="${item.name}"
          data-cat="${ci}" data-idx="${ii}"
          role="button"
          tabindex="0"
          aria-label="${item.name}, ${STATUS_LABEL[item.status]}. Press space to cycle.">
        <span class="pantry-item-name">${item.name}</span>
        <span class="pantry-item-status status-${item.status}">${STATUS_LABEL[item.status]}</span>
      </li>`).join("");

    return `
      <div class="pantry-cat" data-cat="${ci}">
        <h3 class="pantry-cat-title">
          ${cat.category}
          <small>${summary}</small>
        </h3>
        <ul class="pantry-items">${items}</ul>
      </div>`;
  }).join("");

  grid.querySelectorAll(".pantry-item").forEach((li) => {
    li.addEventListener("click", () => cyclePantryItem(li));
    li.addEventListener("keydown", (e) => {
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        cyclePantryItem(li);
      }
    });
  });
}

function cyclePantryItem(li) {
  const ci = +li.dataset.cat;
  const ii = +li.dataset.idx;
  const item = PANTRY[ci].items[ii];
  const next = STATUS_CYCLE[item.status];

  li.classList.remove(`is-${item.status}`);
  li.classList.add(`is-${next}`);

  const badge = li.querySelector(".pantry-item-status");
  badge.classList.remove(`status-${item.status}`);
  badge.classList.add(`status-${next}`);
  badge.textContent = STATUS_LABEL[next];

  item.status = next;
  li.setAttribute("aria-label", `${item.name}, ${next}. Press space to cycle.`);

  // Update category summary count
  const cat = li.closest(".pantry-cat");
  const summary = cat.querySelector(".pantry-cat-title small");
  const counts = pantryCount(PANTRY[ci].items);
  summary.textContent = `${counts.plenty}/${PANTRY[ci].items.length} stocked`;

  toast(`<strong>${item.name}</strong> is now <em>${next}</em>.`);

  // Reapply current filter (so a row may now hide itself)
  const active = document.querySelector(".filter-btn.is-active");
  if (active) applyFilter(active.dataset.filter);
}

// ---------- Pantry filters ----------
function applyFilter(filter) {
  const grid = document.getElementById("pantry-grid");
  if (!grid) return;
  grid.querySelectorAll(".pantry-item").forEach((li) => {
    const status = [...li.classList].find((c) => c.startsWith("is-"))?.replace("is-", "");
    const visible = filter === "all" || status === filter;
    li.classList.toggle("is-hidden", !visible);
  });
  // Hide categories with zero visible items
  grid.querySelectorAll(".pantry-cat").forEach((cat) => {
    const anyVisible = [...cat.querySelectorAll(".pantry-item")].some((li) => !li.classList.contains("is-hidden"));
    cat.classList.toggle("is-empty", !anyVisible);
  });
}

function setupPantryFilters() {
  document.querySelectorAll(".filter-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".filter-btn").forEach((b) => {
        b.classList.remove("is-active");
        b.setAttribute("aria-selected", "false");
      });
      btn.classList.add("is-active");
      btn.setAttribute("aria-selected", "true");
      applyFilter(btn.dataset.filter);
    });
  });
}

// ---------- 3. Scroll-spy nav ----------
function setupScrollSpy() {
  const sections = document.querySelectorAll("main .section");
  const navLinks = document.querySelectorAll(".nav-link");

  const obs = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const id = entry.target.id;
          navLinks.forEach((link) => {
            link.classList.toggle("active", link.getAttribute("href") === `#${id}`);
          });
        }
      });
    },
    { rootMargin: "-35% 0px -55% 0px", threshold: 0 }
  );

  sections.forEach((s) => obs.observe(s));
}

// ---------- 4. Image fallback ----------
// Try to load each [data-img] URL; on success swap the gradient for the photo.
// On failure or timeout (5s), leave the gradient + plate-number stencil.
function setupImageFallback() {
  document.querySelectorAll("[data-img]").forEach((el) => {
    const url = el.dataset.img;
    if (!url) return;
    const img = new Image();
    let settled = false;
    const timeout = setTimeout(() => {
      if (!settled) { settled = true; el.classList.add("img-failed"); }
    }, 5000);
    img.onload = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      el.style.setProperty("--bg-image", `url('${url}')`);
      el.classList.add("img-loaded");
    };
    img.onerror = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      el.classList.add("img-failed");
    };
    img.src = url;
  });
}

// ---------- 5. Ask bar (Mode-1 entry) ----------
const NARROW_QUESTIONS = [
  { match: /quick|fast|tired|20 ?min|weeknight/i,
    reply: "Got it — keeping it under 25 minutes. Two on the menu fit: ii. Rajas con Crema Tacos and iv. Charred Cabbage & Peanut. Filtered for you." ,
    filter: ["quick"] },
  { match: /poblano/i,
    reply: "Nice — poblanos love media crema, which you have. ii. Rajas con Crema Tacos is the obvious play.",
    filter: ["poblano"] },
  { match: /slow ?cook|set and forget|overnight|all day/i,
    reply: "Slow cooker it is. iii. Slow Cooker Tinga gives you three meals from one base.",
    filter: ["slow"] },
  { match: /bold|adventurous|surprise|something new/i,
    reply: "Then vii. Sticky Gochu-Lime — except your gochujang is out, so add it to the shopping list or we pivot to tandoori (v).",
    filter: ["bold"] },
  { match: /taco/i,
    reply: "Tacos are right there: ii. Rajas con Crema, or shred the iii. Tinga base. Tortillas are plenty.",
    filter: ["poblano", "slow"] },
  { match: /soup|broth|caldo/i,
    reply: "vi. Caldo de Pollo — onion, garlic, a whole bird, and a garnish bar. Sunday energy.",
    filter: ["brothy"] },
  { match: /what should i cook/i,
    reply: "Tonight I'd argue for i. Chipotle-Mango Smashed Thighs. The mangoes are peaking and your chipotle adobo is begging to be used." },
];

function setupAskBar() {
  const form = document.getElementById("ask-bar");
  const input = document.getElementById("ask-input");
  const reply = document.getElementById("ask-reply");
  if (!form) return;

  function answer(text) {
    const q = (text || "").trim();
    if (!q) return;
    const match = NARROW_QUESTIONS.find((r) => r.match.test(q));
    if (match) {
      reply.textContent = match.reply;
      if (match.filter) filterMenu(match.filter);
    } else {
      reply.textContent = `I'd start with the pantry — mangoes, poblanos, media crema, chipotle adobo. Want me to suggest something built around any of those?`;
      filterMenu(null);
    }
    document.getElementById("menu-list")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    answer(input.value);
  });

  document.querySelectorAll(".ask-chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      input.value = chip.dataset.ask;
      answer(chip.dataset.ask);
    });
  });
}

function filterMenu(tagsOrNull) {
  document.querySelectorAll(".menu-item").forEach((li) => {
    if (!tagsOrNull) { li.classList.remove("is-hidden"); return; }
    const itemTags = (li.dataset.tags || "").split(/\s+/);
    const match = tagsOrNull.some((t) => itemTags.includes(t));
    li.classList.toggle("is-hidden", !match);
  });
}

// ---------- 6. Step-4 narrowing dialog ----------
function setupMenuPicks() {
  document.querySelectorAll(".menu-item").forEach((li) => {
    const link = li.querySelector(".menu-link");
    if (!link) return;
    link.addEventListener("click", (e) => {
      e.preventDefault();
      openNarrow(li);
    });
  });

  document.getElementById("narrow-close")?.addEventListener("click", closeNarrow);
  document.getElementById("narrow-overlay")?.addEventListener("click", (e) => {
    if (e.target.id === "narrow-overlay") closeNarrow();
  });
}

function openNarrow(menuItem) {
  const overlay = document.getElementById("narrow-overlay");
  const dish = menuItem.querySelector(".menu-name").textContent;
  const question = menuItem.dataset.narrow || "Quick weeknight, or up for a slower cook?";
  document.getElementById("narrow-dish").textContent = dish;
  document.getElementById("narrow-title").textContent = question;

  // Build choices from the question's "A, or B?" structure.
  const parts = question.replace(/\?$/, "").split(/, or |\bor\b/i).map((s) => s.trim()).filter(Boolean);
  const choices = parts.length === 2 ? parts : ["Yes, let's go", "Show me other options"];
  const choicesEl = document.getElementById("narrow-choices");
  choicesEl.innerHTML = choices.map((c, i) => `
    <button type="button" class="narrow-choice ${i === 0 ? "is-primary" : ""}">${c}</button>
  `).join("");
  choicesEl.querySelectorAll(".narrow-choice").forEach((btn) => {
    btn.addEventListener("click", () => {
      toast(`Picked: <strong>${btn.textContent}</strong>. Opening recipe…`);
      closeNarrow();
      const target = document.getElementById("recipe");
      target?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });

  overlay.hidden = false;
  setTimeout(() => choicesEl.querySelector(".narrow-choice")?.focus(), 30);
}

function closeNarrow() {
  const overlay = document.getElementById("narrow-overlay");
  if (overlay) overlay.hidden = true;
}

// ---------- 7. Keyboard shortcuts ----------
const NAV_IDS = ["today", "suggestions", "recipe", "pantry", "shopping"];

function currentSectionIndex() {
  // Pick the section closest to the top of the viewport, but past the masthead.
  const sections = NAV_IDS.map((id) => document.getElementById(id)).filter(Boolean);
  let best = 0;
  let bestDist = Infinity;
  sections.forEach((s, i) => {
    const rect = s.getBoundingClientRect();
    const dist = Math.abs(rect.top - 100);
    if (rect.top < window.innerHeight * 0.6 && dist < bestDist) {
      bestDist = dist;
      best = i;
    }
  });
  return best;
}

function jumpTo(idx) {
  const id = NAV_IDS[Math.max(0, Math.min(NAV_IDS.length - 1, idx))];
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
}

function setupKeyboard() {
  let lastG = 0;

  document.addEventListener("keydown", (e) => {
    const target = e.target;
    const inField =
      target.tagName === "INPUT" ||
      target.tagName === "TEXTAREA" ||
      target.isContentEditable;

    // Esc always closes overlays — even in fields
    if (e.key === "Escape") {
      const help = document.getElementById("help-overlay");
      const narrow = document.getElementById("narrow-overlay");
      if (help && !help.hidden) { help.hidden = true; return; }
      if (narrow && !narrow.hidden) { narrow.hidden = true; return; }
      if (inField) target.blur();
      return;
    }

    if (inField) return;

    // 1-5 jump
    if (/^[1-5]$/.test(e.key)) {
      e.preventDefault();
      jumpTo(parseInt(e.key, 10) - 1);
      return;
    }

    // j / k next/prev
    if (e.key === "j") { e.preventDefault(); jumpTo(currentSectionIndex() + 1); return; }
    if (e.key === "k") { e.preventDefault(); jumpTo(currentSectionIndex() - 1); return; }

    // /
    if (e.key === "/") {
      e.preventDefault();
      const input = document.getElementById("ask-input");
      if (input) {
        document.getElementById("suggestions")?.scrollIntoView({ behavior: "smooth", block: "start" });
        setTimeout(() => input.focus(), 250);
      }
      return;
    }

    // ?
    if (e.key === "?") {
      e.preventDefault();
      const help = document.getElementById("help-overlay");
      if (help) help.hidden = !help.hidden;
      return;
    }

    // g then p — go to pantry (vim-style chord)
    if (e.key === "g") {
      lastG = Date.now();
      return;
    }
    if (e.key === "p" && Date.now() - lastG < 800) {
      e.preventDefault();
      jumpTo(NAV_IDS.indexOf("pantry"));
      lastG = 0;
    }
  });

  document.getElementById("help-close")?.addEventListener("click", () => {
    document.getElementById("help-overlay").hidden = true;
  });
}

// ---------- 8. Inline mark-low action ----------
function setupInlineActions() {
  const btn = document.getElementById("mark-low-chipotle");
  if (!btn) return;
  btn.addEventListener("click", () => {
    // Already low in seed data; this re-affirms & shows the affordance.
    const cat = PANTRY.find((c) => c.category === "Sauces, Pastes & Condiments");
    const item = cat?.items.find((i) => i.name === "Chipotle in adobo");
    if (item) item.status = "low";
    btn.textContent = "Marked low ✓";
    btn.classList.add("is-done");
    btn.disabled = true;
    toast(`Updated — <strong>chipotle in adobo</strong> is now <em>low</em>.`);
    // Re-render the relevant row in pantry
    document.querySelectorAll(".pantry-item").forEach((li) => {
      if (li.dataset.name === "Chipotle in adobo") {
        li.classList.remove("is-plenty", "is-out");
        li.classList.add("is-low");
        const badge = li.querySelector(".pantry-item-status");
        badge.classList.remove("status-plenty", "status-out");
        badge.classList.add("status-low");
        badge.textContent = "low";
      }
    });
  });
}

// ---------- Toast ----------
let toastTimer = null;
function toast(html) {
  const el = document.getElementById("toast");
  if (!el) return;
  el.innerHTML = html;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.hidden = true; }, 2400);
}

// ---------- init ----------
document.addEventListener("DOMContentLoaded", () => {
  renderPantry();
  setupPantryFilters();
  setupScrollSpy();
  setupImageFallback();
  setupAskBar();
  setupMenuPicks();
  setupKeyboard();
  setupInlineActions();
});
