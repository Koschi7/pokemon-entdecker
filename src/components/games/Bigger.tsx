import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { asset } from '../../data/assets';
import { bigger, makePair, type Pair } from '../../data/bigger';
import { typeVars, type UiStrings } from '../../data/labels';
import { aspectOf, formatHeight } from '../../data/size';
import type { BoundingBoxes, PokemonData } from '../../data/types';
import { play } from '../../lib/audio';
import { sfx } from '../../lib/sfx';
import { CroppedArt } from '../CroppedArt';
import { SparkleBurst } from '../DetailCard';
import { GameOverOverlay, VictoryOverlay } from './Celebration';
import { GameHud } from './GameHud';
import { useGame } from './useGame';

type Props = { pool: PokemonData[]; bbox: BoundingBoxes; ui: UiStrings; onExit: () => void };

const END_DELAY = 1700; // erst das Wachsen auf echte Größe zeigen, dann das Ende
const MIN_PX = 10;

/** Misst ein Element – auch wenn es bei jedem neuen Paar neu aufgebaut wird (Callback-Ref). */
function useSize() {
  const [size, setSize] = useState({ w: 360, h: 220 });
  const observer = useRef<ResizeObserver | null>(null);
  const ref = useCallback((el: HTMLDivElement | null) => {
    observer.current?.disconnect();
    if (!el) return;
    const measure = () => setSize({ w: el.clientWidth, h: el.clientHeight });
    measure();
    observer.current = new ResizeObserver(measure);
    observer.current.observe(el);
  }, []);
  return [ref, size] as const;
}

/**
 * "Wer ist größer?": zwei Pokémon, beide gleich groß gezoomt – man muss es wissen, nicht sehen.
 * Nach dem Tipp wachsen bzw. schrumpfen beide auf den echten Maßstab.
 */
export function Bigger({ pool, bbox, ui, onExit }: Props) {
  const game = useGame('bigger');
  const recent = useRef<number[]>([]);
  const scoreRef = useRef(0);
  const [areaRef, area] = useSize();
  const [pair, setPair] = useState<Pair | null>(null);
  const [picked, setPicked] = useState<number | null>(null);
  const [burst, setBurst] = useState(0);
  const [ended, setEnded] = useState<'over' | 'won' | null>(null);

  useEffect(() => {
    scoreRef.current = game.state.score;
  }, [game.state.score]);

  const next = useCallback(() => {
    if (pool.length < 2) return;
    const p = makePair(pool, scoreRef.current, recent.current);
    recent.current = [p[0].id, p[1].id, ...recent.current].slice(0, 16);
    setPair(p);
    setPicked(null);
    play(asset.fragment('biggerWho')); // ausgelöst durch einen Tipp
  }, [pool]);

  useEffect(() => next(), [next]);

  const status = game.state.status;
  useEffect(() => {
    if (status === 'playing') return;
    const t = window.setTimeout(() => setEnded(status), END_DELAY);
    return () => window.clearTimeout(t);
  }, [status]);

  if (!pair) return null;
  const winner = bigger(pair);
  const revealed = picked !== null;
  const boxOf = (p: PokemonData) => bbox[String(p.id)] ?? ([0, 0, 1, 1] as [number, number, number, number]);

  // Vorher: beide Figuren gleich hoch (so hoch, wie die breitere es zulässt)
  const maxH = area.h * 0.92;
  const maxW = area.w * 0.86;
  const same = Math.min(maxH, ...pair.map((p) => maxW / aspectOf(boxOf(p))));
  // Nachher: echter Maßstab, das Größere füllt die Karte
  const pxPerMeter = Math.min(...pair.map((p) => Math.min(maxH, maxW / aspectOf(boxOf(p))) / p.height), maxH / winner.height);
  const heightOf = (p: PokemonData) => (revealed ? Math.max(MIN_PX, p.height * pxPerMeter) : same);

  const choose = (p: PokemonData) => {
    if (revealed || status !== 'playing') return;
    setPicked(p.id);
    if (p.id === winner.id) {
      game.correct();
      setBurst((b) => b + 1);
      sfx.correct();
      window.setTimeout(() => play(asset.fragment('quizRight')), 350);
    } else {
      game.wrong();
      sfx.wrong();
      sfx.lifeLost();
      window.setTimeout(() => play(asset.fragment('biggerWrong')), 350);
    }
  };

  const restart = () => {
    game.restart();
    scoreRef.current = 0;
    setEnded(null);
    next();
  };

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <GameHud state={game.state} ui={ui} onBack={onExit} onSpeak={() => play(asset.fragment('biggerWho'))} />

      <div className="relative flex min-h-0 flex-1 gap-3 px-3 pt-2 pb-3">
        {pair.map((p, i) => {
          const isWinner = p.id === winner.id;
          const isPicked = p.id === picked;
          return (
            <motion.button
              key={`${pair[0].id}-${pair[1].id}-${p.id}`}
              onClick={() => choose(p)}
              aria-label={p.name}
              initial={{ opacity: 0, y: 20 }}
              animate={isPicked && !isWinner ? { opacity: 1, y: 0, x: [0, -12, 12, -8, 8, 0] } : { opacity: 1, y: 0, x: 0 }}
              transition={{ duration: 0.4 }}
              className={`card-face chunky relative flex min-h-0 min-w-0 flex-1 flex-col items-center overflow-hidden rounded-[24px] border-4 ${
                revealed && isWinner ? 'border-sun ring-4 ring-sun' : isPicked ? 'border-[#ff5a5a]' : 'border-white/80'
              }`}
              style={typeVars(p.types)}
            >
              <div ref={i === 0 ? areaRef : undefined} className="relative flex min-h-0 w-full flex-1 items-end justify-center">
                <span className="absolute inset-x-6 bottom-0 h-1 rounded-full bg-black/20" />
                <CroppedArt id={p.id} box={boxOf(p)} height={heightOf(p)} className="drop-shadow-[0_6px_0_rgb(0_0_0/0.22)]" />
              </div>
              <div className="flex h-11 shrink-0 items-center gap-2 short:h-9">
                {revealed && (
                  <motion.span initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                    className="rounded-full bg-ink/75 px-3 py-0.5 text-[15px] font-extrabold whitespace-nowrap">
                    {p.name} · {formatHeight(p.height)}
                  </motion.span>
                )}
              </div>
              {revealed && isPicked && (
                <motion.span
                  initial={{ scale: 0 }} animate={{ scale: 1 }}
                  className={`absolute top-2 right-2 grid size-11 place-items-center rounded-full text-2xl font-black text-white ${isWinner ? 'bg-[#2fae4f]' : 'bg-[#e0453a]'}`}
                >
                  {isWinner ? '✓' : '✗'}
                </motion.span>
              )}
              {revealed && isWinner && (
                <motion.span initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
                  className="absolute top-2 left-2 rounded-full bg-sun px-3 py-1 text-[14px] font-black text-ink">
                  ⬆ {ui.biggerTag}
                </motion.span>
              )}
              {isPicked && isWinner && <SparkleBurst burst={burst} />}
            </motion.button>
          );
        })}

        {/* Mitte: vorher ein Fragezeichen, danach "weiter" */}
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <AnimatePresence mode="wait">
            {revealed && status === 'playing' ? (
              <motion.button
                key="next"
                onClick={() => { sfx.tap(); next(); }}
                aria-label={ui.next}
                initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
                className="chunky pointer-events-auto grid size-16 place-items-center rounded-full border-4 border-white bg-sun text-3xl font-black text-ink short:size-14"
              >
                →
              </motion.button>
            ) : !revealed ? (
              <motion.span
                key="ask"
                initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
                className="grid size-14 place-items-center rounded-full border-4 border-white bg-ink text-3xl font-black text-sun short:size-12"
              >
                ?
              </motion.span>
            ) : null}
          </AnimatePresence>
        </div>
      </div>

      {ended === 'over' && (
        <GameOverOverlay score={game.state.score} best={game.state.best} newBest={game.state.newBest} onAgain={restart} onBack={onExit} ui={ui} />
      )}
      {ended === 'won' && <VictoryOverlay onAgain={restart} onBack={onExit} ui={ui} />}
    </div>
  );
}
