/**
 * Just enough Spanish agreement for templated lines ("Anotado: crema,
 * agotada.", "¿Las marco como agotadas?"). A heuristic on the first noun;
 * the model writes its own lines, this only covers the local templates.
 */
const MASC_A = new Set(['chile', 'chiles', 'ajo', 'ajos', 'aceite', 'arroz', 'pollo', 'queso', 'caldo', 'tomate', 'tomates', 'jitomate', 'jitomates', 'limón', 'limones', 'pan', 'atún', 'elote', 'elotes', 'cilantro', 'chayote', 'aguacate', 'epazote', 'orégano', 'vinagre', 'yogur', 'huevo', 'huevos', 'frijol', 'frijoles', 'miso', 'gochujang', 'jengibre', 'ajonjolí', 'piloncillo', 'azúcar', 'muslo', 'muslos', 'totopos', 'pimiento', 'pimientos', 'nopal', 'nopales', 'poblano', 'poblanos', 'camote']);
const FEM = new Set(['crema', 'media', 'cebolla', 'cebollas', 'cebollita', 'cebollitas', 'sal', 'leche', 'miel', 'mantequilla', 'pechuga', 'pechugas', 'pierna', 'piernas', 'papa', 'papas', 'harina', 'piña', 'salsa', 'mayonesa', 'tortilla', 'tortillas', 'tostada', 'tostadas', 'calabacita', 'calabacitas', 'zanahoria', 'zanahorias', 'lechuga', 'col', 'espinaca', 'espinacas', 'canela', 'pimienta', 'pasta', 'carne', 'pasas', 'nuez', 'nueces', 'lentejas', 'mostaza', 'soya', 'jícama']);

export interface Agreement { fem: boolean; plural: boolean }

export function agreement(display: string): Agreement {
  const first = display.trim().toLowerCase().split(/\s+/)[0] ?? '';
  const plural = /s$/.test(first) && !['sal', 'arroz', 'gochujang', 'miso', 'atún', 'col', 'nuez', 'mayonesa'].includes(first);
  let fem: boolean;
  if (FEM.has(first)) fem = true;
  else if (MASC_A.has(first)) fem = false;
  else fem = /as?$|ión$|ez$/.test(first);
  return { fem, plural };
}

/** "agotada" / "agotados" etc. */
export function agree(stem: string, a: Agreement): string {
  return `${stem}${a.fem ? 'a' : 'o'}${a.plural ? 's' : ''}`;
}

/** Object pronoun: la / lo / las / los. */
export function pronoun(a: Agreement): string {
  return `l${a.fem ? 'a' : 'o'}${a.plural ? 's' : ''}`;
}

/** Agreement for a list: feminine only if every item is feminine; plural if more than one. */
export function listAgreement(displays: string[]): Agreement {
  if (displays.length === 1) return agreement(displays[0]);
  return { fem: displays.every((d) => agreement(d).fem), plural: true };
}

/** "crema y tostadas", "pollo, cebolla y ajo". */
export function joinY(items: string[]): string {
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(', ')} y ${items[items.length - 1]}`;
}
