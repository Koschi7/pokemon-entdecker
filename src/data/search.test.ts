import { describe, expect, it } from 'vitest';
import { fold, koelner, searchPokemon } from './search';
import type { FormData, PokemonData } from './types';

const form = (key: string, name: string, nameEn: string): FormData => ({
  key, region: 'mega', name, nameEn, types: ['fire'], height: 1, weight: 1,
});
const p = (id: number, name: string, nameEn: string, megas?: FormData[]): PokemonData => ({
  id, name, nameEn, gen: 1, color: 'red', types: ['normal'], height: 1, weight: 1, chain: null, megas,
});
const all = [
  p(4, 'Glumanda', 'Charmander'), p(5, 'Glutexo', 'Charmeleon'),
  p(6, 'Glurak', 'Charizard', [form('charizard-mega-x', 'Mega-Glurak X', 'Mega Charizard X')]),
  p(25, 'Pikachu', 'Pikachu'), p(133, 'Evoli', 'Eevee'), p(889, 'Zamazenta', 'Zamazenta'), p(149, 'Dragoran', 'Dragonite'),
];
const names = (q: string) => searchPokemon(q, all).map((h) => h.name);

describe('searchPokemon', () => {
  it('schlägt schon ab dem ersten Buchstaben vor, in Pokédex-Reihenfolge', () => {
    expect(names('gl')).toEqual(['Glumanda', 'Glutexo', 'Glurak', 'Mega-Glurak X']);
  });
  it('findet Formen über jedes Wort im Namen und englische Namen', () => {
    expect(names('mega')).toEqual(['Mega-Glurak X']);
    expect(names('charizard')).toEqual(['Glurak', 'Mega-Glurak X']);
  });
  it('verzeiht Tippfehler beim Buchstabieren nach Gehör', () => {
    expect(names('Glurack')[0]).toBe('Glurak');
    expect(names('Pikatschu')[0]).toBe('Pikachu');
    expect(names('Ewoli')[0]).toBe('Evoli');
    expect(names('Samasenta')[0]).toBe('Zamazenta');
  });
  it('liefert die Form zum Öffnen der Karte mit', () => {
    expect(searchPokemon('Mega-Glurak', all)[0]).toEqual({ id: 6, form: 'charizard-mega-x', name: 'Mega-Glurak X', thumb: 'charizard-mega-x' });
  });
  it('liefert nichts für leere Eingaben', () => {
    expect(searchPokemon('  ', all)).toEqual([]);
    expect(searchPokemon('?!', all)).toEqual([]);
  });
});

describe('Hilfsfunktionen', () => {
  it('vereinfacht Umlaute und Satzzeichen', () => {
    expect(fold('Mega-Glurak X')).toBe('megaglurakx');
    expect(fold('Flügel')).toBe('flugel');
  });
  it('Kölner Phonetik: gleich klingende Wörter, gleicher Code', () => {
    expect(koelner('Meier')).toBe(koelner('Mayer'));
    expect(koelner('Samasenta')).toBe(koelner('Zamazenta'));
    expect(koelner('Müller-Lüdenscheidt')).toBe('65752682');
  });
});
