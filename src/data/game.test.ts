import { describe, expect, it } from 'vitest';
import { LIVES, MAX_SCORE, loseLife, scorePoint, startGame } from './game';

describe('Spielregeln', () => {
  it('startet mit 3 Leben und behält den alten Rekord', () => {
    expect(startGame(12)).toEqual({ score: 0, lives: LIVES, best: 12, newBest: false, status: 'playing' });
  });

  it('zählt Punkte und erkennt einen neuen Rekord', () => {
    let s = startGame(2);
    s = scorePoint(scorePoint(s));
    expect(s).toMatchObject({ score: 2, best: 2, newBest: false });
    s = scorePoint(s);
    expect(s).toMatchObject({ score: 3, best: 3, newBest: true });
  });

  it('ist nach drei Fehlern vorbei', () => {
    let s = startGame(0);
    s = loseLife(loseLife(s));
    expect(s).toMatchObject({ lives: 1, status: 'playing' });
    s = loseLife(s);
    expect(s).toMatchObject({ lives: 0, status: 'over' });
    expect(scorePoint(s).score).toBe(0); // nach dem Ende zählt nichts mehr
  });

  it('ist bei 100 Punkten gewonnen und zählt nicht weiter', () => {
    let s = { ...startGame(0), score: MAX_SCORE - 1 };
    s = scorePoint(s);
    expect(s).toMatchObject({ score: MAX_SCORE, status: 'won', best: MAX_SCORE });
    expect(scorePoint(s).score).toBe(MAX_SCORE);
    expect(loseLife(s).lives).toBe(LIVES);
  });
});
