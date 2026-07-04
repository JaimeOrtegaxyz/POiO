/* POiO companion — VOICE friction probe.
   Encoder + push-to-talk. The bet: an LLM behind the device makes speech the
   highest-bandwidth input, so the painful moment (marking the pantry down
   after cooking) becomes "hold talk, say what you used." Fake STT + reply.
   Honest to e-paper physics: full-refresh flashes on view change, partial
   refresh (no flash) for stepping / the record meter / the diff cursor.
   All three probes converge on the same PROPOSED-DIFF → confirm screen. */
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
      { text: 'Cook the cebolla until soft and just golden.', glyph: 'pan',
        items: [], secs: 5 * 60 },
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
  // starting pantry — tuned so tonight's cook produces real status transitions.
  let pantryRows = [
    { nm: 'epazote', st: 'out' },
    { nm: 'chile pasilla', st: 'out' },
    { nm: 'bolillo', st: 'out' },
    { nm: 'tostadas', st: 'low' },
    { nm: 'chipotle en adobo', st: 'plenty' },
    { nm: 'crema', st: 'low' },
    { nm: 'limones', st: 'low' },
  ];

  let shopRows = [
    { nm: 'epazote', group: 'RESTOCK', bought: false },
    { nm: 'chile pasilla', group: 'RESTOCK', bought: false },
    { nm: 'bolillo', group: 'RESTOCK', bought: false },
    { nm: 'crema', group: 'TOP UP', bought: false },
    { nm: 'limones', group: 'TOP UP', bought: false },
  ];

  // What "saying what you used" resolves to — the canned STT + the LLM's proposal.
  const VOICE_PANTRY = {
    heard: 'we’re out of tostadas, chipotle’s getting low, and I finished the crema',
    diff: [
      { nm: 'tostadas', to: 'out' },
      { nm: 'chipotle en adobo', to: 'low' },
      { nm: 'crema', to: 'out' },
    ],
  };
  const VOICE_SUGGEST = {
    heard: 'something quick, I’ve got cooked pollo to use up',
    reply: 'Tinga, then — 25 min, and your pantry’s basically there.',
  };

  /* ---------------- dithered line-art glyphs (the "soul" of cooking mode) ---- */
  const DITHER = '<defs><pattern id="d" width="4" height="4" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r=".85" fill="#1a1816"/></pattern></defs>';
  const S = 'fill="none" stroke="#1a1816" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"';
  const steam = (x) => `<path d="M${x} 15 q5 -5 0 -10 q-5 -5 0 -10" fill="none" stroke="#1a1816" stroke-width="2.4" stroke-linecap="round"/>`;
  const GLYPH = {
    pan: `<svg viewBox="0 0 118 78">${DITHER}${steam(40)}${steam(56)}
      <line x1="80" y1="50" x2="114" y2="50" ${S}/>
      <ellipse cx="44" cy="50" rx="42" ry="18" ${S}/>
      <ellipse cx="38" cy="50" rx="15" ry="8.5" fill="url(#d)" stroke="#1a1816" stroke-width="2.4"/>
      <ellipse cx="58" cy="53" rx="9" ry="5.5" fill="url(#d)" stroke="#1a1816" stroke-width="2.4"/></svg>`,
    pot: `<svg viewBox="0 0 118 78">${DITHER}${steam(48)}${steam(66)}
      <path d="M20 34 h78 l-6 34 a6 6 0 0 1 -6 5 H32 a6 6 0 0 1 -6 -5 Z" ${S}/>
      <line x1="14" y1="30" x2="104" y2="30" ${S}/>
      <line x1="59" y1="24" x2="59" y2="30" ${S}/>
      <path d="M30 52 h58" stroke="#1a1816" stroke-width="2.4" fill="none" stroke-dasharray="2 4"/></svg>`,
    griddle: `<svg viewBox="0 0 118 78">${DITHER}
      <ellipse cx="59" cy="52" rx="52" ry="16" ${S}/>
      <ellipse cx="42" cy="50" rx="16" ry="6.5" fill="url(#d)" stroke="#1a1816" stroke-width="2.4"/>
      <ellipse cx="74" cy="54" rx="16" ry="6.5" fill="url(#d)" stroke="#1a1816" stroke-width="2.4"/></svg>`,
    bowl: `<svg viewBox="0 0 118 78">${DITHER}
      <path d="M14 40 a45 45 0 0 0 90 0 Z" ${S}/>
      <path d="M14 40 h90" ${S}/>
      <path d="M30 40 a29 29 0 0 0 58 0" fill="url(#d)" stroke="none"/>
      <path d="M52 26 q7 -9 14 0" fill="none" stroke="#1a1816" stroke-width="2.4" stroke-linecap="round"/></svg>`,
  };

  /* ---------------- state ---------------- */
  const state = {
    view: 'today', menu: 0, step: 0, pHl: 0, sHl: 0, fbHl: 1, dHl: 0,
    flash: true, script: 'pantry', diff: [], spokenReply: '', dish: RECIPE.name,
    vibe: RECIPE.vibe, serves: RECIPE.serves, timerId: null, timeLeft: 0, meterId: null,
  };

  const MENU = [
    { label: 'Cook', go: openRecipe },
    { label: 'Pantry', go: () => setView('pantry') },
    { label: 'Shopping', go: () => setView('shopping') },
  ];
  const FB = [
    { key: 'again', nm: 'cook it again' },
    { key: 'good', nm: 'good, not memorable' },
    { key: 'no', nm: 'not again' },
  ];

  /* ---------------- dom + helpers ---------------- */
  const $ = (s) => document.querySelector(s);
  const screen = $('#screen'), body = $('#body'), ctxEl = $('#context'), affEl = $('#affordances');
  const eye = $('#ctl-eye'), talkBtn = $('#ctl-talk');

  const WORD = { plenty: 'stocked', low: 'low', out: 'out' };
  const sw = (st) => `<span class="sw ${st}"></span>`;
  const esc = (s) => s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
  const clock = () => `<svg viewBox="0 0 24 24" fill="none" stroke="#1a1816" stroke-width="2.2"><circle cx="12" cy="13" r="8"/><path d="M12 13V8M12 5V3M9 3h6" stroke-linecap="round"/></svg>`;
  const drum = `<svg class="drum" viewBox="0 0 24 24" fill="#1a1816"><path d="M14.5 3.5a5 5 0 0 1 6 6c-1.3 3.2-4.7 3.4-6.2 4.9-1.5 1.5-1.3 3-2.8 4.5a3.5 3.5 0 1 1-5.6-1.4 3.5 3.5 0 0 1 1.4-.6c1.5-1.5 1.3-3 2.8-4.5S11.3 4.8 14.5 3.5Z"/></svg>`;

  function flash() {
    if (!state.flash) return;
    screen.classList.add('flash');
    setTimeout(() => screen.classList.remove('flash'), 90);
  }
  const mmss = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  function clearTimers() {
    if (state.timerId) { clearInterval(state.timerId); state.timerId = null; }
    if (state.meterId) { clearInterval(state.meterId); state.meterId = null; }
  }

  /* ---------------- views ---------------- */
  const CONTEXT = {
    today: () => 'Tonight', recipe: () => `${state.dish} · ${state.step + 1}/${RECIPE.steps.length}`,
    cookdone: () => 'Just cooked', pantry: () => 'Pantry', shopping: () => 'Shopping',
    vrec: () => 'Listening', vthink: () => 'One sec', vdiff: () => 'Pantry · proposed', vapplied: () => 'Pantry',
  };

  const VIEW = {
    today() {
      const menu = MENU.map((m, i) =>
        `<span class="menu-item${i === state.menu ? ' sel' : ''}">${m.label}</span>`).join('');
      const reply = state.spokenReply
        ? `<div class="talk-hint"><span class="pip"></span><span style="font-family:Spectral,serif;font-style:italic">${esc(state.spokenReply)}</span></div>`
        : `<div class="talk-hint"><span class="pip"></span>hold <b>◉ talk</b> — "what should I cook?"</div>`;
      return `
        <div class="kicker">Tonight</div>
        <div class="dish">${esc(state.dish)}</div>
        <div class="vibe">${esc(state.vibe)}</div>
        <div class="tnight-status">${sw('plenty')} pantry ready · 25 min</div>
        <div class="serves">serves <span class="val">${state.serves}</span> · turn to change</div>
        ${menu ? `<div class="menu">${menu}</div>` : ''}
        ${reply}`;
    },
    recipe() { return `<div id="cook">${cookInner()}</div>`; },
    cookdone() {
      const opts = FB.map((f, i) =>
        `<div class="fb-opt${i === state.fbHl ? ' sel' : ''}">${sw(i === 0 ? 'plenty' : i === 1 ? 'low' : 'out')}<span class="nm">${esc(f.nm)}</span></div>`).join('');
      return `
        <div class="done-h">How was the tinga?</div>
        <div class="done-sub">steers what I suggest next</div>
        <div class="fb-opts">${opts}</div>
        <div class="talk-hint" style="margin-top:12px"><span class="pip"></span>hold <b>◉ talk</b> to mark what you used</div>`;
    },
    pantry() {
      const rows = pantryRows.map((r, i) => `
        <div class="prow${i === state.pHl ? ' row-hl' : ''}">
          <span class="caret">${i === state.pHl ? '▸' : ''}</span>
          ${sw(r.st)}<span class="nm">${esc(r.nm)}</span><span class="st">${WORD[r.st]}</span>
        </div>`).join('');
      const out = pantryRows.filter((r) => r.st === 'out').length;
      const low = pantryRows.filter((r) => r.st === 'low').length;
      return `
        <div class="summary">
          <span>${sw('plenty')} ${STOCKED} stocked</span>
          <span>${sw('low')} ${low} low</span>
          <span>${sw('out')} ${out} out</span>
        </div>
        <div class="plist">${rows}</div>
        <div class="talk-hint" style="margin-top:10px"><span class="pip"></span>hold <b>◉ talk</b> to update by voice</div>`;
    },
    shopping() {
      let html = '', last = null;
      shopRows.forEach((r, i) => {
        if (r.group !== last) {
          if (last !== null) html += '</div>';
          html += `<div class="shop-group"><div class="shop-label">${r.group}</div>`;
          last = r.group;
        }
        html += `<div class="srow${r.bought ? ' bought' : ''}${i === state.sHl ? ' row-hl' : ''}">
          <span class="caret">${i === state.sHl ? '▸' : ''}</span>
          <span class="box">${r.bought ? '▣' : '▢'}</span><span class="nm">${esc(r.nm)}</span></div>`;
      });
      if (last !== null) html += '</div>';
      return html;
    },
    vrec() {
      const bars = 7;
      const on = state._meter || 0;
      const meter = Array.from({ length: bars }, (_, i) =>
        `<i class="${i < on ? 'on' : ''}" style="height:${8 + ((i * 5 + on * 3) % 34)}px"></i>`).join('');
      return `
        <div class="vrec">
          <div class="rec-top"><span class="rec-dot"></span> RECORDING · release to send</div>
          <div class="meter">${meter}</div>
          <div class="rec-heard">${state._heard ? '“' + esc(state._heard) + '”' : ''}</div>
          <div class="rec-prompt">${state._heard ? '' : 'say what you used…'}</div>
        </div>`;
    },
    vthink() {
      return `
        <div class="vthink">
          <div class="think-h">making sense of that</div>
          <div class="think-heard">“${esc(state.script === 'suggest' ? VOICE_SUGGEST.heard : VOICE_PANTRY.heard)}”</div>
          <div class="think-ph"></div>
          <div class="think-lat">server · ~2s</div>
        </div>`;
    },
    vdiff() {
      const rows = state.diff.map((d, i) => `
        <div class="drow${d.drop ? ' drop' : ''}${i === state.dHl ? ' row-hl' : ''}">
          <span class="caret">${i === state.dHl ? '▸' : ''}</span>
          ${sw(d.to)}<span class="nm">${esc(d.nm)}</span>
          <span class="arrow">→</span><span class="to">${WORD[d.to]}</span>
        </div>`).join('');
      const keep = state.diff.filter((d) => !d.drop).length;
      const applyHl = state.dHl === state.diff.length ? ' row-hl' : '';
      return `
        <div class="diff-h">Mark these down?</div>
        <div class="diff-src">heard: “${esc(VOICE_PANTRY.heard)}”</div>
        <div class="diff-list">${rows}
          <div class="drow${applyHl}" style="margin-top:4px;border-top:1px solid var(--ink);padding-top:6px">
            <span class="caret">${state.dHl === state.diff.length ? '▸' : ''}</span>
            <span class="nm" style="font-weight:700">✓ apply ${keep} change${keep === 1 ? '' : 's'}</span>
          </div>
        </div>`;
    },
    vapplied() {
      return `
        <div class="applied">
          <div class="chk">✓</div>
          <div class="big">Pantry updated</div>
          <div class="sub">${state._appliedN} change${state._appliedN === 1 ? '' : 's'} · shopping list caught up</div>
        </div>`;
    },
  };

  function cookInner() {
    const n = RECIPE.steps.length, s = RECIPE.steps[state.step];
    const items = s.items.length
      ? `<div class="step-items">${s.items.map(([nm, st]) =>
          `<span class="item">${sw(st)}<span class="nm">${esc(nm)}</span></span>`).join('')}</div>`
      : '';
    const tmr = s.secs
      ? `<span class="tmr">${clock()} ${mmss(state.timeLeft)}</span>`
      : `<span class="tmr none">no timer</span>`;
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
    today: () => ['<b>turn</b> ▸ choose', '<b>press</b> ● open · <b>◉</b> talk'],
    recipe: () => {
      const last = state.step === RECIPE.steps.length - 1;
      return [`<b>tap</b> ▸ ${last ? 'finish' : 'next'}`, '<b>◂</b> back'];
    },
    cookdone: () => ['<b>turn</b> ▸ pick', '<b>press</b> ● save · <b>◉</b> talk'],
    pantry: () => ['<b>turn</b> ▸ move', '<b>press</b> ● cycle · <b>◉</b> talk'],
    shopping: () => ['<b>turn</b> ▸ move', '<b>press</b> ● mark · <b>◂</b> back'],
    vrec: () => ['<b>◉</b> recording…', 'release ▸ send'],
    vthink: () => ['<span style="opacity:.6">working…</span>', ''],
    vdiff: () => ['<b>turn</b> ▸ move · <b>press</b> ● drop/apply', '<b>◂</b> discard'],
    vapplied: () => ['', '<b>press</b> ● done'],
  };

  function render(full = true) {
    ctxEl.textContent = CONTEXT[state.view]();
    body.innerHTML = VIEW[state.view]();
    const [l, r] = AFF[state.view]();
    affEl.innerHTML = `<span class="aff-l">${l || ''}</span><span class="aff-r">${r || ''}</span>`;
    // drumstick ornament in the masthead while cooking, per the mood reference
    $('#meta').innerHTML = state.view === 'recipe' ? drum : '18:42 · upd 6m';
    if (full) flash();
  }

  /* ---------------- cooking timer ---------------- */
  function startStepTimer() {
    clearTimers();
    const s = RECIPE.steps[state.step];
    if (!s.secs) return;
    state.timeLeft = s.secs;
    // A shipping panel would coarse-refresh this (every ~10s / minutes) to spare
    // the e-paper; the mockup ticks per-second for legibility. Partial refresh only.
    state.timerId = setInterval(() => {
      if (state.view !== 'recipe') { clearTimers(); return; }
      state.timeLeft = Math.max(0, state.timeLeft - 1);
      const el = document.querySelector('#cook .tmr');
      if (el) el.innerHTML = `${clock()} ${mmss(state.timeLeft)}`;
      if (state.timeLeft === 0) clearTimers();
    }, 1000);
  }

  /* ---------------- actions ---------------- */
  function setView(v) { clearTimers(); state.view = v; render(true); }
  function openRecipe() { clearTimers(); state.step = 0; state.view = 'recipe'; render(true); startStepTimer(); }

  function encoderTurn(dir) {
    switch (state.view) {
      case 'today': {
        // servings live on the same dial as the menu: first detent band = serves
        state.menu = (state.menu + dir + MENU.length) % MENU.length; break;
      }
      case 'pantry': state.pHl = (state.pHl + dir + pantryRows.length) % pantryRows.length; break;
      case 'shopping': state.sHl = (state.sHl + dir + shopRows.length) % shopRows.length; break;
      case 'cookdone': state.fbHl = (state.fbHl + dir + FB.length) % FB.length; break;
      case 'vdiff': state.dHl = (state.dHl + dir + (state.diff.length + 1)) % (state.diff.length + 1); break;
      default: return;
    }
    render(false); // selection move = partial refresh, no flash
  }

  function encoderPress() {
    switch (state.view) {
      case 'today': MENU[state.menu].go(); break;
      case 'cookdone': afterFeedback(); break;
      case 'pantry': { const r = pantryRows[state.pHl]; r.st = { plenty: 'low', low: 'out', out: 'plenty' }[r.st]; render(true); break; }
      case 'shopping': shopRows[state.sHl].bought = !shopRows[state.sHl].bought; render(true); break;
      case 'vdiff':
        if (state.dHl === state.diff.length) applyDiff();
        else { state.diff[state.dHl].drop = !state.diff[state.dHl].drop; render(false); }
        break;
      case 'vapplied': setView('pantry'); break;
      default: break;
    }
  }

  function tapAdvance() {
    if (state.view !== 'recipe') return;
    if (state.step < RECIPE.steps.length - 1) {
      state.step++;
      const region = document.getElementById('cook');
      if (region) {                       // partial refresh — repaint the step region, no flash
        region.innerHTML = cookInner();
        ctxEl.textContent = CONTEXT.recipe();
        render(false);
      }
      startStepTimer();
    } else {
      // finished the last step → straight into the post-cook feedback + pantry moment
      state.fbHl = 1; setView('cookdone');
    }
  }

  function afterFeedback() {
    // saving feedback nudges you into the motivating friction: update the pantry
    startVoice('pantry');
  }

  function back() {
    if (['vrec', 'vthink'].includes(state.view)) return; // can't interrupt mid-capture in mock
    if (state.view === 'vdiff') { setView('pantry'); return; }
    if (state.view !== 'today') home();
  }
  function home() { clearTimers(); state.menu = 0; state.spokenReply = ''; state.view = 'today'; render(true); }

  /* ---------------- voice flow: record → think → diff → apply ---------------- */
  function startVoice(script) {
    clearTimers();
    state.script = script || (state.view === 'today' ? 'suggest' : 'pantry');
    state._meter = 0; state._heard = '';
    state.view = 'vrec';
    eye.classList.add('live'); talkBtn.classList.add('live');
    render(true);
    const heardText = state.script === 'suggest' ? VOICE_SUGGEST.heard : VOICE_PANTRY.heard;
    const words = heardText.split(' ');
    let w = 0, tick = 0;
    // coarse, stepped meter + word-by-word transcript = discrete partial refreshes
    state.meterId = setInterval(() => {
      tick++;
      state._meter = 1 + (tick % 7);
      if (tick % 2 === 0 && w < words.length) { state._heard = words.slice(0, ++w).join(' '); }
      body.innerHTML = VIEW.vrec();
      if (w >= words.length && tick > 6) { clearTimers(); endRecording(); }
    }, 260);
  }

  function endRecording() {
    eye.classList.remove('live'); talkBtn.classList.remove('live');
    state.view = 'vthink'; render(true);
    setTimeout(() => {
      if (state.script === 'suggest') {
        state.spokenReply = VOICE_SUGGEST.reply;
        setView('today');
      } else {
        state.diff = VOICE_PANTRY.diff.map((d) => ({ ...d, drop: false }));
        state.dHl = 0; setView('vdiff');
      }
    }, 1900);
  }

  function applyDiff() {
    const keep = state.diff.filter((d) => !d.drop);
    keep.forEach((d) => {
      const r = pantryRows.find((p) => p.nm === d.nm);
      if (r) r.st = d.to; else pantryRows.push({ nm: d.nm, st: d.to });
    });
    // shopping stays derived: anything now out/low that isn't already listed gets added
    keep.forEach((d) => {
      if ((d.to === 'out' || d.to === 'low') && !shopRows.some((s) => s.nm === d.nm)) {
        shopRows.push({ nm: d.nm, group: d.to === 'out' ? 'RESTOCK' : 'TOP UP', bought: false });
      }
    });
    shopRows.sort((a, b) => (a.group < b.group ? 1 : -1));
    state._appliedN = keep.length;
    setView('vapplied');
  }

  function talk() {
    if (['vrec', 'vthink'].includes(state.view)) return;
    startVoice(state.view === 'today' ? 'suggest' : 'pantry');
  }

  /* ---------------- input ---------------- */
  document.addEventListener('keydown', (e) => {
    switch (e.key) {
      case 'ArrowDown': encoderTurn(1); e.preventDefault(); break;
      case 'ArrowUp': encoderTurn(-1); e.preventDefault(); break;
      case 'Enter': encoderPress(); e.preventDefault(); break;
      case ' ': tapAdvance(); e.preventDefault(); break;
      case 'Escape': case 'Backspace': back(); e.preventDefault(); break;
      case 'v': case 'V': talk(); e.preventDefault(); break;
      case 'h': case 'e': home(); break;
      case 'f': state.flash = !state.flash; break;
      default: break;
    }
  });
  screen.addEventListener('wheel', (e) => { encoderTurn(e.deltaY > 0 ? 1 : -1); e.preventDefault(); }, { passive: false });

  eye.addEventListener('click', home);
  $('#ctl-back').addEventListener('click', back);
  $('#ctl-turnl').addEventListener('click', () => encoderTurn(-1));
  $('#ctl-turnr').addEventListener('click', () => encoderTurn(1));
  $('#ctl-press').addEventListener('click', encoderPress);
  $('#ctl-tap').addEventListener('click', tapAdvance);
  talkBtn.addEventListener('click', talk);

  render(true);
})();
