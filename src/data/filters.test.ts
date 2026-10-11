import { describe, expect, it } from 'vitest';
import { defaultView, visiblePokemon } from './filters';
import type { PokemonData } from './types';

const p = (id: number, gen: number, color: string, types: string[], height: number): PokemonData => ({
  id, name: `P${id}`, nameEn: `P${id}`, gen, color, types, height, weight: 1, chain: null,
});
const all = [
  p(1, 1, 'green', ['grass', 'poison'], 0.7),
  p(4, 1, 'red', ['fire'], 0.6),
  p(6, 1, 'red', ['fire', 'flying'], 1.7),
  p(25, 1, 'yellow', ['electric'], 0.4),
  p(152, 2, 'green', ['grass'], 0.9),
];

describe('visiblePokemon', () => {
  it('filtert nach Generation und Farbe', () => {
    const view = { ...defaultView, mode: 'color' as const, color: 'red' };
    expect(visiblePokemon(all, view, []).map((x) => x.id)).toEqual([4, 6]);
  });
  it('filtert nach Typ, auch Zweittyp', () => {
    const view = { ...defaultView, type: 'flying' };
    expect(visiblePokemon(all, view, []).map((x) => x.id)).toEqual([6]);
  });
  it('zeigt mit Generation 0 alle Generationen', () => {
    const view = { ...defaultView, gen: 0, type: 'grass' };
    expect(visiblePokemon(all, view, []).map((x) => x.id)).toEqual([1, 152]);
  });
  it('sortiert von klein nach groß', () => {
    const view = { ...defaultView, sort: 'size' as const };
    expect(visiblePokemon(all, view, []).map((x) => x.id)).toEqual([25, 4, 1, 6]);
  });
  it('zeigt im Team-Modus das Team in Fang-Reihenfolge, unabhängig von Filtern', () => {
    const view = { ...defaultView, mode: 'team' as const, gen: 2 };
    expect(visiblePokemon(all, view, [25, 1]).map((x) => x.id)).toEqual([25, 1]);
  });
});
