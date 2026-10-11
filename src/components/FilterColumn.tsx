import type { View } from '../data/filters';
import { COLORS, COLOR_SWATCHES, TYPES, TYPE_COLORS, strings } from '../data/labels';
import { asset } from '../data/assets';
import type { PokemonData } from '../data/types';
import { sfx } from '../lib/sfx';
import { TEAM_SIZE } from '../settings';
import { Pokeball } from './icons';

type Props = {
  view: View;
  onView: (patch: Partial<View>) => void;
  team: PokemonData[];
  onSelect: (id: number) => void;
  t: ReturnType<typeof strings>;
};

const ring = (active: boolean) => (active ? 'ring-4 ring-sun scale-105' : 'ring-2 ring-white/25');

export function FilterColumn({ view, onView, team, onSelect, t }: Props) {
  return (
    <aside className="scroll-area flex h-full w-[136px] shrink-0 flex-col items-center overflow-y-auto px-2 py-4 short:py-2.5">
      {view.mode === 'color' && (
        <div className="grid grid-cols-2 gap-3 short:grid-cols-3 short:gap-2">
          {COLORS.map((c) => (
            <button
              key={c}
              aria-label={t.colorName(c)}
              aria-pressed={view.color === c}
              onClick={() => {
                sfx.tap();
                onView({ color: view.color === c ? null : c });
              }}
              className={`chunky size-[52px] rounded-full transition-transform short:size-9 ${ring(view.color === c)}`}
              style={{ background: `radial-gradient(circle at 35% 30%, rgb(255 255 255 / .55), transparent 45%), ${COLOR_SWATCHES[c]}` }}
            />
          ))}
        </div>
      )}

      {view.mode === 'type' && (
        <div className="grid grid-cols-2 gap-2.5 short:grid-cols-3 short:gap-1.5">
          {TYPES.map((type) => (
            <button
              key={type}
              aria-label={t.typeName(type)}
              aria-pressed={view.type === type}
              onClick={() => {
                sfx.tap();
                onView({ type: view.type === type ? null : type });
              }}
              className={`chunky grid size-[52px] place-items-center rounded-full transition-transform short:size-9 ${ring(view.type === type)}`}
              style={{ background: TYPE_COLORS[type] }}
            >
              <img src={asset.typeIcon(type)} alt="" className="size-[46px] short:size-8" />
            </button>
          ))}
        </div>
      )}

      {view.mode === 'team' && (
        <div className="flex flex-col items-center gap-2 short:grid short:grid-cols-2 short:gap-1.5">
          {Array.from({ length: TEAM_SIZE }, (_, i) => team[i]).map((p, i) =>
            p ? (
              <button key={p.id} onClick={() => { sfx.open(); onSelect(p.id); }} aria-label={p.name}
                className="chunky size-[64px] rounded-full bg-white/90 p-1 ring-2 ring-sun short:size-12">
                <img src={asset.thumb(p.id)} alt="" className="size-full object-contain" />
              </button>
            ) : (
              <span key={`empty-${i}`} className="grid size-[64px] place-items-center rounded-full border-2 border-dashed border-white/30 short:size-12">
                <Pokeball className="size-8 opacity-30" filled={false} />
              </span>
            ),
          )}
        </div>
      )}
    </aside>
  );
}
