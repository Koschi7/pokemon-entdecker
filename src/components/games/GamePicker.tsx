import { motion } from 'motion/react';
import { asset } from '../../data/assets';
import { typeVars, type UiStrings } from '../../data/labels';
import { sfx } from '../../lib/sfx';
import { Trophy } from '../icons';
import { loadRecords, type GameKey } from './useGame';

type Props = { ui: UiStrings; onPick: (game: GameKey) => void };

/** Spielauswahl: zwei große Karten mit Vorschaubild und Rekord. */
export function GamePicker({ ui, onPick }: Props) {
  const records = loadRecords();
  const tiles: Array<{ key: GameKey; title: string; art: React.ReactNode; style: React.CSSProperties }> = [
    {
      key: 'quiz',
      title: ui.quizWho,
      style: { background: 'radial-gradient(60% 70% at 50% 45%, #3b4aa8, #141836 75%)' },
      art: (
        <>
          <img src={asset.art(25)} alt="" className="absolute inset-0 m-auto h-[92%] w-[80%] object-contain brightness-0" />
          <span className="absolute top-1 right-[12%] text-6xl font-black text-sun drop-shadow-[0_3px_0_rgb(0_0_0/0.4)] short:text-5xl">?</span>
        </>
      ),
    },
    {
      key: 'bigger',
      title: ui.bigger,
      style: typeVars(['fire', 'flying']),
      art: (
        <span className="absolute inset-0 flex items-end justify-center gap-1">
          <img src={asset.art(4)} alt="" className="h-[42%] w-[28%] object-contain object-bottom" />
          <span className="mb-[16%] text-5xl font-black text-white drop-shadow-[0_3px_0_rgb(0_0_0/0.4)] short:text-4xl">?</span>
          <img src={asset.art(6)} alt="" className="h-[96%] w-[52%] object-contain object-bottom" />
        </span>
      ),
    },
  ];

  return (
    <div className="flex min-h-0 flex-1 gap-4 p-3 portrait:flex-col">
      {tiles.map((tile, i) => (
        <motion.button
          key={tile.key}
          onClick={() => { sfx.open(); onPick(tile.key); }}
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.08 }}
          className="card-face foil chunky flex min-h-0 min-w-0 flex-1 flex-col items-center overflow-hidden rounded-[28px] border-4 border-white/85 p-3"
          style={tile.style}
        >
          <div className="relative min-h-0 w-full flex-1">{tile.art}</div>
          <div className="flex w-full items-center justify-between gap-3 rounded-2xl bg-ink/80 px-4 py-2 short:py-1.5">
            <span className="text-[clamp(18px,2.6vw,28px)] font-black">{tile.title}</span>
            <span className="flex items-center gap-1.5">
              <Trophy className="size-8" />
              <span className="text-2xl font-black tabular-nums">{records[tile.key]}</span>
            </span>
          </div>
        </motion.button>
      ))}
    </div>
  );
}
