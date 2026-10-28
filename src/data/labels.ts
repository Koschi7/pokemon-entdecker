// Farben, Typen und Oberflächentexte. Die Kinder lesen (noch) nicht – Texte sind für Eltern
// und als Beschriftung unter Symbolen. Englisch für alle, die das Repo klonen.
export type Lang = 'de' | 'en';

export const TYPE_COLORS: Record<string, string> = {
  normal: '#a8a77a', fire: '#ee8130', water: '#6390f0', electric: '#f7d02c', grass: '#7ac74c',
  ice: '#96d9d6', fighting: '#c22e28', poison: '#a33ea1', ground: '#e2bf65', flying: '#a98ff3',
  psychic: '#f95587', bug: '#a6b91a', rock: '#b6a136', ghost: '#735797', dragon: '#6f35fc',
  dark: '#705746', steel: '#b7b7ce', fairy: '#d685ad',
};
export const TYPES = Object.keys(TYPE_COLORS);

/** CSS-Variablen für den Karten-Verlauf aus Erst- und Zweittyp (siehe .card-face). */
export function typeVars(types: string[]): React.CSSProperties {
  return {
    '--type-a': TYPE_COLORS[types[0] ?? 'normal'],
    '--type-b': TYPE_COLORS[types[1] ?? types[0] ?? 'normal'],
  } as React.CSSProperties;
}

/** Farben der PokéAPI ("Farbe der Art") mit kräftigen, kindgerechten Tönen. */
export const COLOR_SWATCHES: Record<string, string> = {
  red: '#e8402a', yellow: '#ffd23f', green: '#46b04f', blue: '#3b82e6', purple: '#9358d6',
  pink: '#f59ac6', brown: '#9a6234', gray: '#9aa3ad', white: '#f6f4ee', black: '#2b2b33',
};
export const COLORS = Object.keys(COLOR_SWATCHES);

/** Ein Starter als Symbol pro Generation (Kinder kennen keine Zahlen). */
export const GEN_STARTERS: Record<number, number> = { 1: 1, 2: 152, 3: 252, 4: 387, 5: 495, 6: 650, 7: 722, 8: 810, 9: 906 };

const TYPE_NAMES: Record<Lang, Record<string, string>> = {
  de: {
    normal: 'Normal', fire: 'Feuer', water: 'Wasser', electric: 'Elektro', grass: 'Pflanze', ice: 'Eis',
    fighting: 'Kampf', poison: 'Gift', ground: 'Boden', flying: 'Flug', psychic: 'Psycho', bug: 'Käfer',
    rock: 'Gestein', ghost: 'Geist', dragon: 'Drache', dark: 'Unlicht', steel: 'Stahl', fairy: 'Fee',
  },
  en: Object.fromEntries(TYPES.map((t) => [t, t[0]!.toUpperCase() + t.slice(1)])),
};

const COLOR_NAMES: Record<Lang, Record<string, string>> = {
  de: {
    red: 'Rot', yellow: 'Gelb', green: 'Grün', blue: 'Blau', purple: 'Lila', pink: 'Rosa',
    brown: 'Braun', gray: 'Grau', white: 'Weiß', black: 'Schwarz',
  },
  en: Object.fromEntries(COLORS.map((c) => [c, c[0]!.toUpperCase() + c.slice(1)])),
};

const UI = {
  de: {
    color: 'Farbe', type: 'Typ', team: 'Team', sizeSort: 'Klein → groß', all: 'Alle', gen: 'Generation',
    cry: 'Ruf', shiny: 'Shiny', forms: 'Formen', catch: 'Fangen', release: 'Freilassen', evolve: 'Entwickeln',
    size: 'Wie groß?', back: 'Zurück', close: 'Schließen', teamEmpty: 'Noch leer – fang Pokémon mit dem Pokéball!',
    teamFull: 'Team voll (6) – erst eins freilassen', you: 'Du', mama: 'Mama', papa: 'Papa',
    brother: 'Bruder', sister: 'Schwester', settings: 'Eltern-Einstellungen', heights: 'Körpergrößen',
    sibling: 'Geschwisterkind ist', effects: 'Sound-Effekte', offline: 'Alles offline laden',
    offlineHint: 'Lädt alle Bilder, Shinys und Rufe (etwa 80 MB) – vor einer Autofahrt im WLAN.',
    done: 'Fertig', loading: 'Lade Pokémon …', loadError: 'Pokémon konnten nicht geladen werden.',
    holdForSettings: 'Für Eltern: 3 Sekunden gedrückt halten',
    on: 'An', off: 'Aus', failed: 'fehlgeschlagen', name: 'Name',
    quiz: 'Quiz', quizWho: 'Wer ist das?', next: 'Noch eins!',
    games: 'Spiele', bigger: 'Wer ist größer?', again: 'Nochmal!', best: 'Rekord', gameOver: 'Spiel vorbei',
    newBest: 'Neuer Rekord!', master: 'Pokémon-Meister!', biggerTag: 'größer',
    familyHint: 'Nur für die Größen-Bühne. Bleibt auf diesem Tablet und wird nirgends hochgeladen. Gesprochen wird „du“ und „dein Bruder“.',
  },
  en: {
    color: 'Color', type: 'Type', team: 'Team', sizeSort: 'Small → big', all: 'All', gen: 'Generation',
    cry: 'Cry', shiny: 'Shiny', forms: 'Forms', catch: 'Catch', release: 'Release', evolve: 'Evolve',
    size: 'How big?', back: 'Back', close: 'Close', teamEmpty: 'Empty – catch Pokémon with the Poké Ball!',
    teamFull: 'Team full (6) – release one first', you: 'You', mama: 'Mom', papa: 'Dad',
    brother: 'Brother', sister: 'Sister', settings: 'Parent settings', heights: 'Body heights',
    sibling: 'Sibling is a', effects: 'Sound effects', offline: 'Download everything',
    offlineHint: 'Downloads all images, shinies and cries (about 80 MB) – do it on Wi-Fi before a trip.',
    done: 'Done', loading: 'Loading Pokémon …', loadError: 'Could not load Pokémon.',
    holdForSettings: 'Parents: hold for 3 seconds',
    on: 'On', off: 'Off', failed: 'failed', name: 'Name',
    quiz: 'Quiz', quizWho: "Who's that?", next: 'Another one!',
    games: 'Games', bigger: "Who's bigger?", again: 'Again!', best: 'Best', gameOver: 'Game over',
    newBest: 'New record!', master: 'Pokémon Master!', biggerTag: 'bigger',
    familyHint: 'Only for the size stage. Stays on this tablet and is never uploaded. Spoken as “you” and “your brother”.',
  },
} satisfies Record<Lang, Record<string, string>>;

export type UiStrings = (typeof UI)['de'];

export function strings(lang: Lang) {
  return {
    ui: UI[lang] as UiStrings,
    typeName: (t: string) => TYPE_NAMES[lang][t] ?? t,
    colorName: (c: string) => COLOR_NAMES[lang][c] ?? c,
  };
}
