import { describe, expect, it } from 'vitest';
import { compareFragments, type Family } from './compare';

const family: Family = { you: 1.1, sibling: { height: 0.95, role: 'brother' }, mama: 1.68, papa: 1.8 };

describe('compareFragments', () => {
  it('erkennt "genauso groß" mit etwas Toleranz', () => {
    expect(compareFragments(1.1, family)).toEqual(['same']); // Glutexo
    expect(compareFragments(1.13, family)).toEqual(['same']);
  });
  it('unterscheidet ein bisschen, deutlich und viel kleiner', () => {
    expect(compareFragments(1.0, family)).toEqual(['bitSmaller']);
    expect(compareFragments(0.7, family)).toEqual(['smaller']);
    expect(compareFragments(0.6, family)).toEqual(['half']); // Glumanda
    expect(compareFragments(0.2, family)).toEqual(['muchSmaller']);
  });
  it('nennt das Geschwisterkind, wenn es genauso groß ist', () => {
    expect(compareFragments(0.95, family)).toEqual(['bitSmaller', 'likeBrother']);
  });
  it('nennt Mama und Papa bei passender Größe', () => {
    expect(compareFragments(1.7, family)).toEqual(['bigger', 'likeMama']); // Glurak
    expect(compareFragments(1.8, family)).toEqual(['bigger', 'likePapa']);
  });
  it('sagt "sogar größer als Mama und Papa" knapp über den Eltern', () => {
    expect(compareFragments(2.0, family)).toEqual(['times2', 'tallerThanParents']);
  });
  it('zählt Vielfache bis zehn, darüber "mehr als zehnmal"', () => {
    expect(compareFragments(3.5, family)).toEqual(['times3']);
    expect(compareFragments(14.5, family)).toEqual(['huge']); // Wailord
  });
});
