import { expect, it } from 'vitest';
import { pageOrientation } from './print';

it('druckt breite Pokémon quer und hohe hoch', () => {
  expect(pageOrientation(1962, 1100)).toBe('landscape'); // Glurak mit ausgebreiteten Flügeln
  expect(pageOrientation(1100, 1962)).toBe('portrait'); // Mewtu
  expect(pageOrientation(1600, 1600)).toBe('portrait'); // rund: hoch, der Name braucht unten Platz
  expect(pageOrientation(0, 0)).toBe('portrait');
});
