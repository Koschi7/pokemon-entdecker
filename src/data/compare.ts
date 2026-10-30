// Sprachbausteine: Größenvergleiche ([Name] + Baustein, z. B. "Glurak" + "ist größer als du!") und Spiele.
// Die Bausteine werden einmal mit derselben Stimme erzeugt (pipeline/tts.ts, Schlüssel "frag/<key>").

export const FRAGMENTS = {
  same: 'ist genauso groß wie du!',
  bitBigger: 'ist ein bisschen größer als du!',
  bitSmaller: 'ist ein bisschen kleiner als du!',
  bigger: 'ist größer als du!',
  smaller: 'ist kleiner als du!',
  half: 'ist halb so groß wie du!',
  muchSmaller: 'ist viel, viel kleiner als du!',
  times2: 'ist doppelt so groß wie du!',
  times3: 'ist dreimal so groß wie du!',
  times4: 'ist viermal so groß wie du!',
  times5: 'ist fünfmal so groß wie du!',
  times6: 'ist sechsmal so groß wie du!',
  times7: 'ist siebenmal so groß wie du!',
  times8: 'ist achtmal so groß wie du!',
  times9: 'ist neunmal so groß wie du!',
  times10: 'ist zehnmal so groß wie du!',
  huge: 'ist mehr als zehnmal so groß wie du!',
  likeMama: 'Genau so groß wie Mama!',
  likePapa: 'Genau so groß wie Papa!',
  likeBrother: 'Genau so groß wie dein Bruder!',
  likeSister: 'Genau so groß wie deine Schwester!',
  tallerThanParents: 'Sogar größer als Mama und Papa!',
  thatsYou: 'Das bist du!',
  thatsMama: 'Das ist Mama!',
  thatsPapa: 'Das ist Papa!',
  thatsBrother: 'Das ist dein Bruder!',
  thatsSister: 'Das ist deine Schwester!',
  // Quiz "Wer ist das Pokémon?"
  quizWho: 'Wer ist das Pokémon?',
  quizRight: 'Richtig!',
  quizTryAgain: 'Fast! Probier es nochmal!',
  // Spiel "Wer ist größer?"
  biggerWho: 'Wer ist größer?',
  biggerWrong: 'Oh nein! Das andere ist größer.',
  // Für beide Spiele
  newBest: 'Neuer Rekord!',
  gameOver: 'Super gespielt! Gleich nochmal?',
  victory: 'Wahnsinn! Hundert Stück! Du bist ein echter Pokémon-Meister!',
  // Mega-Entwicklung
  megaEvolve: 'Mega-Entwicklung!',
} as const;

export type FragmentKey = keyof typeof FRAGMENTS;

export type Family = {
  you: number; // Größe des Kindes, das gerade spielt
  sibling: { height: number; role: 'brother' | 'sister' } | null;
  mama: number;
  papa: number;
};

const CLOSE = 0.04; // ±4 cm gilt als "genauso groß"

/** Welche Bausteine nach dem Namen gesprochen werden. */
export function compareFragments(height: number, family: Family): FragmentKey[] {
  const ratio = height / family.you;
  if (Math.abs(height - family.you) <= CLOSE) return ['same'];

  let main: FragmentKey;
  if (ratio < 0.25) main = 'muchSmaller';
  else if (ratio >= 0.4 && ratio <= 0.6) main = 'half';
  else if (ratio < 0.85) main = 'smaller';
  else if (ratio < 1) main = 'bitSmaller';
  else if (ratio <= 1.15) main = 'bitBigger';
  else if (ratio < 1.75) main = 'bigger';
  else {
    const times = Math.round(ratio);
    main = times > 10 ? 'huge' : (`times${Math.max(2, times)}` as FragmentKey);
  }

  const extra: FragmentKey[] = [];
  if (Math.abs(height - family.mama) <= CLOSE) extra.push('likeMama');
  else if (Math.abs(height - family.papa) <= CLOSE) extra.push('likePapa');
  else if (family.sibling && Math.abs(height - family.sibling.height) <= CLOSE) {
    extra.push(family.sibling.role === 'brother' ? 'likeBrother' : 'likeSister');
  } else if (height > Math.max(family.mama, family.papa) + CLOSE && ratio < 2.5) {
    extra.push('tallerThanParents');
  }
  return [main, ...extra];
}
