import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { asset } from '../../data/assets';
import { typeVars, type UiStrings } from '../../data/labels';
import { makeRound, type Round } from '../../data/quiz';
import type { PokemonData } from '../../data/types';
import { play, playSequence } from '../../lib/audio';
import { sfx } from '../../lib/sfx';
import { SparkleBurst } from '../DetailCard';
import { GameOverOverlay, VictoryOverlay } from './Celebration';
import { GameHud } from './GameHud';
import { useGame } from './useGame';

type Props = { pool: PokemonData[]; ui: UiStrings; onExit: () => void };

const END_DELAY = 1300; // erst die Auflösung zeigen, dann das Ende

/**
 * "Wer ist das Pokémon?" – Silhouette erraten, drei Bilder zur Auswahl.
 * Punkt nur beim ersten Versuch; ein Fehltipp kostet einen Pokéball, weitersuchen darf man trotzdem.
 */
export function Quiz({ pool, ui, onExit }: Props) {
  const game = useGame('quiz');
  const recent = useRef<number[]>([]);
  const [round, setRound] = useState<Round | null>(null);
  const [wrong, setWrong] = useState<number[]>([]);
  const [solved, setSolved] = useState(false);
  const [burst, setBurst] = useState(0);
  const [shake, setShake] = useState({ id: 0, n: 0 });
  const [ended, setEnded] = useState<'over' | 'won' | null>(null);

  const next = useCallback(() => {
    if (pool.length < 3) return;
    const r = makeRound(pool, recent.current);
    recent.current = [r.target.id, ...recent.current].slice(0, 12);
    setRound(r);
    setWrong([]);
    setSolved(false);
    play(asset.fragment('quizWho')); // ausgelöst durch einen Tipp (Spiel gewählt, "Noch eins!" oder "Nochmal!")
  }, [pool]);

  useEffect(() => next(), [next]);

  const status = game.state.status;
  useEffect(() => {
    if (status === 'playing') return;
    const t = window.setTimeout(() => setEnded(status), END_DELAY);
    return () => window.clearTimeout(t);
  }, [status]);

  if (!round) return null;
  const { target, options } = round;

  const choose = (p: PokemonData) => {
    if (solved || wrong.includes(p.id) || status !== 'playing') return;
    if (p.id === target.id) {
      setSolved(true);
      setBurst((b) => b + 1);
      if (wrong.length === 0) game.correct(); // Punkt nur beim ersten Versuch
      sfx.correct();
      window.setTimeout(() => playSequence([asset.fragment('quizRight'), asset.sentence(p.id)]), 350); // nach dem Jingle
    } else {
      setWrong((w) => [...w, p.id]);
      setShake({ id: p.id, n: shake.n + 1 });
      game.wrong();
      sfx.wrong();
      sfx.lifeLost();
      if (game.state.lives <= 1) setSolved(true); // letzter Pokéball: Lösung zeigen, dann ist Schluss
      else window.setTimeout(() => play(asset.fragment('quizTryAgain')), 350);
    }
  };

  const restart = () => {
    game.restart();
    setEnded(null);
    next();
  };

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <GameHud state={game.state} ui={ui} onBack={onExit}
        onSpeak={() => (solved ? play(asset.sentence(target.id)) : play(asset.fragment('quizWho')))} />

      <div className="flex min-h-0 flex-1 gap-3 px-3 pt-2 pb-3 portrait:flex-col">
        <section
          className={`relative min-h-0 flex-1 overflow-hidden rounded-[26px] border-4 border-white/85 ${solved ? 'card-face' : ''}`}
          style={solved ? typeVars(target.types) : { background: 'radial-gradient(60% 70% at 50% 45%, #3b4aa8, #141836 75%)' }}
        >
          <AnimatePresence mode="popLayout">
            <motion.img
              key={target.id}
              src={asset.art(target.id)}
              alt=""
              className="absolute inset-0 m-auto h-[82%] w-[88%] object-contain"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: solved ? [1, 1.12, 1] : 1, filter: solved ? 'brightness(1)' : 'brightness(0)' }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
            />
          </AnimatePresence>
          <SparkleBurst burst={burst} />

          <AnimatePresence>
            {solved && status === 'playing' && (
              <motion.div
                className="absolute inset-x-3 bottom-3 flex items-center justify-between gap-3"
                initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ opacity: 0 }}
              >
                <span className="rounded-full bg-ink/80 px-4 py-1.5 text-[clamp(20px,3.4vw,34px)] font-black">{target.name}</span>
                <button onClick={() => { sfx.tap(); next(); }} className="chunky rounded-full bg-sun px-5 py-2.5 text-xl font-black text-ink short:py-2">
                  {ui.next} →
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        <div className="flex w-[30%] shrink-0 flex-col gap-3 portrait:h-[30%] portrait:w-full portrait:flex-row">
          {options.map((p) => {
            const isWrong = wrong.includes(p.id);
            const isRight = solved && p.id === target.id;
            return (
              <motion.button
                key={`${target.id}-${p.id}`}
                onClick={() => choose(p)}
                aria-label={p.name}
                animate={shake.id === p.id && shake.n ? { x: [0, -12, 12, -8, 8, 0] } : { x: 0 }}
                transition={{ duration: 0.4 }}
                className={`card-face chunky relative grid min-h-0 flex-1 place-items-center rounded-[22px] border-4 ${
                  isRight ? 'border-sun ring-4 ring-sun' : 'border-white/80'
                } ${isWrong ? 'opacity-35 grayscale' : ''}`}
                style={typeVars(p.types)}
              >
                <img src={asset.thumb(p.id)} alt="" className="absolute inset-0 m-auto h-[86%] w-[86%] object-contain" />
              </motion.button>
            );
          })}
        </div>
      </div>

      {ended === 'over' && (
        <GameOverOverlay score={game.state.score} best={game.state.best} newBest={game.state.newBest} onAgain={restart} onBack={onExit} ui={ui} />
      )}
      {ended === 'won' && <VictoryOverlay onAgain={restart} onBack={onExit} ui={ui} />}
    </div>
  );
}
