// PokéAPI-Zugriff mit Platten-Cache: jede URL wird genau einmal geladen (Fair-Use-Regel der PokéAPI).
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

const BASE = 'https://pokeapi.co/api/v2/';
const CACHE_DIR = '.cache/pokeapi';
const MAX_PARALLEL = 8;

let active = 0;
const waiting: Array<() => void> = [];

async function slot<T>(fn: () => Promise<T>): Promise<T> {
  if (active >= MAX_PARALLEL) await new Promise<void>((resolve) => waiting.push(resolve));
  active += 1;
  try {
    return await fn();
  } finally {
    active -= 1;
    waiting.shift()?.();
  }
}

function cachePath(url: string): string {
  const path = url.replace(BASE, '').replace(/\/$/, '').replace(/[?&=]/g, '_');
  return join(CACHE_DIR, `${path}.json`);
}

export async function get<T>(urlOrPath: string): Promise<T> {
  const url = urlOrPath.startsWith('http') ? urlOrPath : BASE + urlOrPath;
  const file = cachePath(url);
  try {
    return JSON.parse(await readFile(file, 'utf8')) as T;
  } catch {
    // nicht im Cache
  }
  const data = await slot(async () => {
    for (let attempt = 1; ; attempt += 1) {
      const res = await fetch(url);
      if (res.ok) return (await res.json()) as T;
      if (attempt >= 4 || res.status === 404) throw new Error(`PokéAPI ${res.status}: ${url}`);
      await new Promise((r) => setTimeout(r, 1000 * attempt));
    }
  });
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, JSON.stringify(data));
  return data;
}

export const idFromUrl = (url: string): number => Number(url.match(/\/(\d+)\/?$/)?.[1]);

// --- die Teile der PokéAPI-Antworten, die wir brauchen ---
export type NamedRef = { name: string; url: string };
export type LocalizedName = { name: string; language: NamedRef };

export type Species = {
  id: number;
  name: string;
  names: LocalizedName[];
  color: NamedRef;
  generation: NamedRef;
  evolves_from_species: NamedRef | null;
  evolution_chain: { url: string } | null;
  varieties: Array<{ is_default: boolean; pokemon: NamedRef }>;
  is_legendary: boolean;
  is_mythical: boolean;
};

export type PokemonData = {
  id: number;
  name: string;
  height: number; // Dezimeter
  weight: number; // Hektogramm
  types: Array<{ slot: number; type: NamedRef }>;
  sprites: { other?: { 'official-artwork'?: { front_default: string | null; front_shiny: string | null } } };
  cries?: { latest: string | null; legacy: string | null };
  forms: NamedRef[];
};

export type PokemonForm = { names: LocalizedName[]; form_names: LocalizedName[] };

export type ChainLink = { species: NamedRef; evolves_to: ChainLink[] };
export type EvolutionChain = { id: number; chain: ChainLink };
