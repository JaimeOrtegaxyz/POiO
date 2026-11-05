/**
 * Screen copy, Mexican Spanish, B-C voice (VOICE.md): practical first, short
 * lines, no emoji, no exclamation spam, never comment on choices or discards.
 * Every string drawn on the emulated screen lives in this file.
 */

import { agree, agreement, joinY, listAgreement, pronoun } from '../../shared/grammar';
import type { PantryStatus } from '../../shared/pantry';

// ---------------------------------------------------------------------------
// The screen
// ---------------------------------------------------------------------------

export const MARK = 'POiO';

/** Masthead contexts. */
export const CONTEXT = {
  onboarding: 'Primera vez',
  choose: 'Para hoy',
  cookbook: 'Recetario',
  pantry: 'Despensa',
  notes: 'Lo que sé de ti',
};

/**
 * Affordance band: ● = hold the red star knob (talk), ◎ = turn it; "pulsa"
 * is a short press of the same knob. Static glyphs, what the controls do here.
 */
export const AFFORD = {
  onboarding: '● mantén y responde · pulsa para saltar',
  choose: '● mantén y habla · ◎ gira · pulsa para elegir',
  intro: '● mantén y habla · pulsa para empezar',
  check: '● mantén y habla · pulsa si todo está listo',
  missing: '● mantén y habla · ◎ gira · pulsa para elegir',
  cook: '● mantén y habla · pulsa: siguiente · ◎ vistazo',
  cookPeek: '● mantén y habla · pulsa para volver · ◎ vistazo',
  cookBand: '● mantén y habla · pulsa para quitar el aviso',
  done: '● mantén y habla · pulsa para seguir',
  taste: '● di un número · ◎ gira · pulsa para elegir',
  diff: '● sí o no · ◎ gira · pulsa para marcar',
  cookbook: '● mantén y habla · ◎ despensa · pulsa para abrir',
  cookbookEmpty: '● mantén y habla · ◎ despensa',
  pantry: '● mantén y habla · ◎ gira · pulsa para cambiar',
  notes: '● mantén y habla · ◎ gira · pulsa para salir',
};

/** Voice states: static, no motion. */
export const VOICE_STATE = {
  listening: 'Te escucho.',
  thinking: 'Pensando…',
  notUnderstood: 'No te entendí. Mantén el botón y dilo otra vez.',
};

export const LIMIT_LINE = 'Por hoy llegué a mi límite. Las recetas guardadas siguen aquí.';
export const OFFLINE_LINE = 'Sin conexión con el cerebro. Sigo con lo guardado.';

/** Onboarding: four questions, each with its why-line (setup/interview.md). */
export const ONBOARDING = [
  { ask: '¿En qué ciudad cocinas?', why: 'Para sugerirte lo que está de temporada y lo que encuentras cerca.' },
  { ask: '¿Para cuántas personas cocinas normalmente?', why: 'Para ajustar las cantidades.' },
  { ask: '¿Hay algo que no comas o que no te guste?', why: 'Para no sugerirte algo que vas a descartar.' },
  { ask: '¿Qué tienes hoy a la mano? Dime unas cosas, o sáltalo.', why: 'Para que la primera receta use lo que ya tienes.' },
];
export const progress = (i: number, n: number) => `${i} / ${n}`;

/** Poionotas written from onboarding answers and defaults. */
export const NOTES = {
  city: (c: string) => `Cocinas en ${c}.`,
  servings: (n: number) => `Cocinas para ${n}.`,
  noRestrictions: 'Sin restricciones. Picante medio.',
  restriction: (t: string) => (/^no\b/i.test(t.trim()) ? sentence(t) : `No comes: ${t.trim().replace(/[.]+$/, '')}.`),
  rating: (dish: string, n: number) => `${dish}: ${n}/10.`,
  checkin: (dish: string, t: string) => `${dish}: ${t.trim().replace(/[.]+$/, '')}.`,
};

/** "No restrictions" answers to Q3. */
export const NOTHING_WORDS = ['nada', 'no', 'ninguna', 'ninguno', 'todo', 'como de todo', 'nada en especial', 'no nada'];

export const CHOOSE = {
  row: (title: string) => title,
  meta: (minutes: number, difficulty: string) => `${minutes} min · ${difficulty}`,
};

export const INTRO = {
  meta: (minutes: number, difficulty: string | undefined, serves: number) =>
    `${minutes} min${difficulty ? ` · ${difficulty}` : ''} · ${serves} ${serves === 1 ? 'porción' : 'porciones'}`,
};

export const CHECK = {
  heading: 'Antes de empezar:',
  ready: '¿Todo listo?',
};

export const MISSING = {
  /** When the brain gives no options: the line and a single way on. */
  line: (display: string) => `No hay ${display}. Seguimos sin eso; cambia un poco el plato.`,
  dropFallback: 'Seguir sin eso',
};

export const COOK = {
  progress: (n: number, total: number) => `${n} / ${total}`,
  peek: 'vistazo',
  /** The checkpoint band: on its own step, or prefixed with the step it belongs to. */
  checkpointHere: (msg: string) => `Ojo · ${msg}`,
  checkpointOther: (n: number, msg: string) => `Paso ${n} · ${msg}`,
};

export const DONE = {
  line: 'Listo. Provecho.',
  taste: '¿Cómo quedó, del 1 al 10?',
  skip: 'Saltar',
  confirm: 'Listo',
  diffOut: (names: string[]) => {
    const a = listAgreement(names);
    return `Usaste ${joinY(names)}. ¿${cap(pronoun(a))} marco como ${agree('agotad', a)}?`;
  },
  diffMixed: (names: string[]) => {
    const a = listAgreement(names);
    return `Usaste ${joinY(names)}. ¿${cap(pronoun(a))} marco así?`;
  },
};

export const STATUS_LABEL: Record<PantryStatus, string> = { plenty: 'hay', low: 'poco', out: 'no hay' };
export const ASSUMED = 'supuesto';

export const COOKBOOK = {
  today: 'Hoy:',
  meta: (minutes: number, difficulty: string) => `${minutes} min · ${difficulty}`,
  checkin: (dish: string) => {
    const a = agreement(dish);
    const art = a.fem ? (a.plural ? 'las' : 'la') : a.plural ? 'los' : 'el';
    return `¿Qué tal ${art} ${lowerFirst(dish)}?`;
  },
};

export const PANTRY = {
  empty: 'Todavía no sé qué hay. Dime «compré…» o «se acabó…».',
  more: (n: number) => `y ${n} más`,
};

export const NOTES_SCREEN = {
  empty: 'Todavía no sé mucho de ti.',
  change: '¿Cambio algo?',
};

/** One-line confirmations. */
export const REPLY = {
  noted: 'Anotado.',
  notedOut: (display: string) => `Anotado: ${display}, ${agree('agotad', agreement(display))}.`,
  notedLow: (display: string) => `Anotado: queda poco ${display}.`,
  forgotten: 'Listo, ya no lo tomo en cuenta.',
  soon: 'Pronto.',
};

function cap(s: string): string { return s.charAt(0).toUpperCase() + s.slice(1); }
function lowerFirst(s: string): string { return s.charAt(0).toLowerCase() + s.slice(1); }
export function sentence(s: string): string {
  const t = s.trim().replace(/[.!]+$/, '');
  return t ? `${cap(t)}.` : '';
}

// ---------------------------------------------------------------------------
// Device chrome (DOM around the screen)
// ---------------------------------------------------------------------------

export const DEVICE = {
  powerOn: 'Encender',
  powerOff: 'Apagar',
  typedPlaceholder: 'Escribe en lugar de hablar',
  typedHint: 'Enter para enviar',
  knobLabel: 'Estrella: gira con la rueda o las flechas, pulsa con clic o Enter, mantén para hablar (o la barra espaciadora)',
  backLabel: 'Atrás (Esc)',
  homeLabel: 'Recetario (H)',
  controlsLine: 'Estrella: gira, pulsa o mantén para hablar · izquierdo: atrás · derecho: recetario',
  noSpeech: 'Este navegador no reconoce voz. Escribe abajo, funciona igual.',
  demoMode: 'modo demo',
  usageLine: (sessionK: string, capK: string, dayUsd: string, monthUsd: string, monthCap: string) =>
    `Sesión ${sessionK} / ${capK} tokens · Hoy US$${dayUsd} · Mes US$${monthUsd} / US$${monthCap}`,
};

// ---------------------------------------------------------------------------
// Pantry names
// ---------------------------------------------------------------------------

/**
 * Spanish names for the pantry template's item keys (slugs of the English
 * rows in pantry.example.md). The first entry is how the item reads on screen;
 * the rest are extra words people say for it (used by the fake brain's
 * keyword matching and the onboarding Q4 fallback).
 */
export const PANTRY_NAMES: Record<string, string[]> = {
  // Proteins
  'chicken-breast-boneless': ['pechuga sin hueso', 'pechuga', 'pechugas', 'pollo'],
  'chicken-breast-bone-in': ['pechuga con hueso'],
  'chicken-thighs-bone-in-skin-on': ['muslos con hueso y piel', 'muslos con hueso'],
  'chicken-thighs-boneless': ['muslos sin hueso', 'muslo', 'muslos', 'pollo'],
  'chicken-drumsticks': ['piernas de pollo', 'piernitas'],
  'chicken-legs-whole': ['pierna y muslo'],
  'whole-chicken': ['pollo entero'],
  eggs: ['huevo', 'huevos'],
  'pork-shoulder-loin': ['cerdo', 'puerco', 'lomo de cerdo'],
  'ground-beef': ['carne molida'],
  'beef-steak-bistec': ['bistec'],
  'fish-fillets': ['filete de pescado', 'pescado'],
  'shrimp-camaron': ['camarón', 'camarones'],
  'canned-tuna-atun': ['atún'],
  // Spices & Seasonings
  'cumin-ground': ['comino molido', 'comino'],
  'cumin-seeds': ['comino en grano'],
  'coriander-ground': ['semilla de cilantro molida'],
  'turmeric-ground': ['cúrcuma'],
  'smoked-paprika': ['pimentón ahumado'],
  'sweet-paprika': ['pimentón dulce', 'paprika'],
  'chilli-powder': ['chile en polvo'],
  'chilli-flakes': ['chile quebrado'],
  'black-pepper-whole': ['pimienta entera'],
  'black-pepper-ground': ['pimienta molida', 'pimienta'],
  'oregano-mexican': ['orégano', 'orégano mexicano'],
  'oregano-mediterranean': ['orégano mediterráneo'],
  'canela-ceylon-cinnamon': ['canela'],
  'cinnamon-cassia': ['canela cassia'],
  'garlic-powder': ['ajo en polvo'],
  'onion-powder': ['cebolla en polvo'],
  'garam-masala': ['garam masala'],
  'curry-powder': ['curry'],
  'five-spice-powder': ['cinco especias'],
  'allspice-ground': ['pimienta gorda'],
  'cloves-whole': ['clavo de olor', 'clavos'],
  'bay-leaves': ['laurel', 'hojas de laurel'],
  'thyme-dried': ['tomillo seco', 'tomillo'],
  'rosemary-dried': ['romero seco', 'romero'],
  'fennel-seeds': ['semillas de hinojo'],
  'mustard-seeds': ['semillas de mostaza'],
  sumac: ['zumaque'],
  'za-atar': ["za'atar", 'zaatar'],
  tajin: ['tajín'],
  'salt-kosher-table': ['sal'],
  'salt-flaky-finishing-maldon-etc': ['sal en escamas'],
  msg: ['glutamato'],
  // Dried Chiles
  'chile-ancho': ['chile ancho'],
  'chile-guajillo': ['chile guajillo', 'guajillo', 'guajillos'],
  'chile-de-arbol': ['chile de árbol'],
  'chile-morita': ['chile morita'],
  'chile-chipotle-dried': ['chile chipotle seco'],
  'chile-pasilla': ['chile pasilla'],
  'chile-cascabel': ['chile cascabel'],
  'chile-mulato': ['chile mulato'],
  // Oils, Vinegars & Acids
  'olive-oil-extra-virgin': ['aceite de oliva', 'aceite de oliva extra virgen'],
  'olive-oil-regular-cooking': ['aceite de oliva para cocinar'],
  'vegetable-oil': ['aceite', 'aceite vegetal'],
  'sesame-oil': ['aceite de ajonjolí'],
  'coconut-oil': ['aceite de coco'],
  'apple-cider-vinegar': ['vinagre de manzana'],
  'white-vinegar': ['vinagre blanco', 'vinagre'],
  'rice-vinegar': ['vinagre de arroz'],
  'red-wine-vinegar': ['vinagre de vino tinto'],
  'sherry-vinegar': ['vinagre de jerez'],
  limes: ['limón', 'limones'],
  lemons: ['limón amarillo'],
  // Sauces, Pastes & Condiments
  'soy-sauce': ['salsa de soya', 'soya'],
  'dark-soy-sauce': ['salsa de soya oscura'],
  'fish-sauce': ['salsa de pescado'],
  'oyster-sauce': ['salsa de ostión'],
  sriracha: ['sriracha'],
  gochujang: ['gochujang'],
  'harissa-paste-or-jar': ['harissa'],
  'chipotle-in-adobo-canned': ['chiles chipotles en adobo', 'chipotles', 'chipotle', 'chiles chipotles'],
  'tomato-paste-puree': ['puré de tomate'],
  'dijon-mustard': ['mostaza dijon', 'mostaza'],
  'wholegrain-mustard': ['mostaza antigua'],
  honey: ['miel'],
  'maple-syrup': ['miel de maple'],
  'worcestershire-sauce': ['salsa inglesa'],
  'hot-sauce-valentina-cholula-etc': ['salsa picante', 'valentina'],
  tahini: ['tahini'],
  'peanut-butter': ['crema de cacahuate'],
  'miso-paste-white-or-red': ['miso'],
  ketchup: ['cátsup', 'catsup'],
  mayonnaise: ['mayonesa'],
  'salsa-macha': ['salsa macha'],
  // Fresh Vegetables & Aromatics
  'white-onion': ['cebolla blanca', 'cebolla', 'cebollas'],
  'red-onion': ['cebolla morada'],
  garlic: ['ajo', 'ajos'],
  'ginger-fresh': ['jengibre'],
  'tomatoes-jitomate': ['jitomate', 'jitomates'],
  tomatillo: ['tomate verde', 'tomates verdes', 'tomatillo'],
  jalapenos: ['chile jalapeño', 'jalapeño', 'jalapeños'],
  serranos: ['chile serrano', 'serrano', 'serranos'],
  habaneros: ['chile habanero', 'habanero', 'habaneros'],
  'bell-peppers': ['pimiento morrón', 'morrón', 'pimientos'],
  'poblano-peppers': ['chile poblano', 'chiles poblanos', 'poblano', 'poblanos'],
  avocado: ['aguacate', 'aguacates'],
  zucchini: ['calabacita', 'calabacitas'],
  nopales: ['nopales', 'nopal'],
  chayote: ['chayote', 'chayotes'],
  carrots: ['zanahoria', 'zanahorias'],
  celery: ['apio'],
  'cabbage-green': ['col', 'repollo'],
  'cabbage-purple': ['col morada'],
  'lettuce-romaine': ['lechuga'],
  'spinach-fresh': ['espinaca', 'espinacas'],
  broccoli: ['brócoli'],
  cauliflower: ['coliflor'],
  'corn-on-the-cob-elote': ['elote', 'elotes'],
  'green-beans-ejotes': ['ejotes'],
  mushrooms: ['champiñones', 'hongos'],
  cucumber: ['pepino', 'pepinos'],
  radishes: ['rábanos', 'rábano'],
  jicama: ['jícama'],
  'sweet-potato-camote': ['camote', 'camotes'],
  potatoes: ['papas', 'papa'],
  'spring-onions-cebollita': ['cebollitas cambray', 'cebollitas', 'cebollita'],
  // Fresh Herbs
  cilantro: ['cilantro'],
  'flat-leaf-parsley': ['perejil'],
  mint: ['hierbabuena', 'menta'],
  epazote: ['epazote'],
  'thyme-fresh': ['tomillo fresco'],
  'rosemary-fresh': ['romero fresco'],
  basil: ['albahaca'],
  dill: ['eneldo'],
  // Starches & Grains
  'rice-white-long-grain': ['arroz blanco', 'arroz'],
  'rice-jasmine': ['arroz jazmín'],
  'rice-basmati': ['arroz basmati'],
  'rice-brown': ['arroz integral'],
  'corn-tortillas': ['tortillas de maíz', 'tortillas'],
  'flour-tortillas': ['tortillas de harina'],
  'pasta-spaghetti': ['espagueti'],
  'pasta-penne-rigatoni': ['pasta corta', 'penne'],
  'pasta-orzo': ['orzo'],
  'noodles-egg': ['fideo de huevo'],
  'noodles-rice': ['fideo de arroz'],
  'noodles-udon': ['udon'],
  couscous: ['cuscús'],
  quinoa: ['quinoa'],
  'bulgur-wheat': ['bulgur'],
  'bread-bolillo-telera': ['bolillo', 'bolillos', 'teleras'],
  'bread-sourdough-sliced': ['pan de caja'],
  'flatbreads-pita': ['pan pita'],
  'sweet-potatoes-camote': ['camote para hornear'],
  'dried-beans-black': ['frijol negro', 'frijoles negros', 'frijoles'],
  'dried-beans-pinto': ['frijol pinto'],
  'dried-lentils-green-brown': ['lentejas'],
  'dried-lentils-red': ['lentejas rojas'],
  'dried-chickpeas': ['garbanzos secos'],
  // Dairy & Cheese
  'butter-unsalted': ['mantequilla sin sal', 'mantequilla'],
  'butter-salted': ['mantequilla con sal'],
  'media-crema': ['media crema'],
  'crema-mexican-sour-cream': ['crema'],
  'greek-yoghurt': ['yogur griego', 'yogur', 'yogurt'],
  milk: ['leche'],
  'cream-cheese': ['queso crema'],
  'queso-fresco': ['queso fresco'],
  'queso-oaxaca': ['queso Oaxaca', 'quesillo'],
  'queso-chihuahua': ['queso Chihuahua'],
  'parmesan-parmigiano': ['queso parmesano', 'parmesano'],
  feta: ['queso feta'],
  mozzarella: ['mozzarella'],
  cheddar: ['queso cheddar'],
  cotija: ['queso cotija', 'cotija'],
  // Canned & Jarred Goods
  'canned-tomatoes-diced': ['jitomate en lata'],
  'canned-tomatoes-crushed-whole': ['jitomate triturado'],
  'canned-black-beans': ['frijoles de lata'],
  'canned-chickpeas': ['garbanzos', 'garbanzos de lata'],
  'canned-corn': ['elote de lata'],
  'coconut-milk': ['leche de coco'],
  'coconut-cream': ['crema de coco'],
  'chicken-broth-stock': ['caldo de pollo', 'caldo', 'consomé'],
  'pickled-jalapenos': ['chiles en vinagre', 'jalapeños en vinagre'],
  'olives-green-or-black': ['aceitunas'],
  'roasted-red-peppers-jar': ['pimientos asados'],
  capers: ['alcaparras'],
  'anchovies-tin-or-jar': ['anchoas'],
  // Frozen Items
  'frozen-corn': ['elote congelado'],
  'frozen-peas': ['chícharos', 'chícharos congelados'],
  'frozen-spinach': ['espinaca congelada'],
  'frozen-mixed-veg': ['verduras congeladas'],
  'frozen-edamame': ['edamame'],
  // Nuts, Seeds & Dried Fruit
  peanuts: ['cacahuates'],
  almonds: ['almendras'],
  cashews: ['nuez de la India'],
  'sesame-seeds': ['ajonjolí'],
  'pumpkin-seeds-pepitas': ['pepitas'],
  'pine-nuts': ['piñones'],
  walnuts: ['nueces', 'nuez'],
  'dried-cranberries': ['arándanos secos'],
  raisins: ['pasas'],
  'dried-apricots': ['chabacanos secos'],
  // Baking & Other
  'all-purpose-flour': ['harina'],
  cornstarch: ['fécula de maíz', 'maicena'],
  'baking-powder': ['polvo para hornear'],
  'sugar-white': ['azúcar'],
  'sugar-brown-piloncillo': ['piloncillo', 'azúcar morena'],
  'panko-breadcrumbs': ['panko'],
  'regular-breadcrumbs': ['pan molido'],
  'tortilla-chips': ['totopos'],
  'cocoa-powder': ['cacao en polvo'],
};

/** Items the sample recipes use that the template doesn't list. */
export const EXTRA_PANTRY_NAMES: Record<string, string[]> = {
  tostadas: ['tostadas'],
};

/** Spanish headings for the template's English categories. */
export const PANTRY_CATEGORIES: Record<string, string> = {
  Proteins: 'Proteínas',
  'Spices & Seasonings': 'Especias',
  'Dried Chiles': 'Chiles secos',
  'Oils, Vinegars & Acids': 'Aceites y vinagres',
  'Sauces, Pastes & Condiments': 'Salsas y condimentos',
  'Fresh Vegetables & Aromatics': 'Verduras',
  'Fresh Herbs': 'Hierbas',
  'Starches & Grains': 'Granos y tortillas',
  'Dairy & Cheese': 'Lácteos',
  'Canned & Jarred Goods': 'Latas y frascos',
  'Frozen Items': 'Congelados',
  'Nuts, Seeds & Dried Fruit': 'Semillas y frutos secos',
  'Baking & Other': 'Repostería y otros',
};

/** How an item reads on screen; falls back to a de-slugged key. */
export function pantryName(key: string): string {
  return (PANTRY_NAMES[key] ?? EXTRA_PANTRY_NAMES[key])?.[0] ?? key.replace(/-/g, ' ');
}
