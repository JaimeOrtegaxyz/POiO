/* POiO companion — PHOTO friction probe (the lighter sketch).
   A third bet: the camera sees the pantry so you don't have to describe it.
   After cooking, point it at the shelf / the empty jars, and the LLM proposes
   the diff from the image. It also quietly tests the dispatcher's open question
   — does editing even belong ON the device? The "seeing" can live on a phone;
   the companion's job shrinks to confirming the diff. So all three probes land
   on the SAME confirm screen; only how the diff is proposed differs.
   Kept deliberately light: capture → read → propose → confirm. Fake capture. */
(() => {
  'use strict';

  /* ---------------- data ---------------- */
  const RECIPE = {
    name: 'Tinga de Pollo',
    vibe: 'smoky chipotle, piled on tostadas',
    serves: 2,
    steps: [
      { text: 'Slice ½ cebolla thin. Warm 1 tbsp aceite in the comal.', glyph: 'pan',
        items: [['cebolla', 'plenty'], ['aceite', 'plenty']], secs: 0 },
      { text: 'Cook the cebolla until soft and just golden.', glyph: 'pan', items: [], secs: 5 * 60 },
      { text: 'Stir in 2–3 chipotles en adobo, chopped, plus a spoon of the adobo.', glyph: 'pot',
        items: [['chipotle en adobo', 'plenty']], secs: 0 },
      { text: 'Add 2 cups shredded pollo and a splash of caldo. Simmer.', glyph: 'pot',
        items: [['pollo cocido', 'plenty'], ['caldo', 'plenty']], secs: 8 * 60 },
      { text: 'Season with sal. Warm the tostadas on a dry comal.', glyph: 'griddle',
        items: [['tostadas', 'low'], ['sal', 'plenty']], secs: 0 },
      { text: 'Top with tinga, crema, queso fresco. Eat right away.', glyph: 'bowl',
        items: [['crema', 'low'], ['queso fresco', 'plenty']], secs: 0 },
    ],
  };

  const STOCKED = 38;
  let pantryRows = [
    { nm: 'epazote', st: 'out' }, { nm: 'chile pasilla', st: 'out' }, { nm: 'bolillo', st: 'out' },
    { nm: 'tostadas', st: 'low' }, { nm: 'chipotle en adobo', st: 'plenty' },
    { nm: 'crema', st: 'low' }, { nm: 'limones', st: 'low' },
  ];
  let shopRows = [
    { nm: 'epazote', group: 'RESTOCK', bought: false },
    { nm: 'chile pasilla', group: 'RESTOCK', bought: false },
    { nm: 'bolillo', group: 'RESTOCK', bought: false },
    { nm: 'crema', group: 'TOP UP', bought: false },
    { nm: 'limones', group: 'TOP UP', bought: false },
  ];

  // What the vision model reads back from the photo of the shelf.
  const PHOTO_DIFF = [
    { nm: 'tostadas', to: 'out' },
    { nm: 'chipotle en adobo', to: 'low' },
    { nm: 'crema', to: 'out' },
  ];

  /* ---------------- glyphs ---------------- */
  const DITHER = '<defs><pattern id="d" width="4" height="4" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r=".85" fill="#1a1816"/></pattern></defs>';
  const S = 'fill="none" stroke="#1a1816" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"';
  const steam = (x) => `<path d="M${x} 15 q5 -5 0 -10 q-5 -5 0 -10" fill="none" stroke="#1a1816" stroke-width="2.4" stroke-linecap="round"/>`;
  const GLYPH = {
    pan: `<svg viewBox="0 0 118 78">${DITHER}${steam(40)}${steam(56)}<line x1="80" y1="50" x2="114" y2="50" ${S}/><ellipse cx="44" cy="50" rx="42" ry="18" ${S}/><ellipse cx="38" cy="50" rx="15" ry="8.5" fill="url(#d)" stroke="#1a1816" stroke-width="2.4"/><ellipse cx="58" cy="53" rx="9" ry="5.5" fill="url(#d)" stroke="#1a1816" stroke-width="2.4"/></svg>`,
    pot: `<svg viewBox="0 0 118 78">${DITHER}${steam(48)}${steam(66)}<path d="M20 34 h78 l-6 34 a6 6 0 0 1 -6 5 H32 a6 6 0 0 1 -6 -5 Z" ${S}/><line x1="14" y1="30" x2="104" y2="30" ${S}/><line x1="59" y1="24" x2="59" y2="30" ${S}/><path d="M30 52 h58" stroke="#1a1816" stroke-width="2.4" fill="none" stroke-dasharray="2 4"/></svg>`,
    griddle: `<svg viewBox="0 0 118 78">${DITHER}<ellipse cx="59" cy="52" rx="52" ry="16" ${S}/><ellipse cx="42" cy="50" rx="16" ry="6.5" fill="url(#d)" stroke="#1a1816" stroke-width="2.4"/><ellipse cx="74" cy="54" rx="16" ry="6.5" fill="url(#d)" stroke="#1a1816" stroke-width="2.4"/></svg>`,
    bowl: `<svg viewBox="0 0 118 78">${DITHER}<path d="M14 40 a45 45 0 0 0 90 0 Z" ${S}/><path d="M14 40 h90" ${S}/><path d="M30 40 a29 29 0 0 0 58 0" fill="url(#d)" stroke="none"/><path d="M52 26 q7 -9 14 0" fill="none" stroke="#1a1816" stroke-width="2.4" stroke-linecap="round"/></svg>`,
  };

  /* ---------------- state ---------------- */
  const state = {
    view: 'today', menu: 0, step: 0, pHl: 0, sHl: 0, fbHl: 1, dHl: 0,
    flash: true, diff: [], dish: RECIPE.name, vibe: RECIPE.vibe, serves: RECIPE.serves,
    timerId: null, timeLeft: 0, appliedN: 0, captured: false,
  };
  const MENU = [
    { label: 'Cook', go: openRecipe },
    { label: 'Pantry', go: () => setView('pantry') },
    { label: 'Shopping', go: () => setView('shopping') },
  ];
  const FB = [{ nm: 'cook it again' }, { nm: 'good, not memorable' }, { nm: 'not again' }];

  /* ---------------- dom + helpers ---------------- */
  const $ = (s) => document.querySelector(s);
  const screen = $('#screen'), body = $('#body'), ctxEl = $('#context'), affEl = $('#affordances');
  const WORD = { plenty: 'stocked', low: 'low', out: 'out' };
  const sw = (st) => `<span class="sw ${st}"></span>`;
  const esc = (s) => s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
  const clock = () => `<svg viewBox="0 0 24 24" fill="none" stroke="#1a1816" stroke-width="2.2"><circle cx="12" cy="13" r="8"/><path d="M12 13V8M12 5V3M9 3h6" stroke-linecap="round"/></svg>`;
  const drum = `<svg class="drum" viewBox="0 0 24 24" fill="#1a1816"><path d="M14.5 3.5a5 5 0 0 1 6 6c-1.3 3.2-4.7 3.4-6.2 4.9-1.5 1.5-1.3 3-2.8 4.5a3.5 3.5 0 1 1-5.6-1.4 3.5 3.5 0 0 1 1.4-.6c1.5-1.5 1.3-3 2.8-4.5S11.3 4.8 14.5 3.5Z"/></svg>`;
  const mmss = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  function flash() { if (!state.flash) return; screen.classList.add('flash'); setTimeout(() => screen.classList.remove('flash'), 90); }
  function clearTimer() { if (state.timerId) { clearInterval(state.timerId); state.timerId = null; } }

  /* ---------------- views ---------------- */
  const CONTEXT = {
    today: () => 'Tonight', recipe: () => `${state.dish} · ${state.step + 1}/${RECIPE.steps.length}`,
    cookdone: () => 'Just cooked', pcap: () => 'Scan the shelf', pthink: () => 'Reading',
    review: () => 'Pantry · from photo', saved: () => 'Pantry', pantry: () => 'Pantry', shopping: () => 'Shopping',
  };

  const VIEW = {
    today() {
      const menu = MENU.map((m, i) => `<span class="menu-item${i === state.menu ? ' sel' : ''}">${m.label}</span>`).join('');
      return `
        <div class="kicker">Tonight</div>
        <div class="dish">${esc(state.dish)}</div>
        <div class="vibe">${esc(state.vibe)}</div>
        <div class="tnight-status">${sw('plenty')} pantry ready · 25 min</div>
        <div class="serves">serves <span class="val">${state.serves}</span> · turn to change</div>
        <div class="menu">${menu}</div>
        <div class="talk-hint"><span class="pip"></span>press <b>◉ scan</b> to photo the shelf</div>`;
    },
    recipe() { return `<div id="cook">${cookInner()}</div>`; },
    cookdone() {
      const opts = FB.map((f, i) => `<div class="fb-opt${i === state.fbHl ? ' sel' : ''}">${sw(i === 0 ? 'plenty' : i === 1 ? 'low' : 'out')}<span class="nm">${esc(f.nm)}</span></div>`).join('');
      return `
        <div class="done-h">How was the tinga?</div>
        <div class="done-sub">steers what I suggest next</div>
        <div class="fb-opts">${opts}</div>
        <div class="talk-hint" style="margin-top:12px"><span class="pip"></span><b>press</b> — then photo what you used up</div>`;
    },
    pcap() {
      return `
        <div class="pcap">
          <div class="viewf${state.captured ? ' captured' : ''}">
            <span class="vf c-tl"></span><span class="vf c-tr"></span><span class="vf c-bl"></span><span class="vf c-br"></span>
            <span class="cap-label">${state.captured ? 'captured' : 'the shelf · hold steady'}</span>
          </div>
        </div>`;
    },
    pthink() {
      return `
        <div class="vthink">
          <div class="think-h">reading the photo</div>
          <div class="pthumb"><span class="cap-label">shelf.jpg</span></div>
          <div class="think-ph"></div>
          <div class="think-lat">vision · server · ~3s</div>
        </div>`;
    },
    review() {
      const rows = state.diff.map((d, i) => `
        <div class="drow${d.drop ? ' drop' : ''}${i === state.dHl ? ' row-hl' : ''}">
          <span class="caret">${i === state.dHl ? '▸' : ''}</span>
          ${sw(d.to)}<span class="nm">${esc(d.nm)}</span><span class="arrow">→</span><span class="to">${WORD[d.to]}</span>
        </div>`).join('');
      const keep = state.diff.filter((d) => !d.drop).length;
      const applyHl = state.dHl === state.diff.length ? ' row-hl' : '';
      return `
        <div class="diff-h">Read from your photo</div>
        <div class="diff-src">shelf.jpg · check it got them right</div>
        <div class="diff-list">${rows}
          <div class="drow${applyHl}" style="margin-top:4px;border-top:1px solid var(--ink);padding-top:6px">
            <span class="caret">${state.dHl === state.diff.length ? '▸' : ''}</span>
            <span class="nm" style="font-weight:700">✓ apply ${keep} change${keep === 1 ? '' : 's'}</span>
          </div>
        </div>`;
    },
    saved() {
      return `<div class="applied"><div class="chk">✓</div><div class="big">Pantry updated</div>
        <div class="sub">${state.appliedN} change${state.appliedN === 1 ? '' : 's'} · from one photo · shopping caught up</div></div>`;
    },
    pantry() {
      const rows = pantryRows.map((r, i) => `
        <div class="prow${i === state.pHl ? ' row-hl' : ''}">
          <span class="caret">${i === state.pHl ? '▸' : ''}</span>
          ${sw(r.st)}<span class="nm">${esc(r.nm)}</span><span class="st">${WORD[r.st]}</span>
        </div>`).join('');
      const out = pantryRows.filter((r) => r.st === 'out').length, low = pantryRows.filter((r) => r.st === 'low').length;
      return `
        <div class="summary"><span>${sw('plenty')} ${STOCKED} stocked</span><span>${sw('low')} ${low} low</span><span>${sw('out')} ${out} out</span></div>
        <div class="plist">${rows}</div>
        <div class="talk-hint" style="margin-top:10px"><span class="pip"></span>press <b>◉ scan</b> to update from a photo</div>`;
    },
    shopping() {
      let html = '', last = null;
      shopRows.forEach((r, i) => {
        if (r.group !== last) { if (last !== null) html += '</div>'; html += `<div class="shop-group"><div class="shop-label">${r.group}</div>`; last = r.group; }
        html += `<div class="srow${r.bought ? ' bought' : ''}${i === state.sHl ? ' row-hl' : ''}"><span class="caret">${i === state.sHl ? '▸' : ''}</span><span class="box">${r.bought ? '▣' : '▢'}</span><span class="nm">${esc(r.nm)}</span></div>`;
      });
      if (last !== null) html += '</div>';
      return html;
    },
  };

  function cookInner() {
    const n = RECIPE.steps.length, s = RECIPE.steps[state.step];
    const items = s.items.length ? `<div class="step-items">${s.items.map(([nm, st]) => `<span class="item">${sw(st)}<span class="nm">${esc(nm)}</span></span>`).join('')}</div>` : '';
    const tmr = s.secs ? `<span class="tmr">${clock()} ${mmss(state.timeLeft)}</span>` : `<span class="tmr none">no timer</span>`;
    const last = state.step === n - 1;
    return `
      <div class="cook">
        <div class="step-kick"><span class="n">${esc(state.dish)}</span><span class="n">step ${state.step + 1} / ${n}</span></div>
        <div class="step-text">${esc(s.text)}</div>
        <div class="glyph">${GLYPH[s.glyph] || ''}</div>
        ${items}
        <div class="cook-foot">${tmr}<span class="tap-next">${last ? 'tap ▸ finish' : 'tap ▸ next'}</span></div>
      </div>`;
  }

  const AFF = {
    today: () => ['<b>turn</b> ▸ choose', '<b>press</b> ● open · <b>◉</b> scan'],
    recipe: () => { const last = state.step === RECIPE.steps.length - 1; return [`<b>tap</b> ▸ ${last ? 'finish' : 'next'}`, '<b>◂</b> back']; },
    cookdone: () => ['<b>turn</b> ▸ pick', '<b>press</b> ● save · <b>◉</b> scan'],
    pcap: () => ['<b>◉</b> capturing…', ''],
    pthink: () => ['<span style="opacity:.6">reading…</span>', ''],
    review: () => ['<b>turn</b> ▸ move · <b>press</b> ● drop/apply', '<b>◂</b> discard'],
    saved: () => ['', '<b>press</b> ● done'],
    pantry: () => ['<b>turn</b> ▸ move', '<b>press</b> ● cycle · <b>◉</b> scan'],
    shopping: () => ['<b>turn</b> ▸ move', '<b>press</b> ● mark · <b>◂</b> back'],
  };

  function render(full = true) {
    ctxEl.textContent = CONTEXT[state.view]();
    body.innerHTML = VIEW[state.view]();
    const [l, r] = AFF[state.view]();
    affEl.innerHTML = `<span class="aff-l">${l || ''}</span><span class="aff-r">${r || ''}</span>`;
    $('#meta').innerHTML = state.view === 'recipe' ? drum : '18:42 · upd 6m';
    if (full) flash();
  }

  /* ---------------- timer ---------------- */
  function startStepTimer() {
    clearTimer();
    const s = RECIPE.steps[state.step];
    if (!s.secs) return;
    state.timeLeft = s.secs;
    state.timerId = setInterval(() => {
      if (state.view !== 'recipe') { clearTimer(); return; }
      state.timeLeft = Math.max(0, state.timeLeft - 1);
      const el = document.querySelector('#cook .tmr');
      if (el) el.innerHTML = `${clock()} ${mmss(state.timeLeft)}`;
      if (state.timeLeft === 0) clearTimer();
    }, 1000);
  }

  /* ---------------- actions ---------------- */
  function setView(v) { clearTimer(); state.view = v; render(true); }
  function openRecipe() { clearTimer(); state.step = 0; state.view = 'recipe'; render(true); startStepTimer(); }

  function encoderTurn(dir) {
    switch (state.view) {
      case 'today': state.menu = (state.menu + dir + MENU.length) % MENU.length; break;
      case 'pantry': state.pHl = (state.pHl + dir + pantryRows.length) % pantryRows.length; break;
      case 'shopping': state.sHl = (state.sHl + dir + shopRows.length) % shopRows.length; break;
      case 'cookdone': state.fbHl = (state.fbHl + dir + FB.length) % FB.length; break;
      case 'review': state.dHl = (state.dHl + dir + (state.diff.length + 1)) % (state.diff.length + 1); break;
      default: return;
    }
    render(false);
  }

  function encoderPress() {
    switch (state.view) {
      case 'today': MENU[state.menu].go(); break;
      case 'cookdone': startScan(); break;
      case 'pantry': { const r = pantryRows[state.pHl]; r.st = { plenty: 'low', low: 'out', out: 'plenty' }[r.st]; render(true); break; }
      case 'shopping': shopRows[state.sHl].bought = !shopRows[state.sHl].bought; render(true); break;
      case 'review':
        if (state.dHl === state.diff.length) applyDiff();
        else { state.diff[state.dHl].drop = !state.diff[state.dHl].drop; render(false); }
        break;
      case 'saved': setView('pantry'); break;
      default: break;
    }
  }

  function tapAdvance() {
    if (state.view !== 'recipe') return;
    if (state.step < RECIPE.steps.length - 1) {
      state.step++;
      const region = document.getElementById('cook');
      if (region) { region.innerHTML = cookInner(); ctxEl.textContent = CONTEXT.recipe(); render(false); }
      startStepTimer();
    } else { state.fbHl = 1; setView('cookdone'); }
  }

  /* ---------------- photo flow: capture → read → propose → confirm ---------- */
  function startScan() {
    if (['pcap', 'pthink'].includes(state.view)) return;
    clearTimer();
    state.captured = false; state.view = 'pcap'; render(true);
    setTimeout(() => {                    // shutter: freeze the frame (partial refresh)
      state.captured = true; body.innerHTML = VIEW.pcap();
      setTimeout(() => { state.view = 'pthink'; render(true); readPhoto(); }, 700);
    }, 900);
  }
  function readPhoto() {
    setTimeout(() => { state.diff = PHOTO_DIFF.map((d) => ({ ...d, drop: false })); state.dHl = 0; setView('review'); }, 2200);
  }

  function applyDiff() {
    const keep = state.diff.filter((d) => !d.drop);
    keep.forEach((d) => { const r = pantryRows.find((p) => p.nm === d.nm); if (r) r.st = d.to; else pantryRows.push({ nm: d.nm, st: d.to }); });
    keep.forEach((d) => { if ((d.to === 'out' || d.to === 'low') && !shopRows.some((s) => s.nm === d.nm)) shopRows.push({ nm: d.nm, group: d.to === 'out' ? 'RESTOCK' : 'TOP UP', bought: false }); });
    shopRows.sort((a, b) => (a.group < b.group ? 1 : -1));
    state.appliedN = keep.length; setView('saved');
  }

  function scan() { if (!['pcap', 'pthink', 'recipe'].includes(state.view)) startScan(); }
  function back() { if (['pcap', 'pthink'].includes(state.view)) return; if (state.view === 'review') { setView('pantry'); return; } if (state.view !== 'today') home(); }
  function home() { clearTimer(); state.menu = 0; state.view = 'today'; render(true); }

  /* ---------------- input ---------------- */
  document.addEventListener('keydown', (e) => {
    switch (e.key) {
      case 'ArrowDown': encoderTurn(1); e.preventDefault(); break;
      case 'ArrowUp': encoderTurn(-1); e.preventDefault(); break;
      case 'Enter': encoderPress(); e.preventDefault(); break;
      case ' ': tapAdvance(); e.preventDefault(); break;
      case 'Escape': case 'Backspace': back(); e.preventDefault(); break;
      case 's': case 'S': scan(); e.preventDefault(); break;
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
  $('#ctl-scan').addEventListener('click', scan);

  render(true);
})();
