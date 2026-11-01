// Ausmalbild drucken: A4, Hoch- oder Querformat – je nachdem, wo das Pokémon größer aufs Blatt passt.

/** Bedruckbare Fläche in mm (A4 minus 12 mm Rand) und Platz unten für den Namen. */
export const PAGE = { long: 297 - 24, short: 210 - 24, name: 34 } as const;

export type Orientation = 'portrait' | 'landscape';

/** Seitenverhältnis des (zugeschnittenen) Ausmalbilds → Format, in dem es größer gedruckt wird. */
export function pageOrientation(width: number, height: number): Orientation {
  if (!width || !height) return 'portrait';
  const scale = (pageW: number, pageH: number) => Math.min(pageW / width, (pageH - PAGE.name) / height);
  return scale(PAGE.long, PAGE.short) > scale(PAGE.short, PAGE.long) ? 'landscape' : 'portrait';
}
