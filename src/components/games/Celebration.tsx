import { useEffect, useMemo, useState } from 'react';
import { animate, motion } from 'motion/react';
import { asset } from '../../data/assets';
import { MAX_SCORE } from '../../data/game';
import { TYPE_COLORS, type UiStrings } from '../../data/labels';
import { play } from '../../lib/audio';
import { sfx } from '../../lib/sfx';
import { Pokeball, Sparkles, Trophy } from '../icons';

type Buttons = { onAgain: () => void; onBack: () => void; ui: UiStrings };

function Actions({ onAgain, onBack, ui }: Buttons) {
  return (
    <div className="flex gap-3">
      <button onClick={() => { sfx.tap(); onBack(); }} className="chunky rounded-full bg-white/15 px-5 py-2.5 text-lg font-extrabold">
        ← {ui.games}
      </button>
      <button onClick={() => { sfx.tap(); onAgain(); }} className="chunky rounded-full bg-sun px-6 py-2.5 text-xl font-black text-ink">
        {ui.again}
      </button>
    </div>
  );
}

/** Konfetti in den Typfarben – per CSS animiert, damit es auch auf dem Fire-Tablet flüssig bleibt. */
function Confetti({ count }: { count: number }) {
  const pieces = useMemo(() => {
    const colors = Object.values(TYPE_COLORS);
    return Array.from({ length: count }, (_, i) => ({
      left: (i * 37) % 100,
      delay: (i % 12) * 0.18,
      duration: 2.4 + ((i * 7) % 10) / 6,
      color: colors[i % colors.length],
      round: i % 3 === 0,
    }));
  }, [count]);
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {pieces.map((p, i) => (
        <span
          key={i}
          className={`confetti ${p.round ? 'rounded-full' : 'rounded-[2px]'}`}
          style={{ left: `${p.left}%`, background: p.color, animationDelay: `${p.delay}s`, animationDuration: `${p.duration}s` }}
        />
      ))}
    </div>
  );
}

/** Ende nach drei Fehlern – mit Extra-Jubel bei neuem Rekord. */
export function GameOverOverlay({ score, best, newBest, ...buttons }: Buttons & { score: number; best: number; newBest: boolean }) {
  const { ui } = buttons;
  useEffect(() => {
    if (newBest) sfx.newBest();
    else sfx.gameOver();
    const t = window.setTimeout(() => play(asset.fragment(newBest ? 'newBest' : 'gameOver')), 500);
    return () => window.clearTimeout(t);
  }, [newBest]);

  return (
    <motion.div className="absolute inset-0 z-20 grid place-items-center bg-[#080a18]/75 p-3" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      {newBest && <Confetti count={28} />}
      <motion.div
        className="relative flex flex-col items-center gap-3 rounded-[28px] border-4 border-white/85 bg-ink px-8 py-5 short:gap-2 short:py-3"
        initial={{ scale: 0.7, y: 30 }} animate={{ scale: 1, y: 0 }} transition={{ type: 'spring', stiffness: 220, damping: 16 }}
      >
        {newBest ? (
          <motion.div className="rounded-full bg-sun px-5 py-1 text-xl font-black text-ink" animate={{ rotate: [-3, 3, -3] }} transition={{ repeat: Infinity, duration: 1.2 }}>
            {ui.newBest}
          </motion.div>
        ) : (
          <div className="text-lg font-extrabold text-white/70">{ui.gameOver}</div>
        )}
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <Sparkles className="size-10 text-sun" />
            <span className="text-5xl font-black tabular-nums short:text-4xl">{score}</span>
          </div>
          <div className="flex items-center gap-2 text-white/80">
            <Trophy className="size-10" />
            <span className="text-3xl font-black tabular-nums">{best}</span>
          </div>
        </div>
        <Actions {...buttons} />
      </motion.div>
    </motion.div>
  );
}

/** 100 geschafft: Lichtstrahlen, Pokal, hochzählende 100, Konfetti, Fanfare und Puck. */
export function VictoryOverlay(buttons: Buttons) {
  const { ui } = buttons;
  const [count, setCount] = useState(0);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    sfx.victory();
    const counter = animate(0, MAX_SCORE, { duration: 1.6, ease: 'easeOut', onUpdate: (v) => setCount(Math.round(v)) });
    const voice = window.setTimeout(() => play(asset.fragment('victory')), 1300);
    const show = window.setTimeout(() => setReady(true), 2200);
    return () => {
      counter.stop();
      window.clearTimeout(voice);
      window.clearTimeout(show);
    };
  }, []);

  return (
    <motion.div className="app-frame z-[80] grid place-items-center overflow-hidden bg-[radial-gradient(circle_at_50%_45%,#3b4aa8,#0c0e20_70%)]"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="victory-rays" aria-hidden />
      <Confetti count={60} />
      {[0, 1, 2, 3].map((i) => (
        <motion.span
          key={i}
          className="absolute size-14"
          style={{ left: `${12 + i * 24}%` }}
          initial={{ y: '60vh', rotate: 0, opacity: 0 }}
          animate={{ y: ['60vh', '-8vh', '10vh'], rotate: [0, 360, 540], opacity: [0, 1, 0] }}
          transition={{ duration: 2.6, delay: 0.3 + i * 0.25, ease: 'easeOut' }}
        >
          <Pokeball className="size-full" />
        </motion.span>
      ))}
      <div className="relative flex flex-col items-center gap-2 short:gap-0.5">
        <motion.div
          initial={{ scale: 0, rotate: -30 }}
          animate={{ scale: [0, 1.25, 1], rotate: [-30, 10, 0] }}
          transition={{ duration: 0.9, ease: 'easeOut' }}
        >
          <motion.div animate={{ y: [0, -8, 0] }} transition={{ repeat: Infinity, duration: 1.6, ease: 'easeInOut', delay: 1 }}>
            <Trophy className="size-36 drop-shadow-[0_0_30px_rgb(255_203_5/0.8)] short:size-20" />
          </motion.div>
        </motion.div>
        <span className="text-7xl font-black text-sun tabular-nums drop-shadow-[0_4px_0_rgb(0_0_0/0.4)] short:text-5xl">{count}</span>
        <motion.span className="text-3xl font-black short:text-2xl" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.6 }}>
          {ui.master}
        </motion.span>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: ready ? 1 : 0 }} className="mt-2 short:mt-1.5" style={{ pointerEvents: ready ? 'auto' : 'none' }}>
          <Actions {...buttons} />
        </motion.div>
      </div>
    </motion.div>
  );
}
