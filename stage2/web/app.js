/* POiO companion — LIVE. The winning encoder probe, wired to the Stage-2 server.
   Real recipes, real pantry, and a post-cook "used tonight?" checklist that
   writes the pantry back over HTTP. Same origin as the API, so fetch is relative.
   Same e-paper physics as the probe: full-refresh flash on view change, partial
   on stepping, 1-bit, dither/hatch for status. A fetch shows a static "…" — the
   real device would feel the same wait. Wheel / arrows + enter = the encoder. */
(() => {
  'use strict';

  /* ---------------- api ---------------- */
  const API = '';
  async function getJSON(p) {
    const r = await fetch(API + p);
    if (!r.ok) throw new Error(`GET ${p} → ${r.status}`);
    return r.json();
  }
  async function postJSON(p, body) {
    const r = await fetch(API + p, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (!r.ok) throw new Error(`POST ${p} → ${r.status}`);
    return r.json();
  }

  /* ---------------- dithered glyphs (shared with the probes) ---------------- */
  const DITHER = '<defs><pattern id="d" width="4" height="4" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r=".85" fill="#1a1816"/></pattern></defs>';
  const S = 'fill="none" stroke="#1a1816" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"';
  const steam = (x) => `<path d="M${x} 15 q5 -5 0 -10 q-5 -5 0 -10" fill="none" stroke="#1a1816" stroke-width="2.4" stroke-linecap="round"/>`;
  const GLYPH = {
    pan: `<svg viewBox="0 0 118 78">${DITHER}${steam(40)}${steam(56)}<line x1="80" y1="50" x2="114" y2="50" ${S}/><ellipse cx="44" cy="50" rx="42" ry="18" ${S}/><ellipse cx="38" cy="50" rx="15" ry="8.5" fill="url(#d)" stroke="#1a1816" stroke-width="2.4"/><ellipse cx="58" cy="53" rx="9" ry="5.5" fill="url(#d)" stroke="#1a1816" stroke-width="2.4"/></svg>`,
    pot: `<svg viewBox="0 0 118 78">${DITHER}${steam(48)}${steam(66)}<path d="M20 34 h78 l-6 34 a6 6 0 0 1 -6 5 H32 a6 6 0 0 1 -6 -5 Z" ${S}/><line x1="14" y1="30" x2="104" y2="30" ${S}/><line x1="59" y1="24" x2="59" y2="30" ${S}/><path d="M30 52 h58" stroke="#1a1816" stroke-width="2.4" fill="none" stroke-dasharray="2 4"/></svg>`,
    griddle: `<svg viewBox="0 0 118 78">${DITHER}<ellipse cx="59" cy="52" rx="52" ry="16" ${S}/><ellipse cx="42" cy="50" rx="16" ry="6.5" fill="url(#d)" stroke="#1a1816" stroke-width="2.4"/><ellipse cx="74" cy="54" rx="16" ry="6.5" fill="url(#d)" stroke="#1a1816" stroke-width="2.4"/></svg>`,
    bowl: `<svg viewBox="0 0 118 78">${DITHER}<path d="M14 40 a45 45 0 0 0 90 0 Z" ${S}/><path d="M14 40 h90" ${S}/><path d="M30 40 a29 29 0 0 0 58 0" fill="url(#d)" stroke="none"/><path d="M52 26 q7 -9 14 0" fill="none" stroke="#1a1816" stroke-width="2.4" stroke-linecap="round"/></svg>`,
    oven: `<svg viewBox="0 0 118 78">${DITHER}<rect x="26" y="10" width="66" height="60" rx="4" ${S}/><line x1="26" y1="26" x2="92" y2="26" ${S}/><circle cx="34" cy="18" r="2.4" fill="#1a1816"/><circle cx="45" cy="18" r="2.4" fill="#1a1816"/><rect x="36" y="34" width="46" height="28" fill="url(#d)" stroke="#1a1816" stroke-width="2.4"/></svg>`,
    knife: `<svg viewBox="0 0 118 78">${DITHER}<path d="M18 54 h70" ${S}/><path d="M20 40 q34 -6 58 12 l-58 2 Z" fill="url(#d)" stroke="#1a1816" stroke-width="2.4"/><line x1="88" y1="52" x2="104" y2="52" ${S}/></svg>`,
    none: '',
  };

  /* ---------------- state ---------------- */
  const state = {
    view: 'boot', menu: 0, step: 0, dHl: 0, fbHl: 1, pHl: 0, sHl: 0, recHl: 0, setupHl: 0, listHl: 0, knobAngle: 0,
    flash: true, dish: '', recipe: null, ingByKey: {}, diff: [], appliedN: 0,
    today: null, pantry: { counts: { plenty: 0, low: 0, out: 0 }, items: [] },
    recipes: [], shop: [], list: [], timerId: null, timeLeft: 0, errMsg: '',
  };
  const MENU = [
    { label: 'Cook', go: () => cookToday() },
    { label: 'Recipes', go: () => openRecipes() },
    { label: 'Pantry', go: () => openPantry() },
    { label: 'Shopping', go: () => openShopping() },
  ];
  const FB = [{ nm: 'cook it again' }, { nm: 'good, not memorable' }, { nm: 'not again' }];
  const NEXT = { plenty: 'low', low: 'out', out: 'plenty' };
  const SETUP = [
    { label: 'Try a demo pantry', go: () => doBootstrap('demo') },
    { label: 'Set up my kitchen', go: () => { state.view = 'setupinfo'; render(true); } },
  ];

  /* ---------------- dom + helpers ---------------- */
  const $ = (s) => document.querySelector(s);
  const screen = $('#screen'), body = $('#body'), ctxEl = $('#context'), affEl = $('#affordances'), metaEl = $('#meta');
  const WORD = { plenty: 'stocked', low: 'low', out: 'out' };
  const sw = (st) => `<span class="sw ${st}"></span>`;
  const esc = (s) => (s || '').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
  const clock = () => `<svg viewBox="0 0 24 24" fill="none" stroke="#1a1816" stroke-width="2.2"><circle cx="12" cy="13" r="8"/><path d="M12 13V8M12 5V3M9 3h6" stroke-linecap="round"/></svg>`;
  const drum = `<svg class="drum" viewBox="0 0 24 24" fill="#1a1816"><path d="M14.5 3.5a5 5 0 0 1 6 6c-1.3 3.2-4.7 3.4-6.2 4.9-1.5 1.5-1.3 3-2.8 4.5a3.5 3.5 0 1 1-5.6-1.4 3.5 3.5 0 0 1 1.4-.6c1.5-1.5 1.3-3 2.8-4.5S11.3 4.8 14.5 3.5Z"/></svg>`;
  const mmss = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  function flash() { if (!state.flash) return; screen.classList.add('flash'); setTimeout(() => screen.classList.remove('flash'), 90); }
  function clearTimer() { if (state.timerId) { clearInterval(state.timerId); state.timerId = null; } }

  /* ---------- physical control widget — reflects EVERY input source ----------
     The knob/tap/back/eye react whether you drag them, click them, or drive the
     app with the keyboard or scroll wheel, so the physical mapping is obvious.
     This is device chrome (not the e-paper screen), so motion here is fine. */
  function pulse(sel, cls) {
    const el = document.querySelector(sel);
    if (!el) return;
    el.classList.remove(cls);   // restart if mid-pulse
    void el.offsetWidth;
    el.classList.add(cls);
    setTimeout(() => el.classList.remove(cls), 150);
  }
  function reflect(kind, dir) {
    if (kind === 'turn') {
      state.knobAngle += dir > 0 ? 30 : -30;   // one detent per step
      const d = document.querySelector('.knob-dial');
      if (d) d.style.transform = `rotate(${state.knobAngle}deg)`;
      pulse('.knob', 'bump');
    } else if (kind === 'press') pulse('.knob', 'press');
    else if (kind === 'tap') pulse('#ctl-tap', 'tapped');
    else if (kind === 'back') pulse('#ctl-back', 'flash');
    else if (kind === 'home') pulse('#ctl-eye', 'flash');
  }
  function bindKnob() {
    const knob = document.getElementById('ctl-knob');
    if (!knob) return;
    let dragging = false, lastY = 0, moved = 0, accum = 0;
    const STEP = 15; // px of vertical drag per detent
    knob.addEventListener('pointerdown', (e) => {
      dragging = true; lastY = e.clientY; moved = 0; accum = 0;
      try { knob.setPointerCapture(e.pointerId); } catch (_) {}
      e.preventDefault();
    });
    knob.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      const dy = e.clientY - lastY; lastY = e.clientY;
      moved += Math.abs(dy); accum += dy;
      while (Math.abs(accum) >= STEP) { const d = accum > 0 ? 1 : -1; accum -= d * STEP; encoderTurn(d); }
    });
    const end = (e) => {
      if (!dragging) return;
      dragging = false;
      try { knob.releasePointerCapture(e.pointerId); } catch (_) {}
      if (moved < 5) encoderPress();   // a click with no real drag = a press
    };
    knob.addEventListener('pointerup', end);
    knob.addEventListener('pointercancel', end);
    knob.addEventListener('wheel', (e) => { encoderTurn(e.deltaY > 0 ? 1 : -1); e.preventDefault(); }, { passive: false });
  }

  /* ---------------- views ---------------- */
  const CONTEXT = {
    boot: () => 'POiO', setup: () => 'Welcome', setupinfo: () => 'Setup',
    list: () => 'Kitchen', today: () => 'Tonight', recipes: () => 'Recipes',
    recipe: () => `${state.dish} · ${state.step + 1}/${(state.recipe ? state.recipe.steps.length : 0)}`,
    cookdone: () => 'Just cooked', review: () => 'Used tonight?', saved: () => 'Pantry',
    pantry: () => 'Pantry', shopping: () => 'Shopping', loading: () => state._loadCtx || 'One sec', error: () => 'Offline',
  };

  const VIEW = {
    boot() { return `<div class="center"><div class="dots">···</div><div class="sub">waking up</div></div>`; },
    setup() {
      const opts = SETUP.map((o, i) => `<div class="fb-opt${i === state.setupHl ? ' sel' : ''}"><span class="nm">${o.label}</span></div>`).join('');
      return `
        <div class="done-h">First run</div>
        <div class="done-sub">no pantry here yet — let's stock one</div>
        <div class="fb-opts">${opts}</div>`;
    },
    setupinfo() {
      return `
        <div class="diff-h">Set up your kitchen</div>
        <div class="setup-copy">Tell <b>poio</b> (the skill) what you have — "set up my pantry" — and it fills the pantry as a conversation. Then run <code>python3 stage2/bootstrap_pantry.py</code> and reload here.</div>
        <div class="setup-copy" style="opacity:.75">Files are a one-time seed; after that the conversation and this device keep it current. No hand-editing.</div>`;
    },
    list() {
      let html = '', navStarted = false;
      state.list.forEach((it, i) => {
        const hl = i === state.listHl ? ' row-hl' : '';
        const car = `<span class="caret">${i === state.listHl ? '▸' : ''}</span>`;
        if (it.type === 'nav' && !navStarted) { html += `<hr class="list-div">`; navStarted = true; }
        if (it.type === 'recipe') {
          html += `<div class="rrow${it.tonight ? ' tonight' : ''}${it.feasible ? '' : ' blocked'}${hl}">
            ${car}${sw(it.feasible ? 'plenty' : 'out')}<span class="nm">${esc(it.name)}</span>
            <span class="mt">${it.totalMin}m${it.feasible ? '' : ' · missing'}</span></div>`;
        } else {
          html += `<div class="rrow nav${hl}">${car}<span class="nm">${esc(it.label)} ›</span></div>`;
        }
      });
      return `<div class="list-kick">What are we cooking?</div><div class="rlist">${html}</div>`;
    },
    loading() { return `<div class="center"><div class="dots">···</div><div class="sub">${esc(state._loadMsg || '')}</div></div>`; },
    error() {
      return `<div class="center"><div class="big">Can't reach the brain</div>
        <div class="sub">${esc(state.errMsg)}<br>is <code>stage2/server.py</code> running?</div>
        <div class="sub" style="margin-top:4px"><b>press ●</b> to retry</div></div>`;
    },
    today() {
      const t = state.today;
      if (!t) return VIEW.error();
      const menu = MENU.map((m, i) => `<span class="menu-item${i === state.menu ? ' sel' : ''}">${m.label}</span>`).join('');
      const c = state.pantry.counts;
      const status = t.feasible
        ? `${sw('plenty')} pantry ready · ${t.time.totalMin} min`
        : `${sw('out')} missing ${esc((t.missing || []).length + ' item' + (t.missing.length === 1 ? '' : 's'))} · ${t.time.totalMin} min`;
      return `
        <div class="kicker">Tonight</div>
        <div class="dish">${esc(t.name)}</div>
        <div class="vibe">${esc(t.vibe)}</div>
        <div class="tnight-status">${status}</div>
        <div class="menu">${menu}</div>
        <div class="talk-hint"><span class="pip"></span>pantry · ${c.low} low · ${c.out} out — turn to choose</div>`;
    },
    recipes() {
      const rows = state.recipes.map((r, i) => `
        <div class="rrow${r.feasible ? '' : ' blocked'}${i === state.recHl ? ' row-hl' : ''}">
          <span class="caret">${i === state.recHl ? '▸' : ''}</span>
          ${sw(r.feasible ? 'plenty' : 'out')}
          <span class="nm">${esc(r.name)}</span>
          <span class="mt">${r.time.totalMin}m${r.feasible ? '' : ' · missing'}</span>
        </div>`).join('');
      return `<div class="rlist">${rows}</div>`;
    },
    recipe() { return `<div id="cook">${cookInner()}</div>`; },
    cookdone() {
      const opts = FB.map((f, i) => `<div class="fb-opt${i === state.fbHl ? ' sel' : ''}">${sw(i === 0 ? 'plenty' : i === 1 ? 'low' : 'out')}<span class="nm">${esc(f.nm)}</span></div>`).join('');
      return `
        <div class="done-h">How was it?</div>
        <div class="done-sub">steers what I suggest next</div>
        <div class="fb-opts">${opts}</div>
        <div class="talk-hint" style="margin-top:12px"><span class="pip"></span><b>press</b> — then confirm what you used</div>`;
    },
    review() {
      if (!state.diff.length) {
        return `<div class="diff-h">Used tonight?</div>
          <div class="diff-empty">nothing to mark down — your pantry's still flush.</div>
          <div class="talk-hint" style="margin-top:14px"><span class="pip"></span><b>press</b> ● done</div>`;
      }
      const rows = state.diff.map((d, i) => `
        <div class="drow${d.drop ? ' drop' : ''}${i === state.dHl ? ' row-hl' : ''}">
          <span class="caret">${i === state.dHl ? '▸' : ''}</span>
          <span class="tick">${d.drop ? '▢' : '▣'}</span>
          ${sw(d.to)}<span class="nm">${esc(d.display || d.label)}</span>
          <span class="arrow">→</span><span class="to">${WORD[d.to]}</span>
        </div>`).join('');
      const keep = state.diff.filter((d) => !d.drop).length;
      const applyHl = state.dHl === state.diff.length ? ' row-hl' : '';
      return `
        <div class="diff-h">Used tonight?</div>
        <div class="diff-src">predicted from the recipe · already ticked</div>
        <div class="diff-list">${rows}
          <div class="drow${applyHl}" style="margin-top:4px;border-top:1px solid var(--ink);padding-top:6px">
            <span class="caret">${state.dHl === state.diff.length ? '▸' : ''}</span>
            <span class="nm" style="font-weight:700">✓ confirm ${keep} change${keep === 1 ? '' : 's'}</span>
          </div>
        </div>`;
    },
    saved() {
      return `<div class="applied"><div class="chk">✓</div><div class="big">Pantry updated</div>
        <div class="sub">${state.appliedN} change${state.appliedN === 1 ? '' : 's'} written · shopping caught up</div></div>`;
    },
    pantry() {
      const its = state.pantry.items;
      const c = state.pantry.counts;
      const rows = its.length ? its.map((r, i) => `
        <div class="prow${i === state.pHl ? ' row-hl' : ''}">
          <span class="caret">${i === state.pHl ? '▸' : ''}</span>
          ${sw(r.status)}<span class="nm">${esc(r.label)}</span><span class="st">${WORD[r.status]}</span>
        </div>`).join('') : `<div class="diff-empty">nothing low or out — nice.</div>`;
      return `
        <div class="summary"><span>${sw('plenty')} ${c.plenty} stocked</span><span>${sw('low')} ${c.low} low</span><span>${sw('out')} ${c.out} out</span></div>
        <div class="plist">${rows}</div>
        <div class="talk-hint" style="margin-top:10px"><span class="pip"></span><b>press</b> ● cycle status — writes to the server</div>`;
    },
    shopping() {
      if (!state.shop.length) return `<div class="diff-empty">shopping list's empty — pantry's flush.</div>`;
      let html = '', last = null;
      state.shop.forEach((r, i) => {
        if (r.group !== last) { if (last !== null) html += '</div>'; html += `<div class="shop-group"><div class="shop-label">${r.group}</div>`; last = r.group; }
        html += `<div class="srow${r.bought ? ' bought' : ''}${i === state.sHl ? ' row-hl' : ''}"><span class="caret">${i === state.sHl ? '▸' : ''}</span><span class="box">${r.bought ? '▣' : '▢'}</span><span class="nm">${esc(r.label)}</span></div>`;
      });
      if (last !== null) html += '</div>';
      return html;
    },
  };

  function cookInner() {
    const r = state.recipe, n = r.steps.length, s = r.steps[state.step];
    const uses = (s.uses || []).map((k) => state.ingByKey[k]).filter(Boolean);
    const items = uses.length
      ? `<div class="step-items">${uses.map((ig) => `<span class="item">${sw(ig.status)}<span class="nm">${esc(ig.display || ig.label)}</span></span>`).join('')}</div>`
      : '';
    const tmr = s.timerSec ? `<span class="tmr">${clock()} ${mmss(state.timeLeft)}</span>` : `<span class="tmr none">no timer</span>`;
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
    boot: () => ['', ''],
    setup: () => ['<b>turn</b> ▸ choose', '<b>press</b> ● go'],
    setupinfo: () => ['', '<b>◂</b> back'],
    list: () => ['<b>turn</b> ▸ choose', '<b>press</b> ● open'],
    today: () => ['<b>turn</b> ▸ choose', '<b>press</b> ● open'],
    recipes: () => ['<b>turn</b> ▸ move', '<b>press</b> ● cook · <b>◂</b> back'],
    recipe: () => { const last = state.step === state.recipe.steps.length - 1; return [`<b>tap</b> ▸ ${last ? 'finish' : 'next'}`, '<b>◂</b> back']; },
    cookdone: () => ['<b>turn</b> ▸ pick', '<b>press</b> ● save'],
    review: () => ['<b>turn</b> ▸ move · <b>press</b> ● un-tick/confirm', '<b>◂</b> skip'],
    saved: () => ['', '<b>press</b> ● done'],
    pantry: () => ['<b>turn</b> ▸ move', '<b>press</b> ● cycle · <b>◂</b> back'],
    shopping: () => ['<b>turn</b> ▸ move', '<b>press</b> ● mark · <b>◂</b> back'],
    loading: () => ['', ''],
    error: () => ['', '<b>press</b> ● retry'],
  };

  function render(full = true) {
    ctxEl.textContent = CONTEXT[state.view]();
    body.innerHTML = VIEW[state.view]();
    const [l, r] = (AFF[state.view] || AFF.today)();
    affEl.innerHTML = `<span class="aff-l">${l || ''}</span><span class="aff-r">${r || ''}</span>`;
    metaEl.innerHTML = state.view === 'recipe' ? drum : 'live';
    if (full) flash();
  }

  function showLoading(ctx, msg) {
    state._loadCtx = ctx; state._loadMsg = msg; state.view = 'loading'; render(true);
  }
  function showError(e) {
    state.errMsg = (e && e.message) || String(e); state.view = 'error'; render(true);
  }

  /* ---------------- cooking timer ---------------- */
  function startStepTimer() {
    clearTimer();
    const s = state.recipe.steps[state.step];
    if (!s.timerSec) return;
    state.timeLeft = s.timerSec;
    state.timerId = setInterval(() => {
      if (state.view !== 'recipe') { clearTimer(); return; }
      state.timeLeft = Math.max(0, state.timeLeft - 1);
      const el = document.querySelector('#cook .tmr');
      if (el) el.innerHTML = `${clock()} ${mmss(state.timeLeft)}`;
      if (state.timeLeft === 0) clearTimer();
    }, 1000);
  }

  /* ---------------- data loads ---------------- */
  async function boot() { state.view = 'boot'; render(true); await loadHome(); }

  // Home is the recipe LIST (tonight starred), not a single pick. Pantry / Shopping
  // ride at the bottom as nav rows. Re-fetches so feasibility reflects the pantry.
  async function loadHome() {
    try {
      const [today, recs, pantry] = await Promise.all([
        getJSON('/api/today'), getJSON('/api/recipes'), getJSON('/api/pantry?filter=attention')]);
      if (today.provisioned === false) { state.setupHl = 0; state.view = 'setup'; render(true); return; }
      state.today = today.tonight;
      state.pantry = { counts: pantry.counts, items: pantry.items };
      const tid = today.tonight ? today.tonight.id : null;
      const rows = recs.recipes.map((r) => ({
        type: 'recipe', id: r.id, name: r.name, totalMin: r.time.totalMin,
        feasible: r.feasible, tonight: r.id === tid,
      }));
      rows.sort((a, b) => (b.tonight ? 1 : 0) - (a.tonight ? 1 : 0)); // tonight first
      state.list = [...rows,
        { type: 'nav', key: 'pantry', label: 'Pantry' },
        { type: 'nav', key: 'shopping', label: 'Shopping' }];
      state.listHl = 0; state.view = 'list'; render(true);
    } catch (e) { showError(e); }
  }

  async function doBootstrap(mode) {
    showLoading('Setting up', mode === 'demo' ? 'stocking a demo pantry' : 'setting up');
    try { await postJSON('/api/pantry/bootstrap', { mode }); await boot(); }
    catch (e) { showError(e); }
  }

  async function refreshPantry() {
    const p = await getJSON('/api/pantry?filter=attention');
    state.pantry = { counts: p.counts, items: p.items };
  }

  async function openRecipe(id) {
    clearTimer();
    showLoading(id, 'loading recipe');
    try {
      const r = await getJSON('/api/recipes/' + id);
      state.recipe = r; state.dish = r.name; state.ingByKey = {};
      r.ingredients.forEach((ig) => { state.ingByKey[ig.item] = ig; });
      state.step = 0; state.view = 'recipe'; render(true); startStepTimer();
    } catch (e) { showError(e); }
  }

  function cookToday() { if (state.today) openRecipe(state.today.id); }

  async function openRecipes() {
    showLoading('Recipes', 'reading the shelf');
    try {
      const d = await getJSON('/api/recipes');
      state.recipes = d.recipes; state.recHl = 0; state.view = 'recipes'; render(true);
    } catch (e) { showError(e); }
  }

  async function openPantry() {
    showLoading('Pantry', 'reading pantry');
    try { await refreshPantry(); state.pHl = 0; state.view = 'pantry'; render(true); }
    catch (e) { showError(e); }
  }

  function openShopping() {
    // derived from the attention pantry: out -> restock, low -> top up
    const out = state.pantry.items.filter((i) => i.status === 'out').map((i) => ({ key: i.key, label: i.label, group: 'RESTOCK', bought: false }));
    const low = state.pantry.items.filter((i) => i.status === 'low').map((i) => ({ key: i.key, label: i.label, group: 'TOP UP', bought: false }));
    state.shop = [...out, ...low]; state.sHl = 0; state.view = 'shopping'; render(true);
  }

  async function openReview() {
    showLoading('Used tonight?', 'checking what you used');
    try {
      const d = await getJSON('/api/recipes/' + state.recipe.id + '/consumed');
      state.diff = d.changes.map((c) => ({ ...c, drop: false }));
      state.dHl = state.diff.length; state.view = 'review'; render(true);
    } catch (e) { showError(e); }
  }

  async function applyDiff() {
    const keep = state.diff.filter((d) => !d.drop);
    if (!keep.length) { state.appliedN = 0; state.view = 'saved'; render(true); await refreshPantry().catch(() => {}); return; }
    showLoading('Pantry', 'writing it down');
    try {
      const res = await postJSON('/api/pantry/apply', { changes: keep.map((d) => ({ item: d.item, to: d.to })) });
      state.appliedN = res.applied.length;
      await refreshPantry();
      state.view = 'saved'; render(true);
    } catch (e) { showError(e); }
  }

  async function cyclePantry() {
    const it = state.pantry.items[state.pHl];
    if (!it) return;
    const to = NEXT[it.status];
    showLoading('Pantry', 'writing it down');
    try {
      await postJSON('/api/pantry/apply', { changes: [{ item: it.key, to }] });
      await refreshPantry();
      if (state.pHl >= state.pantry.items.length) state.pHl = Math.max(0, state.pantry.items.length - 1);
      state.view = 'pantry'; render(true);
    } catch (e) { showError(e); }
  }

  /* ---------------- input ---------------- */
  function encoderTurn(dir) {
    reflect('turn', dir);
    switch (state.view) {
      case 'setup': state.setupHl = (state.setupHl + dir + SETUP.length) % SETUP.length; break;
      case 'list': if (state.list.length) state.listHl = (state.listHl + dir + state.list.length) % state.list.length; break;
      case 'today': state.menu = (state.menu + dir + MENU.length) % MENU.length; break;
      case 'recipes': if (state.recipes.length) state.recHl = (state.recHl + dir + state.recipes.length) % state.recipes.length; break;
      case 'pantry': if (state.pantry.items.length) state.pHl = (state.pHl + dir + state.pantry.items.length) % state.pantry.items.length; break;
      case 'shopping': if (state.shop.length) state.sHl = (state.sHl + dir + state.shop.length) % state.shop.length; break;
      case 'cookdone': state.fbHl = (state.fbHl + dir + FB.length) % FB.length; break;
      case 'review': if (state.diff.length) state.dHl = (state.dHl + dir + (state.diff.length + 1)) % (state.diff.length + 1); break;
      default: return;
    }
    render(false);
  }

  function encoderPress() {
    reflect('press');
    switch (state.view) {
      case 'setup': SETUP[state.setupHl].go(); break;
      case 'list': {
        const it = state.list[state.listHl];
        if (!it) break;
        if (it.type === 'recipe') openRecipe(it.id);
        else if (it.key === 'pantry') openPantry();
        else if (it.key === 'shopping') openShopping();
        break;
      }
      case 'today': MENU[state.menu].go(); break;
      case 'recipes': { const r = state.recipes[state.recHl]; if (r) openRecipe(r.id); break; }
      case 'cookdone': openReview(); break;
      case 'pantry': cyclePantry(); break;
      case 'shopping': if (state.shop[state.sHl]) { state.shop[state.sHl].bought = !state.shop[state.sHl].bought; render(true); } break;
      case 'review':
        if (!state.diff.length) { openPantry(); break; }
        if (state.dHl === state.diff.length) applyDiff();
        else { state.diff[state.dHl].drop = !state.diff[state.dHl].drop; render(false); }
        break;
      case 'saved': openPantry(); break;
      case 'error': boot(); break;
      default: break;
    }
  }

  function tapAdvance() {
    reflect('tap');
    if (state.view !== 'recipe') return;
    if (state.step < state.recipe.steps.length - 1) {
      state.step++;
      const region = document.getElementById('cook');
      if (region) { region.innerHTML = cookInner(); ctxEl.textContent = CONTEXT.recipe(); render(false); }
      startStepTimer();
    } else { state.fbHl = 1; state.view = 'cookdone'; render(true); }
  }

  function back() {
    reflect('back');
    if (state.view === 'loading' || state.view === 'boot') return;
    if (state.view === 'setupinfo') { state.view = 'setup'; render(true); return; }
    if (state.view === 'setup') return;
    if (state.view === 'list') return; // list is home
    if (state.view === 'review') { openPantry(); return; }
    if (state.view === 'recipe') { clearTimer(); }
    if (state.view !== 'list') home();
  }
  function home() { reflect('home'); clearTimer(); loadHome(); }

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
  $('#ctl-tap').addEventListener('click', tapAdvance);
  bindKnob();

  boot();
})();
