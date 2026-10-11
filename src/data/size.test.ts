import { describe, expect, it } from 'vitest';
import { formatHeight, pixelsPerMeter } from './size';

describe('formatHeight', () => {
  it('nutzt Zentimeter unter einem Meter', () => {
    expect(formatHeight(0.6)).toBe('60 cm');
    expect(formatHeight(0.1)).toBe('10 cm');
  });
  it('nutzt Meter mit Komma ab einem Meter', () => {
    expect(formatHeight(1.7)).toBe('1,7 m');
    expect(formatHeight(1.75)).toBe('1,75 m');
    expect(formatHeight(2)).toBe('2 m');
    expect(formatHeight(14.5)).toBe('14,5 m');
  });
});

describe('pixelsPerMeter', () => {
  it('lässt das Größte mit Luft auf die Bühne passen', () => {
    expect(pixelsPerMeter([0.6, 1.1, 1.7], 340)).toBeCloseTo(180);
  });
});
