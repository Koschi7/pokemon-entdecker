import { memo, useEffect, useRef } from 'react';
import { typeVars } from '../data/labels';
import { asset } from '../data/assets';
import type { PokemonData } from '../data/types';
import { sfx } from '../lib/sfx';
import { load, save } from '../lib/storage';
import { Pokeball } from './icons';

const Tile = memo(function Tile({ p, inTeam, onSelect }: { p: PokemonData; inTeam: boolean; onSelect: (id: number) => void }) {
  return (
    <button
      onClick={() => {
        sfx.open();
        onSelect(p.id);
      }}
      className="tile card-face foil chunky flex flex-col items-stretch rounded-[18px] border-[3px] border-white/75 p-1.5 text-left"
      style={typeVars(p.types)}
    >
      <span className="absolute top-1 left-2 text-[11px] font-extrabold text-white/85 drop-shadow">#{String(p.id).padStart(3, '0')}</span>
      {inTeam && <Pokeball className="absolute top-1.5 right-1.5 size-5 drop-shadow" />}
      <img
        src={asset.thumb(p.id)}
        alt=""
        loading="lazy"
        decoding="async"
        className="aspect-square w-full object-contain drop-shadow-[0_4px_0_rgb(0_0_0/0.22)]"
      />
      <span className="mt-0.5 truncate rounded-full bg-white/92 px-2 py-0.5 text-center text-[13px] font-extrabold text-ink">{p.name}</span>
    </button>
  );
});

type Props = {
  list: PokemonData[];
  team: number[];
  onSelect: (id: number) => void;
  scrollKey: string; // Scroll-Position pro Ansicht merken
  empty?: React.ReactNode;
};

export function Grid({ list, team, onSelect, scrollKey, empty }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  const restored = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Nur beim App-Start dorthin zurück, wo das Kind war – ein neuer Filter beginnt immer oben
    el.scrollTop = restored.current ? 0 : (load('scroll', {} as Record<string, number>)[scrollKey] ?? 0);
    restored.current = true;
    // Erst speichern, wenn das Scrollen aufgehört hat – localStorage in jedem Frame ruckelt auf dem Fire-Tablet
    let timer = 0;
    const onScroll = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => save('scroll', { ...load('scroll', {}), [scrollKey]: el.scrollTop }), 250);
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.clearTimeout(timer);
      el.removeEventListener('scroll', onScroll);
    };
  }, [scrollKey]);

  if (!list.length && empty) return <div className="grid flex-1 place-items-center p-8">{empty}</div>;

  const teamSet = new Set(team);
  return (
    <div ref={ref} className="scroll-area min-h-0 flex-1 overflow-y-auto px-3 pt-2 pb-6">
      <div className="grid grid-cols-[repeat(auto-fill,minmax(128px,1fr))] gap-3 short:grid-cols-[repeat(auto-fill,minmax(112px,1fr))] short:gap-2.5">
        {list.map((p) => <Tile key={p.id} p={p} inTeam={teamSet.has(p.id)} onSelect={onSelect} />)}
      </div>
    </div>
  );
}
