import { AnimatePresence, motion } from 'motion/react';
import { LIVES, MAX_SCORE, type GameState } from '../../data/game';
import type { UiStrings } from '../../data/labels';
import { sfx } from '../../lib/sfx';
import { Pokeball, Sparkles, Speaker, Trophy } from '../icons';

type Props = { state: GameState; onBack: () => void; onSpeak: () => void; ui: UiStrings };

/** Kopfzeile im Spiel: zurück, Pokébälle als Leben, Punkte und Rekord. */
export function GameHud({ state, onBack, onSpeak, ui }: Props) {
  return (
    <div className="flex shrink-0 items-center gap-3 px-3 pt-3 pb-1 short:pt-2 portrait:gap-2">
      <button onClick={() => { sfx.tap(); onBack(); }} className="chunky h-11 shrink-0 rounded-full bg-white/12 px-4 text-[15px] font-extrabold short:h-10">
        ← {ui.games}
      </button>

      <div className="flex items-center gap-1.5" aria-label={`${state.lives} / ${LIVES}`}>
        {Array.from({ length: LIVES }, (_, i) => {
          const alive = i < state.lives;
          return (
            <motion.span
              key={i}
              className="block size-9 short:size-8"
              animate={alive ? { scale: 1, rotate: 0, opacity: 1 } : { scale: [1, 1.35, 0.9], rotate: [0, -25, 15], opacity: 0.4 }}
              transition={{ duration: 0.5 }}
            >
              <Pokeball className={`size-full ${alive ? 'drop-shadow-[0_3px_0_rgb(0_0_0/0.35)]' : 'grayscale'}`} />
            </motion.span>
          );
        })}
      </div>

      <button onClick={onSpeak} aria-label="?" className="chunky grid size-11 shrink-0 place-items-center rounded-full bg-sun text-ink short:size-10">
        <Speaker className="size-6" />
      </button>

      <div className="ml-auto flex items-center gap-3">
        <div className="flex items-center gap-1.5 rounded-full bg-white/10 py-1 pr-4 pl-2 whitespace-nowrap">
          <Sparkles className="size-7 text-sun" />
          <AnimatePresence mode="popLayout">
            <motion.span
              key={state.score}
              initial={{ y: -14, opacity: 0, scale: 1.4 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              className="text-2xl font-black tabular-nums"
            >
              {state.score}
            </motion.span>
          </AnimatePresence>
          <span className="text-sm font-bold text-white/50 portrait:hidden">/ {MAX_SCORE}</span>
        </div>
        <motion.div
          key={state.newBest ? state.best : 'best'}
          animate={state.newBest ? { scale: [1, 1.25, 1] } : undefined}
          className={`flex items-center gap-1.5 rounded-full py-1 pr-4 pl-2 whitespace-nowrap ${state.newBest ? 'bg-sun text-ink' : 'bg-white/10'}`}
          aria-label={ui.best}
        >
          <Trophy className="size-7" />
          <span className="text-2xl font-black tabular-nums">{state.best}</span>
        </motion.div>
      </div>
    </div>
  );
}
