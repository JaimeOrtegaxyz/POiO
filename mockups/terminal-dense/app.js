/* =========================================================
   POiO :: terminal-dense :: v2 :: app.js
   Vanilla. No frameworks. Keyboard-first.
   v2: pantry data feels lived-in, counts computed from data,
   narrowing question flow, Spanish words stay Spanish.
   ========================================================= */
(() => {
  'use strict';

  // -----------------------------------------------------------------
  // Data :: pantry
  // Lived-in kitchen: staples (salt, garlic, white onion, Mexican oregano,
  // limes) are plenty. `out` items are realistically out — things you'd
  // actually run out of: gochujang (an unlock ingredient you haven't bought),
  // whole bird (no current weekend project), bolillo (bakery run needed),
  // bone-in thighs (used the last for tinga), epazote (seasonal/local).
  // -----------------------------------------------------------------
  const STATUS = ['plenty', 'low', 'out'];

  const PANTRY = [
    // proteins
    ['Chicken breast (boneless)',          'proteins', 'plenty', ''],
    ['Chicken breast (bone-in)',           'proteins', 'low',    ''],
    ['Chicken thighs (bone-in, skin-on)',  'proteins', 'out',    'used the last for tinga'],
    ['Chicken thighs (boneless)',          'proteins', 'plenty', 'weeknight workhorse'],
    ['Chicken drumsticks',                 'proteins', 'plenty', ''],
    ['Chicken legs (whole)',               'proteins', 'low',    ''],
    ['Whole chicken',                      'proteins', 'out',    'no weekend project queued'],
    ['Eggs',                               'proteins', 'plenty', ''],

    // spices
    ['Cumin (ground)',                     'spices',   'plenty', ''],
    ['Cumin (seeds)',                      'spices',   'plenty', ''],
    ['Coriander (ground)',                 'spices',   'plenty', ''],
    ['Turmeric (ground)',                  'spices',   'plenty', ''],
    ['Smoked paprika',                     'spices',   'plenty', ''],
    ['Sweet paprika',                      'spices',   'plenty', ''],
    ['Chilli flakes',                      'spices',   'plenty', ''],
    ['Black pepper (whole)',               'spices',   'plenty', ''],
    ['Oregano (Mexican)',                  'spices',   'plenty', 'spice anchor for latin work'],
    ['Oregano (Mediterranean)',            'spices',   'plenty', ''],
    ['Canela',                             'spices',   'plenty', ''],
    ['Garam masala',                       'spices',   'plenty', ''],
    ['Curry powder',                       'spices',   'low',    ''],
    ['Allspice (ground)',                  'spices',   'plenty', ''],
    ['Bay leaves',                         'spices',   'plenty', ''],
    ['Fennel seeds',                       'spices',   'plenty', ''],
    ['Sumac',                              'spices',   'low',    ''],
    ['Za\'atar',                           'spices',   'plenty', ''],
    ['Tajín',                              'spices',   'plenty', 'finish elote, mango'],
    ['Salt (kosher)',                      'spices',   'plenty', ''],
    ['Salt (Maldon)',                      'spices',   'plenty', ''],
    ['MSG',                                'spices',   'plenty', ''],

    // chiles
    ['Chile ancho',                        'chiles',   'plenty', ''],
    ['Chile guajillo',                     'chiles',   'plenty', ''],
    ['Chile de árbol',                     'chiles',   'plenty', ''],
    ['Chile morita',                       'chiles',   'low',    ''],
    ['Chile chipotle (dried)',             'chiles',   'plenty', ''],
    ['Chile pasilla',                      'chiles',   'out',    'mole adobo backstop, restock'],

    // oils / acids
    ['Olive oil (EV)',                     'oils',     'plenty', ''],
    ['Olive oil (cooking)',                'oils',     'plenty', ''],
    ['Vegetable oil',                      'oils',     'plenty', ''],
    ['Sesame oil',                         'oils',     'low',    'a few drops at a time'],
    ['Coconut oil',                        'oils',     'plenty', ''],
    ['Apple cider vinegar',                'oils',     'plenty', ''],
    ['Rice vinegar',                       'oils',     'plenty', ''],
    ['Red wine vinegar',                   'oils',     'plenty', ''],
    ['Limes',                              'oils',     'plenty', 'the squeeze is non-negotiable'],
    ['Lemons',                             'oils',     'low',    ''],

    // sauces
    ['Soy sauce',                          'sauces',   'plenty', ''],
    ['Fish sauce',                         'sauces',   'plenty', ''],
    ['Sriracha',                           'sauces',   'plenty', ''],
    ['Gochujang',                          'sauces',   'out',    'unlock korean glazes'],
    ['Harissa',                            'sauces',   'plenty', ''],
    ['Chipotle in adobo (canned)',         'sauces',   'plenty', 'star ingredient'],
    ['Tomato paste',                       'sauces',   'plenty', ''],
    ['Dijon mustard',                      'sauces',   'plenty', ''],
    ['Honey',                              'sauces',   'plenty', ''],
    ['Worcestershire',                     'sauces',   'plenty', ''],
    ['Tahini',                             'sauces',   'low',    'enough for one drizzle'],
    ['Peanut butter',                      'sauces',   'plenty', ''],
    ['Miso paste',                         'sauces',   'low',    ''],
    ['Mayonnaise',                         'sauces',   'plenty', ''],
    ['Salsa macha',                        'sauces',   'plenty', 'spoon over everything'],

    // veg
    ['White onion',                        'veg',      'plenty', 'base of half the suggestion list'],
    ['Red onion',                          'veg',      'plenty', ''],
    ['Garlic',                             'veg',      'plenty', 'garlic-ginger backbone'],
    ['Ginger (fresh)',                     'veg',      'plenty', ''],
    ['Jitomate',                           'veg',      'plenty', ''],
    ['Tomatillo',                          'veg',      'plenty', 'salsa verde'],
    ['Jalapeños',                          'veg',      'plenty', ''],
    ['Serranos',                           'veg',      'plenty', ''],
    ['Habaneros',                          'veg',      'low',    'pairs with mango'],
    ['Poblano peppers',                    'veg',      'plenty', ''],
    ['Avocado',                            'veg',      'plenty', ''],
    ['Nopales',                            'veg',      'plenty', 'seasonal · peaking'],
    ['Elote',                              'veg',      'plenty', ''],
    ['Cabbage (purple)',                   'veg',      'plenty', ''],
    ['Carrots',                            'veg',      'plenty', ''],
    ['Radishes',                           'veg',      'plenty', ''],

    // herbs
    ['Cilantro',                           'herbs',    'low',    'workhorse, dies fast'],
    ['Flat-leaf parsley',                  'herbs',    'plenty', ''],
    ['Mint',                               'herbs',    'plenty', ''],
    ['Epazote',                            'herbs',    'out',    'wait for it at the tianguis'],
    ['Basil',                              'herbs',    'plenty', ''],

    // grains / starches
    ['Rice (jasmine)',                     'grains',   'plenty', ''],
    ['Rice (basmati)',                     'grains',   'plenty', ''],
    ['Corn tortillas',                     'grains',   'plenty', ''],
    ['Flour tortillas',                    'grains',   'low',    ''],
    ['Pasta (rigatoni)',                   'grains',   'plenty', ''],
    ['Noodles (rice)',                     'grains',   'plenty', ''],
    ['Couscous',                           'grains',   'plenty', ''],
    ['Bolillo',                            'grains',   'out',    'bakery run before tortas'],
    ['Black beans (dried)',                'grains',   'plenty', ''],
    ['Lentils (red)',                      'grains',   'plenty', ''],

    // dairy
    ['Butter (unsalted)',                  'dairy',    'plenty', ''],
    ['Media crema',                        'dairy',    'low',    'lime crema, swooshes'],
    ['Crema (mexicana)',                   'dairy',    'plenty', ''],
    ['Greek yoghurt',                      'dairy',    'plenty', ''],
    ['Queso fresco',                       'dairy',    'low',    'crumble on everything'],
    ['Queso Oaxaca',                       'dairy',    'plenty', ''],
    ['Cotija',                             'dairy',    'plenty', ''],
    ['Parmesan',                           'dairy',    'plenty', ''],
  ];

  // -----------------------------------------------------------------
  // Suggestions — voice-forward, one-line hooks. Each has a narrowing
  // question with two/three answer chips (SKILL.md Mode 1 step 4).
  // -----------------------------------------------------------------
  const SUGGESTIONS = [
    {
      hook: "Sticky, smoky, with a bright lime-crema swoosh. Smash the thighs flat for max surface area; the glaze catches in the oven until the edges turn lacquered. Lime + chipotle + honey is the trinity.",
      pattern: "Bowl (starch + protein + 2 veg + sauce + acid)",
      anchor: "latin · spice-anchor: chipotle + cumin + Mexican oregano",
      reason: "Chipotle in adobo plenty, elote plenty, honey plenty. Media crema is low but enough for the swoosh.",
      cut: "thigh (boneless, smashed flat)",
      time: "35m total · 20m active",
      flags: ["weeknight", "uses today's star"],
      narrowing: {
        q: "Crunchy and charred, or saucy and tender?",
        choices: [
          { label: "charred", note: "hard sear, almost-burnt glaze" },
          { label: "tender",  note: "lower oven, longer glaze" }
        ]
      }
    },
    {
      hook: "Braised forever in chipotle-tomato adobo until it shreds with a fork. Pile on warm tortillas with a snowfall of cotija and a drag of crema. The kind of taco that ruins other tacos for you.",
      pattern: "Taco (warm tortilla + bold protein + slaw + creamy + herb)",
      anchor: "latin · sauce archetype: tomato + chile adobo",
      reason: "Bone-in thighs are out, but boneless work fine. Jitomate + tomato paste + chipotle in adobo all plenty.",
      cut: "thigh (bone-in preferred; boneless ok)",
      time: "55m total · 20m active",
      flags: ["slow", "leftovers extend to lunch"],
      narrowing: {
        q: "Crispy-edged tinga, or full braise that falls apart?",
        choices: [
          { label: "crispy edge", note: "shred + crisp in a hot pan at the end" },
          { label: "full braise", note: "low and slow, eaten with a spoon" }
        ]
      }
    },
    {
      hook: "Coconut milk hits the pan, you bloom curry paste until the kitchen smells like vacation. Thighs poach in the broth, lime at the very end. Jasmine rice underneath, absorbing everything.",
      pattern: "One-pot (sear → bloom → liquid → return → finish with acid)",
      anchor: "se asian · spice anchor: garlic + ginger + curry + lime",
      reason: "Ginger plenty, jasmine rice plenty, limes plenty. A weeknight that drinks like a holiday.",
      cut: "thigh (boneless)",
      time: "30m total · 15m active",
      flags: ["weeknight"],
      narrowing: {
        q: "Warming spice, or bright and fresh?",
        choices: [
          { label: "warming", note: "more curry paste, longer simmer" },
          { label: "bright",  note: "more lime + Thai basil at the end" }
        ]
      }
    },
    {
      hook: "Whole bird spatchcocked flat, rubbed with za'atar and lemon zest, then roasted hot until the skin is golden and crackling. Tahini drizzle pulled across the platter at the end.",
      pattern: "Traybake (protein + hearty veg + sauce → high heat)",
      anchor: "middle eastern · spice anchor: za'atar + sumac + cumin",
      reason: "Whole chicken is OUT. Could pivot to drumsticks (plenty) — same flavor profile, smaller commitment.",
      cut: "whole bird (drumstick swap available)",
      time: "1h 10m total · 15m active",
      flags: ["weekend", "swap suggested"],
      narrowing: {
        q: "Stick with whole bird (means a store run), or pivot to drumsticks?",
        choices: [
          { label: "store run",   note: "weekend project, get the bird" },
          { label: "drumsticks",  note: "same flavor, no shopping" }
        ]
      }
    },
    {
      hook: "Mango pureed with habanero, garlic, lime, a glug of vinegar — that's the glaze. Brush it on drumsticks while they roast until the edges catch and turn lacquered. Floral heat meets ripe sweet.",
      pattern: "Traybake → glaze finish",
      anchor: "fusion · mango-habanero · sweet-floral-heat",
      reason: "Mangoes are peaking at the tianguis. Drumsticks plenty, habaneros low (use 1 — that's all you need).",
      cut: "drumstick",
      time: "40m total · 10m active",
      flags: ["adventurous", "seasonal"],
      narrowing: {
        q: "How brave are we feeling with the habanero?",
        choices: [
          { label: "one chile",  note: "background floral heat" },
          { label: "two chiles", note: "real burn, kids ask for water" }
        ]
      }
    },
    {
      hook: "Hot wok, neutral oil, garlic-ginger pounding the air. Thighs go in, sear hard, then gochujang-soy-honey hits and reduces to lacquer in 90 seconds. Done before the rice is ready.",
      pattern: "Stir-fry (high heat + sticky glaze)",
      anchor: "korean fusion · sticky asian glaze",
      reason: "Gochujang is OUT — flagged as unlock ingredient. Swap with chipotle in adobo + honey lands you back at #1.",
      cut: "thigh (boneless, bite-sized)",
      time: "15m total · 10m active",
      flags: ["quick", "needs gochujang or swap"],
      narrowing: {
        q: "Wait for gochujang, or do the chipotle swap tonight?",
        choices: [
          { label: "swap tonight", note: "same glaze register, different DNA" },
          { label: "wait",         note: "save it for after the shop run" }
        ]
      }
    },
    {
      hook: "Dried chiles toasted on the comal until they smell like a campfire, soaked, blended with garlic and vinegar into a deep-red adobo. Thighs swim in it in the slow cooker all afternoon. Pulled three different directions across the week.",
      pattern: "Batch-then-riff (one base, 3 weeknight meals)",
      anchor: "latin · marinade archetype: dried chile adobo",
      reason: "Ancho + guajillo + chipotle dried — all plenty. Bone-in thighs are out; boneless work but use double quantity.",
      cut: "thigh (bone-in preferred)",
      time: "6h total · 20m active",
      flags: ["batch", "best for sunday cook"],
      narrowing: {
        q: "How do you want the week to riff?",
        choices: [
          { label: "tacos + bowls + soup", note: "classic 3-way pull" },
          { label: "all tacos",            note: "no apologies" }
        ]
      }
    }
  ];

  // Recipe ingredient list — names map back into PANTRY for live diff.
  // (Format: [display name, pantry-lookup name])
  const RECIPE_INGREDIENTS = [
    ['chicken thighs (boneless)',  'Chicken thighs (boneless)'],
    ['chipotle in adobo',          'Chipotle in adobo (canned)'],
    ['honey',                      'Honey'],
    ['elote',                      'Elote'],
    ['cumin (ground)',             'Cumin (ground)'],
    ['Mexican oregano',            'Oregano (Mexican)'],
    ['smoked paprika',             'Smoked paprika'],
    ['jalapeños',                  'Jalapeños'],
    ['white onion',                'White onion'],
    ['garlic',                     'Garlic'],
    ['apple cider vinegar',        'Apple cider vinegar'],
    ['soy sauce',                  'Soy sauce'],
    ['media crema',                'Media crema'],
    ['limes',                      'Limes'],
    ['cilantro',                   'Cilantro'],
    ['kosher salt',                'Salt (kosher)'],
  ];

  // -----------------------------------------------------------------
  // App state
  // -----------------------------------------------------------------
  const state = {
    view: 'today',
    selSug: 0,
    selPantry: 0,
    pantryFilter: 'all',
    pantryCat: 'all',
    pantrySort: 'status',
    pantryFind: '',
    pantryRows: [],
    theme: 'light',           // v2 default: warm paper for kitchen daytime use
    overlayOpen: false,
    helpOpen: false,
    narrowedChoice: null,     // null | { sugIdx, choiceIdx } — last narrowing answer
  };

  const VIEWS = ['today', 'suggestions', 'recipe', 'pantry', 'shopping'];

  // -----------------------------------------------------------------
  // Helpers
  // -----------------------------------------------------------------
  const $  = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  function clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, n)); }

  function pantryByName(name) {
    return PANTRY.find(p => p[0] === name);
  }

  function pantryCounts() {
    const c = { plenty: 0, low: 0, out: 0 };
    PANTRY.forEach(([, , s]) => c[s]++);
    return c;
  }

  function setMode(mode) {
    $('#sb-mode').textContent = mode;
    $('#statusbar').dataset.mode = mode;
  }

  function setView(name) {
    if (!VIEWS.includes(name)) return;
    state.view = name;
    $$('#tabs .tab').forEach(t => t.classList.toggle('active', t.dataset.view === name));
    $$('.view').forEach(v => { v.hidden = (v.dataset.view !== name); });
    $('#sb-view').textContent = name;
    if (name === 'suggestions') renderSuggestionDetail();
    if (name === 'pantry') renderPantry();
    if (name === 'recipe') renderRecipeCheck();
    if (name === 'today') renderTodayStats();
    if (name === 'shopping') renderShopping();
  }

  // -----------------------------------------------------------------
  // Today :: live stats from PANTRY (no more hardcoded 42/11/18)
  // -----------------------------------------------------------------
  function renderTodayStats() {
    const c = pantryCounts();
    const total = c.plenty + c.low + c.out;
    const pct = n => total ? Math.round((n / total) * 100) : 0;

    $('#today-stats').innerHTML = `
      <div class="stat"><span class="big ok">${c.plenty}</span><span class="lbl">plenty</span></div>
      <div class="stat"><span class="big warn">${c.low}</span><span class="lbl">low</span></div>
      <div class="stat"><span class="big bad">${c.out}</span><span class="lbl">out</span></div>
    `;
    $('#today-bar').innerHTML = `
      <div class="bar-plenty" style="width:${pct(c.plenty)}%"></div>
      <div class="bar-low"    style="width:${pct(c.low)}%"></div>
      <div class="bar-out"    style="width:${pct(c.out)}%"></div>
    `;
    $('#today-legend').innerHTML = `
      <span><i class="dot ok"></i> ${pct(c.plenty)}% plenty</span>
      <span><i class="dot warn"></i> ${pct(c.low)}% low</span>
      <span><i class="dot bad"></i> ${pct(c.out)}% out</span>
    `;
    const lowItems = PANTRY.filter(p => p[2] === 'low').slice(0, 6).map(p => p[0]);
    $('#today-low').innerHTML = lowItems.map(n => `<li>${n.toLowerCase()}</li>`).join('');

    // shopping summary, also computed
    const restock = PANTRY.filter(p => p[2] === 'out').length;
    const topup   = PANTRY.filter(p => p[2] === 'low').length;
    const seasonal = 3;
    const unlock = 2;
    const total_items = restock + topup + seasonal + unlock;
    $('#today-shop-stats').innerHTML = `
      <div class="stat"><span class="big">${total_items}</span><span class="lbl">items</span></div>
      <div class="stat"><span class="big">4</span><span class="lbl">lists</span></div>
      <div class="stat"><span class="big">${unlock}</span><span class="lbl">new</span></div>
    `;
    $('#today-shop-kv').innerHTML = `
      <tr><td>restock</td>    <td class="bad">  ${restock} items</td></tr>
      <tr><td>top up</td>     <td class="warn"> ${topup} items</td></tr>
      <tr><td>seasonal</td>   <td class="ok">   ${seasonal} picks</td></tr>
      <tr><td>unlock</td>     <td class="accent">${unlock} new   </td></tr>
    `;
  }

  // -----------------------------------------------------------------
  // Suggestions :: list + detail with narrowing question
  // -----------------------------------------------------------------
  function renderSuggestionDetail() {
    const i = state.selSug;
    const s = SUGGESTIONS[i];
    $('#sug-meta').textContent = `${i + 1} / ${SUGGESTIONS.length}`;
    const tagsHtml = s.flags.map(f => `<span class="tag">${f}</span>`).join(' ');

    // narrowing question with answer chips
    const choiceHtml = s.narrowing.choices.map((c, idx) => {
      const picked = state.narrowedChoice
                  && state.narrowedChoice.sugIdx === i
                  && state.narrowedChoice.choiceIdx === idx;
      return `
        <button class="choice ${picked ? 'sel' : ''}" data-choice-idx="${idx}">
          <span class="ck">[${idx + 1}]</span> ${c.label}
          <span class="dim"> — ${c.note}</span>
        </button>
      `;
    }).join('');

    $('#sug-detail').innerHTML = `
      <div class="rh-sub">tasting note</div>
      <p style="margin: 4px 0 14px; max-width: 60ch;">${s.hook}</p>

      <div class="rh-sub">assembly</div>
      <p style="margin: 4px 0 10px;">${s.pattern}</p>

      <div class="rh-sub">anchor</div>
      <p style="margin: 4px 0 10px;">${s.anchor}</p>

      <div class="rh-sub">why this dish, today</div>
      <p style="margin: 4px 0 10px; color: var(--fg-mute);">${s.reason}</p>

      <table class="kv tight">
        <tr><td>cut</td><td>${s.cut}</td></tr>
        <tr><td>time</td><td>${s.time}</td></tr>
      </table>

      <div style="margin-top: 10px;">${tagsHtml}</div>

      <div class="narrowing">
        <div class="q">${s.narrowing.q}</div>
        <div class="choices">${choiceHtml}</div>
      </div>

      <div class="hint">
        <span class="key">enter</span> open recipe &nbsp;
        <span class="key">1/2</span> pick narrowing answer &nbsp;
        <span class="key">j/k</span> next/prev
      </div>
    `;
    $$('#sug-table tbody tr').forEach((tr, idx) => {
      tr.classList.toggle('sel', idx === i);
    });
    const row = $$('#sug-table tbody tr')[i];
    if (row) row.scrollIntoView({ block: 'nearest' });

    // wire choice clicks
    $$('#sug-detail .choice').forEach(btn => {
      btn.addEventListener('click', () => {
        const choiceIdx = parseInt(btn.dataset.choiceIdx, 10);
        state.narrowedChoice = { sugIdx: i, choiceIdx };
        renderSuggestionDetail();
        flashStatus(`narrowed: ${s.narrowing.choices[choiceIdx].label}`);
      });
    });
  }

  // click handler for suggestion rows
  $$('#sug-table tbody tr').forEach(tr => {
    tr.addEventListener('click', () => {
      state.selSug = parseInt(tr.dataset.idx, 10);
      renderSuggestionDetail();
    });
    tr.addEventListener('dblclick', () => setView('recipe'));
  });

  // -----------------------------------------------------------------
  // Recipe :: ingredient check rendered live from PANTRY
  // -----------------------------------------------------------------
  function renderRecipeCheck() {
    const tbody = $('#recipe-check-tbody');
    if (!tbody) return;
    const rows = RECIPE_INGREDIENTS.map(([display, key]) => {
      const p = pantryByName(key);
      const status = p ? p[2] : 'out';
      return `<tr><td>${display}</td><td class="${status}">${status}</td></tr>`;
    });
    tbody.innerHTML = rows.join('');

    const anyOut = RECIPE_INGREDIENTS.some(([, key]) => {
      const p = pantryByName(key); return p && p[2] === 'out';
    });
    const anyLow = RECIPE_INGREDIENTS.some(([, key]) => {
      const p = pantryByName(key); return p && p[2] === 'low';
    });
    const summary = $('#recipe-check-summary');
    if (anyOut) {
      summary.innerHTML = `<span class="bad">missing one or more required items</span>`;
    } else if (anyLow) {
      summary.innerHTML = `<span class="warn">in stock — a couple of low items, used sparingly</span>`;
    } else {
      summary.innerHTML = `<span class="ok">all required items in stock</span>`;
    }
  }

  // -----------------------------------------------------------------
  // Pantry :: render with filter / sort / find
  // -----------------------------------------------------------------
  const STATUS_ORDER = { out: 0, low: 1, plenty: 2 };
  const CAT_LABEL = {
    proteins: 'proteins', spices: 'spices', chiles: 'chiles',
    oils: 'oils/acids', sauces: 'sauces', veg: 'veg',
    herbs: 'herbs', grains: 'grains', dairy: 'dairy',
  };

  function computePantryRows() {
    let rows = PANTRY.map(([name, cat, status, note]) => ({ name, cat, status, note }));
    if (state.pantryFilter !== 'all') {
      rows = rows.filter(r => r.status === state.pantryFilter);
    }
    if (state.pantryCat !== 'all') {
      rows = rows.filter(r => r.cat === state.pantryCat);
    }
    if (state.pantryFind) {
      const q = state.pantryFind.toLowerCase();
      rows = rows.filter(r =>
        r.name.toLowerCase().includes(q) ||
        r.note.toLowerCase().includes(q) ||
        r.cat.toLowerCase().includes(q)
      );
    }
    const sort = state.pantrySort;
    rows.sort((a, b) => {
      if (sort === 'status') {
        const d = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
        if (d) return d;
        return a.name.localeCompare(b.name);
      }
      if (sort === 'name') return a.name.localeCompare(b.name);
      if (sort === 'cat') {
        const d = a.cat.localeCompare(b.cat);
        if (d) return d;
        return a.name.localeCompare(b.name);
      }
      return 0;
    });
    return rows;
  }

  function renderPantry() {
    state.pantryRows = computePantryRows();
    state.selPantry = clamp(state.selPantry, 0, Math.max(0, state.pantryRows.length - 1));

    const tbody = $('#pantry-tbody');
    tbody.innerHTML = state.pantryRows.map((r, i) => `
      <tr data-idx="${i}" class="${i === state.selPantry ? 'sel' : ''}">
        <td class="num-col">${i + 1}</td>
        <td>${r.name}</td>
        <td><span class="dim">${CAT_LABEL[r.cat] || r.cat}</span></td>
        <td class="${r.status}">${r.status}</td>
        <td><span class="dim">${r.note || ''}</span></td>
      </tr>
    `).join('');

    const c = pantryCounts();
    $('#pantry-total').textContent = PANTRY.length;
    $('#pantry-counts').textContent =
      `${c.plenty} plenty · ${c.low} low · ${c.out} out · ${state.pantryRows.length} shown`;

    $$('#pantry-table tbody tr').forEach(tr => {
      tr.addEventListener('click', () => {
        state.selPantry = parseInt(tr.dataset.idx, 10);
        renderPantry();
      });
    });

    const row = $$('#pantry-table tbody tr')[state.selPantry];
    if (row) row.scrollIntoView({ block: 'nearest' });
  }

  $$('.filter-chip').forEach(c => c.addEventListener('click', () => {
    $$('.filter-chip').forEach(x => x.classList.remove('sel'));
    c.classList.add('sel');
    state.pantryFilter = c.dataset.filter;
    state.selPantry = 0;
    renderPantry();
  }));
  $$('.cat-chip').forEach(c => c.addEventListener('click', () => {
    $$('.cat-chip').forEach(x => x.classList.remove('sel'));
    c.classList.add('sel');
    state.pantryCat = c.dataset.cat;
    state.selPantry = 0;
    renderPantry();
  }));
  $$('.sort-chip').forEach(c => c.addEventListener('click', () => {
    $$('.sort-chip').forEach(x => x.classList.remove('sel'));
    c.classList.add('sel');
    state.pantrySort = c.dataset.sort;
    renderPantry();
  }));

  function cyclePantryStatus() {
    if (state.view !== 'pantry') return;
    const row = state.pantryRows[state.selPantry];
    if (!row) return;
    const idx = PANTRY.findIndex(p => p[0] === row.name);
    if (idx === -1) return;
    const next = STATUS[(STATUS.indexOf(PANTRY[idx][2]) + 1) % STATUS.length];
    PANTRY[idx][2] = next;
    renderPantry();
    renderTodayStats();
  }

  // -----------------------------------------------------------------
  // Shopping :: restock + top-up rendered from PANTRY
  // -----------------------------------------------------------------
  // Voice notes for staples so the rendered shopping list reads like
  // SKILL.md prose, not a database dump.
  const STAPLE_NOTES = {
    'Whole chicken':                     'sunday project — spatchcock + traybake',
    'Chicken thighs (bone-in, skin-on)': 'the braise backbone, always restock',
    'Chicken legs (whole)':              'for the slow cooker pull',
    'Bolillo':                           'tortas need this, bakery run',
    'Chile pasilla':                     'mole adobo backstop',
    'Epazote':                           'wait for it at the tianguis — worth it',
    'Gochujang':                         'unlock korean glazes (asian aisle)',
    'Media crema':                       'lime crema, sauces, finishing swoosh',
    'Cilantro':                          'workhorse herb, dies fast',
    'Sesame oil':                        'a few drops finish a stir-fry',
    'Queso fresco':                      'crumble on everything',
    'Tahini':                            'lemon-tahini drizzle, hummus pivot',
    'Curry powder':                      'one-pot coconut curries',
    'Sumac':                             'finish on roasted things, acid pop',
    'Miso paste':                        'glazes + dressings',
    'Habaneros':                         'one is all you need for mango heat',
    'Flour tortillas':                   'breakfast quesadillas, grocery aisle',
    'Lemons':                            'when the limes can\'t do it alone',
    'Chile morita':                      'smoke + heat backup to chipotle',
    'Chicken breast (bone-in)':          'poach + shred for cold week lunches',
  };

  function renderShopping() {
    const restock = PANTRY.filter(p => p[2] === 'out');
    const topup   = PANTRY.filter(p => p[2] === 'low');

    const render = items => items.map(([name, , , note]) => {
      const voice = STAPLE_NOTES[name] || note || '';
      return `<li><span class="cb">[ ]</span> ${name.toLowerCase()}${voice ? ` <span class="dim">— ${voice}</span>` : ''}</li>`;
    }).join('');

    const r = $('#shop-restock');
    const t = $('#shop-topup');
    if (r) r.innerHTML = render(restock);
    if (t) t.innerHTML = render(topup);

    // wire checkboxes
    $$('.check-list .cb').forEach(cb => {
      if (cb.dataset.wired) return;
      cb.dataset.wired = '1';
      cb.addEventListener('click', () => {
        const checked = cb.classList.toggle('checked');
        cb.textContent = checked ? '[x]' : '[ ]';
      });
    });
  }

  // -----------------------------------------------------------------
  // Find overlay
  // -----------------------------------------------------------------
  const overlay = $('#overlay');
  const overlayInput = $('#overlay-input');
  function openOverlay() {
    state.overlayOpen = true;
    overlay.hidden = false;
    overlayInput.value = state.pantryFind;
    overlayInput.focus();
    overlayInput.select();
    setMode('FIND');
  }
  function closeOverlay(apply) {
    state.overlayOpen = false;
    overlay.hidden = true;
    if (apply) {
      state.pantryFind = overlayInput.value.trim();
      if (state.view !== 'pantry') setView('pantry');
      state.selPantry = 0;
      renderPantry();
    }
    setMode('NORMAL');
  }
  overlayInput.addEventListener('keydown', e => {
    if (e.key === 'Escape') { e.preventDefault(); closeOverlay(false); }
    else if (e.key === 'Enter') { e.preventDefault(); closeOverlay(true); }
  });
  overlayInput.addEventListener('input', () => {
    state.pantryFind = overlayInput.value.trim();
    if (state.view !== 'pantry') setView('pantry');
    state.selPantry = 0;
    renderPantry();
  });

  // -----------------------------------------------------------------
  // Help modal
  // -----------------------------------------------------------------
  const help = $('#help');
  function toggleHelp(force) {
    state.helpOpen = (force !== undefined) ? force : !state.helpOpen;
    help.hidden = !state.helpOpen;
    setMode(state.helpOpen ? 'HELP' : 'NORMAL');
  }
  help.addEventListener('click', e => { if (e.target === help) toggleHelp(false); });

  // -----------------------------------------------------------------
  // Theme toggle
  // -----------------------------------------------------------------
  function toggleTheme() {
    state.theme = state.theme === 'light' ? 'dark' : 'light';
    document.body.dataset.theme = state.theme;
  }

  // -----------------------------------------------------------------
  // Tabs (click)
  // -----------------------------------------------------------------
  $$('#tabs .tab').forEach(t => {
    t.addEventListener('click', () => setView(t.dataset.view));
  });

  // -----------------------------------------------------------------
  // Clock
  // -----------------------------------------------------------------
  function tickClock() {
    const d = new Date();
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    const ss = String(d.getSeconds()).padStart(2, '0');
    $('#ctx-clock').textContent = `${hh}:${mm}:${ss}`;
  }
  setInterval(tickClock, 1000);
  tickClock();

  // -----------------------------------------------------------------
  // Keyboard handling
  // -----------------------------------------------------------------
  function isTyping() {
    const t = document.activeElement;
    return t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable);
  }

  function moveSelection(delta) {
    if (state.view === 'suggestions') {
      state.selSug = clamp(state.selSug + delta, 0, SUGGESTIONS.length - 1);
      renderSuggestionDetail();
    } else if (state.view === 'pantry') {
      state.selPantry = clamp(state.selPantry + delta, 0, state.pantryRows.length - 1);
      renderPantry();
    }
  }
  function jumpTo(top) {
    if (state.view === 'suggestions') {
      state.selSug = top ? 0 : SUGGESTIONS.length - 1;
      renderSuggestionDetail();
    } else if (state.view === 'pantry') {
      state.selPantry = top ? 0 : Math.max(0, state.pantryRows.length - 1);
      renderPantry();
    }
  }

  document.addEventListener('keydown', e => {
    if (state.overlayOpen) return;
    if (state.helpOpen) {
      if (e.key === 'Escape' || e.key === '?' || e.key === 'q') {
        e.preventDefault();
        toggleHelp(false);
      }
      return;
    }
    if (isTyping()) return;

    const k = e.key;

    // numbers 1-5 → views; BUT on suggestions view, 1/2/3 also work
    // as narrowing-question answers if they're a valid choice.
    if (k >= '1' && k <= '9') {
      // narrowing question answer override
      if (state.view === 'suggestions') {
        const s = SUGGESTIONS[state.selSug];
        const ci = parseInt(k, 10) - 1;
        if (s.narrowing && ci < s.narrowing.choices.length) {
          e.preventDefault();
          state.narrowedChoice = { sugIdx: state.selSug, choiceIdx: ci };
          renderSuggestionDetail();
          flashStatus(`narrowed: ${s.narrowing.choices[ci].label}`);
          return;
        }
      }
      // view jumps
      if (k >= '1' && k <= '5') {
        e.preventDefault();
        setView(VIEWS[parseInt(k, 10) - 1]);
        return;
      }
    }

    switch (k) {
      case 'j':
      case 'ArrowDown':
        e.preventDefault(); moveSelection(1); return;
      case 'k':
      case 'ArrowUp':
        e.preventDefault(); moveSelection(-1); return;
      case 'g':
        e.preventDefault(); jumpTo(true); return;
      case 'G':
        e.preventDefault(); jumpTo(false); return;
      case 'h':
      case 'ArrowLeft': {
        e.preventDefault();
        const idx = VIEWS.indexOf(state.view);
        setView(VIEWS[(idx - 1 + VIEWS.length) % VIEWS.length]);
        return;
      }
      case 'l':
      case 'ArrowRight': {
        e.preventDefault();
        const idx = VIEWS.indexOf(state.view);
        setView(VIEWS[(idx + 1) % VIEWS.length]);
        return;
      }
      case 'Tab': {
        e.preventDefault();
        const idx = VIEWS.indexOf(state.view);
        const next = e.shiftKey
          ? (idx - 1 + VIEWS.length) % VIEWS.length
          : (idx + 1) % VIEWS.length;
        setView(VIEWS[next]);
        return;
      }
      case 'Enter':
        e.preventDefault();
        if (state.view === 'suggestions') setView('recipe');
        else if (state.view === 'today') setView('recipe');
        else if (state.view === 'pantry') cyclePantryStatus();
        return;
      case ' ':
        e.preventDefault();
        cyclePantryStatus();
        return;
      case '/':
        e.preventDefault();
        openOverlay();
        return;
      case 't':
        e.preventDefault();
        toggleTheme();
        return;
      case '?':
        e.preventDefault();
        toggleHelp(true);
        return;
      case 's':
        if (state.view === 'today' || state.view === 'suggestions') {
          e.preventDefault();
          state.selSug = (state.selSug + 1) % SUGGESTIONS.length;
          setView('suggestions');
        }
        return;
      case 'm':
        if (state.view === 'today') {
          e.preventDefault();
          flashStatus('marked cooked · logged to journal');
        }
        return;
      case 'Escape':
        if (state.helpOpen) toggleHelp(false);
        return;
    }
  });

  // brief status-bar flash
  let flashTimer = null;
  function flashStatus(msg) {
    const right = $('#sb-right');
    const bar = $('#statusbar');
    const prev = right.textContent;
    right.textContent = msg;
    bar.classList.add('flash');
    clearTimeout(flashTimer);
    flashTimer = setTimeout(() => {
      right.textContent = prev;
      bar.classList.remove('flash');
    }, 1800);
  }

  // -----------------------------------------------------------------
  // Boot
  // -----------------------------------------------------------------
  setView('today');
  renderTodayStats();
  renderSuggestionDetail();
  renderPantry();
  renderRecipeCheck();
  renderShopping();

})();
