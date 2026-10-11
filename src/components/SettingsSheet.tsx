import { useState } from 'react';
import { motion } from 'motion/react';
import type { strings } from '../data/labels';
import { formatHeight } from '../data/size';
import type { AppData } from '../data/types';
import { downloadAll } from '../lib/offline';
import type { Settings } from '../settings';

type Props = {
  data: AppData;
  settings: Settings;
  onSettings: (s: Settings) => void;
  onClose: () => void;
  t: ReturnType<typeof strings>;
};

function HeightStepper({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const set = (v: number) => onChange(Math.round(Math.min(2.3, Math.max(0.4, v)) * 100) / 100);
  const small = 'chunky h-11 w-12 rounded-full bg-white/10 text-base font-black';
  const big = 'chunky size-11 rounded-full bg-white/15 text-2xl font-black';
  return (
    <div className="flex shrink-0 items-center gap-2">
      <button onClick={() => set(value - 0.05)} className={small}>−5</button>
      <button onClick={() => set(value - 0.01)} className={big}>−</button>
      <span className="w-20 text-center text-xl font-black tabular-nums">{formatHeight(value)}</span>
      <button onClick={() => set(value + 0.01)} className={big}>+</button>
      <button onClick={() => set(value + 0.05)} className={small}>+5</button>
    </div>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white/8 px-4 py-2">{children}</div>;
}

const input = 'w-40 rounded-xl border-2 border-white/20 bg-black/20 px-3 py-2 text-lg font-extrabold outline-none focus:border-sun';

export function SettingsSheet({ data, settings, onSettings, onClose, t }: Props) {
  const { ui } = t;
  const [progress, setProgress] = useState<{ done: number; total: number; failed?: number } | null>(null);
  const patch = (p: Partial<Settings>) => onSettings({ ...settings, ...p });
  const pill = (active: boolean) => `chunky rounded-full px-4 py-2 text-base font-extrabold ${active ? 'bg-sun text-ink' : 'bg-white/10'}`;

  const download = async () => {
    setProgress({ done: 0, total: 1 });
    const failed = await downloadAll(data, (done, total) => setProgress({ done, total }));
    setProgress((p) => (p ? { ...p, failed } : p));
  };

  return (
    <motion.div className="app-frame z-[60] grid place-items-center bg-[#080a18]/85 p-3"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <motion.div
        className="scroll-area flex max-h-[calc(var(--app-h)*0.94)] w-[min(96vw,780px)] flex-col gap-3 overflow-y-auto rounded-[28px] border-[4px] border-white/80 bg-ink p-5"
        initial={{ y: 40 }} animate={{ y: 0 }}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-black">{ui.settings}</h2>
          <button onClick={onClose} className="chunky rounded-full bg-sun px-6 py-2 text-lg font-black text-ink">{ui.done}</button>
        </div>
        <p className="text-sm text-white/65">{ui.familyHint}</p>

        <Row>
          <label className="flex items-center gap-3">
            <span className="w-24 text-lg font-extrabold">{ui.you}</span>
            <input className={input} value={settings.you.name} placeholder={ui.name}
              onChange={(e) => patch({ you: { ...settings.you, name: e.target.value } })} />
          </label>
          <HeightStepper value={settings.you.height} onChange={(height) => patch({ you: { ...settings.you, height } })} />
        </Row>

        <Row>
          <div className="flex items-center gap-3">
            <div className="flex w-24 flex-col gap-1">
              {(['brother', 'sister'] as const).map((role) => (
                <button key={role} onClick={() => patch({ sibling: { ...settings.sibling, role } })} className={pill(settings.sibling.role === role)}>
                  {role === 'brother' ? ui.brother : ui.sister}
                </button>
              ))}
            </div>
            <input className={input} value={settings.sibling.name} placeholder={ui.name}
              onChange={(e) => patch({ sibling: { ...settings.sibling, name: e.target.value } })} />
          </div>
          <HeightStepper value={settings.sibling.height} onChange={(height) => patch({ sibling: { ...settings.sibling, height } })} />
        </Row>

        <Row>
          <span className="text-lg font-extrabold">{ui.mama}</span>
          <HeightStepper value={settings.mama} onChange={(mama) => patch({ mama })} />
        </Row>
        <Row>
          <span className="text-lg font-extrabold">{ui.papa}</span>
          <HeightStepper value={settings.papa} onChange={(papa) => patch({ papa })} />
        </Row>

        <Row>
          <span className="text-lg font-extrabold">{ui.effects}</span>
          <button onClick={() => patch({ effects: !settings.effects })} className={pill(settings.effects)}>
            {settings.effects ? ui.on : ui.off}
          </button>
        </Row>

        <div className="rounded-2xl bg-white/8 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-lg font-extrabold">{ui.offline}</div>
              <div className="text-sm text-white/65">{ui.offlineHint}</div>
            </div>
            <button disabled={!!progress && progress.failed === undefined} onClick={download}
              className="chunky shrink-0 rounded-full bg-[#1f8a70] px-5 py-2 text-lg font-extrabold disabled:opacity-50">
              ⬇
            </button>
          </div>
          {progress && (
            <div className="mt-3">
              <div className="h-3 overflow-hidden rounded-full bg-white/10">
                <div className="h-full rounded-full bg-sun transition-[width]" style={{ width: `${(progress.done / progress.total) * 100}%` }} />
              </div>
              <div className="mt-1 text-sm text-white/70 tabular-nums">
                {progress.done} / {progress.total}
                {progress.failed !== undefined && (progress.failed ? ` · ${progress.failed} ${ui.failed}` : ' · ✓')}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
