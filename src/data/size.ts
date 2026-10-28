/**
 * So, wie man es spricht: "1 m 10 cm", darunter "60 cm", glatte Meter "2 m".
 * Kein Komma – "1,1 m" lesen Kinder als "ein Meter eins".
 */
export function formatHeight(meters: number): string {
  const cm = Math.round(meters * 100);
  if (cm < 100) return `${cm} cm`;
  const m = Math.floor(cm / 100);
  const rest = cm % 100;
  return rest ? `${m} m ${rest} cm` : `${m} m`;
}

/** Pixel pro Meter, damit das Größte (plus etwas Luft) genau auf die Bühne passt. */
export function pixelsPerMeter(heights: number[], stageHeightPx: number, headroom = 0.9): number {
  const tallest = Math.max(...heights, 0.1);
  return (stageHeightPx * headroom) / tallest;
}

/** Breite im Verhältnis zur Höhe – aus dem sichtbaren Umriss eines Artworks [x, y, Breite, Höhe]. */
export const aspectOf = (box: [number, number, number, number]) => box[2] / box[3];
