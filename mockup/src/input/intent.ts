/**
 * The local intent parser: runs first, on the client, with no tokens.
 * Accent- and case-insensitive, anchored to the whole utterance so that
 * "no hay crema" never reads as "no". Anything it misses goes to the brain.
 */
import { normalizeText } from '../../shared/slug';

export type Intent =
  | { kind: 'next' }
  | { kind: 'back' }
  | { kind: 'discard' }
  | { kind: 'pick'; index: number }
  | { kind: 'number'; value: number }
  | { kind: 'skip' }
  | { kind: 'yes' }
  | { kind: 'no' }
  | { kind: 'nav'; to: 'pantry' | 'cookbook' | 'notes' | 'choose' }
  | { kind: 'askAll' };

const NUM_WORDS: Record<string, number> = {
  uno: 1, una: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10,
};
const ORDINALS: Record<string, number> = {
  primera: 1, primero: 1, primer: 1, segunda: 2, segundo: 2, tercera: 3, tercero: 3, tercer: 3,
  cuarta: 4, cuarto: 4, quinta: 5, quinto: 5, ultima: -1, ultimo: -1,
};

/** Filler that doesn't change the meaning ("oye poio, siguiente por favor"). */
function strip(n: string): string {
  return n
    .replace(/^(oye |ey |poio |oye poio |a ver |ok |okay |bueno |este )+/, '')
    .replace(/( por favor| porfa| gracias| poio)+$/, '')
    .trim();
}

export function parseNumber(n: string): number | null {
  const m = /^(?:(?:el|la|numero|opcion|la opcion|el numero|la numero|calificacion|un|una|le doy|le doy un|como|un|de) )*(\d{1,2}|uno|una|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez)(?: de 10| de diez)?$/.exec(n);
  if (!m) return null;
  const v = /^\d+$/.test(m[1]) ? Number(m[1]) : NUM_WORDS[m[1]];
  return v >= 1 && v <= 10 ? v : null;
}

export function parseIntent(text: string): Intent | null {
  const n = strip(normalizeText(text));
  if (!n) return null;

  if (/^(siguiente|sigue|listo|lista|ya|ya esta|ya quedo|ya quedó|va siguiente|siguiente paso|adelante|next)$/.test(n)) return { kind: 'next' };
  if (/^(atras|para atras|regresa|regresar|anterior|paso anterior|vuelve|volver|back)$/.test(n)) return { kind: 'back' };
  if (/^(otras|otra|otras opciones|otras tres|ninguna|ninguna de esas|ninguno|dame otras|cambia|cambialas|algo diferente|algo distinto)$/.test(n)) return { kind: 'discard' };
  if (/^(saltalo|saltala|saltar|salta|salta esta|luego|despues|al rato|paso|mejor luego|no se|siguiente pregunta|skip)$/.test(n)) return { kind: 'skip' };
  if (/^(si|claro|va|dale|ok|okay|sale|esta bien|de acuerdo|correcto|eso|si todo|si todo listo|todo listo|marcalas|marcalos|si marcalas|si marcalos|empecemos|vamos)$/.test(n)) return { kind: 'yes' };
  if (/^(no|nel|no gracias|mejor no|no marques nada|ninguno no)$/.test(n)) return { kind: 'no' };
  if (/^(preguntame todo|pregunta todo|hazme todas las preguntas)$/.test(n)) return { kind: 'askAll' };

  if (/^((abre |muestrame |ver |ve a |vamos a |ensename )?(la )?despensa|que hay en (la )?despensa|que hay en mi refri|que hay en el refri)$/.test(n)) return { kind: 'nav', to: 'pantry' };
  if (/^((abre |muestrame |ver |ve a |vamos a |regresa al |vuelve al )?(el )?recetario|inicio)$/.test(n)) return { kind: 'nav', to: 'cookbook' };
  if (/^(que sabes de mi|que mas sabes de mi|lo que sabes de mi|que sabes|que sabes de nosotros)$/.test(n)) return { kind: 'nav', to: 'notes' };
  if (/^(que hago de (cenar|comer|desayunar)|que cocino( hoy)?|que cocinamos( hoy)?|que hago hoy|que hay de (cenar|comer)|que como hoy|dame opciones|sugiereme algo|que me sugieres)$/.test(n)) return { kind: 'nav', to: 'choose' };

  const ord = /^(?:(?:la|el|quiero la|quiero el|dame la|dame el) )?(primera|primero|primer|segunda|segundo|tercera|tercero|tercer|cuarta|cuarto|quinta|quinto|ultima|ultimo)(?: opcion| receta)?$/.exec(n);
  if (ord) return { kind: 'pick', index: ORDINALS[ord[1]] };
  const num = parseNumber(n);
  if (num !== null) return { kind: 'number', value: num };
  return null;
}

/** Servings from an onboarding answer: "para cuatro", "somos 3", "2 personas". */
export function parseServings(text: string): number | null {
  const n = normalizeText(text);
  const m = /(\d{1,2}|uno|una|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez)/.exec(n);
  if (m) {
    const v = /^\d+$/.test(m[1]) ? Number(m[1]) : NUM_WORDS[m[1]];
    if (v >= 1 && v <= 20) return v;
  }
  if (/(solo|sola|nada mas yo|yo nada mas|para mi)\b/.test(n)) return 1;
  if (/(pareja|mi esposa y yo|mi esposo y yo|los dos|las dos)/.test(n)) return 2;
  return null;
}
