import { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence } from 'motion/react';
import { asset } from './data/assets';
import { defaultView, visiblePokemon, type View } from './data/filters';
import { strings } from './data/labels';
import type { AppData, BoundingBoxes, PokemonData } from './data/types';
import { warmCore } from './lib/offline';
import { load, loadList, save } from './lib/storage';
import { setEffectsEnabled } from './lib/sfx';
import { defaultSettings, TEAM_SIZE, type Settings } from './settings';
import { familyView } from './family';
import { DetailCard, type Selection } from './components/DetailCard';
import { FilterColumn } from './components/FilterColumn';
import { GenBar } from './components/GenBar';
import { Grid } from './components/Grid';
import { Pokeball } from './components/icons';
import { Quiz } from './components/Quiz';
import { Rail } from './components/Rail';
import { SettingsSheet } from './components/SettingsSheet';

export function App() {
  const [data, setData] = useState<AppData | null>(null);
  const [failed, setFailed] = useState(false);
  const [bbox, setBbox] = useState<BoundingBoxes>({});
  const [view, setView] = useState<View>(() => load('view', defaultView));
  const [team, setTeam] = useState<number[]>(() => loadList('team'));
  const [settings, setSettings] = useState<Settings>(() => load('settings', defaultSettings));
  const [selection, setSelection] = useState<Selection | null>(() => {
    const last = load<{ id: number | null; form: string | null }>('selection', { id: null, form: null });
    return last.id ? { id: last.id, form: last.form, nonce: 1 } : null;
  });
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [teamBump, setTeamBump] = useState(0);
  const t = strings(settings.lang);

  useEffect(() => {
    fetch(asset.data)
      .then((r) => r.json() as Promise<AppData>)
      .then((d) => {
        setData(d);
        // Kern-Dateien in Ruhe offline vorhalten
        const idle = window.requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 2000));
        idle(() => void warmCore(d));
      })
      .catch(() => setFailed(true));
    fetch(asset.bbox).then((r) => r.json() as Promise<BoundingBoxes>).then(setBbox).catch(() => {});
  }, []);

  useEffect(() => save('view', view), [view]);
  useEffect(() => save('team', team), [team]);
  useEffect(() => save('settings', settings), [settings]);
  useEffect(() => setEffectsEnabled(settings.effects), [settings.effects]);
  useEffect(() => save('selection', { id: selection?.id ?? null, form: selection?.form ?? null }), [selection]);

  const byId = useMemo(() => new Map<number, PokemonData>(data?.pokemon.map((p) => [p.id, p]) ?? []), [data]);
  const list = useMemo(() => (data ? visiblePokemon(data.pokemon, view, team) : []), [data, view, team]);
  const quizPool = useMemo(() => (data ? data.pokemon.filter((p) => view.gen === 0 || p.gen === view.gen) : []), [data, view.gen]);
  const teamPokemon = useMemo(() => team.map((id) => byId.get(id)).filter((p): p is PokemonData => !!p), [team, byId]);

  const { people, family } = familyView(settings, t.ui);

  const onView = useCallback((patch: Partial<View>) => setView((v) => ({ ...v, ...patch })), []);
  const open = useCallback((id: number) => setSelection((s) => ({ id, form: null, nonce: (s?.nonce ?? 0) + 1 })), []);

  const toggleTeam = (id: number): boolean => {
    if (team.includes(id)) {
      setTeam(team.filter((x) => x !== id));
      return true;
    }
    if (team.length >= TEAM_SIZE) {
      setTeamBump((n) => n + 1);
      return false;
    }
    setTeam([...team, id]);
    return true;
  };

  if (failed) return <p className="grid h-full place-items-center text-xl font-bold">{t.ui.loadError}</p>;
  if (!data) {
    return (
      <div className="grid h-full place-items-center">
        <Pokeball className="size-20 animate-spin [animation-duration:1.4s]" />
      </div>
    );
  }

  const scrollKey = `${view.mode}-${view.color}-${view.type}-${view.gen}-${view.sort}`;
  return (
    <div className="app-frame flex overflow-hidden">
      <Rail view={view} onView={onView} onSettings={() => setSettingsOpen(true)} teamBump={teamBump} ui={t.ui} />
      {view.mode !== 'quiz' && <FilterColumn view={view} onView={onView} team={teamPokemon} onSelect={open} t={t} />}
      <main className="flex min-w-0 flex-1 flex-col">
        {view.mode !== 'team' && <GenBar gen={view.gen} onGen={(gen) => onView({ gen })} ui={t.ui} />}
        {view.mode === 'quiz' ? (
          <Quiz pool={quizPool} ui={t.ui} />
        ) : (
          <Grid
            list={list}
            team={team}
            onSelect={open}
            scrollKey={scrollKey}
            empty={view.mode === 'team' ? (
              <div className="flex flex-col items-center gap-4 text-center">
                <Pokeball className="size-24 animate-bounce" filled={false} />
                <p className="max-w-xs text-lg font-bold text-white/70">{t.ui.teamEmpty}</p>
              </div>
            ) : undefined}
          />
        )}
      </main>

      <AnimatePresence>
        {selection && byId.has(selection.id) && (
          <DetailCard
            key="detail"
            data={data}
            bbox={bbox}
            byId={byId}
            selection={selection}
            onSelection={setSelection}
            onClose={() => setSelection(null)}
            inTeam={team.includes(selection.id)}
            onToggleTeam={() => toggleTeam(selection.id)}
            people={people}
            family={family}
            t={t}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {settingsOpen && (
          <SettingsSheet data={data} settings={settings} onSettings={setSettings} onClose={() => setSettingsOpen(false)} t={t} />
        )}
      </AnimatePresence>
    </div>
  );
}
