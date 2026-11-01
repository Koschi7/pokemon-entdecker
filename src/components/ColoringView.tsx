// Ausmal-Helfer: Das Pokémon groß auf "Papier", daneben die Stifte, die man dafür braucht. Tippt das Kind
// auf einen Stift, sagt Puck die Farbe. Mit zwei Fingern (oder Doppeltipp) lässt sich hineinzoomen.
// Der Bildschirm bleibt an, solange die Ansicht offen ist.
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'motion/react';
import { asset } from '../data/assets';
import { crayonFragment, crayonIndex, crayonShares, oklch, withoutOutlines, type CrayonKey, type CrayonShare } from '../data/crayons';
import type { strings } from '../data/labels';
import { play } from '../lib/audio';
import { sfx } from '../lib/sfx';
import { Close, Shrink, Speaker } from './icons';

const SAMPLE = 320; // Analyse-Auflösung: genau genug auch für kleine Flächen, schnell auf dem Fire-Tablet
const MAX_ZOOM = 5;
const DOUBLE_TAP_MS = 320;

type Props = {
  assetId: string | number;
  shiny: boolean;
  name: string;
  onClose: () => void;
  t: ReturnType<typeof strings>;
};

/** Artwork laden und die passenden Stifte bestimmen. */
function useCrayons(src: string) {
  const [result, setResult] = useState<CrayonShare[]>([]);
  useEffect(() => {
    let alive = true;
    const img = new Image();
    img.src = src;
    img.decode().then(() => {
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = SAMPLE;
      const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
      ctx.drawImage(img, 0, 0, SAMPLE, SAMPLE);
      const index = withoutOutlines(crayonIndex(ctx.getImageData(0, 0, SAMPLE, SAMPLE).data), SAMPLE);
      if (alive) setResult(crayonShares(index, SAMPLE));
    }).catch(() => {});
    return () => { alive = false; };
  }, [src]);
  return result;
}

/** Bildschirm nicht ausgehen lassen, während das Tablet neben dem Malblatt liegt. */
function useWakeLock() {
  useEffect(() => {
    let lock: WakeLockSentinel | null = null;
    let alive = true;
    const acquire = () => {
      if (document.visibilityState !== 'visible' || !('wakeLock' in navigator)) return;
      navigator.wakeLock.request('screen')
        .then((l) => { if (alive) lock = l; else void l.release(); })
        .catch(() => {}); // vom Browser nicht erlaubt: dann eben nicht
    };
    acquire();
    document.addEventListener('visibilitychange', acquire);
    return () => {
      alive = false;
      document.removeEventListener('visibilitychange', acquire);
      lock?.release().catch(() => {});
    };
  }, []);
}

/** Zoomen mit zwei Fingern, Verschieben mit einem, Doppeltipp zoomt hinein bzw. wieder heraus. */
function usePinchZoom() {
  const stage = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const [zoomed, setZoomed] = useState(false);
  const view = useRef({ s: 1, x: 0, y: 0 });

  const apply = (animate: boolean) => {
    const el = content.current;
    if (!el) return;
    const { s, x, y } = view.current;
    el.style.transition = animate ? 'transform 220ms ease-out' : 'none';
    el.style.transform = `translate(${x}px, ${y}px) scale(${s})`;
    setZoomed(s > 1.01);
  };

  useEffect(() => {
    const el = stage.current;
    if (!el) return;
    const pts = new Map<number, { x: number; y: number }>();
    let start: { s: number; x: number; y: number; mid: { x: number; y: number }; dist: number } | null = null;
    let moved = false;
    let lastTap = { t: 0, x: 0, y: 0 };

    const center = () => {
      const r = el.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    };
    // Verschieben nur so weit, dass das Bild seinen Platz immer ausfüllt
    const clamp = () => {
      const v = view.current;
      const c = content.current;
      v.s = Math.min(MAX_ZOOM, Math.max(1, v.s));
      const mx = c ? ((v.s - 1) * c.offsetWidth) / 2 : 0;
      const my = c ? ((v.s - 1) * c.offsetHeight) / 2 : 0;
      v.x = Math.min(mx, Math.max(-mx, v.x));
      v.y = Math.min(my, Math.max(-my, v.y));
    };
    // Zoomstufe s so setzen, dass der Bildpunkt unter `from` danach unter `to` liegt
    const zoomAround = (s: number, from: { x: number; y: number }, to: { x: number; y: number }, base = view.current) => {
      const c = center();
      const qx = (from.x - c.x - base.x) / base.s;
      const qy = (from.y - c.y - base.y) / base.s;
      view.current = { s, x: to.x - c.x - s * qx, y: to.y - c.y - s * qy };
      clamp();
    };
    const begin = () => {
      const [a, b] = [...pts.values()];
      if (!a) return;
      start = {
        ...view.current,
        mid: b ? { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 } : a,
        dist: b ? Math.hypot(a.x - b.x, a.y - b.y) : 0,
      };
    };

    const down = (e: PointerEvent) => {
      // Knöpfe auf der Bühne (Schließen, Name, Zoom zurück) nicht abfangen – sonst kommt ihr Klick nie an
      if (e.target instanceof Element && e.target.closest('button')) return;
      try {
        el.setPointerCapture(e.pointerId); // Finger darf die Bühne beim Ziehen verlassen
      } catch {
        // unbekannter Zeiger (z. B. synthetisches Event): ohne Capture weiter
      }
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pts.size === 1) moved = false;
      begin();
    };
    const move = (e: PointerEvent) => {
      if (!pts.has(e.pointerId) || !start) return;
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      const [a, b] = [...pts.values()];
      if (b) {
        const mid = { x: (a!.x + b.x) / 2, y: (a!.y + b.y) / 2 };
        const s = Math.min(MAX_ZOOM, Math.max(1, (start.s * Math.hypot(a!.x - b.x, a!.y - b.y)) / (start.dist || 1)));
        zoomAround(s, start.mid, mid, start);
        moved = true;
      } else {
        const dx = a!.x - start.mid.x;
        const dy = a!.y - start.mid.y;
        if (Math.hypot(dx, dy) > 8) moved = true;
        if (start.s <= 1) return;
        view.current = { s: start.s, x: start.x + dx, y: start.y + dy };
        clamp();
      }
      apply(false);
    };
    const up = (e: PointerEvent) => {
      if (!pts.delete(e.pointerId)) return;
      if (pts.size) {
        begin(); // ein Finger bleibt liegen: ab hier verschieben
        return;
      }
      start = null;
      if (moved) return;
      const now = performance.now();
      if (now - lastTap.t < DOUBLE_TAP_MS && Math.hypot(e.clientX - lastTap.x, e.clientY - lastTap.y) < 30) {
        const p = { x: e.clientX, y: e.clientY };
        if (view.current.s > 1.01) view.current = { s: 1, x: 0, y: 0 };
        else zoomAround(2.5, p, p);
        apply(true);
        lastTap = { t: 0, x: 0, y: 0 };
      } else lastTap = { t: now, x: e.clientX, y: e.clientY };
    };
    // Mausrad (für Eltern am Rechner)
    const wheel = (e: WheelEvent) => {
      e.preventDefault();
      const p = { x: e.clientX, y: e.clientY };
      zoomAround(view.current.s * (e.deltaY < 0 ? 1.15 : 1 / 1.15), p, p);
      apply(false);
    };

    el.addEventListener('pointerdown', down);
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
    el.addEventListener('wheel', wheel, { passive: false });
    return () => {
      el.removeEventListener('pointerdown', down);
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', up);
      el.removeEventListener('pointercancel', up);
      el.removeEventListener('wheel', wheel);
    };
  }, []);

  const reset = () => {
    view.current = { s: 1, x: 0, y: 0 };
    apply(true);
  };
  return { stage, content, zoomed, reset };
}

/** Ein Buntstift zum Antippen, die Farbe steht wie bei echten Stiften auf dem Schaft. */
function CrayonButton({ crayon, label, onClick }: { crayon: CrayonShare; label: string; onClick: () => void }) {
  const light = oklch(...([1, 3, 5].map((i) => parseInt(crayon.hex.slice(i, i + 2), 16)) as [number, number, number]))[0] > 0.72;
  const edge = `color-mix(in oklab, ${crayon.hex} 62%, black)`;
  return (
    <motion.button
      onClick={onClick}
      whileTap={{ scale: 0.92 }}
      className="flex min-h-9 w-full items-stretch drop-shadow-[0_3px_0_rgb(0_0_0/0.18)] landscape:max-h-14 landscape:min-h-0 landscape:flex-1 portrait:h-12 portrait:w-[calc(50%-4px)]"
    >
      <span
        className="flex min-w-0 flex-1 items-center justify-center rounded-l-[10px] border-y-[3px] border-l-[3px] px-2 text-[16px] leading-none font-black short:text-[14px]"
        style={{ background: crayon.hex, borderColor: edge, color: light ? '#10132a' : '#fff' }}
      >
        {label}
      </span>
      <svg viewBox="0 0 40 40" preserveAspectRatio="none" className="h-auto w-[22%] shrink-0" aria-hidden>
        <path d="M0 1.5L38.5 20 0 38.5z" fill="#f2d4a4" stroke={edge} strokeWidth="3" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
        <path d="M25 13.75L38.5 20 25 26.25z" fill={crayon.hex} stroke={edge} strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
      </svg>
    </motion.button>
  );
}

export function ColoringView({ assetId, shiny, name, onClose, t }: Props) {
  const { ui, crayonName } = t;
  const src = asset.art(assetId, shiny);
  const crayons = useCrayons(src);
  const { stage: stageRef, content: contentRef, zoomed, reset } = usePinchZoom();
  useWakeLock();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const say = (key: CrayonKey) => play(asset.fragment(crayonFragment(key)));

  return createPortal(
    <motion.div
      className="app-frame z-[60] flex bg-[#fbf7ee] text-ink portrait:flex-col"
      initial={{ opacity: 0, scale: 1.03 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.03 }}
      transition={{ duration: 0.2 }}
      onClick={(e) => e.stopPropagation()}
    >
      <div ref={stageRef} className="relative min-h-0 min-w-0 flex-1 touch-none overflow-hidden">
        <div className="absolute inset-0 grid place-items-center p-4 [container-type:size] short:p-2">
          <div ref={contentRef} className="relative size-[min(100cqw,100cqh)] will-change-transform">
            <img src={src} alt={name} draggable={false} className="absolute inset-0 size-full object-contain" />
          </div>
        </div>

        <div className="pointer-events-none absolute inset-x-3 top-3 flex items-start gap-2 short:inset-x-2 short:top-2">
          <button
            onClick={() => { sfx.tap(); onClose(); }}
            aria-label={ui.close}
            className="chunky pointer-events-auto grid size-14 shrink-0 place-items-center rounded-full bg-ink text-white short:size-11"
          >
            <Close className="size-7 short:size-6" />
          </button>
          <button
            onClick={() => play(asset.sentence(assetId))}
            className="pointer-events-auto flex items-center gap-2 rounded-full bg-white/85 px-4 py-2 text-[22px] leading-none font-black shadow short:py-1.5 short:text-lg"
          >
            {name}
            <Speaker className="size-6 text-dex short:size-5" />
          </button>
        </div>

        {zoomed && (
          <button
            onClick={reset}
            aria-label={ui.showAll}
            className="chunky absolute bottom-3 left-3 grid size-14 place-items-center rounded-full bg-ink text-white short:bottom-2 short:left-2 short:size-11"
          >
            <Shrink className="size-7 short:size-6" />
          </button>
        )}
      </div>

      <aside className="flex shrink-0 flex-col gap-2 bg-[#efe7d6] p-3 landscape:w-[clamp(170px,24vw,250px)] portrait:flex-row portrait:flex-wrap portrait:justify-center short:gap-1.5 short:p-2">
        <h2 className="text-center text-[13px] leading-tight font-extrabold text-ink/55 portrait:w-full">{ui.crayons}</h2>
        {crayons.map((c) => (
          <CrayonButton key={c.key} crayon={c} label={crayonName(c.key)} onClick={() => say(c.key)} />
        ))}
      </aside>
    </motion.div>,
    document.body,
  );
}
