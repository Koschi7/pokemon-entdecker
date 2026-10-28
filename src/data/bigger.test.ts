import { describe, expect, it } from 'vitest';
import { bigger, makePair, minRatio } from './bigger';
import type { PokemonData } from './types';

const p = (id: number, height: number): PokemonData => ({
  id, name: `P${id}`, nameEn: `P${id}`, gen: 1, color: 'red', types: ['normal'], height, weight: 1, chain: null,
});
const pool = [p(1, 0.3), p(2, 0.4), p(3, 0.7), p(4, 1.0), p(5, 1.1), p(6, 1.7), p(7, 3.5), p(8, 6.5), p(9, 14.5)];

function seeded(seed: number) {
  return () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
}
const ratioOf = ([a, b]: [PokemonData, PokemonData]) => Math.max(a.height, b.height) / Math.min(a.height, b.height);

describe('Wer ist größer?', () => {
  it('wird mit dem Punktestand knapper', () => {
    expect(minRatio(0)).toBe(2);
    expect(minRatio(15)).toBe(1.5);
    expect(minRatio(45)).toBe(1.3);
    expect(minRatio(90)).toBe(1.15);
  });

  it('wählt zwei verschiedene Pokémon mit genug Größenunterschied', () => {
    for (let s = 1; s < 60; s++) {
      const pair = makePair(pool, 0, [], seeded(s));
      expect(pair[0].id).not.toBe(pair[1].id);
      expect(ratioOf(pair)).toBeGreaterThanOrEqual(2);
    }
  });

  it('meidet kürzlich gezeigte Pokémon', () => {
    const recent = [1, 2, 3, 4, 5, 6];
    for (let s = 1; s < 30; s++) {
      for (const x of makePair(pool, 0, recent, seeded(s))) expect(recent).not.toContain(x.id);
    }
  });

  it('kommt auch mit einem kleinen Pool zurecht', () => {
    const pair = makePair([p(1, 1.0), p(2, 1.02)], 0, [], seeded(7));
    expect(new Set(pair.map((x) => x.id)).size).toBe(2);
  });

  it('erkennt das größere', () => {
    expect(bigger([p(1, 0.5), p(2, 1.2)]).id).toBe(2);
    expect(bigger([p(3, 2), p(4, 1)]).id).toBe(3);
  });
});
