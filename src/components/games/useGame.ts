import { useEffect, useState } from 'react';
import { loseLife, scorePoint, startGame, type GameState } from '../../data/game';
import { load, save } from '../../lib/storage';

export type GameKey = 'quiz' | 'bigger';
const NO_RECORDS: Record<GameKey, number> = { quiz: 0, bigger: 0 };

/** Punkte, Leben und Rekord eines Spiels; der Rekord bleibt auf dem Tablet gespeichert. */
export function useGame(key: GameKey) {
  const [state, setState] = useState<GameState>(() => startGame(load('records', NO_RECORDS)[key]));

  useEffect(() => {
    const records = load('records', NO_RECORDS);
    if (state.best > records[key]) save('records', { ...records, [key]: state.best });
  }, [key, state.best]);

  return {
    state,
    correct: () => setState(scorePoint),
    wrong: () => setState(loseLife),
    restart: () => setState((s) => startGame(s.best)),
  };
}

export function loadRecords(): Record<GameKey, number> {
  return load('records', NO_RECORDS);
}
