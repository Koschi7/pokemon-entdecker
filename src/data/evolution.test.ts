import { describe, expect, it } from 'vitest';
import { ladder, nextStages, pathTo } from './evolution';
import type { ChainNode } from './types';

const n = (id: number, ...to: ChainNode[]): ChainNode => ({ id, to });
const charmander = n(4, n(5, n(6)));
const eevee = n(133, n(134), n(135), n(136));
const oddish = n(43, n(44, n(45), n(182)));

describe('pathTo', () => {
  it('führt von der Basis zum Pokémon', () => {
    expect(pathTo(charmander, 6)).toEqual([4, 5, 6]);
    expect(pathTo(oddish, 182)).toEqual([43, 44, 182]);
  });
  it('ist leer, wenn das Pokémon nicht in der Kette ist', () => {
    expect(pathTo(charmander, 25)).toEqual([]);
  });
});

describe('nextStages', () => {
  it('liefert alle direkten Entwicklungen', () => {
    expect(nextStages(eevee, 133)).toEqual([134, 135, 136]);
    expect(nextStages(charmander, 6)).toEqual([]);
  });
});

describe('ladder', () => {
  it('zeigt eine lineare Kette vom Anfang an', () => {
    expect(ladder(charmander, 4)).toEqual([[4], [5], [6]]);
    expect(ladder(charmander, 6)).toEqual([[4], [5], [6]]);
  });
  it('stellt Verzweigungen nebeneinander statt als Kette', () => {
    expect(ladder(eevee, 133)).toEqual([[133], [134, 135, 136]]);
  });
  it('zeigt bei einem Ast nur den eigenen Weg', () => {
    expect(ladder(eevee, 135)).toEqual([[133], [135]]);
    expect(ladder(oddish, 44)).toEqual([[43], [44], [45, 182]]);
  });
});
