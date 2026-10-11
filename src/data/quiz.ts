// "Wer ist das Pokémon?": eine Silhouette, drei Bilder zur Auswahl.
import type { PokemonData } from './types';

export type Round = { target: PokemonData; options: PokemonData[] };

const OPTIONS = 3;

/** Zufällige Auswahl ohne Zurücklegen. */
function sample<T>(list: T[], count: number, rng: () => number): T[] {
  const pool = [...list];
  const picked: T[] = [];
  while (picked.length < count && pool.length) picked.push(pool.splice(Math.floor(rng() * pool.length), 1)[0]!);
  return picked;
}

/**
 * Neue Runde aus `pool` (z. B. eine Generation). Kürzlich gefragte Pokémon (`recent`) werden als Ziel
 * gemieden, solange genug andere da sind. Die Ablenker sehen anders aus als das Ziel (andere Farbe),
 * damit auch Vierjährige eine faire Chance haben.
 */
export function makeRound(pool: PokemonData[], recent: number[], rng: () => number = Math.random): Round {
  const fresh = pool.filter((p) => !recent.includes(p.id));
  const target = sample(fresh.length ? fresh : pool, 1, rng)[0]!;
  const others = pool.filter((p) => p.id !== target.id);
  const differentColor = others.filter((p) => p.color !== target.color);
  const distractors = sample(differentColor.length >= OPTIONS - 1 ? differentColor : others, OPTIONS - 1, rng);
  const options = sample([target, ...distractors], OPTIONS, rng); // Position des Ziels zufällig
  return { target, options };
}
