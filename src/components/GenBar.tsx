import { GEN_STARTERS } from '../data/labels';
import { asset } from '../data/assets';
import type { UiStrings } from '../data/labels';
import { sfx } from '../lib/sfx';

type Props = { gen: number; onGen: (gen: number) => void; ui: UiStrings };

/** Generationen als Starter-Symbole – Kinder erkennen Bisasam, nicht die Zahl 1. */
export function GenBar({ gen, onGen: setGen, ui }: Props) {
  const onGen = (g: number) => {
    sfx.tap();
    setGen(g);
  };
  return (
    <div className="scroll-area flex shrink-0 items-center gap-2 overflow-x-auto px-3 pt-3 pb-1 short:pt-2">
      <button
        onClick={() => onGen(0)}
        aria-pressed={gen === 0}
        className={`chunky h-12 shrink-0 rounded-full px-4 text-[15px] font-extrabold short:h-10 ${gen === 0 ? 'bg-sun text-ink' : 'bg-white/10'}`}
      >
        {ui.all}
      </button>
      {Object.entries(GEN_STARTERS).map(([g, starter]) => {
        const active = gen === Number(g);
        return (
          <button
            key={g}
            onClick={() => onGen(Number(g))}
            aria-pressed={active}
            aria-label={`${ui.gen} ${g}`}
            className={`chunky relative grid size-12 shrink-0 place-items-center rounded-full short:size-10 ${active ? 'bg-sun' : 'bg-white/10'}`}
          >
            <img src={asset.thumb(starter)} alt="" className="size-10 object-contain short:size-8" />
            <span className={`absolute -right-1 -bottom-1 grid size-5 place-items-center rounded-full text-[11px] font-black ${active ? 'bg-ink text-sun' : 'bg-white text-ink'}`}>
              {g}
            </span>
          </button>
        );
      })}
    </div>
  );
}
