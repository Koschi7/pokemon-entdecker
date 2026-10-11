import { useLayoutEffect, useRef, useState } from 'react';
import { asset } from '../data/assets';
import { formatHeight, pixelsPerMeter } from '../data/size';
import { Person } from './icons';

export type StageFigure =
  | { kind: 'person'; key: string; label: string; height: number; color: string; child: boolean }
  | {
      kind: 'pokemon'; key: string; label: string; height: number; assetId: string | number; current: boolean;
      box: [number, number, number, number]; // sichtbarer Umriss im Artwork, damit die Figur – nicht der Rand – skaliert wird
    };

type Props = {
  people: StageFigure[];
  levels: StageFigure[][]; // Entwicklungsstufen; Verzweigungen nebeneinander
  shiny: boolean;
  onTap: (figure: StageFigure) => void;
};

const LABEL_SPACE = 48; // Platz unter den Figuren für Name + Größe
const GAP = 14;
const GROUP_GAP = 28;
const MIN_PX = 14; // winzige Pokémon bleiben antippbar
const aspect = (f: StageFigure) => (f.kind === 'person' ? 0.42 : f.box[2] / f.box[3]);

/** Größen-Bühne: Familie und Entwicklungskette maßstabsgetreu nebeneinander – passt immer ohne Scrollen. */
export function SizeStage({ people, levels, shiny, onTap }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ w: 800, h: 360 });

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setBox({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const groups = [people, ...levels].filter((g) => g.length);
  const figures = groups.flat();
  const gaps = GAP * (figures.length - groups.length) + GROUP_GAP * (groups.length - 1) + 32;
  const widthInMeters = figures.reduce((sum, f) => sum + f.height * aspect(f), 0);
  const ppm = Math.min(
    pixelsPerMeter(figures.map((f) => f.height), box.h - LABEL_SPACE),
    (box.w - gaps) / Math.max(widthInMeters, 0.1),
  );

  const figure = (f: StageFigure) => {
    const h = Math.max(MIN_PX, f.height * ppm);
    const w = Math.max(MIN_PX, h * aspect(f));
    const current = f.kind === 'pokemon' && f.current;
    return (
      <button key={f.key} onClick={() => onTap(f)} className="flex shrink-0 flex-col items-center">
        {f.kind === 'person' ? (
          <Person child={f.child} color={f.color} className="block" style={{ height: h, width: w }} />
        ) : (
          <span className="relative block overflow-hidden drop-shadow-[0_6px_0_rgb(0_0_0/0.25)]" style={{ height: h, width: w }}>
            <img
              src={asset.art(f.assetId, shiny && current)}
              alt=""
              className="absolute max-w-none"
              style={{ width: h / f.box[3], height: h / f.box[3], left: (-f.box[0] * h) / f.box[3], top: (-f.box[1] * h) / f.box[3] }}
            />
          </span>
        )}
        <span className={`mt-1 h-1.5 w-[70%] min-w-3 rounded-full ${current ? 'bg-sun shadow-[0_0_12px_var(--color-sun)]' : 'bg-black/25'}`} />
        <span className={`mt-1 max-w-[120px] truncate text-[13px] leading-tight font-extrabold ${current ? 'text-sun' : 'text-white'}`}>
          {f.label}
        </span>
        <span className="text-[12px] leading-tight text-white/75">{formatHeight(f.height)}</span>
      </button>
    );
  };

  return (
    <div ref={ref} className="relative h-full w-full">
      <div className="absolute inset-x-4 bottom-[41px] h-[3px] rounded-full bg-white/25" />
      <div className="absolute inset-0 flex items-end justify-center" style={{ gap: GROUP_GAP }}>
        {groups.map((group, i) => (
          <div key={i} className="flex items-end" style={{ gap: GAP }}>
            {group.map(figure)}
          </div>
        ))}
      </div>
    </div>
  );
}
