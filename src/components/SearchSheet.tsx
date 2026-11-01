// Suche über alle Generationen. Eltern (oder Kinder, die schon Buchstaben kennen) tippen ein paar
// Buchstaben, darunter erscheinen gleich Bilder zum Antippen. Ohne Eingabe stehen die zuletzt gesuchten
// Pokémon da – die finden die Kinder dann am Bild wieder, ganz ohne Lesen.
import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { asset } from '../data/assets';
import type { strings } from '../data/labels';
import { searchPokemon, type SearchHit } from '../data/search';
import type { PokemonData } from '../data/types';
import { loadArray, save } from '../lib/storage';
import { sfx } from '../lib/sfx';
import { Close, Magnifier } from './icons';

const RECENT_KEY = 'recentSearch';
const RECENT_MAX = 12;

type Pick = { id: number; form: string | null };

const isPick = (x: unknown): x is Pick =>
  typeof x === 'object' && x !== null && typeof (x as Pick).id === 'number'
  && ((x as Pick).form === null || typeof (x as Pick).form === 'string');
const loadRecent = () => loadArray(RECENT_KEY).filter(isPick);

type Props = {
  pokemon: PokemonData[];
  onPick: (pick: Pick) => void;
  onClose: () => void;
  t: ReturnType<typeof strings>;
};

/** Zuletzt gesuchte Pokémon (pro Tablet), als Treffer zum Anzeigen. */
function recentHits(pokemon: PokemonData[]): SearchHit[] {
  const byId = new Map(pokemon.map((p) => [p.id, p]));
  return loadRecent().flatMap(({ id, form }) => {
    const p = byId.get(id);
    const f = form ? [...(p?.forms ?? []), ...(p?.megas ?? [])].find((x) => x.key === form) : null;
    if (!p || (form && !f)) return [];
    return [{ id, form, name: f?.name ?? p.name, thumb: form ?? id }];
  });
}

function Tiles({ hits, onPick }: { hits: SearchHit[]; onPick: (hit: SearchHit) => void }) {
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(100px,1fr))] gap-2 short:grid-cols-[repeat(auto-fill,minmax(88px,1fr))]">
      {hits.map((hit) => (
        <button
          key={`${hit.id}-${hit.form}`}
          onClick={() => onPick(hit)}
          className="chunky flex flex-col items-center gap-1 rounded-2xl bg-white/10 px-1 pt-1.5 pb-2"
        >
          <img src={asset.thumb(hit.thumb)} alt="" className="size-16 object-contain short:size-14" />
          <span className="line-clamp-2 text-center text-[13px] leading-tight font-extrabold">{hit.name}</span>
        </button>
      ))}
    </div>
  );
}

export function SearchSheet({ pokemon, onPick, onClose, t }: Props) {
  const { ui } = t;
  const [query, setQuery] = useState('');
  const input = useRef<HTMLInputElement>(null);
  const hits = useMemo(() => searchPokemon(query, pokemon), [query, pokemon]);
  const [recent] = useState(() => recentHits(pokemon));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const pick = (hit: SearchHit) => {
    input.current?.blur(); // Tastatur einklappen
    const entry = { id: hit.id, form: hit.form };
    const rest = loadRecent().filter((r) => r.id !== hit.id || r.form !== hit.form);
    save(RECENT_KEY, [entry, ...rest].slice(0, RECENT_MAX));
    sfx.tap();
    onPick(entry);
  };

  return (
    <motion.div
      className="app-frame z-50 flex flex-col bg-[#0c0e20]/95 p-3 short:p-2"
      initial={{ opacity: 0, y: -24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -24 }}
      transition={{ duration: 0.2 }}
    >
      <form
        className="flex items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (hits[0]) pick(hits[0]); // Enter öffnet den besten Treffer
        }}
      >
        <label className="flex h-14 min-w-0 flex-1 items-center gap-2 rounded-full bg-white pr-2 pl-4 text-ink short:h-11">
          <Magnifier className="size-7 shrink-0 text-ink/45 short:size-6" />
          <input
            ref={input}
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            type="text"
            inputMode="search"
            enterKeyHint="search"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            placeholder={ui.searchPlaceholder}
            aria-label={ui.search}
            className="min-w-0 flex-1 bg-transparent text-2xl font-extrabold outline-none placeholder:text-ink/35 short:text-xl"
          />
          {query && (
            <button
              type="button"
              aria-label={ui.clear}
              onClick={() => { setQuery(''); input.current?.focus(); }}
              className="grid size-10 shrink-0 place-items-center rounded-full bg-ink/10 short:size-8"
            >
              <Close className="size-5" />
            </button>
          )}
        </label>
        <button
          type="button"
          onClick={() => { sfx.tap(); onClose(); }}
          aria-label={ui.close}
          className="chunky grid size-14 shrink-0 place-items-center rounded-full bg-white text-ink short:size-11"
        >
          <Close className="size-7" />
        </button>
      </form>

      <div className="scroll-area mt-3 min-h-0 flex-1 overflow-y-auto pb-2 short:mt-2">
        {query ? (
          hits.length ? <Tiles hits={hits} onPick={pick} /> : <p className="pt-6 text-center text-lg font-bold text-white/60">{ui.noHits}</p>
        ) : recent.length ? (
          <>
            <h2 className="mb-2 text-sm font-extrabold text-white/55">{ui.recent}</h2>
            <Tiles hits={recent} onPick={pick} />
          </>
        ) : (
          <p className="pt-6 text-center text-lg font-bold text-white/60">{ui.searchHint}</p>
        )}
      </div>
    </motion.div>
  );
}
