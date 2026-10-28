// "Wer ist größer?": zwei Pokémon, deren Größen sich klar genug unterscheiden. Je höher der Punktestand,
// desto knapper wird es.
import type { PokemonData } from './types';

/** Mindest-Verhältnis der Größen je nach Punktestand. */
export function minRatio(score: number): number {
  if (score < 10) return 2;
  if (score < 30) return 1.5;
  if (score < 60) return 1.3;
  return 1.15;
}

export type Pair = [PokemonData, PokemonData];

export function makePair(pool: PokemonData[], score: number, recent: number[], rng: () => number = Math.random): Pair {
  const pick = (list: PokemonData[]) => list[Math.floor(rng() * list.length)]!;
  const fresh = pool.filter((p) => !recent.includes(p.id));
  const ratio = minRatio(score);
  // Ein paar Versuche mit frischen Pokémon, dann mit allen, dann notfalls mit dem kleinsten möglichen Abstand
  for (const [candidates, need] of [[fresh, ratio], [pool, ratio], [pool, 1.05]] as const) {
    for (let attempt = 0; attempt < 40 && candidates.length > 1; attempt++) {
      const a = pick(candidates);
      const matches = candidates.filter((b) => b.id !== a.id && Math.max(a.height, b.height) / Math.min(a.height, b.height) >= need);
      if (matches.length) {
        const b = pick(matches);
        return rng() < 0.5 ? [a, b] : [b, a];
      }
    }
  }
  // Alle fast gleich groß: dann das kleinste gegen das größte
  const sorted = [...pool].sort((x, y) => x.height - y.height);
  return [sorted[0]!, sorted.at(-1)!];
}

export function bigger(pair: Pair): PokemonData {
  return pair[0].height >= pair[1].height ? pair[0] : pair[1];
}
