import { useRef, useState } from 'react';
import { motion } from 'motion/react';
import type { View } from '../data/filters';
import type { UiStrings } from '../data/labels';
import { asset } from '../data/assets';
import { sfx } from '../lib/sfx';
import { Controller, Palette, Pokeball, SizeSort } from './icons';

type Props = {
  view: View;
  onView: (patch: Partial<View>) => void;
  onSettings: () => void;
  teamBump: number; // ändert sich, wenn das Team voll ist → Team-Knopf wackelt
  ui: UiStrings;
};

const HOLD_MS = 3000;

/** Pokédex-Linse: 3 Sekunden halten öffnet die Eltern-Einstellungen. */
function Lens({ onSettings, label }: { onSettings: () => void; label: string }) {
  const timer = useRef<number | null>(null);
  const [holding, setHolding] = useState(false);
  const start = () => {
    setHolding(true);
    timer.current = window.setTimeout(() => {
      setHolding(false);
      onSettings();
    }, HOLD_MS);
  };
  const cancel = () => {
    if (timer.current) window.clearTimeout(timer.current);
    setHolding(false);
  };
  return (
    <div className="flex items-center gap-2 pl-1">
      <button
        aria-label={label}
        title={label}
        onPointerDown={start}
        onPointerUp={cancel}
        onPointerLeave={cancel}
        onPointerCancel={cancel}
        onContextMenu={(e) => e.preventDefault()}
        className="lens relative size-14 rounded-full short:size-10"
      >
        <svg viewBox="0 0 60 60" className="absolute -inset-2 size-[72px] -rotate-90 short:size-[56px]" aria-hidden>
          <circle
            cx="30" cy="30" r="27" fill="none" stroke="var(--color-sun)" strokeWidth="4" strokeLinecap="round"
            strokeDasharray="170"
            style={{ strokeDashoffset: holding ? 0 : 170, transition: holding ? `stroke-dashoffset ${HOLD_MS}ms linear` : 'none' }}
          />
        </svg>
      </button>
      <div className="flex flex-col gap-1 short:hidden" aria-hidden>
        <span className="size-3 rounded-full bg-[#ff5a5a] ring-2 ring-black/20" />
        <span className="size-3 rounded-full bg-sun ring-2 ring-black/20" />
        <span className="size-3 rounded-full bg-[#5ad35a] ring-2 ring-black/20" />
      </div>
    </div>
  );
}

function ModeButton({ active, label, onClick, children, bump = 0 }: {
  active: boolean; label: string; onClick: () => void; children: React.ReactNode; bump?: number;
}) {
  return (
    <motion.button
      key={bump}
      animate={bump ? { x: [0, -8, 8, -6, 6, 0] } : undefined}
      transition={{ duration: 0.45 }}
      onClick={() => {
        sfx.tap();
        onClick();
      }}
      aria-pressed={active}
      className={`chunky flex w-[72px] flex-col items-center gap-0.5 rounded-2xl py-2 transition-colors short:w-[56px] short:py-1.5 ${
        active ? 'bg-white text-ink ring-4 ring-sun' : 'bg-black/20 text-white'
      }`}
    >
      <span className="size-9 short:size-8">{children}</span>
      <span className="text-[12px] font-bold leading-none short:hidden">{label}</span>
    </motion.button>
  );
}

export function Rail({ view, onView, onSettings, teamBump, ui }: Props) {
  return (
    <nav className="dex-shell z-10 flex h-full w-[96px] shrink-0 flex-col items-center gap-3 rounded-r-[32px] py-4 short:w-[76px] short:gap-2 short:py-2.5">
      <Lens onSettings={onSettings} label={ui.holdForSettings} />
      <div className="mt-2 flex flex-col gap-3 short:mt-1 short:gap-2">
        <ModeButton active={view.mode === 'color'} label={ui.color} onClick={() => onView({ mode: 'color' })}>
          <Palette className="size-full" />
        </ModeButton>
        <ModeButton active={view.mode === 'type'} label={ui.type} onClick={() => onView({ mode: 'type' })}>
          <span className="relative block size-full">
            <img src={asset.typeIcon('water')} alt="" className="absolute left-0 top-0 size-6" />
            <img src={asset.typeIcon('grass')} alt="" className="absolute right-0 top-1 size-6" />
            <img src={asset.typeIcon('fire')} alt="" className="absolute bottom-0 left-2 size-6" />
          </span>
        </ModeButton>
        <ModeButton active={view.mode === 'team'} label={ui.team} onClick={() => onView({ mode: 'team' })} bump={teamBump}>
          <Pokeball className="size-full" />
        </ModeButton>
        <ModeButton active={['games', 'quiz', 'bigger'].includes(view.mode)} label={ui.games} onClick={() => onView({ mode: 'games' })}>
          <Controller className="size-full" />
        </ModeButton>
      </div>
      <div className="mt-auto">
        <ModeButton
          active={view.sort === 'size'}
          label={ui.sizeSort}
          onClick={() => onView({ sort: view.sort === 'size' ? 'dex' : 'size' })}
        >
          <SizeSort className="size-full" />
        </ModeButton>
      </div>
    </nav>
  );
}
