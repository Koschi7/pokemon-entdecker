import { describe, expect, it } from 'vitest';
import { makeRound } from './quiz';
import type { PokemonData } from './types';

const p = (id: number, color: string): PokemonData => ({
  id, name: `P${id}`, nameEn: `P${id}`, gen: 1, color, types: ['normal'], height: 1, weight: 1, chain: null,
});
const pool = [p(1, 'green'), p(4, 'red'), p(7, 'blue'), p(25, 'yellow'), p(39, 'pink'), p(52, 'yellow')];

/** Deterministischer Zufall für reproduzierbare Tests. */
function seeded(seed: number) {
  return () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
}

describe('makeRound', () => {
  it('liefert drei verschiedene Optionen, darunter das Ziel', () => {
    for (let s = 1; s < 50; s++) {
      const { target, options } = makeRound(pool, [], seeded(s));
      expect(options).toHaveLength(3);
      expect(new Set(options.map((o) => o.id)).size).toBe(3);
      expect(options).toContain(target);
    }
  });

  it('wählt Ablenker mit anderer Farbe als das Ziel', () => {
    for (let s = 1; s < 50; s++) {
      const { target, options } = makeRound(pool, [], seeded(s));
      for (const o of options.filter((x) => x !== target)) expect(o.color).not.toBe(target.color);
    }
  });

  it('meidet kürzlich gefragte Pokémon als Ziel', () => {
    const recent = [1, 4, 7, 25, 39];
    for (let s = 1; s < 20; s++) expect(makeRound(pool, recent, seeded(s)).target.id).toBe(52);
  });

  it('funktioniert auch, wenn alle schon dran waren', () => {
    const { options } = makeRound(pool, pool.map((x) => x.id), seeded(3));
    expect(options).toHaveLength(3);
  });
});
