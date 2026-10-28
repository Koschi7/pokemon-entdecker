// Spielregeln für "Wer ist das Pokémon?" und "Wer ist größer?": 3 Leben (Pokébälle), höchstens 100 Punkte.

export const MAX_SCORE = 100;
export const LIVES = 3;

export type GameState = {
  score: number;
  lives: number;
  best: number; // Rekord auf diesem Tablet
  newBest: boolean; // in dieser Runde übertroffen
  status: 'playing' | 'over' | 'won';
};

export function startGame(best: number): GameState {
  return { score: 0, lives: LIVES, best, newBest: false, status: 'playing' };
}

export function scorePoint(s: GameState): GameState {
  if (s.status !== 'playing') return s;
  const score = Math.min(MAX_SCORE, s.score + 1);
  const beaten = score > s.best;
  return {
    ...s,
    score,
    best: beaten ? score : s.best,
    newBest: s.newBest || beaten,
    status: score >= MAX_SCORE ? 'won' : 'playing',
  };
}

export function loseLife(s: GameState): GameState {
  if (s.status !== 'playing') return s;
  const lives = Math.max(0, s.lives - 1);
  return { ...s, lives, status: lives === 0 ? 'over' : 'playing' };
}
