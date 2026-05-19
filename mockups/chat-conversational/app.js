/* POiO — Conversational mockup v2
   Vanilla JS. Five first-class views (Today / Suggestions / Recipe / Pantry /
   Shopping) plus a conversation view. Keyboard parity. Multiple wired recipes. */

(() => {
  const D = window.POIO_DATA;

  // ---- DOM refs ----
  const main = document.getElementById("main");
  const thread = document.getElementById("thread");
  const qr     = document.getElementById("quickReplies");
  const input  = document.getElementById("input");
  const form   = document.getElementById("composer");
  const crumb  = document.getElementById("crumbView");
  const overlay = document.getElementById("overlay");

  // ---- view router ----
  const VIEWS = ["today", "suggestions", "recipe", "pantry", "shopping", "chat"];
  const VIEW_LABEL = {
    today: "Today",
    suggestions: "Suggestions",
    recipe: "Recipe",
    pantry: "Pantry",
    shopping: "Shopping",
    chat: "Chat",
  };
  let currentRecipeId = 3; // default wired recipe
  let currentView = "today";
  let chatBooted = false;

  function setView(view, opts = {}) {
    if (!VIEWS.includes(view)) return;
    currentView = view;

    // toggle sections
    document.querySelectorAll(".view").forEach(el => {
      el.hidden = el.getAttribute("data-view") !== view;
    });

    // rail current state
    document.querySelectorAll(".nav-view, .rail-chat").forEach(btn => {
      const v = btn.getAttribute("data-view");
      if (v === view) btn.setAttribute("aria-current", "page");
      else btn.removeAttribute("aria-current");
    });

    crumb.textContent = VIEW_LABEL[view];

    // per-view boot
    if (view === "today") renderToday();
    if (view === "suggestions") renderSuggestionsView();
    if (view === "recipe") renderRecipeView(opts.recipeId || currentRecipeId);
    if (view === "pantry") renderPantryView();
    if (view === "shopping") renderShoppingView();
    if (view === "chat") {
      if (!chatBooted) { chatBooted = true; flowGreet(); }
      setTimeout(() => input.focus(), 50);
    }

    // scroll the main pane (not the chat thread)
    main.scrollTop = 0;
  }

  // wire nav rail
  document.querySelectorAll(".nav-view, .rail-chat").forEach(btn => {
    btn.addEventListener("click", () => setView(btn.getAttribute("data-view")));
  });

  // ---- shortcuts overlay ----
  document.getElementById("showShortcuts").addEventListener("click", () => overlay.hidden = false);
  document.getElementById("closeOverlay").addEventListener("click", () => overlay.hidden = true);
  overlay.addEventListener("click", (e) => { if (e.target === overlay) overlay.hidden = true; });

  // ---- helpers ----
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, m => ({
      "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
    }[m]));
  }
  function fmt(s) {
    return escapeHtml(s)
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.+?)\*/g, "<em>$1</em>")
      .replace(/`([^`]+)`/g, "<code>$1</code>");
  }

  // ============================================================
  // TODAY view
  // ============================================================
  function renderToday() {
    const t = D.today;
    document.getElementById("todayDate").textContent = t.date;
    document.getElementById("todayRegion").textContent = `${t.region} · ${t.weather}`;
    document.getElementById("todayHeadline").textContent = t.headline;
    document.getElementById("todayVibe").textContent = t.headlineVibe;
    document.getElementById("todayWhy").textContent = t.why;

    const callouts = document.getElementById("todayCallouts");
    callouts.innerHTML = t.callouts.map(c =>
      `<div class="today-callout ${c.kind}"><span class="dot"></span>${escapeHtml(c.text)}</div>`
    ).join("");

    // tiles
    const low = countByStatus("low");
    const out = countByStatus("out");
    document.getElementById("tilePantry").textContent =
      `${low} low · ${out} out · ${countByStatus("plenty")} plenty`;
    document.getElementById("tileShopping").textContent =
      `${D.shoppingList.length} item${D.shoppingList.length === 1 ? "" : "s"} on the list`;

    // wire any data-view buttons on this view
    document.querySelectorAll(".view-today [data-view]").forEach(b => {
      b.onclick = () => setView(b.getAttribute("data-view"));
    });
    document.querySelectorAll(".view-today [data-prompt]").forEach(b => {
      b.onclick = () => {
        const p = b.getAttribute("data-prompt");
        setView("chat");
        setTimeout(() => handleTyped(p), 100);
      };
    });
  }

  function countByStatus(s) {
    let n = 0;
    D.pantry.forEach(g => g.items.forEach(it => { if (it.status === s) n++; }));
    return n;
  }

  // ============================================================
  // SUGGESTIONS view (full page)
  // ============================================================
  function renderSuggestionsView() {
    const s = D.suggestions;
    document.getElementById("suggestionsSub").textContent =
      "Tomatillos and poblanos are loud right now. Chipotle in adobo and media crema are on the shelf. Mangoes peaking at the tianguis. Pick a direction or open the chat to narrow.";
    const grid = document.getElementById("suggestionsGrid");
    const wired = new Set(D.wiredRecipes);
    grid.innerHTML = s.items.map(it => {
      const isWired = wired.has(it.n);
      return `
        <button class="sugg-card ${isWired ? "" : "disabled"}" data-pick="${it.n}" data-wired="${isWired}" ${isWired ? "" : "aria-disabled='true'"}>
          <div class="sugg-head">
            <div class="sugg-num">${it.n}</div>
            <div class="sugg-title">${escapeHtml(it.title)}</div>
          </div>
          <div class="sugg-hook">${escapeHtml(it.hook)}</div>
          <div class="sugg-tags">
            ${it.tags.map(t => `<span class="tag ${t.cls||""}">${escapeHtml(t.label)}</span>`).join("")}
          </div>
          <div class="sugg-foot">
            <span>${isWired ? "Recipe ready" : "Sketch only in this demo"}</span>
            <span class="open-link">${isWired ? "Open recipe →" : "—"}</span>
          </div>
        </button>
      `;
    }).join("");

    grid.querySelectorAll(".sugg-card").forEach(card => {
      card.addEventListener("click", () => {
        const n = parseInt(card.getAttribute("data-pick"), 10);
        if (D.wiredRecipes.includes(n)) {
          currentRecipeId = n;
          setView("recipe");
        } else {
          // graceful: show the recipe view with a stub
          currentRecipeId = n;
          setView("recipe");
        }
      });
    });
  }

  // ============================================================
  // RECIPE view (full page)
  // ============================================================
  function renderRecipeView(id) {
    currentRecipeId = id;
    const picker = document.getElementById("recipePicker");
    picker.innerHTML = `<span class="picker-label">recipe</span>` +
      D.suggestions.items.map(it => {
        const wired = D.wiredRecipes.includes(it.n);
        const cur = it.n === id ? 'aria-current="page"' : "";
        return `<button data-pick="${it.n}" ${cur} ${wired ? "" : "title='Not in this demo'"}>${it.n}${wired ? "" : "·"}</button>`;
      }).join("");
    picker.querySelectorAll("button").forEach(b => {
      b.addEventListener("click", () => {
        const n = parseInt(b.getAttribute("data-pick"), 10);
        renderRecipeView(n);
      });
    });

    const mount = document.getElementById("recipeMount");
    const r = D.recipes[id];
    if (!r) {
      const meta = D.suggestions.items.find(s => s.n === id);
      mount.innerHTML = `
        <div class="recipe-stub">
          <div class="stub-eyebrow">Recipe #${id}</div>
          <div class="stub-name">${escapeHtml(meta ? meta.title : "Untitled")}</div>
          <div class="stub-msg">This direction is sketched in the suggestion deck but isn't fully wired in the v2 demo — four of the seven recipes are. The production engine would render every direction in the same format from your pantry and the style guide.</div>
          <div class="stub-actions">
            <button class="btn-primary" id="stubGoSuggestions">Back to suggestions</button>
            <button class="btn-ghost" id="stubTryWired">Try a wired recipe</button>
          </div>
        </div>
      `;
      document.getElementById("stubGoSuggestions").onclick = () => setView("suggestions");
      document.getElementById("stubTryWired").onclick = () => { renderRecipeView(3); };
      return;
    }

    mount.innerHTML = recipeFullHTML(r);
  }

  function recipeFullHTML(r) {
    const ingGroups = r.ingredients.map(g => `
      <div class="ing-group">
        <div class="label">${escapeHtml(g.label)}</div>
        <ul class="ing-list">
          ${g.items.map(it => `
            <li${it.star ? ' class="star"' : ""}>
              <span>${escapeHtml(it.text)}</span>
              <span class="qty">${escapeHtml(it.qty)}</span>
              ${it.low ? '<span class="low">low</span>' : ""}
            </li>`).join("")}
        </ul>
      </div>
    `).join("");

    const methodHTML = r.method.map(step => `<li><div>${fmt(step)}</div></li>`).join("");
    const pchips = r.panchips.map(p =>
      `<span class="pchip ${p.status}"><span class="pdot"></span>${escapeHtml(p.name)}</span>`
    ).join("");

    const hero = r.hero || { emoji: "🍗", gradient: "linear-gradient(135deg, #c14b2a 0%, #6b3a14 100%)" };

    return `
      <article class="recipe-card">
        <div class="recipe-hero" style="background:${hero.gradient}">
          <span class="recipe-hero-tag">From your pantry</span>
          <span class="recipe-hero-emoji">${hero.emoji}</span>
        </div>
        <div class="recipe-head">
          <div class="recipe-name">${escapeHtml(r.name)}</div>
          <div class="recipe-vibe">${escapeHtml(r.vibe)}</div>
          <div class="recipe-meta">
            <span><b>Time</b> ${escapeHtml(r.timeActive)} active · ${escapeHtml(r.timeTotal)} total</span>
            <span><b>Serves</b> ${r.serves}</span>
          </div>
        </div>
        <div class="pchips">
          <div class="pchips-label">from your shelf</div>
          ${pchips}
        </div>
        <div class="recipe-body">
          <div class="recipe-section">
            <h4>What you need</h4>
            <div class="recipe-grid">${ingGroups}</div>
          </div>
          <div class="recipe-section">
            <h4>Method</h4>
            <ol class="method">${methodHTML}</ol>
          </div>
          <div class="recipe-section">
            <div class="finish">
              <div class="label">The finish</div>
              ${fmt(r.finish)}
            </div>
          </div>
          <div class="recipe-section">
            <div class="notes">
              <div class="label">Pantry notes</div>
              <ul>${r.notes.map(n => `<li>${fmt(n)}</li>`).join("")}</ul>
            </div>
          </div>
        </div>
      </article>
    `;
  }

  // ============================================================
  // PANTRY view (full page, with priority section)
  // ============================================================
  function renderPantryView() {
    // priority list: low + out items first
    const priority = [];
    D.pantry.forEach(g => g.items.forEach(it => {
      if (it.status === "low" || it.status === "out") {
        priority.push({ ...it, group: g.group });
      }
    }));
    priority.sort((a, b) => {
      if (a.status === b.status) return a.name.localeCompare(b.name);
      return a.status === "out" ? -1 : 1;
    });

    document.getElementById("pantryPriorityCount").textContent =
      `${priority.filter(p => p.status === "out").length} out · ${priority.filter(p => p.status === "low").length} low`;
    const pl = document.getElementById("pantryPriorityList");
    pl.innerHTML = priority.length
      ? priority.map(p => `
          <div class="pp-row ${p.status}" data-name="${escapeHtml(p.name)}">
            <span class="pdot"></span>
            <span class="name">${escapeHtml(p.name)}</span>
            <span class="status">${p.status}</span>
          </div>`).join("")
      : `<div class="pp-row" style="color:var(--ink-mute)">Nothing low or out — you're stocked.</div>`;

    // wire status flip on click
    pl.querySelectorAll(".pp-row[data-name]").forEach(row => {
      row.addEventListener("click", () => togglePantryItem(row.getAttribute("data-name")));
    });

    // full grouped panes
    const body = document.getElementById("pantryFullbody");
    body.innerHTML = D.pantry.map(g => `
      <div class="pantry-group-card">
        <h6>${escapeHtml(g.group)}</h6>
        <ul>
          ${g.items.map(it => `
            <li class="${it.status}" data-name="${escapeHtml(it.name)}">
              <span class="pdot"></span>
              <span>${escapeHtml(it.name)}</span>
            </li>
          `).join("")}
        </ul>
      </div>
    `).join("");

    body.querySelectorAll("li[data-name]").forEach(li => {
      li.addEventListener("click", () => togglePantryItem(li.getAttribute("data-name")));
    });
  }

  function togglePantryItem(name) {
    D.pantry.forEach(g => g.items.forEach(it => {
      if (it.name === name) {
        it.status = it.status === "plenty" ? "low" : it.status === "low" ? "out" : "plenty";
        // auto-add to shopping if newly low/out
        if ((it.status === "low" || it.status === "out") && !D.shoppingList.find(s => s.item === name)) {
          D.shoppingList.push({ item: name, note: it.status === "out" ? "auto-added (out)" : "auto-added (low)" });
        }
      }
    }));
    // re-render whatever view is active
    if (currentView === "pantry") renderPantryView();
    if (currentView === "shopping") renderShoppingView();
    if (currentView === "today") renderToday();
  }

  // ============================================================
  // SHOPPING view (full page) — calmer than v1
  // ============================================================
  function renderShoppingView() {
    const s = D.shopping;
    document.getElementById("shoppingSub").textContent =
      "Mid-May, mangoes peaking, tomatillos abundant, first chiles de agua showing up. Restock essentials, top up what's running low, lean into the season, or follow an unlock if you're curious.";

    const grid = document.getElementById("shopGridV2");
    const list = arr => arr.map(x => `<li>${escapeHtml(x.item)}<small>${escapeHtml(x.note)}</small></li>`).join("");
    grid.innerHTML = `
      <div class="shop-col-v2 restock">
        <h5><span class="dot"></span>Restock</h5>
        <ul>${list(s.restock)}</ul>
      </div>
      <div class="shop-col-v2 topup">
        <h5><span class="dot"></span>Top up</h5>
        <ul>${list(s.topup)}</ul>
      </div>
      <div class="shop-col-v2 seasonal">
        <h5><span class="dot"></span>Seasonal picks</h5>
        <ul>${list(s.seasonal)}</ul>
      </div>
      <div class="shop-col-v2 unlock">
        <h5><span class="dot"></span>Unlock new dishes</h5>
        <ul>${list(s.unlock)}</ul>
      </div>
    `;

    // ongoing list
    const slv = document.getElementById("shopListV2");
    if (!D.shoppingList.length) {
      slv.innerHTML = `<li class="empty">Nothing on the list yet.</li>`;
    } else {
      slv.innerHTML = D.shoppingList.map(x =>
        `<li><span>${escapeHtml(x.item)}</span><small>${escapeHtml(x.note)}</small></li>`
      ).join("");
    }

    document.getElementById("btnCompile").onclick = () => {
      compileShoppingList();
      renderShoppingView();
    };
  }

  function compileShoppingList() {
    // merge top-up + restock + a couple of seasonal picks
    const next = [];
    D.shopping.topup.forEach(x => next.push({ item: x.item, note: "top up" }));
    D.shopping.restock.forEach(x => next.push({ item: x.item, note: "restock" }));
    D.shopping.seasonal.slice(0, 2).forEach(x => next.push({ item: x.item, note: "in season" }));
    D.shoppingList = next;
  }

  // ============================================================
  // CHAT view (the conversation surface — distilled from v1)
  // ============================================================

  // Delays: only used for the very first turn of a flow (where it reads as
  // "thinking"). Navigation-style replies are immediate.
  const DELAY_FIRST = 420;

  function addUserTurn(text) {
    const turn = document.createElement("div");
    turn.className = "turn user";
    turn.innerHTML = `
      <div class="avatar you">you</div>
      <div class="bubble">
        <div class="name">you</div>
        <div class="text">${fmt(text)}</div>
      </div>`;
    thread.appendChild(turn);
    scrollDown();
  }

  function addAssistantTurn(html) {
    const turn = document.createElement("div");
    turn.className = "turn poio";
    turn.innerHTML = `
      <div class="avatar poio">Po</div>
      <div class="bubble">
        <div class="name">POiO</div>
        ${html}
      </div>`;
    thread.appendChild(turn);
    scrollDown();
    return turn;
  }

  function botSay(html, opts = {}) {
    clearQuickReplies();
    const turn = addAssistantTurn(html);
    return turn;
  }

  // For flows where a "thinking" beat helps. Otherwise use botSay directly.
  function botSayDelayed(html) {
    return new Promise(resolve => {
      clearQuickReplies();
      const turn = document.createElement("div");
      turn.className = "turn poio";
      turn.innerHTML = `
        <div class="avatar poio">Po</div>
        <div class="bubble">
          <div class="name">POiO</div>
          <div class="typing"><span></span><span></span><span></span></div>
        </div>`;
      thread.appendChild(turn);
      scrollDown();
      setTimeout(() => {
        turn.querySelector(".bubble").innerHTML = `<div class="name">POiO</div>${html}`;
        scrollDown();
        resolve(turn);
      }, DELAY_FIRST);
    });
  }

  function setQuickReplies(replies) {
    qr.innerHTML = "";
    replies.forEach((r, i) => {
      const b = document.createElement("button");
      b.className = "qr" + (r.primary ? " primary" : "");
      b.type = "button";
      b.innerHTML = `<span>${escapeHtml(r.label)}</span>${i < 9 ? `<span class="qr-kbd">${i + 1}</span>` : ""}`;
      b.addEventListener("click", () => r.onClick());
      b.dataset.qrIndex = String(i);
      qr.appendChild(b);
    });
  }
  function clearQuickReplies() { qr.innerHTML = ""; }
  function scrollDown() {
    requestAnimationFrame(() => { thread.scrollTop = thread.scrollHeight; });
  }

  function userSays(text, then) {
    clearQuickReplies();
    addUserTurn(text);
    if (typeof then === "function") setTimeout(then, 120);
  }

  // ---- chat-card renderers (more compact than dedicated views) ----

  function chatSuggestionDeckHTML() {
    const s = D.suggestions;
    const wired = new Set(D.wiredRecipes);
    const items = s.items.map(it => `
      <div class="chat-suggestion ${wired.has(it.n) ? "" : "disabled"}" data-pick="${it.n}" data-wired="${wired.has(it.n)}">
        <div class="num">${it.n}</div>
        <div class="body">
          <div class="title">${escapeHtml(it.title)}</div>
          <div class="hook">${escapeHtml(it.hook)}</div>
          <div class="tags">
            ${it.tags.map(t => `<span class="tag ${t.cls||""}">${escapeHtml(t.label)}</span>`).join("")}
          </div>
        </div>
        <div class="pick">${wired.has(it.n) ? "pick" : "sketch"}</div>
      </div>
    `).join("");

    return `
      <div class="text">${fmt(s.intro)}</div>
      <div class="chat-card">
        <div class="card-head">
          <div>
            <div class="card-eyebrow">suggestion deck</div>
            <div class="card-title">7 directions from your pantry</div>
          </div>
          <div class="card-meta">May · Guadalajara</div>
        </div>
        <div class="chat-suggestions">${items}</div>
        <div class="card-actions">
          <button class="primary" data-action="open-suggestions">Open the full deck →</button>
        </div>
      </div>
      <div class="text" style="margin-top:10px;color:var(--ink-soft)">${fmt(s.outro)}</div>
    `;
  }

  function chatRecipePreviewHTML(id) {
    const r = D.recipes[id];
    if (!r) return "";
    const pchips = r.panchips.map(p =>
      `<span class="pchip ${p.status}"><span class="pdot"></span>${escapeHtml(p.name)}</span>`
    ).join("");
    return `
      <div class="text">Pulled it up. ${escapeHtml(r.vibe)}</div>
      <div class="pchips" style="padding:8px 0 0">${pchips}</div>
      <div class="chat-card">
        <div class="card-head">
          <div>
            <div class="card-eyebrow">recipe · ${escapeHtml(r.timeActive)} active</div>
            <div class="card-title">${escapeHtml(r.name)}</div>
          </div>
          <div class="card-meta">serves ${r.serves}</div>
        </div>
        <div class="card-actions">
          <button class="primary" data-action="open-recipe" data-id="${id}">Open the recipe →</button>
          <button data-action="open-pantry">See pantry</button>
        </div>
      </div>
    `;
  }

  function chatShoppingPreviewHTML() {
    const s = D.shopping;
    return `
      <div class="text">${fmt(s.intro)}</div>
      <div class="chat-card">
        <div class="card-head">
          <div>
            <div class="card-eyebrow">shopping</div>
            <div class="card-title">Four lists for the tianguis</div>
          </div>
          <div class="card-meta">mid-May</div>
        </div>
        <div class="card-actions">
          <button class="primary" data-action="open-shopping">Open shopping →</button>
          <button data-action="compile-list">Compile a single list</button>
        </div>
      </div>
    `;
  }

  // ---- chat flow ----

  async function flowGreet() {
    if (thread.children.length > 0) return; // don't re-greet
    await botSayDelayed(`<div class="text">Hey. Pantry's loaded, regional file says it's May in Guadalajara — that means tomatillos, elote on the way up, and mangoes are absolutely peaking. What are we doing?</div>`);
    setQuickReplies([
      { label: "what should I cook?", primary: true, onClick: () => userSays("what should I cook?", flowSuggest) },
      { label: "I'm going to the store", onClick: () => userSays("I'm going to the store.", flowShop) },
      { label: "chipotle-lime bowl", onClick: () => userSays("make me a chipotle-lime chicken bowl", flowDirect) },
      { label: "what's new this week?", onClick: () => userSays("what's new this week?", flowSeasonal) },
    ]);
  }

  async function flowSuggest() {
    await botSayDelayed(chatSuggestionDeckHTML());
    wireInlineActions();
    setQuickReplies([
      { label: "I'll have #3", primary: true, onClick: () => userSays("I'll have #3.", () => flowPickSuggestion(3)) },
      { label: "more like #2 but quicker", onClick: () => userSays("more like #2 but quicker", flowNarrow2) },
      { label: "what's the time on #4?", onClick: () => userSays("what's the time on #4?", flowAnswerTime4) },
      { label: "one more, weirder", onClick: () => userSays("give me one more, weirder", flowWeirder) },
      { label: "open the full deck", onClick: () => setView("suggestions") },
    ]);
  }

  async function flowSeasonal() {
    botSay(`<div class="text">Mangoes are at their absolute peak right now — heavy, perfumed, the kind that drip down your wrist. First chiles de agua are showing up. Tomatillos are abundant and cheap. If I had your hands today I'd lean mango-habanero on grilled thighs, or stuff chiles de agua with chicken and queso Oaxaca and char them on a comal.</div>`);
    setQuickReplies([
      { label: "mango-habanero thighs, write it up", primary: true, onClick: () => userSays("mango-habanero thighs, write it up.", flowMangoHabanero) },
      { label: "what should I cook?", onClick: () => userSays("what should I cook?", flowSuggest) },
      { label: "going to the store", onClick: () => userSays("I'm going to the store.", flowShop) },
    ]);
  }

  async function flowMangoHabanero() {
    botSay(`<div class="text">Quick sketch: ripe mango blitzed with one habanero (start with half if you're unsure), lime, a spoon of honey, a pinch of salt. Marinate bone-in thighs an hour. Grill or broil until lacquered. Toasted pepitas on top. Cilantro. It's fruit-hot-sweet, and the habanero builds — taste before you commit.</div><div class="text" style="margin-top:8px;color:var(--ink-soft)">This one isn't fully wired in v2, but the production engine would render it like any other.</div>`);
    setQuickReplies([
      { label: "back to suggestions", onClick: () => userSays("back to suggestions.", flowSuggest) },
      { label: "open chipotle-lime instead", primary: true, onClick: () => userSays("okay, the chipotle-lime bowl.", () => flowPickSuggestion(3)) },
    ]);
  }

  async function flowPickSuggestion(n) {
    if (!D.wiredRecipes.includes(n)) {
      botSay(`<div class="text">That one's sketched in the deck but not fully wired in this v2 demo (four recipes are: #1, #2, #3, #6). The production engine would write it up the same way it does the others.</div>`);
      setQuickReplies([
        { label: "try #3 (the bowl)", primary: true, onClick: () => userSays("try #3.", () => flowPickSuggestion(3)) },
        { label: "try #1 (glazed thighs)", onClick: () => userSays("try #1.", () => flowPickSuggestion(1)) },
        { label: "try #2 (salsa verde)", onClick: () => userSays("try #2.", () => flowPickSuggestion(2)) },
        { label: "try #6 (gochujang tacos)", onClick: () => userSays("try #6.", () => flowPickSuggestion(6)) },
      ]);
      return;
    }
    currentRecipeId = n;
    if (n === 3) {
      await botSayDelayed(`<div class="text">${fmt(D.narrow_3)}</div>`);
      setQuickReplies([
        { label: "char it hard, salsa macha", primary: true, onClick: () => userSays("char it hard, salsa macha.", flowRecipe) },
        { label: "soft and saucy with crema", onClick: () => userSays("soft and saucy with crema.", flowRecipeAlt) },
      ]);
    } else {
      // wired non-3: go straight to recipe in the chat
      await flowRecipe();
    }
  }

  async function flowNarrow2() {
    await botSayDelayed(`<div class="text">Salsa verde is by nature a slow-ish braise — but you can pivot. Blister the tomatillos hard, blend raw with serrano + cilantro + a splash of stock, and sear the thighs separately. Spoon the green sauce over at the end. ~20 minutes. Same flavor, half the time.</div><div class="text" style="margin-top:8px;color:var(--ink-soft)">Want me to write that up?</div>`);
    setQuickReplies([
      { label: "yes, write it up", primary: true, onClick: () => userSays("yes, write it up.", () => { currentRecipeId = 2; flowRecipe(); }) },
      { label: "back to the list", onClick: () => userSays("back to the list.", flowSuggest) },
    ]);
  }

  async function flowAnswerTime4() {
    botSay(`<div class="text">Tinga in the slow cooker: 10 min active to brown the onion and bloom the chipotle-tomato base, then 4–5 hours on low (or 2 on high). Thighs come out shreddable. Plan it for a morning start.</div>`);
    setQuickReplies([
      { label: "let's do #4", primary: true, onClick: () => userSays("okay let's do #4.", () => flowPickSuggestion(4)) },
      { label: "still leaning #3", onClick: () => userSays("still leaning #3.", () => flowPickSuggestion(3)) },
      { label: "going to the store first", onClick: () => userSays("going to the store first.", flowShop) },
    ]);
  }

  async function flowWeirder() {
    await botSayDelayed(`<div class="text">Okay — <strong>chipotle-miso wings, drumstick edition</strong>. White miso + chipotle in adobo + honey + lime, rubbed under the skin, oven-roasted until lacquered. Finish with a tajin-pepita crunch. Flavor bridge: both are fermented, both are smoky-funky. Nothing about your pantry argues with it.</div>`);
    setQuickReplies([
      { label: "I'm in", primary: true, onClick: () => userSays("I'm in.", () => { currentRecipeId = 1; flowRecipe(); }) },
      { label: "tempting but not tonight", onClick: () => userSays("tempting but not tonight.", flowSuggest) },
    ]);
  }

  async function flowRecipe() {
    await botSayDelayed(chatRecipePreviewHTML(currentRecipeId));
    wireInlineActions();
    setQuickReplies([
      { label: "open the recipe", primary: true, onClick: () => setView("recipe", { recipeId: currentRecipeId }) },
      { label: "swap rice for tortillas", onClick: () => userSays("swap rice for tortillas.", flowSwap) },
      { label: "mark avocado low", onClick: () => userSays("mark avocado low.", flowMarkLow) },
      { label: "salsa macha substitute?", onClick: () => userSays("what's a salsa macha substitute?", flowMachaSub) },
    ]);
  }

  async function flowRecipeAlt() {
    botSay(`<div class="text">Noted — same dish, but after the sear we'll deglaze the pan with a splash of stock and stir in a couple of spoonfuls of media crema. The chipotle melts into it and you get a smoky pink pool under the chicken. Less char, more sauce.</div>`);
    setTimeout(flowRecipe, 200);
  }

  async function flowKickoff() {
    botSay(`<div class="text">Good. Start the rice first, marinade goes on while it cooks. I'll be here if you need cook timing.</div>`);
    setQuickReplies([
      { label: "plan the store run too", primary: true, onClick: () => userSays("let's plan the store run too.", flowShop) },
      { label: "open the recipe", onClick: () => setView("recipe", { recipeId: currentRecipeId }) },
      { label: "back to suggestions", onClick: () => userSays("back to suggestions.", flowSuggest) },
    ]);
  }

  async function flowSwap() {
    botSay(`<div class="text">Easy. Warm 4–6 corn tortillas on a comal until they puff and char in spots. Build little tacos: chicken, charred elote, a smear of mashed avocado, pickled onion, salsa macha, cilantro, lime. Same dish, hand-held.</div>`);
    setQuickReplies([
      { label: "perfect", primary: true, onClick: () => userSays("perfect.", flowKickoff) },
      { label: "open the recipe", onClick: () => setView("recipe", { recipeId: currentRecipeId }) },
    ]);
  }

  async function flowMarkLow() {
    botSay(`<div class="text">Updated — avocado is now <code>low</code>. I'll bias suggestions away from it until you restock.</div>`);
    D.pantry.forEach(g => g.items.forEach(i => { if (i.name === "Avocado") i.status = "low"; }));
    if (!D.shoppingList.find(s => s.item === "Avocados")) {
      D.shoppingList.push({ item: "Avocados", note: "auto-added (low)" });
    }
    setQuickReplies([
      { label: "open pantry", primary: true, onClick: () => setView("pantry") },
      { label: "open shopping list", onClick: () => setView("shopping") },
      { label: "back to the recipe", onClick: () => userSays("back to the recipe.", flowRecipe) },
    ]);
  }

  async function flowMachaSub() {
    botSay(`<div class="text">In a pinch: warm olive oil with a tablespoon of crushed chile de arbol or chile flakes + a sliced garlic clove + a spoon of toasted pepitas or sesame. Crisp the garlic, off the heat, salt. It won't have the depth of a real macha but it'll do the job — crunchy, oily, hot.</div>`);
    setQuickReplies([
      { label: "back to the recipe", primary: true, onClick: () => userSays("back to the recipe.", flowRecipe) },
      { label: "open the recipe", onClick: () => setView("recipe", { recipeId: currentRecipeId }) },
      { label: "what else needs swapping?", onClick: () => userSays("what else might I need to swap?", flowSwapsList) },
    ]);
  }

  async function flowSwapsList() {
    botSay(`<div class="text">Looking at your shelf — <code>elote</code> is low (frozen corn slots in fine, dry-blister the same way). <code>avocado</code> is low (slice thin, stretch). <code>crema</code> is low for the alt version (media crema works). <code>cotija</code> is low (queso fresco is on the shelf, use that instead). Everything else is plenty.</div>`);
    setQuickReplies([
      { label: "back to the recipe", primary: true, onClick: () => userSays("back to the recipe.", flowRecipe) },
      { label: "open pantry", onClick: () => setView("pantry") },
    ]);
  }

  async function flowDirect() {
    botSay(`<div class="text">You've got everything. Let me write it up the way I'd cook it.</div>`);
    currentRecipeId = 3;
    setTimeout(flowRecipe, 200);
  }

  async function flowShop() {
    await botSayDelayed(chatShoppingPreviewHTML());
    wireInlineActions();
    setQuickReplies([
      { label: "open shopping", primary: true, onClick: () => setView("shopping") },
      { label: "compile a single list", onClick: () => userSays("compile a single list.", flowCompiled) },
      { label: "skip the unlock items", onClick: () => userSays("skip the unlock items.", flowSkipUnlock) },
      { label: "back to cooking", onClick: () => userSays("back to cooking.", flowSuggest) },
    ]);
  }

  async function flowCompiled() {
    botSay(`<div class="text">Here, in walking order through the tianguis:</div>
      <div class="chat-card"><div class="card-head"><div><div class="card-eyebrow">consolidated</div><div class="card-title">Tianguis list</div></div><div class="card-meta">12 items</div></div>
      <div style="padding: 8px 16px 14px; font-size: 14px; color: var(--ink);">
        <ol style="margin:0; padding-left: 18px; line-height: 1.85;">
          <li>elote — 3–4 ears</li>
          <li>aguacates — 4</li>
          <li>crema — small tub</li>
          <li>epazote — small bunch</li>
          <li>bolillo — 4</li>
          <li>mangos — 3 <span style="color:var(--ink-mute)">(peaking, eat one walking home)</span></li>
          <li>tomatillos — ½ kilo</li>
          <li>chiles de agua — 4–5</li>
          <li>calabacitas — 3</li>
          <li>habaneros — small bag</li>
          <li>tortillas de harina — paquete</li>
          <li>yoghurt natural — pote chico</li>
        </ol>
      </div></div>`);
    compileShoppingList();
    setQuickReplies([
      { label: "open shopping", primary: true, onClick: () => setView("shopping") },
      { label: "okay I'm off", onClick: () => userSays("okay I'm off.", flowGoodLuck) },
      { label: "what should I cook once I'm back?", onClick: () => userSays("what should I cook once I'm back?", flowSuggest) },
    ]);
  }

  async function flowSkipUnlock() {
    botSay(`<div class="text">Fair. Keep it to what you already cook with. The unlock list is there when you're curious.</div>`);
    setQuickReplies([
      { label: "compile a single list", primary: true, onClick: () => userSays("compile a single list.", flowCompiled) },
      { label: "open shopping", onClick: () => setView("shopping") },
    ]);
  }

  async function flowGoodLuck() {
    botSay(`<div class="text">Enjoy the walk. Say <em>"I'm back"</em> when you are and I'll update the pantry.</div>`);
    setQuickReplies([
      { label: "I'm back", primary: true, onClick: () => userSays("I'm back.", flowImBack) },
      { label: "what should I cook?", onClick: () => userSays("what should I cook?", flowSuggest) },
    ]);
  }

  async function flowImBack() {
    botSay(`<div class="text">Nice. Bumping statuses — assuming the tianguis list: elote, aguacates, crema, epazote, bolillo, mangoes, tomatillos, habaneros — all <code>plenty</code>.</div>`);
    D.pantry.forEach(g => g.items.forEach(i => {
      if (["Elote (corn)","Avocado","Crema","Epazote","Bolillo","Tomatillos","Habaneros"].includes(i.name)) i.status = "plenty";
    }));
    D.shoppingList = [];
    setQuickReplies([
      { label: "what should I cook tonight?", primary: true, onClick: () => userSays("what should I cook tonight?", flowSuggest) },
      { label: "open pantry", onClick: () => setView("pantry") },
    ]);
  }

  // ---- inline card action wiring ----
  function wireInlineActions() {
    // suggestions inside chat
    thread.querySelectorAll(".chat-suggestion[data-pick]").forEach(el => {
      if (el.dataset.wired === "true") {
        el.onclick = () => {
          const n = parseInt(el.getAttribute("data-pick"), 10);
          userSays(`I'll have #${n}.`, () => flowPickSuggestion(n));
        };
      } else {
        el.onclick = () => {
          const n = parseInt(el.getAttribute("data-pick"), 10);
          userSays(`#${n}, let's do it.`, () => flowPickSuggestion(n));
        };
      }
    });
    thread.querySelectorAll("[data-action]").forEach(el => {
      const action = el.getAttribute("data-action");
      el.onclick = () => {
        if (action === "open-recipe") {
          const id = parseInt(el.getAttribute("data-id") || currentRecipeId, 10);
          setView("recipe", { recipeId: id });
        } else if (action === "open-suggestions") {
          setView("suggestions");
        } else if (action === "open-shopping") {
          setView("shopping");
        } else if (action === "open-pantry") {
          setView("pantry");
        } else if (action === "compile-list") {
          compileShoppingList();
          botSay(`<div class="text">Compiled. Twelve items, in walking order. It's in the side surface and on the Shopping view.</div>`);
          setQuickReplies([
            { label: "open shopping", primary: true, onClick: () => setView("shopping") },
          ]);
        }
      };
    });
  }

  // ============================================================
  // FREEFORM input — expanded coverage
  // ============================================================
  function handleTyped(raw) {
    const t = String(raw || "").trim();
    if (!t) return;
    const tl = t.toLowerCase();

    // ensure we're in chat view for any conversational input
    if (currentView !== "chat") setView("chat");

    addUserTurn(t);

    // navigation phrases
    if (/^(go to |open |show me |take me to )?(today|home)$/.test(tl))      { quickRoute("today", "Opening Today."); return; }
    if (/^(go to |open |show me )?suggestions?$/.test(tl))                   { quickRoute("suggestions", "Opening Suggestions."); return; }
    if (/^(go to |open |show me )?(the )?recipe$/.test(tl))                  { quickRoute("recipe", "Opening the recipe."); return; }
    if (/^(go to |open |show me )?pantry$/.test(tl))                         { quickRoute("pantry", "Opening Pantry."); return; }
    if (/^(go to |open |show me )?shopping( list)?$/.test(tl))               { quickRoute("shopping", "Opening Shopping."); return; }

    // intent regexes (broader than v1)
    if (/(what.*cook|suggest|ideas?|hungry|dinner|tonight|lunch)/.test(tl)) return flowSuggest();
    if (/(store|tianguis|mercado|shop|grocer|market)/.test(tl))             return flowShop();
    if (/(compile|consolidat|single list|walking list)/.test(tl))           return flowCompiled();
    if (/(chipotle.*lime|chipotle lime|chipotle-lime|the bowl|smashed)/.test(tl)) return flowDirect();
    if (/(salsa verde|verde|tomatillo)/.test(tl))                           return flowNarrow2();
    if (/(tinga|slow cook)/.test(tl))                                       return flowAnswerTime4();
    if (/(gochujang|korean|taco)/.test(tl))                                 { currentRecipeId = 6; return flowRecipe(); }
    if (/(glazed?|honey|broil|sticky|bone-?in)/.test(tl))                   { currentRecipeId = 1; return flowRecipe(); }
    if (/(mango|habanero)/.test(tl))                                        return flowMangoHabanero();
    if (/(season|peak|this week|new|fresh)/.test(tl))                       return flowSeasonal();
    if (/(weird|adventur|surprise|wild|unusual)/.test(tl))                  return flowWeirder();
    if (/(mark.*low|low avocado|low aguacate|out of .*avocado)/.test(tl))   return flowMarkLow();
    if (/(macha|substitute|sub for|replace)/.test(tl))                      return flowMachaSub();
    if (/(swap|tortilla.*rice|rice.*tortilla)/.test(tl))                    return flowSwap();
    if (/(what.*swap|what.*need.*swap|substitution)/.test(tl))              return flowSwapsList();
    if (/(start|let's go|let's start|begin|cook now|i'?ll start)/.test(tl)) return flowKickoff();
    if (/(time on|how long|cook time|active time)/.test(tl))                return flowAnswerTime4();
    if (/(bought|got|picked up|i'?m back|i am back|home now)/.test(tl))     return flowImBack();
    if (/(thanks|thank you|cheers|ok cool|nice|love it)/.test(tl)) {
      botSay(`<div class="text">Anytime. Yell if anything misbehaves at the stove.</div>`);
      setQuickReplies([
        { label: "what should I cook tomorrow?", primary: true, onClick: () => userSays("what should I cook tomorrow?", flowSuggest) },
        { label: "open pantry", onClick: () => setView("pantry") },
      ]);
      return;
    }
    if (/(help|shortcuts|how|what can you)/.test(tl)) {
      botSay(`<div class="text">Try: <code>what should I cook?</code>, <code>I'm going to the store</code>, <code>chipotle-lime bowl</code>, <code>salsa verde</code>, <code>gochujang tacos</code>, <code>mark avocado low</code>, <code>I'm back</code>. You can also tap a chip below, or jump to a view with the keyboard (1–5).</div>`);
      setQuickReplies([
        { label: "what should I cook?", primary: true, onClick: () => userSays("what should I cook?", flowSuggest) },
        { label: "open pantry", onClick: () => setView("pantry") },
        { label: "open shopping", onClick: () => setView("shopping") },
      ]);
      return;
    }

    // default — narrower than v1, less apologetic. Be honest about scope.
    botSay(`<div class="text">I caught the gist but I don't have a wired response for that exact phrase in the v2 demo. Closest things I do know about: cooking ideas, the store run, swaps for the current recipe, marking items low, or "I'm back" to bulk-restock.</div>`);
    setQuickReplies([
      { label: "what should I cook?", primary: true, onClick: () => userSays("what should I cook?", flowSuggest) },
      { label: "going to the store", onClick: () => userSays("I'm going to the store.", flowShop) },
      { label: "help / examples", onClick: () => userSays("help", () => handleTyped("help")) },
    ]);
  }

  function quickRoute(view, ack) {
    botSay(`<div class="text">${escapeHtml(ack)}</div>`);
    setTimeout(() => setView(view), 250);
  }

  // ---- composer ----
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const v = input.value;
    input.value = "";
    handleTyped(v);
  });

  // slash button: jump-focus
  document.querySelector(".composer-slash").addEventListener("click", () => {
    if (currentView !== "chat") setView("chat");
    setTimeout(() => input.focus(), 60);
  });

  // Top-bar prompt buttons
  document.querySelectorAll(".pill-btn[data-prompt]").forEach(btn => {
    btn.addEventListener("click", () => {
      const p = btn.getAttribute("data-prompt");
      if (currentView !== "chat") setView("chat");
      setTimeout(() => handleTyped(p), 80);
    });
  });

  // ============================================================
  // KEYBOARD SHORTCUTS
  // ============================================================
  document.addEventListener("keydown", (e) => {
    // ignore if typing in the composer (except for some globals)
    const inField = document.activeElement === input;

    // overlay first
    if (!overlay.hidden) {
      if (e.key === "Escape") { overlay.hidden = true; e.preventDefault(); return; }
      return;
    }

    // global "?" and "/"
    if (e.key === "/" && !inField) {
      e.preventDefault();
      setView("chat");
      setTimeout(() => input.focus(), 50);
      return;
    }
    if (e.key === "?" && !inField) { overlay.hidden = false; e.preventDefault(); return; }
    if (e.key === "Escape" && !inField) { setView("today"); return; }
    if (e.key === "Escape" && inField) { input.blur(); return; }

    if (inField) {
      // in the composer: allow 1-9 to fire quick replies via Cmd/Ctrl
      if ((e.metaKey || e.ctrlKey) && /^[1-9]$/.test(e.key)) {
        const idx = parseInt(e.key, 10) - 1;
        const btn = qr.querySelector(`[data-qr-index="${idx}"]`);
        if (btn) { e.preventDefault(); btn.click(); }
      }
      return;
    }

    // top-level digits 1..5 -> views
    if (/^[1-5]$/.test(e.key)) {
      const map = { "1":"today", "2":"suggestions", "3":"recipe", "4":"pantry", "5":"shopping" };
      setView(map[e.key]);
      e.preventDefault();
      return;
    }

    // in suggestions view, 1..7 picks; in chat view, 1..9 fires quick replies
    if (currentView === "chat") {
      if (/^[1-9]$/.test(e.key)) {
        const idx = parseInt(e.key, 10) - 1;
        const btn = qr.querySelector(`[data-qr-index="${idx}"]`);
        if (btn) { e.preventDefault(); btn.click(); }
      }
    }

    // in recipe view, ← / → cycle wired recipes
    if (currentView === "recipe") {
      if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        const wired = D.wiredRecipes;
        const idx = wired.indexOf(currentRecipeId);
        const next = e.key === "ArrowLeft"
          ? wired[(idx - 1 + wired.length) % wired.length]
          : wired[(idx + 1) % wired.length];
        renderRecipeView(next);
        e.preventDefault();
      }
    }
  });

  // ---- boot ----
  setView("today");
})();
