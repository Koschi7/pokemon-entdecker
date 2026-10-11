/** "1,70 m" ab einem Meter, darunter "60 cm" – so lesen Eltern es vor. */
export function formatHeight(meters: number): string {
  if (meters < 1) return `${Math.round(meters * 100)} cm`;
  return `${meters.toFixed(2).replace('.', ',').replace(/,00$/, '').replace(/(,\d)0$/, '$1')} m`;
}

/** Pixel pro Meter, damit das Größte (plus etwas Luft) genau auf die Bühne passt. */
export function pixelsPerMeter(heights: number[], stageHeightPx: number, headroom = 0.9): number {
  const tallest = Math.max(...heights, 0.1);
  return (stageHeightPx * headroom) / tallest;
}
