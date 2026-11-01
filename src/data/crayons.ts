// Ausmal-Helfer: Welche Buntstifte braucht man für dieses Pokémon? Jeder sichtbare Pixel des Artworks
// bekommt einen Stift aus einem typischen Kinder-Set. Die Artworks sind pastellig und schattiert, deshalb
// zählt vor allem der Farbton (in OKLCh, nah am menschlichen Farbempfinden) und die Sättigung relativ zur
// Helligkeit – ein schattiertes Orange bleibt so Orange und wird nicht zu Braun.

/** Stifte eines typischen 15er-Sets, so wie sie in der App gezeigt werden. */
export const CRAYONS = {
  yellow: '#ffd83a',
  orange: '#f58a1f',
  red: '#d9262c',
  pink: '#f39ac0',
  purple: '#7d4bb5',
  darkBlue: '#24479b',
  lightBlue: '#6cc3ef',
  turquoise: '#25b3a8',
  darkGreen: '#2c7a3a',
  lightGreen: '#8fcf4a',
  brown: '#8b5a2b',
  beige: '#ecd3a8',
  gray: '#9b9ea4',
  black: '#2a2a2e',
  white: '#ffffff',
} as const;

export type CrayonKey = keyof typeof CRAYONS;

const toLinear = (c: number) => {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
};

/** sRGB (0–255) → OKLCh: Helligkeit L (0–1), Buntheit C, Farbton h in Grad */
export function oklch(r: number, g: number, b: number): [number, number, number] {
  const lr = toLinear(r), lg = toLinear(g), lb = toLinear(b);
  const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
  const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
  const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const a = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const bb = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  return [L, Math.hypot(a, bb), ((Math.atan2(bb, a) * 180) / Math.PI + 360) % 360];
}

/** Ein Pixel → Stift. */
export function crayonOf(r: number, g: number, b: number): CrayonKey {
  const [L, C, h] = oklch(r, g, b);
  const sat = C / Math.max(L, 0.2); // Sättigung unabhängig von Schatten

  if (L < 0.3 && C < 0.07) return 'black';
  if (C < 0.022 || sat < 0.03) return L >= 0.86 ? 'white' : L >= 0.42 ? 'gray' : 'black';

  if (h < 15 || h >= 330) return L >= 0.62 || sat < 0.2 ? 'pink' : 'red';
  if (h < 40) {
    if (sat >= 0.18) return L >= 0.78 ? 'pink' : 'red';
    return L >= 0.75 ? 'pink' : 'brown';
  }
  // Orange, Braun und Beige liegen im selben Farbton. Braun ist dunkler und etwas gelblicher
  // (Evoli), Orange heller und röter (Glumanda); Schatten eines Orange bleiben Orange.
  if (h < 75) {
    if (L < 0.5) return 'brown';
    if (sat < 0.06) return L >= 0.6 ? 'beige' : 'brown';
    return h >= 62 && L < 0.72 ? 'brown' : 'orange';
  }
  if (h < 112) {
    if (L < 0.45) return 'brown';
    return sat >= 0.09 ? 'yellow' : 'beige';
  }
  if (h < 158) return L >= 0.7 ? 'lightGreen' : 'darkGreen';
  if (h < 208) return 'turquoise';
  if (h < 265) return L >= 0.68 ? 'lightBlue' : 'darkBlue';
  if (h < 305) return 'purple';
  return L >= 0.75 ? 'pink' : 'purple';
}

export const CRAYON_KEYS = Object.keys(CRAYONS) as CrayonKey[];
export const NO_CRAYON = 255; // durchsichtiger Pixel

/** Der gesprochene Baustein zu einem Stift, z. B. "crayonOrange" → "Orange!" */
export const crayonFragment = (key: CrayonKey) =>
  `crayon${key[0]!.toUpperCase()}${key.slice(1)}` as `crayon${Capitalize<CrayonKey>}`;

/** Stift je Pixel (Index in CRAYON_KEYS) für RGBA-Pixel, z. B. aus einem Canvas. */
export function crayonIndex(rgba: ArrayLike<number>): Uint8Array {
  const out = new Uint8Array(Math.floor(rgba.length / 4)).fill(NO_CRAYON);
  const seen = new Map<number, number>(); // viele Pixel haben dieselbe Farbe
  for (let p = 0; p < out.length; p++) {
    const i = p * 4;
    if (rgba[i + 3]! < 200) continue;
    const rgb = (rgba[i]! << 16) | (rgba[i + 1]! << 8) | rgba[i + 2]!;
    let idx = seen.get(rgb);
    if (idx === undefined) {
      idx = CRAYON_KEYS.indexOf(crayonOf(rgba[i]!, rgba[i + 1]!, rgba[i + 2]!));
      seen.set(rgb, idx);
    }
    out[p] = idx;
  }
  return out;
}

const BLACK = CRAYON_KEYS.indexOf('black');

/**
 * Umrisslinien entfernen: Auf dem Malblatt sind sie schon gedruckt, einen schwarzen Stift braucht es
 * nur für echte schwarze Flächen (Nachtara, Pikachus Ohrspitzen). Ein schwarzer Pixel zählt nur, wenn
 * fast alle Nachbarn auch schwarz sind – dünne Linien fallen so weg (sie werden "kein Stift").
 */
export function withoutOutlines(index: Uint8Array, width: number): Uint8Array {
  const out = index.slice();
  const height = index.length / width;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const p = y * width + x;
      if (index[p] !== BLACK) continue;
      let dark = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx, ny = y + dy;
          if ((dx || dy) && nx >= 0 && ny >= 0 && nx < width && ny < height && index[ny * width + nx] === BLACK) dark += 1;
        }
      }
      if (dark < 7) out[p] = NO_CRAYON;
    }
  }
  return out;
}

export type CrayonShare = { key: CrayonKey; hex: string; share: number };

/** Die Stifte mit nennenswertem Anteil, größter zuerst. Kleinere fallen weg (Glanzlichter, Kanten). */
export function crayonShares(index: Uint8Array, minShare = 0.05, max = 6): CrayonShare[] {
  const counts = new Array<number>(CRAYON_KEYS.length).fill(0);
  let total = 0;
  for (const idx of index) {
    if (idx === NO_CRAYON) continue;
    counts[idx]! += 1;
    total += 1;
  }
  if (!total) return [];
  return CRAYON_KEYS
    .map((key, i) => ({ key, hex: CRAYONS[key], share: counts[i]! / total }))
    .filter((c) => c.share >= minShare)
    .sort((a, b) => b.share - a.share)
    .slice(0, max);
}

export const crayonsFor = (rgba: ArrayLike<number>, minShare?: number, max?: number) =>
  crayonShares(crayonIndex(rgba), minShare, max);
