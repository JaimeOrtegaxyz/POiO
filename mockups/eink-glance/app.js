/* POiO — E-ink Glance (v2)
   - Data-driven pantry (renders columns, priority strip, snapshot counts)
   - Keyboard nav: 1..5 view switching, j/k + arrows for items, enter to pick
   - ARIA tabs with proper roles + selection
   - Mode-1 Step-4 narrowing question reveal
   - Ask POiO single intent entry
   - Pantry status cycle (preview only; pantry.md remains the source of truth)
   - Shopping checkbox toggling
   - Help overlay (?)
   No transitions, no animations, no polling. */

(function () {
  'use strict';

  // -------------------------------------------------------------------
  // PANTRY DATA — single source of truth for the pantry view + snapshot.
  // Categories mirror pantry.example.md. "use" is a short hint shown
  // in the "use these first" priority strip for `low` items.
  // -------------------------------------------------------------------
  const PANTRY = [
    {
      cat: 'Proteins',
      items: [
        { name: 'Chicken thighs (bone-in)',   status: 'plenty' },
        { name: 'Chicken thighs (boneless)',  status: 'plenty' },
        { name: 'Chicken breasts (boneless)', status: 'low', use: 'butterfly + sear, before they stiffen' },
        { name: 'Whole chicken',              status: 'out' },
        { name: 'Eggs',                       status: 'plenty' },
      ]
    },
    {
      cat: 'Dried chiles',
      items: [
        { name: 'Chile ancho',     status: 'plenty' },
        { name: 'Chile guajillo',  status: 'plenty' },
        { name: 'Chile de árbol',  status: 'plenty' },
        { name: 'Chile morita',    status: 'low', use: 'into a chile colorado before you have to restock' },
        { name: 'Chile pasilla',   status: 'out' },
      ]
    },
    {
      cat: 'Spices & seasonings',
      items: [
        { name: 'Salt (kosher)',     status: 'plenty' },
        { name: 'Black pepper',      status: 'plenty' },
        { name: 'Cumin (ground)',    status: 'plenty' },
        { name: 'Oregano (Mexican)', status: 'plenty' },
        { name: 'Smoked paprika',    status: 'plenty' },
        { name: 'Garam masala',      status: 'plenty' },
        { name: 'Za’atar',      status: 'low', use: 'a traybake will finish the jar' },
        { name: 'Canela',            status: 'low' },
        { name: 'Sumac',             status: 'out' },
      ]
    },
    {
      cat: 'Sauces & condiments',
      items: [
        { name: 'Soy sauce',          status: 'plenty' },
        { name: 'Chipotle in adobo',  status: 'plenty' },
        { name: 'Sriracha',           status: 'plenty' },
        { name: 'Honey',              status: 'plenty' },
        { name: 'Olive oil',          status: 'plenty' },
        { name: 'Fish sauce',         status: 'low' },
        { name: 'Salsa macha',        status: 'low', use: 'drizzle, finish the jar over mango tacos' },
        { name: 'Gochujang',          status: 'out' },
        { name: 'Tahini',             status: 'out' },
      ]
    },
    {
      cat: 'Fresh produce & herbs',
      items: [
        { name: 'White onion',       status: 'plenty' },
        { name: 'Garlic',            status: 'plenty' },
        { name: 'Ginger (fresh)',    status: 'plenty' },
        { name: 'Jalapeños',    status: 'plenty' },
        { name: 'Zucchini',          status: 'plenty' },
        { name: 'Cabbage (green)',   status: 'plenty' },
        { name: 'Limes',             status: 'low', use: 'cook tonight’s thighs before you’re out' },
        { name: 'Avocado',           status: 'low' },
        { name: 'Cilantro',          status: 'out' },
        { name: 'Epazote',           status: 'out' },
      ]
    },
    {
      cat: 'Dairy',
      items: [
        { name: 'Media crema',     status: 'plenty' },
        { name: 'Greek yoghurt',   status: 'plenty' },
        { name: 'Butter (unsalted)', status: 'plenty' },
        { name: 'Queso fresco',    status: 'plenty' },
        { name: 'Cotija',          status: 'low', use: 'crumble over tonight’s thighs' },
        { name: 'Crema',           status: 'low' },
        { name: 'Queso Oaxaca',    status: 'out' },
      ]
    },
    {
      cat: 'Starches & grains',
      items: [
        { name: 'Rice (long grain)',  status: 'plenty' },
        { name: 'Rice (jasmine)',     status: 'plenty' },
        { name: 'Corn tortillas',     status: 'plenty' },
        { name: 'Black beans (dried)',status: 'plenty' },
        { name: 'Pasta (rigatoni)',   status: 'plenty' },
        { name: 'Noodles (rice)',     status: 'low' },
        { name: 'Bolillo',            status: 'out' },
        { name: 'Couscous',           status: 'out' },
      ]
    },
    {
      cat: 'Canned & jarred',
      items: [
        { name: 'Canned tomatoes (crushed)', status: 'plenty' },
        { name: 'Chicken broth',             status: 'plenty' },
        { name: 'Coconut milk',              status: 'plenty' },
        { name: 'Pickled jalapeños',    status: 'plenty' },
        { name: 'Canned chickpeas',          status: 'low' },
        { name: 'Olives',                    status: 'out' },
      ]
    },
  ];

  // -------------------------------------------------------------------
  // PANTRY render — columns + priority strip + snapshot
  // -------------------------------------------------------------------
  const STATUS_CYCLE = { plenty: 'low', low: 'out', out: 'plenty' };
  const pantryRoot   = document.getElementById('pantry-columns');
  const priorityList = document.getElementById('priority-list');
  const snapshotEl   = document.getElementById('snapshot');
  const snapshotNote = document.getElementById('snapshot-note');
  const pantrySub    = document.getElementById('pantry-sub');
  const shopCount    = document.getElementById('shop-count');

  function counts() {
    const c = { plenty: 0, low: 0, out: 0, total: 0 };
    PANTRY.forEach(cat => cat.items.forEach(it => {
      c[it.status] += 1;
      c.total += 1;
    }));
    return c;
  }

  function renderPantry() {
    // Columns
    pantryRoot.innerHTML = '';
    PANTRY.forEach((cat, ci) => {
      const sec = document.createElement('section');
      sec.className = 'pantry-cat';
      sec.dataset.cat = String(ci);
      sec.innerHTML =
        '<h3 class="cat-h">' + escape(cat.cat) + '</h3>' +
        '<ul class="pantry-list">' +
          cat.items.map((it, ii) =>
            '<li class="p-item" data-status="' + it.status + '" data-cat="' + ci + '" data-idx="' + ii + '">' +
              '<span class="p-name">' + escape(it.name) + '</span>' +
              '<button class="p-status s-' + it.status + '" type="button" ' +
                'aria-label="' + escape(it.name) + ' is ' + it.status + '. Click to cycle." ' +
                'title="cycle status (preview)">' + it.status + '</button>' +
            '</li>'
          ).join('') +
        '</ul>';
      pantryRoot.appendChild(sec);
    });

    // Priority "use these first" — all `low` items with a use hint, then ones without
    const lows = [];
    PANTRY.forEach(cat => cat.items.forEach(it => {
      if (it.status === 'low') lows.push(it);
    }));
    lows.sort((a, b) => (b.use ? 1 : 0) - (a.use ? 1 : 0));
    priorityList.innerHTML = lows.length
      ? lows.map(it =>
          '<li><strong>' + escape(it.name) + '</strong>' +
            (it.use ? '<span class="p-use">&mdash; ' + escape(it.use) + '</span>' : '') +
          '</li>'
        ).join('')
      : '<li><em>Nothing urgent. Your shelves are looking good.</em></li>';

    // Snapshot bars (widths derived from real counts, not hardcoded)
    const c = counts();
    const pct = n => c.total ? Math.round((n / c.total) * 100) : 0;
    snapshotEl.innerHTML =
      '<div class="snap-row"><span class="snap-k">Plenty</span><span class="snap-bar"><span class="snap-fill plenty" style="width:' + pct(c.plenty) + '%"></span></span><span class="snap-v">' + c.plenty + '</span></div>' +
      '<div class="snap-row"><span class="snap-k">Low</span><span class="snap-bar"><span class="snap-fill low" style="width:' + pct(c.low) + '%"></span></span><span class="snap-v">' + c.low + '</span></div>' +
      '<div class="snap-row"><span class="snap-k">Out</span><span class="snap-bar"><span class="snap-fill out" style="width:' + pct(c.out) + '%"></span></span><span class="snap-v">' + c.out + '</span></div>';

    // Pantry header sub-line and shopping count, in POiO voice
    if (pantrySub) {
      pantrySub.innerHTML =
        c.total + ' tracked. <strong>' + c.plenty + ' plenty</strong>, ' +
        '<strong>' + c.low + ' running low</strong>, <strong>' + c.out + ' to restock</strong>. ' +
        'Filter with the chips or press <kbd>p</kbd>.';
    }
    if (shopCount) {
      const shop = c.low + c.out;
      shopCount.innerHTML = shop + ' <span class="big-unit">things to grab</span>';
    }

    // Filter chip counts
    document.querySelector('[data-count="all"]').textContent    = c.total;
    document.querySelector('[data-count="plenty"]').textContent = c.plenty;
    document.querySelector('[data-count="low"]').textContent    = c.low;
    document.querySelector('[data-count="out"]').textContent    = c.out;

    // Re-apply current filter, if any
    applyFilter(currentFilter);

    // Wire pantry status cycle (preview)
    pantryRoot.querySelectorAll('.p-status').forEach(btn => {
      btn.addEventListener('click', () => {
        const li = btn.closest('.p-item');
        const ci = +li.dataset.cat;
        const ii = +li.dataset.idx;
        const item = PANTRY[ci].items[ii];
        item.status = STATUS_CYCLE[item.status];
        renderPantry();
      });
    });
  }

  function escape(s) {
    return String(s).replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }

  // -------------------------------------------------------------------
  // FILTERS
  // -------------------------------------------------------------------
  let currentFilter = 'all';
  function applyFilter(f) {
    currentFilter = f;
    document.querySelectorAll('.filter').forEach(b => {
      b.classList.toggle('active', b.dataset.filter === f);
    });
    document.querySelectorAll('.p-item').forEach(item => {
      const match = f === 'all' || item.dataset.status === f;
      item.classList.toggle('hidden', !match);
    });
    document.querySelectorAll('.pantry-cat').forEach(cat => {
      const visible = cat.querySelectorAll('.p-item:not(.hidden)').length;
      cat.classList.toggle('hidden', visible === 0);
    });
  }
  document.querySelectorAll('.filter').forEach(btn => {
    btn.addEventListener('click', () => applyFilter(btn.dataset.filter));
  });

  // -------------------------------------------------------------------
  // VIEW SWITCHING (ARIA tabs + hash routing)
  // -------------------------------------------------------------------
  const tabs  = document.querySelectorAll('.tab');
  const views = document.querySelectorAll('.view');
  const validViews = ['today', 'suggestions', 'recipe', 'pantry', 'shopping'];

  function show(name, opts) {
    if (!validViews.includes(name)) name = 'today';
    tabs.forEach(t => {
      const on = t.dataset.view === name;
      t.classList.toggle('active', on);
      t.setAttribute('aria-selected', on ? 'true' : 'false');
      t.tabIndex = on ? 0 : -1;
    });
    views.forEach(v => v.classList.toggle('active', v.id === 'view-' + name));
    if (window.scrollTo) window.scrollTo({ top: 0, behavior: 'auto' });
    if (location.hash !== '#' + name) {
      history.replaceState(null, '', '#' + name);
    }
    if (opts && opts.focus) {
      const panel = document.getElementById('view-' + name);
      if (panel) panel.focus();
    }
  }

  tabs.forEach(t => {
    t.addEventListener('click', e => {
      e.preventDefault();
      show(t.dataset.view, { focus: true });
    });
    // Roving tabindex with left/right
    t.addEventListener('keydown', e => {
      const idx = Array.from(tabs).indexOf(t);
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        e.preventDefault();
        const dir = e.key === 'ArrowRight' ? 1 : -1;
        const next = tabs[(idx + dir + tabs.length) % tabs.length];
        next.focus();
        show(next.dataset.view);
      } else if (e.key === 'Home') {
        e.preventDefault();
        tabs[0].focus();
        show(tabs[0].dataset.view);
      } else if (e.key === 'End') {
        e.preventDefault();
        tabs[tabs.length - 1].focus();
        show(tabs[tabs.length - 1].dataset.view);
      }
    });
  });

  // Generic "go to view" click delegation (link-buttons inside content)
  document.addEventListener('click', (e) => {
    const t = e.target.closest('[data-view]');
    if (!t) return;
    if (t.classList.contains('tab')) return; // handled above
    e.preventDefault();
    show(t.dataset.view);
  });

  window.addEventListener('hashchange', () => {
    show((location.hash || '#today').slice(1));
  });

  // -------------------------------------------------------------------
  // SUGGESTIONS — keyboard nav (j/k + arrows) and the Mode-1 narrowing
  // question reveal when a suggestion is picked.
  // -------------------------------------------------------------------
  const suggestEls = () => Array.from(document.querySelectorAll('.suggest'));
  let suggestFocused = -1;

  function focusSuggest(i) {
    const els = suggestEls();
    if (!els.length) return;
    suggestFocused = (i + els.length) % els.length;
    els.forEach((el, idx) => el.classList.toggle('focused', idx === suggestFocused));
    els[suggestFocused].focus();
    els[suggestFocused].scrollIntoView({ block: 'nearest' });
  }

  function pickSuggest(el) {
    // Hide other narrows, reveal this one
    document.querySelectorAll('.narrow').forEach(n => { n.hidden = true; });
    const n = el.querySelector('.narrow');
    if (n) {
      n.hidden = false;
      const first = n.querySelector('.narrow-opt');
      if (first) first.focus();
    }
  }

  // Click to pick a suggestion (anywhere on the suggestion body, but not the narrow options)
  document.addEventListener('click', e => {
    const opt = e.target.closest('.narrow-opt');
    if (opt) {
      // Choosing a narrowing option opens the full recipe
      show('recipe');
      return;
    }
    const li = e.target.closest('.suggest');
    if (li) {
      pickSuggest(li);
    }
  });

  // Activate a focused suggest with Enter / Space
  document.addEventListener('keydown', e => {
    const todayActive = document.getElementById('view-suggestions').classList.contains('active');
    if (!todayActive) return;
    if (suggestFocused < 0) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      const els = suggestEls();
      pickSuggest(els[suggestFocused]);
    }
  });

  // -------------------------------------------------------------------
  // SHOPPING — checkbox toggling (preview only)
  // -------------------------------------------------------------------
  document.addEventListener('click', e => {
    const box = e.target.closest('.check-box');
    if (!box) return;
    box.classList.toggle('checked');
    const li = box.closest('li');
    if (li) li.classList.toggle('checked');
  });

  // -------------------------------------------------------------------
  // ASK POIO — single intent entry. Echoes the input as a "we heard you"
  // line, since this prototype isn't wired to the engine. It demonstrates
  // the entry point without faking a response.
  // -------------------------------------------------------------------
  const askForm  = document.getElementById('ask-form');
  const askInput = document.getElementById('ask-input');
  const askEcho  = document.getElementById('ask-echo');
  if (askForm) {
    askForm.addEventListener('submit', e => {
      e.preventDefault();
      const q = askInput.value.trim();
      if (!q) return;
      askEcho.hidden = false;
      askEcho.innerHTML =
        '<strong>heard you &middot;</strong>' +
        '&ldquo;' + escape(q) + '&rdquo;' +
        ' &mdash; in the live app this kicks the suggestion or pantry update flow. ' +
        'For now, jump to <a href="#suggestions" data-view="suggestions">Suggestions</a> ' +
        'or <a href="#pantry" data-view="pantry">Pantry</a>.';
      askInput.value = '';
    });
  }

  // -------------------------------------------------------------------
  // HELP OVERLAY
  // -------------------------------------------------------------------
  const help      = document.getElementById('help-overlay');
  const helpClose = document.getElementById('help-close');
  function openHelp()  { help.hidden = false; helpClose.focus(); }
  function closeHelp() { help.hidden = true; }
  if (helpClose) helpClose.addEventListener('click', closeHelp);
  if (help) help.addEventListener('click', e => { if (e.target === help) closeHelp(); });

  // -------------------------------------------------------------------
  // GLOBAL KEYBOARD MAP
  //   1..5      switch view
  //   j / down  next item
  //   k / up    prev item
  //   enter     pick focused suggestion (handled above)
  //   /         focus Ask POiO
  //   p         jump to pantry filters
  //   ?         help
  //   esc       close help / blur ask field
  // -------------------------------------------------------------------
  document.addEventListener('keydown', e => {
    // Don't hijack typing inside inputs
    const inField = e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA');
    const key = e.key;

    if (key === 'Escape') {
      if (!help.hidden) { closeHelp(); return; }
      if (inField) { e.target.blur(); return; }
    }

    if (inField) return;

    // Help is open — only Esc handles it (above)
    if (!help.hidden) return;

    if (key >= '1' && key <= '5') {
      e.preventDefault();
      show(validViews[+key - 1], { focus: false });
      return;
    }
    if (key === '/') {
      e.preventDefault();
      show('today');
      if (askInput) askInput.focus();
      return;
    }
    if (key === '?') {
      e.preventDefault();
      openHelp();
      return;
    }
    if (key === 'p' || key === 'P') {
      e.preventDefault();
      show('pantry');
      const f = document.querySelector('.filter');
      if (f) f.focus();
      return;
    }

    // j/k + arrow nav inside suggestions
    const onSuggestions = document.getElementById('view-suggestions').classList.contains('active');
    if (onSuggestions) {
      if (key === 'j' || key === 'ArrowDown') {
        e.preventDefault();
        focusSuggest(suggestFocused < 0 ? 0 : suggestFocused + 1);
      } else if (key === 'k' || key === 'ArrowUp') {
        e.preventDefault();
        focusSuggest(suggestFocused < 0 ? 0 : suggestFocused - 1);
      }
    }
  });

  // -------------------------------------------------------------------
  // DATE in masthead (the real "today")
  // -------------------------------------------------------------------
  const dateEl = document.getElementById('today-date');
  if (dateEl) {
    const d = new Date();
    const days   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    dateEl.textContent = days[d.getDay()] + ' · ' + d.getDate() + ' ' + months[d.getMonth()] + ' ' + d.getFullYear();
  }

  // -------------------------------------------------------------------
  // BOOT
  // -------------------------------------------------------------------
  renderPantry();
  show((location.hash || '#today').slice(1));
})();
