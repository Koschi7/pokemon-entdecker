// Datenformat, das die App lädt (/data/pokemon.json). Erzeugt von pipeline/build-data.ts.
// Bilder und Audio liegen nach fester Konvention neben den Daten, siehe src/data/assets.ts.

export type FormData = {
  key: string; // z. B. "vulpix-alola"
  region: string;
  name: string;
  nameEn: string;
  types: string[];
  height: number; // Meter
  weight: number; // Kilogramm
};

export type PokemonData = {
  id: number;
  name: string;
  nameEn: string;
  gen: number;
  color: string; // PokéAPI-Farbe: black, blue, brown, gray, green, pink, purple, red, white, yellow
  types: string[];
  height: number;
  weight: number;
  chain: number | null;
  legendary?: true;
  forms?: FormData[];
};

export type ChainNode = { id: number; to: ChainNode[] };

export type AppData = {
  version: string;
  pokemon: PokemonData[];
  chains: Record<string, ChainNode>;
};

/** Sichtbarer Umriss im quadratischen Artwork: [x, y, Breite, Höhe] als Anteil (0–1). */
export type BoundingBoxes = Record<string, [number, number, number, number]>;
