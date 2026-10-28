import type { PokemonData } from './types';

export type View = {
  mode: 'color' | 'type' | 'team' | 'games' | 'quiz' | 'bigger'; // games = Spielauswahl
  color: string | null;
  type: string | null;
  gen: number; // 0 = alle
  sort: 'dex' | 'size';
};

export const defaultView: View = { mode: 'type', color: null, type: null, gen: 1, sort: 'dex' };

export function visiblePokemon(all: PokemonData[], view: View, team: number[]): PokemonData[] {
  let list: PokemonData[];
  if (view.mode === 'team') {
    const byId = new Map(all.map((p) => [p.id, p]));
    list = team.map((id) => byId.get(id)).filter((p): p is PokemonData => !!p);
    return list; // Team bleibt in der Reihenfolge, in der es gefangen wurde
  }
  list = all.filter((p) => view.gen === 0 || p.gen === view.gen);
  if (view.mode === 'color' && view.color) list = list.filter((p) => p.color === view.color);
  if (view.mode === 'type' && view.type) list = list.filter((p) => p.types.includes(view.type!));
  if (view.sort === 'size') list = [...list].sort((a, b) => a.height - b.height || a.id - b.id);
  return list;
}
