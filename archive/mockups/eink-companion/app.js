/* POiO e-paper companion — 400×300 reference build.
   Vanilla JS, no deps. Drives the screen the way the device will:
   encoder turn/press, tap-to-advance, eye, back. One job per screen,
   sparse by default. See hardware/UI-LANGUAGE.md. */
(() => {
  'use strict';

  /* ---------------- data (a real-ish Guadalajara cook's night) ---------------- */
  const RECIPE = {
    name: 'Tinga de Pollo',
    vibe: 'smoky chipotle, piled on tostadas',
    minutes: 25,
    steps: [
      { text: 'Slice ½ cebolla thin. Warm 1 tbsp aceite in the comal, medium.',
        items: [['cebolla', 'plenty'], ['aceite', 'plenty']], timer: null },
      { text: 'Cook the cebolla until soft and just golden.',
        items: [], timer: '5 min' },
      { text: 'Stir in 2–3 chipotles en adobo, chopped, plus a spoon of the adobo.',
        items: [['chipotle en adobo', 'low']], timer: null },
      { text: 'Add 2 cups shredded pollo cocido and a splash of caldo. Simmer.',
        items: [['pollo cocido', 'plenty'], ['caldo', 'plenty']], timer: '8 min' },
      { text: 'Season with sal. Warm the tostadas on a dry comal.',
        items: [['tostadas', 'out'], ['sal', 'plenty']], timer: null },
      { text: 'Top with tinga, crema, queso fresco. Eat right away.',
        items: [['crema', 'low'], ['queso fresco', 'plenty']], timer: null },
    ],
  };

  // Pantry shows only what needs attention — sparse by default.
  const STOCKED = 38;
  let pantryRows = [
    { nm: 'tostadas', st: 'out' },
    { nm: 'chile pasilla', st: 'out' },
    { nm: 'epazote', st: 'out' },
    { nm: 'bolillo', st: 'out' },
    { nm: 'chipotle en adobo', st: 'low' },
    { nm: 'crema', st: 'low' },
    { nm: 'limones', st: 'low' },
  ];

  // Shopping is derived from pantry: out → restock, low → top up.
  let shopRows = [
    { nm: 'tostadas', group: 'RESTOCK', bought: false },
    { nm: 'chile pasilla', group: 'RESTOCK', bought: false },
    { nm: 'epazote', group: 'RESTOCK', bought: false },
    { nm: 'bolillo', group: 'RESTOCK', bought: false },
    { nm: 'chipotle en adobo', group: 'TOP UP', bought: false },
    { nm: 'crema', group: 'TOP UP', bought: false },
    { nm: 'limones', group: 'TOP UP', bought: false },
  ];

  /* ---------------- state ---------------- */
  const state = { view: 'today', menu: 0, step: 0, pHl: 0, sHl: 0, flash: true };

  const MENU = [
    { label: 'Cook', go: openRecipe },
    { label: 'Pantry', go: () => setView('pantry') },
    { label: 'Shopping', go: () => setView('shopping') },
  ];

  /* ---------------- dom + helpers ---------------- */
  const $ = (s) => document.querySelector(s);
  const screen = $('#screen');
  const body = $('#body');
  const ctxEl = $('#context');
  const affEl = $('#affordances');

  const STATUS_WORD = { plenty: 'stocked', low: 'low', out: 'out' };
  const NEXT_STATUS = { plenty: 'low', low: 'out', out: 'plenty' };
  const sw = (st) => `<span class="sw ${st}"></span>`;
  const esc = (s) => s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

  function flash() {
    if (!state.flash) return;
    screen.classList.add('flash');
    setTimeout(() => screen.classList.remove('flash'), 90);
  }

  /* ---------------- render ---------------- */
  const CONTEXT = {
    today: () => 'Tonight',
    recipe: () => RECIPE.name,
    pantry: () => 'Pantry',
    shopping: () => 'Shopping',
  };

  const VIEW = {
    today() {
      const menu = MENU
        .map((m, i) => `<span class="menu-item${i === state.menu ? ' sel' : ''}">${m.label}</span>`)
        .join('');
      const missing = pantryRows.filter((r) => r.st === 'out').some((r) =>
        RECIPE.steps.some((s) => s.items.some(([nm]) => nm === r.nm)));
      const status = missing
        ? `${sw('out')} missing tostadas · ${RECIPE.minutes} min`
        : `${sw('plenty')} pantry ready · ${RECIPE.minutes} min`;
      return `
        <div class="kicker">Tonight</div>
        <div class="dish">${esc(RECIPE.name)}</div>
        <div class="vibe">${esc(RECIPE.vibe)}</div>
        <div class="tnight-status">${status}</div>
        <div class="menu">${menu}</div>`;
    },
    recipe() {
      return `<div id="step-region">${stepRegion()}</div>`;
    },
    pantry() {
      const rows = pantryRows.map((r, i) => `
        <div class="prow${i === state.pHl ? ' row-hl' : ''}">
          <span class="caret">${i === state.pHl ? '▸' : ''}</span>
          ${sw(r.st)}<span class="nm">${esc(r.nm)}</span>
          <span class="st">${STATUS_WORD[r.st]}</span>
        </div>`).join('');
      const out = pantryRows.filter((r) => r.st === 'out').length;
      const low = pantryRows.filter((r) => r.st === 'low').length;
      return `
        <div class="summary">
          <span>${sw('plenty')} ${STOCKED} stocked</span>
          <span>${sw('low')} ${low} low</span>
          <span>${sw('out')} ${out} out</span>
        </div>
        <div class="plist">${rows}</div>`;
    },
    shopping() {
      let html = '';
      let last = null;
      shopRows.forEach((r, i) => {
        if (r.group !== last) {
          if (last !== null) html += '</div>';
          html += `<div class="shop-group"><div class="shop-label">${r.group}</div>`;
          last = r.group;
        }
        html += `
          <div class="srow${r.bought ? ' bought' : ''}${i === state.sHl ? ' row-hl' : ''}">
            <span class="caret">${i === state.sHl ? '▸' : ''}</span>
            <span class="box">${r.bought ? '▣' : '▢'}</span>
            <span class="nm">${esc(r.nm)}</span>
          </div>`;
      });
      if (last !== null) html += '</div>';
      return html;
    },
  };

  function stepRegion() {
    const n = RECIPE.steps.length;
    const s = RECIPE.steps[state.step];
    const items = s.items.length
      ? `<div class="step-items">${s.items
          .map(([nm, st]) => `<div class="item">${sw(st)}<span class="nm">${esc(nm)}</span></div>`)
          .join('')}</div>`
      : '';
    const timer = s.timer ? `<div class="timer">◷ ${esc(s.timer)}</div>` : '';
    return `
      <div class="step-head"><span class="kicker">Step</span><span class="step-num">${state.step + 1} / ${n}</span></div>
      <div class="step-text">${esc(s.text)}</div>
      ${items}${timer}`;
  }

  const AFF = {
    today: () => '<span><b>turn</b> ▸ choose</span><span><b>press</b> ● open</span>',
    recipe: () => {
      const last = state.step === RECIPE.steps.length - 1;
      return `<span><b>tap</b> ▸ ${last ? '—' : 'next'}</span><span><b>press</b> ● ${last ? 'done' : '—'}</span><span><b>◂</b> back</span>`;
    },
    pantry: () => '<span><b>turn</b> ▸ move</span><span><b>press</b> ● cycle</span><span><b>◂</b> back</span>',
    shopping: () => '<span><b>turn</b> ▸ move</span><span><b>press</b> ● mark</span><span><b>◂</b> back</span>',
  };

  function render(full = true) {
    ctxEl.textContent = CONTEXT[state.view]();
    body.innerHTML = VIEW[state.view]();
    affEl.innerHTML = AFF[state.view]();
    if (full) flash();
  }

  /* ---------------- actions ---------------- */
  function setView(v) { state.view = v; render(true); }
  function openRecipe() { state.step = 0; state.view = 'recipe'; render(true); }

  function encoderTurn(dir) {
    if (state.view === 'today') state.menu = (state.menu + dir + MENU.length) % MENU.length;
    else if (state.view === 'pantry') state.pHl = (state.pHl + dir + pantryRows.length) % pantryRows.length;
    else if (state.view === 'shopping') state.sHl = (state.sHl + dir + shopRows.length) % shopRows.length;
    else return;
    render(false); // selection move = partial refresh, no flash
  }

  function encoderPress() {
    if (state.view === 'today') MENU[state.menu].go();
    else if (state.view === 'recipe') { if (state.step === RECIPE.steps.length - 1) setView('today'); }
    else if (state.view === 'pantry') { const r = pantryRows[state.pHl]; r.st = NEXT_STATUS[r.st]; render(true); }
    else if (state.view === 'shopping') { shopRows[state.sHl].bought = !shopRows[state.sHl].bought; render(true); }
  }

  function tapAdvance() {
    if (state.view !== 'recipe') return;
    if (state.step < RECIPE.steps.length - 1) {
      state.step++;
      const region = document.getElementById('step-region');
      if (region) { region.innerHTML = stepRegion(); affEl.innerHTML = AFF.recipe(); } // partial refresh
      else render(false);
    }
  }

  function back() { if (state.view !== 'today') setView('today'); }
  function home() { state.menu = 0; setView('today'); }

  /* ---------------- input ---------------- */
  document.addEventListener('keydown', (e) => {
    switch (e.key) {
      case 'ArrowDown': encoderTurn(1); e.preventDefault(); break;
      case 'ArrowUp': encoderTurn(-1); e.preventDefault(); break;
      case 'Enter': encoderPress(); e.preventDefault(); break;
      case ' ': tapAdvance(); e.preventDefault(); break;
      case 'Escape': case 'Backspace': back(); e.preventDefault(); break;
      case 'h': case 'e': home(); break;
      case 'f': state.flash = !state.flash; break;
      default: break;
    }
  });
  screen.addEventListener('wheel', (e) => { encoderTurn(e.deltaY > 0 ? 1 : -1); e.preventDefault(); }, { passive: false });

  $('#ctl-eye').addEventListener('click', home);
  $('#ctl-back').addEventListener('click', back);
  $('#ctl-turnl').addEventListener('click', () => encoderTurn(-1));
  $('#ctl-turnr').addEventListener('click', () => encoderTurn(1));
  $('#ctl-press').addEventListener('click', encoderPress);
  $('#ctl-tap').addEventListener('click', tapAdvance);

  render(true);
})();
