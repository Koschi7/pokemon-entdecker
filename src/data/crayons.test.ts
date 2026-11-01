import { describe, expect, it } from 'vitest';
import { CRAYON_KEYS, CRAYONS, NO_CRAYON, crayonFragment, crayonIndex, crayonOf, crayonShares, crayonsFor, withoutOutlines } from './crayons';
import { FRAGMENTS } from './compare';

const rgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as [number, number, number];
/** RGBA-Pixel: [Farbe, Anzahl] … (null = durchsichtig) */
const pixels = (...runs: [string | null, number][]) =>
  runs.flatMap(([hex, n]) => Array.from({ length: n }, () => (hex ? [...rgb(hex), 255] : [0, 0, 0, 0])).flat());

describe('crayonOf', () => {
  it('erkennt jeden Stift an seiner eigenen Farbe', () => {
    for (const key of CRAYON_KEYS) expect(crayonOf(...rgb(CRAYONS[key]))).toBe(key);
  });
  it('macht aus Schatten keinen anderen Stift', () => {
    expect(crayonOf(...rgb('#f08030'))).toBe('orange'); // Glumanda
    expect(crayonOf(...rgb('#b86a2a'))).toBe('orange'); // Glumanda im Schatten
    expect(crayonOf(...rgb('#a87a46'))).toBe('brown'); // Evoli
  });
  it('erkennt Pastelltöne', () => {
    expect(crayonOf(...rgb('#f5c8d8'))).toBe('pink'); // Mew
    expect(crayonOf(...rgb('#9b86b8'))).toBe('purple'); // Gengar
  });
});

describe('crayonShares', () => {
  it('zählt nur sichtbare Pixel und sortiert nach Anteil', () => {
    const shares = crayonsFor(pixels([CRAYONS.yellow, 6], [CRAYONS.black, 3], [CRAYONS.red, 1], [null, 90]), 10);
    expect(shares.map((s) => s.key)).toEqual(['yellow', 'black', 'red']);
    expect(shares[0]!.share).toBeCloseTo(0.6);
  });
  it('lässt kleine Anteile weg', () => {
    const shares = crayonsFor(pixels([CRAYONS.yellow, 97], [CRAYONS.red, 3]), 10);
    expect(shares.map((s) => s.key)).toEqual(['yellow']);
  });
  it('nimmt kleine feste Flächen dazu (Flamme, Backen), aber keine dünnen Ränder', () => {
    // 40×40 Gelb mit einem roten 7×7-Fleck (3 %), einer rosa Linie (3 %) und einem weißen Glanzlicht
    const w = 40;
    const index = new Uint8Array(w * w).fill(CRAYON_KEYS.indexOf('yellow'));
    const paint = (key: (typeof CRAYON_KEYS)[number], x0: number, y0: number, sx: number, sy: number) => {
      for (let y = y0; y < y0 + sy; y++) for (let x = x0; x < x0 + sx; x++) index[y * w + x] = CRAYON_KEYS.indexOf(key);
    };
    paint('red', 5, 5, 7, 7);
    paint('pink', 20, 0, 1, 40);
    paint('pink', 22, 0, 1, 9);
    paint('white', 28, 28, 7, 7);
    expect(crayonShares(index, w).map((s) => s.key)).toEqual(['yellow', 'red']);
  });
  it('liefert für ein leeres Bild nichts', () => {
    const index = crayonIndex(pixels([null, 10]));
    expect([...index].every((i) => i === NO_CRAYON)).toBe(true);
    expect(crayonShares(index, 10)).toEqual([]);
  });
});

describe('withoutOutlines', () => {
  const B = CRAYON_KEYS.indexOf('black');
  const O = CRAYON_KEYS.indexOf('orange');
  it('entfernt dünne schwarze Linien, behält schwarze Flächen', () => {
    // 6×6: links eine 1 px breite Linie, rechts ein 3×3-Block
    const w = 6;
    const index = new Uint8Array(36).fill(O);
    for (let y = 0; y < 6; y++) index[y * w] = B;
    for (let y = 1; y < 4; y++) for (let x = 2; x < 5; x++) index[y * w + x] = B;
    const out = withoutOutlines(index, w);
    expect([0, 1, 2, 3, 4, 5].map((y) => out[y * w])).toEqual(Array(6).fill(NO_CRAYON));
    expect(out[2 * w + 3]).toBe(B); // Mitte des Blocks bleibt
  });
});

it('hat für jeden Stift einen gesprochenen Baustein', () => {
  for (const key of CRAYON_KEYS) expect(FRAGMENTS[crayonFragment(key)]).toBeTruthy();
});
