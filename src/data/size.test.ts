import { describe, expect, it } from 'vitest';
import { formatHeight, pixelsPerMeter } from './size';

describe('formatHeight', () => {
  it('nutzt Zentimeter unter einem Meter', () => {
    expect(formatHeight(0.6)).toBe('60 cm');
    expect(formatHeight(0.1)).toBe('10 cm');
  });
  it('schreibt Meter und Zentimeter wie gesprochen, ohne Komma', () => {
    expect(formatHeight(1.1)).toBe('1 m 10 cm');
    expect(formatHeight(1.7)).toBe('1 m 70 cm');
    expect(formatHeight(1.05)).toBe('1 m 5 cm');
    expect(formatHeight(2)).toBe('2 m');
    expect(formatHeight(14.5)).toBe('14 m 50 cm');
  });
  it('rundet auf ganze Zentimeter', () => {
    expect(formatHeight(1.999)).toBe('2 m');
    expect(formatHeight(0.995)).toBe('1 m');
  });
});

describe('pixelsPerMeter', () => {
  it('lässt das Größte mit Luft auf die Bühne passen', () => {
    expect(pixelsPerMeter([0.6, 1.1, 1.7], 340)).toBeCloseTo(180);
  });
});
