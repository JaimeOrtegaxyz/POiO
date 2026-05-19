/* POiO conversational mockup — canned data (v2).
   Drawn from pantry.example.md and references/style-guide.md.
   Region: Guadalajara / Western Mexico (May — tail end of mango season,
   tomatillo and elote coming in). */

window.POIO_DATA = {
  // ---------- pantry (grouped) ----------
  pantry: [
    {
      group: "Proteins",
      items: [
        { name: "Chicken thighs (boneless)", status: "plenty" },
        { name: "Chicken thighs (bone-in)", status: "plenty" },
        { name: "Chicken breast", status: "low" },
        { name: "Whole chicken", status: "out" },
        { name: "Eggs", status: "plenty" },
      ],
    },
    {
      group: "Fresh — produce & herbs",
      items: [
        { name: "Limes", status: "plenty" },
        { name: "White onion", status: "plenty" },
        { name: "Garlic", status: "plenty" },
        { name: "Cilantro", status: "plenty" },
        { name: "Tomatillos", status: "plenty" },
        { name: "Poblanos", status: "plenty" },
        { name: "Jalapeños", status: "plenty" },
        { name: "Elote (corn)", status: "low" },
        { name: "Avocado", status: "low" },
        { name: "Epazote", status: "low" },
        { name: "Red onion", status: "plenty" },
        { name: "Tomatoes", status: "plenty" },
        { name: "Habaneros", status: "out" },
        { name: "Nopales", status: "out" },
      ],
    },
    {
      group: "Sauces & pastes",
      items: [
        { name: "Chipotle in adobo", status: "plenty" },
        { name: "Salsa macha", status: "plenty" },
        { name: "Soy sauce", status: "plenty" },
        { name: "Gochujang", status: "low" },
        { name: "Fish sauce", status: "low" },
        { name: "Tahini", status: "out" },
        { name: "Harissa", status: "out" },
      ],
    },
    {
      group: "Dairy",
      items: [
        { name: "Media crema", status: "plenty" },
        { name: "Crema", status: "low" },
        { name: "Queso fresco", status: "plenty" },
        { name: "Cotija", status: "low" },
        { name: "Greek yoghurt", status: "out" },
      ],
    },
    {
      group: "Spices",
      items: [
        { name: "Cumin (ground)", status: "plenty" },
        { name: "Mexican oregano", status: "plenty" },
        { name: "Smoked paprika", status: "plenty" },
        { name: "Tajin", status: "plenty" },
        { name: "Garam masala", status: "low" },
        { name: "Sumac", status: "out" },
        { name: "Za'atar", status: "out" },
      ],
    },
    {
      group: "Starches & grains",
      items: [
        { name: "Corn tortillas", status: "plenty" },
        { name: "Rice (jasmine)", status: "plenty" },
        { name: "Bolillo", status: "low" },
        { name: "Flour tortillas", status: "out" },
        { name: "Pasta", status: "plenty" },
      ],
    },
    {
      group: "Pantry staples",
      items: [
        { name: "Olive oil", status: "plenty" },
        { name: "Black beans (canned)", status: "plenty" },
        { name: "Coconut milk", status: "low" },
        { name: "Chicken stock", status: "plenty" },
        { name: "Honey", status: "plenty" },
        { name: "Pepitas", status: "low" },
      ],
    },
  ],

  // ---------- ongoing shopping list (ambient state) ----------
  shoppingList: [
    { item: "Limes", note: "always stocked" },
    { item: "Avocados", note: "running low" },
    { item: "Crema", note: "for finishing" },
  ],

  // ---------- Today (the new first-class view) ----------
  today: {
    date: "Tuesday, May 19",
    region: "Guadalajara · Western Mexico",
    weather: "warm evening · 26°C",
    headline: "Smashed chipotle-lime bowl",
    headlineVibe: "Quick weeknight. 20 min from cold pan to bowl.",
    why: "Tomatillos and elote are loud at the tianguis. You've got chipotle in adobo, salsa macha, thighs — everything that matters is on the shelf. Avocado and elote are low; recipe accounts for it.",
    callouts: [
      { kind: "low", text: "Avocado, Elote, Crema — running low" },
      { kind: "out", text: "Habaneros, Tahini — out of stock" },
      { kind: "peak", text: "Mangoes are peaking. Make something." },
    ],
  },

  // ---------- Mode 1: 5–7 suggestion deck ----------
  suggestions: {
    intro:
`Pulled up your pantry. Tomatillos and poblanos are loud right now, you've got media crema and chipotle in adobo on the shelf, and there's a stack of corn tortillas waiting to be used. Good day to cook.

Here's where I'd go:`,
    items: [
      {
        n: 1,
        title: "Chipotle-Honey Glazed Thighs",
        hook: "Bone-in, sticky and lacquered, charred at the edges. Honey hits the adobo and goes mahogany under the broiler.",
        tags: [{ label: "weeknight", cls: "quick" }, { label: "oven", cls: "" }],
      },
      {
        n: 2,
        title: "Pollo en Salsa Verde",
        hook: "Tomatillos blistered until they collapse, blitzed with serrano and cilantro, thighs braised in it until they pull apart. Epazote at the end.",
        tags: [{ label: "one-pot", cls: "" }, { label: "uses epazote (low)", cls: "" }],
      },
      {
        n: 3,
        title: "Smashed Chipotle-Lime Chicken Bowl",
        hook: "Boneless thighs pressed flat, blistered in a hot pan, sliced over rice with charred elote, avocado, pickled red onion. Salsa macha on top.",
        tags: [
          { label: "20 min", cls: "quick" },
          { label: "bowl", cls: "" },
        ],
      },
      {
        n: 4,
        title: "Slow Cooker Tinga",
        hook: "Tomato + chipotle + onion, low and slow. Shred it in the morning, eat it three different ways this week — tostadas, tortas, tacos.",
        tags: [{ label: "batch-then-riff", cls: "slow" }],
      },
      {
        n: 5,
        title: "Poblano-Crema Chicken Skillet",
        hook: "Poblanos charred and peeled, blended with garlic and media crema into a green pool. Chicken nestled in, finished with queso fresco.",
        tags: [{ label: "one-pan", cls: "" }, { label: "in season", cls: "season" }],
      },
      {
        n: 6,
        title: "Korean-Style Gochujang Tacos",
        hook: "Thighs glazed with gochujang + honey + soy, charred, tucked into corn tortillas with cabbage slaw and a quick chipotle crema. Flavor bridge: smoky-sweet-fermented.",
        tags: [{ label: "adventurous", cls: "adventurous" }],
      },
      {
        n: 7,
        title: "Caldo Tlalpeño",
        hook: "Brothy, smoky from a single chipotle in adobo, chicken poached gentle, garbanzos, avocado and lime at the table. Weeknight medicine.",
        tags: [{ label: "brothy", cls: "" }],
      },
    ],
    outro: "Or tell me what you're in the mood for and I'll narrow it.",
  },

  // ---------- Mode 1 step 4: narrowing follow-up ----------
  narrow_3:
`Good pick. That one's a workhorse — you've got everything for it.

One question to lock it in: **char it hard and bright with salsa macha**, or **soft, saucy, finished with media crema**?`,

  // ---------- Recipes (v2: four are fully wired) ----------
  recipes: {
    1: {
      name: "Chipotle-Honey Glazed Thighs",
      vibe: "Sticky, mahogany, fingers-licked. The broiler does most of the work; you mostly stay out of its way.",
      hero: { emoji: "🔥", gradient: "linear-gradient(135deg, #c14b2a 0%, #7a2a18 100%)" },
      timeActive: "10 min",
      timeTotal: "35 min",
      serves: 3,
      ingredients: [
        { label: "Protein", items: [
          { text: "Bone-in chicken thighs, skin-on", qty: "6 (about 1 kg)" },
        ]},
        { label: "Glaze", items: [
          { text: "Chipotle in adobo (3 chiles + a spoonful of sauce)", qty: "3", star: true },
          { text: "Honey", qty: "3 tbsp", star: true },
          { text: "Garlic, grated", qty: "3 cloves" },
          { text: "Lime juice", qty: "1 lime worth" },
          { text: "Soy sauce", qty: "1 tbsp" },
          { text: "Olive oil", qty: "1 tbsp" },
        ]},
        { label: "To finish", items: [
          { text: "Cilantro, chopped", qty: "small handful" },
          { text: "Lime wedges", qty: "for the table" },
          { text: "Salt — kosher", qty: "to taste" },
        ]},
      ],
      method: [
        "Heat the oven to 220°C. Line a sheet pan with foil — the glaze will burn onto it and you don't want to scrub.",
        "Blitz or chop the chipotles to a paste. Whisk with honey, garlic, lime, soy, oil, and a big pinch of salt.",
        "Pat the thighs dry. Toss with two-thirds of the glaze; reserve the rest. Skin-side up on the sheet pan.",
        "Roast 22 minutes. Brush with the reserved glaze. Crank the broiler and go 3–4 minutes until the tops are blistered and lacquered. Watch them.",
        "Rest 5 minutes. Scatter cilantro. Lime at the table, used aggressively.",
      ],
      finish: `Plate over rice or just a pile of corn tortillas. Spoon the pan juices over them — that's the whole point. Lime wedges within reach. Eat with your hands.`,
      notes: [
        "Bone-in stays juicier under the broiler. Boneless works in 16 minutes flat — drop the broil to 2 minutes.",
        "Leftovers: shred and stretch into the tinga slot tomorrow.",
      ],
      panchips: [
        { name: "chipotle in adobo", status: "plenty" },
        { name: "bone-in thighs", status: "plenty" },
        { name: "honey", status: "plenty" },
        { name: "limes", status: "plenty" },
        { name: "cilantro", status: "plenty" },
      ],
    },

    2: {
      name: "Pollo en Salsa Verde",
      vibe: "Tangy, herbal, the kind of one-pot dish where the sauce wants a tortilla to mop it.",
      hero: { emoji: "🌿", gradient: "linear-gradient(135deg, #7ea33a 0%, #3f5318 100%)" },
      timeActive: "20 min",
      timeTotal: "55 min",
      serves: 4,
      ingredients: [
        { label: "Protein", items: [
          { text: "Bone-in chicken thighs", qty: "6", star: true },
        ]},
        { label: "Salsa verde", items: [
          { text: "Tomatillos, husked and rinsed", qty: "700 g", star: true },
          { text: "Serrano chiles", qty: "2" },
          { text: "White onion, quartered", qty: "½" },
          { text: "Garlic", qty: "3 cloves" },
          { text: "Cilantro, big handful", qty: "1 bunch" },
          { text: "Epazote", qty: "few sprigs", low: true },
        ]},
        { label: "To cook & finish", items: [
          { text: "Olive oil", qty: "for the pan" },
          { text: "Chicken stock", qty: "200 ml" },
          { text: "Salt", qty: "to taste" },
          { text: "Crema, to spoon over", qty: "a swirl", low: true },
          { text: "Queso fresco, crumbled", qty: "pinch" },
        ]},
      ],
      method: [
        "Char the tomatillos, serranos, onion, and garlic on a dry comal or in a hot pan until they blister and collapse — about 8 minutes. Don't be timid.",
        "Blitz with cilantro and a pinch of salt. Taste — should be tangy, green, hot.",
        "Season the thighs. Sear them skin-side down in oil until deeply golden, 5 minutes; flip 2 more. Pull them out.",
        "Pour the salsa into the same pan. Let it darken and tighten, 4 minutes. Add stock. Tuck the thighs back in.",
        "Cover and braise on low, 30 minutes. Tear in epazote in the last 5.",
        "Taste, salt, swirl crema on top, scatter queso fresco. Corn tortillas mandatory.",
      ],
      finish: `Serve straight from the pan. Tortillas warmed on the comal alongside. Use them as scoops. The sauce wants to be mopped.`,
      notes: [
        "Epazote is *(low)* — one or two leaves is enough; it's a flavor, not a herb you pile on.",
        "Crema is *(low)* — media crema works in the same gesture, or skip it; the salsa stands.",
        "Leftovers: shred any remaining chicken into the sauce; tomorrow's enchiladas or chilaquiles base.",
      ],
      panchips: [
        { name: "tomatillos", status: "plenty" },
        { name: "thighs (bone-in)", status: "plenty" },
        { name: "epazote", status: "low" },
        { name: "crema", status: "low" },
        { name: "cilantro", status: "plenty" },
      ],
    },

    3: {
      name: "Smashed Chipotle-Lime Chicken Bowl",
      vibe: "Bright, smoky, a little messy. The kind of bowl where the lime juice runs into the rice and you don't mind.",
      hero: { emoji: "🍋", gradient: "linear-gradient(135deg, #c9852a 0%, #6b3a14 100%)" },
      timeActive: "15 min",
      timeTotal: "25 min",
      serves: 2,
      ingredients: [
        { label: "Protein", items: [
          { text: "Boneless chicken thighs", qty: "4 (about 500g)" },
        ]},
        { label: "Veg & Aromatics", items: [
          { text: "Elote (one ear, kernels cut off)", qty: "1", low: true },
          { text: "Red onion (half, sliced thin for quick-pickle)", qty: "½" },
          { text: "Avocado, sliced", qty: "1", low: true },
          { text: "Limes", qty: "2" },
          { text: "Cilantro, picked", qty: "small handful" },
        ]},
        { label: "Pantry & Spices", items: [
          { text: "Jasmine rice", qty: "1 cup, cooked" },
          { text: "Cumin (ground)", qty: "1 tsp" },
          { text: "Smoked paprika", qty: "1 tsp" },
          { text: "Mexican oregano", qty: "½ tsp, crushed" },
          { text: "Olive oil", qty: "for the pan" },
          { text: "Salt — kosher", qty: "to taste" },
        ]},
        { label: "Marinade & finish", items: [
          { text: "Chipotle in adobo (one chile + a spoon of sauce)", qty: "1", star: true },
          { text: "Lime juice + extra wedges", qty: "1 lime worth", star: true },
          { text: "Garlic, grated", qty: "2 cloves" },
          { text: "Salsa macha", qty: "to spoon over", star: true },
          { text: "Queso fresco, crumbled", qty: "a pinch" },
        ]},
      ],
      method: [
        "Quick-pickle the red onion — slice paper-thin, cover with juice of half a lime, pinch of salt, pinch of sugar. Leave it. It'll be ready by the time you plate.",
        "Marinade: chop the chipotle to a paste, mix with garlic, the juice of one lime, cumin, smoked paprika, oregano, a glug of oil. Coat the thighs and let them sit 10 minutes while the rice cooks.",
        "Press each thigh flat — palm down on the cutting board, push hard. More surface area = more char.",
        "Hot pan, thin film of oil, almost smoking. Lay the thighs in smoothest-side down. Don't touch them for 4–5 minutes. Deeply browned, crackling at the edges. Flip, 3 more minutes. Rest on a board.",
        "Same pan: throw in the elote kernels, dry, no oil. Toss until they catch and blister in spots — 2 minutes. Salt them.",
        "Slice the chicken against the grain into wide strips.",
      ],
      finish: `Rice in the bottom of the bowl. Chicken fanned across, juices and all. Charred elote in one corner, avocado in another, pickled onion in a bright pink pile on top. Cilantro scattered. A real spoonful of salsa macha — don't be shy. Queso fresco crumbled over. Lime wedge on the side, used aggressively at the table.`,
      notes: [
        "Avocado is *(low)* — if you only have one, slice it thin and let it stretch across two bowls; the elote can take the crunch slot.",
        "Elote is *(low)* — frozen corn works in the same dry-blister move.",
        "Keeps 3 days. Reheat the chicken gently in a covered pan with a splash of water; rebuild the bowl fresh.",
        "Leftovers: shred any remaining chicken into tomorrow's tacos with the pickled onion and a smear of media crema.",
      ],
      panchips: [
        { name: "chipotle in adobo", status: "plenty" },
        { name: "thighs (boneless)", status: "plenty" },
        { name: "elote", status: "low" },
        { name: "avocado", status: "low" },
        { name: "limes", status: "plenty" },
        { name: "salsa macha", status: "plenty" },
      ],
    },

    6: {
      name: "Korean-Style Gochujang Tacos",
      vibe: "Smoky, sweet, fermented, fast. A flavor bridge: gochujang and chipotle were always going to be friends.",
      hero: { emoji: "🌶", gradient: "linear-gradient(135deg, #c14b2a 0%, #6b3a4f 100%)" },
      timeActive: "20 min",
      timeTotal: "30 min",
      serves: 3,
      ingredients: [
        { label: "Protein", items: [
          { text: "Boneless chicken thighs", qty: "500 g" },
        ]},
        { label: "Glaze", items: [
          { text: "Gochujang", qty: "2 tbsp", star: true, low: true },
          { text: "Honey", qty: "1 tbsp", star: true },
          { text: "Soy sauce", qty: "1 tbsp" },
          { text: "Garlic, grated", qty: "2 cloves" },
          { text: "Sesame oil", qty: "1 tsp" },
          { text: "Lime juice", qty: "½ lime" },
        ]},
        { label: "Slaw & build", items: [
          { text: "Cabbage, shredded fine", qty: "2 cups" },
          { text: "Red onion, sliced thin", qty: "¼" },
          { text: "Lime juice (for slaw)", qty: "½ lime" },
          { text: "Cilantro, rough chopped", qty: "handful" },
          { text: "Corn tortillas", qty: "8" },
        ]},
        { label: "Chipotle crema", items: [
          { text: "Crema (or media crema)", qty: "3 tbsp", low: true },
          { text: "Chipotle in adobo, blitzed", qty: "1 tsp", star: true },
          { text: "Lime juice", qty: "squeeze" },
          { text: "Salt", qty: "pinch" },
        ]},
      ],
      method: [
        "Whisk the glaze. Toss the thighs in two-thirds of it. 10 minutes minimum.",
        "Slaw: cabbage, onion, lime, salt. Massage 30 seconds. Cilantro at the end.",
        "Crema: stir chipotle and lime into the crema. Taste. More chipotle if you're brave.",
        "Hot pan, oil. Sear thighs 4 minutes a side until deeply caramelized — the sugar in the gochujang and honey will catch fast, that's the point. Rest 3 minutes, slice.",
        "Warm tortillas on a dry comal until they puff and char in spots.",
        "Build: tortilla, chicken, slaw, chipotle crema, extra cilantro. Sesame seeds if you've got them.",
      ],
      finish: `Tacos on a board, lime wedges and the leftover gochujang glaze on the side for dunking. Eat over the counter, standing up.`,
      notes: [
        "Gochujang is *(low)* — half the amount, half the depth, but the chipotle picks up the slack.",
        "Crema is *(low)* — media crema works; thicker, sweeter, fine.",
        "If you're out of cabbage, quick-pickled red onion is the substitute.",
      ],
      panchips: [
        { name: "thighs (boneless)", status: "plenty" },
        { name: "gochujang", status: "low" },
        { name: "soy sauce", status: "plenty" },
        { name: "honey", status: "plenty" },
        { name: "corn tortillas", status: "plenty" },
        { name: "crema", status: "low" },
      ],
    },
  },

  // Recipes available in the demo (others show a graceful disabled state)
  wiredRecipes: [1, 2, 3, 6],

  // ---------- Mode 2: shopping ----------
  shopping: {
    intro:
`Good timing. Let's keep it tight. It's mid-May here — tomatillos and elote are everywhere, mangoes are at their absolute peak right now, and the first chiles de agua are starting to show up at the tianguis.`,
    restock: [
      { item: "Habaneros", note: "you ran out and the salsas miss them" },
      { item: "Flour tortillas", note: "for when corn doesn't fit the dish" },
      { item: "Greek yoghurt", note: "marinades and the cooling counterpoint" },
    ],
    topup: [
      { item: "Elote (3–4 ears)", note: "in everything this week" },
      { item: "Avocados", note: "down to one" },
      { item: "Crema", note: "almost out" },
      { item: "Epazote (a small bunch)", note: "for the salsa verde braise" },
      { item: "Bolillo", note: "tortas if you batch the tinga" },
    ],
    seasonal: [
      { item: "Mangoes — peaking", note: "mango-habanero glazed thighs; a quick mango-lime salsa for tacos" },
      { item: "Tomatillos — abundant", note: "salsa verde, chilaquiles base, braising liquid" },
      { item: "Chiles de agua (early)", note: "stuffed with queso Oaxaca and chicken, comal-charred" },
      { item: "Calabacitas", note: "diced into the tinga, or charred alongside the bowl" },
    ],
    unlock: [
      { item: "Pomegranate molasses", note: "Middle Eastern glazes — sticky-sour, pairs with sumac" },
      { item: "Tahini", note: "drizzle sauce archetype; opens up grain bowls with yoghurt swoosh" },
      { item: "Preserved lemon", note: "North African direction — unlocks chermoula and tagines" },
    ],
    outro: "Want me to compile this into a single list you can take?",
  },
};
