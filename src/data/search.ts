// Suche über alle Generationen: Vorschläge schon ab dem ersten Buchstaben. Verzeiht Tippfehler, wie sie
// beim Buchstabieren nach Gehör passieren ("Pikatschu", "Glurack", "Samasenta"): erst Namensanfang, dann
// Wortanfang (auch englisch, auch "Mega-Glurak X"), dann ähnlich geschrieben oder ähnlich klingend.
import type { PokemonData } from './types';

export type SearchHit = { id: number; form: string | null; name: string; thumb: string | number };

/** Kleinbuchstaben, Umlaute vereinfacht, nur Buchstaben. */
export function fold(text: string): string {
  return text
    .toLowerCase()
    .replace(/ä/g, 'a').replace(/ö/g, 'o').replace(/ü/g, 'u').replace(/ß/g, 'ss').replace(/é/g, 'e')
    .replace(/[^a-z]/g, '');
}

/** Kölner Phonetik: gleich klingende deutsche Wörter bekommen denselben Ziffern-Code. */
export function koelner(word: string): string {
  const s = fold(word);
  let code = '';
  for (let i = 0; i < s.length; i++) {
    const c = s[i]!;
    const prev = s[i - 1] ?? '';
    const next = s[i + 1] ?? '';
    let d = '';
    if ('aeijouy'.includes(c)) d = '0';
    else if (c === 'h') d = '';
    else if (c === 'b') d = '1';
    else if (c === 'p') d = next === 'h' ? '3' : '1';
    else if (c === 'd' || c === 't') d = 'csz'.includes(next) && next ? '8' : '2';
    else if ('fvw'.includes(c)) d = '3';
    else if ('gkq'.includes(c)) d = '4';
    else if (c === 'c') {
      if (i === 0) d = 'ahkloqrux'.includes(next) && next ? '4' : '8';
      else d = 'sz'.includes(prev) ? '8' : 'ahkoqux'.includes(next) && next ? '4' : '8';
    } else if (c === 'x') d = 'ckq'.includes(prev) && prev ? '8' : '48';
    else if (c === 'l') d = '5';
    else if (c === 'm' || c === 'n') d = '6';
    else if (c === 'r') d = '7';
    else if (c === 's' || c === 'z') d = '8';
    code += d;
  }
  // doppelte Ziffern zusammenfassen, Nullen nur am Anfang behalten
  const collapsed = code.replace(/(\d)\1+/g, '$1');
  return collapsed.slice(0, 1) + collapsed.slice(1).replace(/0/g, '');
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let diag = row[0]!;
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const up = row[j]!;
      row[j] = Math.min(row[j]! + 1, row[j - 1]! + 1, diag + (a[i - 1] === b[j - 1] ? 0 : 1));
      diag = up;
    }
  }
  return row[b.length]!;
}

type Entry = SearchHit & { order: number; full: string; words: string[]; sound: string };
const cache = new WeakMap<PokemonData[], Entry[]>();

/** Alle Pokémon samt Regionalformen und Megas, vorbereitet für die Suche. */
function entries(all: PokemonData[]): Entry[] {
  let list = cache.get(all);
  if (list) return list;
  const make = (id: number, form: string | null, name: string, nameEn: string, order: number): Entry => ({
    id, form, name, thumb: form ?? id, order,
    full: fold(name),
    words: [...name.split(/[^\p{L}]+/u), ...nameEn.split(/[^\p{L}]+/u), nameEn].map(fold).filter(Boolean),
    sound: koelner(name),
  });
  list = all.flatMap((p) => [
    make(p.id, null, p.name, p.nameEn, p.id),
    ...[...(p.forms ?? []), ...(p.megas ?? [])].map((f) => make(p.id, f.key, f.name, f.nameEn, 10_000 + p.id)),
  ]);
  cache.set(all, list);
  return list;
}

/** Vorschläge für das Getippte, bester zuerst. */
export function searchPokemon(query: string, all: PokemonData[], limit = 30): SearchHit[] {
  const q = fold(query);
  if (!q) return [];
  const qSound = koelner(q);
  const tolerance = q.length >= 6 ? 2 : 1;
  const scored: { e: Entry; rank: number }[] = [];
  for (const e of entries(all)) {
    let rank: number | null = null;
    if (e.full.startsWith(q)) rank = 0;
    else if (e.words.some((w) => w.startsWith(q))) rank = 1;
    else if (q.length >= 4) {
      // Tippfehler: mit dem Namensanfang passender Länge vergleichen, ab 5 Buchstaben auch einer mehr oder weniger
      const lengths = q.length >= 5 ? [-1, 0, 1] : [0];
      const typo = Math.min(...lengths.map((d) => levenshtein(q, e.full.slice(0, q.length + d))));
      if (typo <= tolerance) rank = 2 + typo;
      // klingt gleich (Samasenta → Zamazenta) – nur bei etwa gleich langem Code, sonst passt jeder lange Name
      else if (qSound.length >= 3 && e.sound.startsWith(qSound) && e.sound.length <= qSound.length + 1) rank = 5;
    }
    if (rank !== null) scored.push({ e, rank });
  }
  return scored
    .sort((a, b) => a.rank - b.rank || a.e.order - b.e.order)
    .slice(0, limit)
    .map(({ e: { id, form, name, thumb } }) => ({ id, form, name, thumb }));
}
