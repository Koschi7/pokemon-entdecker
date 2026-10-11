import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { asset } from '../data/assets';
import { typeVars, type UiStrings } from '../data/labels';
import { makeRound, type Round } from '../data/quiz';
import type { PokemonData } from '../data/types';
import { play, playSequence } from '../lib/audio';
import { sfx } from '../lib/sfx';
import { SparkleBurst } from './DetailCard';
import { Sparkles, Speaker } from './icons';

type Props = { pool: PokemonData[]; ui: UiStrings };

/** "Wer ist das Pokémon?" – Silhouette erraten, drei Bilder zur Auswahl. Sterne nur für diese Runde. */
export function Quiz({ pool, ui }: Props) {
  const recent = useRef<number[]>([]);
  const [round, setRound] = useState<Round | null>(null);
  const [wrong, setWrong] = useState<number[]>([]);
  const [solved, setSolved] = useState(false);
  const [stars, setStars] = useState(0);
  const [burst, setBurst] = useState(0);
  const [shake, setShake] = useState({ id: 0, n: 0 });

  const next = useCallback(() => {
    if (pool.length < 3) return;
    const r = makeRound(pool, recent.current);
    recent.current = [r.target.id, ...recent.current].slice(0, 12);
    setRound(r);
    setWrong([]);
    setSolved(false);
    play(asset.fragment('quizWho')); // ausgelöst durch einen Tipp (Quiz-Knopf, Generation oder "Noch eins!")
  }, [pool]);

  useEffect(() => next(), [next]);

  if (!round) return null;
  const { target, options } = round;

  const choose = (p: PokemonData) => {
    if (solved || wrong.includes(p.id)) return;
    if (p.id === target.id) {
      setSolved(true);
      setStars((s) => s + 1);
      setBurst((b) => b + 1);
      sfx.correct();
      window.setTimeout(() => playSequence([asset.fragment('quizRight'), asset.sentence(p.id)]), 350); // nach dem Jingle
    } else {
      setWrong((w) => [...w, p.id]);
      setShake({ id: p.id, n: shake.n + 1 });
      sfx.wrong();
      window.setTimeout(() => play(asset.fragment('quizTryAgain')), 300);
    }
  };

  return (
    <div className="flex min-h-0 flex-1 gap-3 px-3 pt-2 pb-3 portrait:flex-col">
      <section
        className={`relative min-h-0 flex-1 overflow-hidden rounded-[26px] border-4 border-white/85 ${solved ? 'card-face' : ''}`}
        style={solved ? typeVars(target.types) : { background: 'radial-gradient(60% 70% at 50% 45%, #3b4aa8, #141836 75%)' }}
      >
        <div className="absolute top-2 left-3 flex flex-wrap gap-0.5 text-sun">
          {Array.from({ length: Math.min(stars, 10) }, (_, i) => (
            <Sparkles key={i} className="size-5 drop-shadow-[0_0_4px_white]" />
          ))}
        </div>
        <button
          onClick={() => (solved ? play(asset.sentence(target.id)) : play(asset.fragment('quizWho')))}
          aria-label={ui.quizWho}
          className="chunky absolute top-2 right-2 z-10 grid size-12 place-items-center rounded-full bg-sun text-ink short:size-10"
        >
          <Speaker className="size-6" />
        </button>

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
          {solved && (
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
  );
}
