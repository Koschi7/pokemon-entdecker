import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { asset } from '../data/assets';
import { ladder, nextStages } from '../data/evolution';
import { TYPE_COLORS, typeVars, type strings } from '../data/labels';
import type { AppData, BoundingBoxes, PokemonData } from '../data/types';
import { compareFragments, type Family } from '../data/compare';
import { play, playSequence } from '../lib/audio';
import { sfx } from '../lib/sfx';
import type { StagePerson } from '../family';
import { Close, Evolve, Flip, Globe, MegaStone, Pokeball, Ruler, Sparkles, Speaker } from './icons';
import { SizeStage, type StageFigure } from './SizeStage';

export type Selection = { id: number; form: string | null; nonce: number };

type Props = {
  data: AppData;
  bbox: BoundingBoxes;
  byId: Map<number, PokemonData>;
  selection: Selection;
  onSelection: (sel: Selection) => void;
  onClose: () => void;
  inTeam: boolean;
  onToggleTeam: () => boolean; // false = Team voll
  people: StagePerson[];
  family: Family;
  t: ReturnType<typeof strings>;
};

const SHINY_CHANCE = 1 / 20;
const rollShiny = () => Math.random() < SHINY_CHANCE; // wie in Pokémon Go: selten, aber möglich
const GLOW_MS = 1400;
const MEGA_MS = 1800; // Mega-Entwicklung: länger und bunter als die normale

function ActionButton({ icon, label, onClick, active = false, tone = 'bg-white/10', shake = 0 }: {
  icon: React.ReactNode; label: string; onClick: () => void; active?: boolean; tone?: string; shake?: number;
}) {
  return (
    <motion.button
      key={shake}
      animate={shake ? { x: [0, -10, 10, -6, 6, 0] } : undefined}
      transition={{ duration: 0.4 }}
      whileTap={{ scale: 0.9 }}
      onClick={onClick}
      aria-pressed={active}
      className={`chunky flex flex-col items-center justify-center gap-1 rounded-2xl py-2.5 short:gap-0.5 short:rounded-xl short:py-1.5 ${active ? 'bg-sun text-ink' : tone}`}
    >
      <span className="size-9 short:size-6">{icon}</span>
      <span className="text-[13px] leading-none font-extrabold short:text-[11px]">{label}</span>
    </motion.button>
  );
}

/** Funkeln über dem Artwork (Shiny gefunden / umgeschaltet / Entwicklung fertig). */
export function SparkleBurst({ burst }: { burst: number }) {
  const stars = useMemo(() => Array.from({ length: 10 }, (_, i) => ({
    angle: (i / 10) * Math.PI * 2, dist: 90 + (i % 3) * 40, size: 18 + (i % 4) * 8,
  })), []);
  if (!burst) return null;
  return (
    <div key={burst} className="pointer-events-none absolute inset-0 grid place-items-center">
      {stars.map((s, i) => (
        <motion.span
          key={i}
          className="absolute text-sun drop-shadow-[0_0_6px_white]"
          style={{ width: s.size, height: s.size }}
          initial={{ x: 0, y: 0, scale: 0, opacity: 1 }}
          animate={{ x: Math.cos(s.angle) * s.dist, y: Math.sin(s.angle) * s.dist, scale: [0, 1.2, 0.6], opacity: [1, 1, 0] }}
          transition={{ duration: 0.9, ease: 'easeOut' }}
        >
          <Sparkles className="size-full" />
        </motion.span>
      ))}
    </div>
  );
}

/** Zwei Regenbogen-Ringe, die während der Mega-Entwicklung um das Pokémon wachsen. */
function MegaRings() {
  return (
    <div className="pointer-events-none absolute inset-0 grid place-items-center" aria-hidden>
      {[0, 0.6].map((delay) => (
        <motion.svg
          key={delay}
          viewBox="0 0 100 100"
          className="absolute h-[80%] w-auto"
          initial={{ scale: 0.3, rotate: 0, opacity: 0 }}
          animate={{ scale: [0.3, 1.25], rotate: 300, opacity: [0, 1, 0] }}
          transition={{ duration: 1.3, delay, ease: 'easeOut' }}
        >
          <defs>
            <linearGradient id={`mega-ring-${delay}`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#ff4fd8" />
              <stop offset="0.35" stopColor="#ffcb05" />
              <stop offset="0.65" stopColor="#4fd2ff" />
              <stop offset="1" stopColor="#8b5cf6" />
            </linearGradient>
          </defs>
          <circle cx="50" cy="50" r="44" fill="none" stroke={`url(#mega-ring-${delay})`} strokeWidth="5" strokeDasharray="18 7" />
        </motion.svg>
      ))}
    </div>
  );
}

export function DetailCard({ data, bbox, byId, selection, onSelection, onClose, inTeam, onToggleTeam, people, family, t }: Props) {
  const { ui, typeName } = t;
  const pokemon = byId.get(selection.id)!;
  const megas = pokemon.megas ?? [];
  // Gezeigte Variante: Regionalform oder Mega-/Proto-Form (beide über selection.form)
  const form = [...(pokemon.forms ?? []), ...megas].find((f) => f.key === selection.form) ?? null;
  const isMega = !!form && megas.includes(form);
  const shown = form ?? pokemon;
  const assetId = form?.key ?? pokemon.id;
  const chain = pokemon.chain !== null ? data.chains[pokemon.chain] : undefined;
  const next = chain ? nextStages(chain, pokemon.id) : [];
  const chainIds = chain ? ladder(chain, chain.id).flat() : []; // ganze Familie, auch alle Äste

  // Die Karte wird bei jedem Öffnen neu aufgebaut: dann entscheidet sich, ob ein Shiny überrascht
  const [surprise] = useState(rollShiny);
  const [flipped, setFlipped] = useState(false);
  const [shinyWanted, setShiny] = useState(surprise);
  const canShiny = !form?.noShiny; // ganz neue Megas haben noch kein Shiny-Artwork
  const shiny = shinyWanted && canShiny;
  const [burst, setBurst] = useState(surprise ? 1 : 0);
  const [evolving, setEvolving] = useState<'glow' | 'mega' | 'reveal' | null>(null);
  const [picker, setPicker] = useState<'evolve' | 'mega' | null>(null);
  const [teamShake, setTeamShake] = useState(0);

  // Keine Sprache beim Öffnen – gesprochen wird erst, wenn das Kind auf Name oder Bild tippt
  useEffect(() => {
    if (surprise) sfx.shiny();
  }, [surprise]);

  /** Sprung zu einem anderen Pokémon der Familie: wie neu geöffnet, inklusive Shiny-Chance. */
  const jumpTo = (id: number) => {
    const lucky = rollShiny();
    setFlipped(false);
    setPicker(null);
    setShiny(lucky);
    if (lucky) {
      setBurst((b) => b + 1);
      sfx.shiny();
    } else sfx.tap();
    onSelection({ id, form: null, nonce: selection.nonce + 1 });
  };

  const evolveTo = (target: number) => {
    if (evolving) return; // zweiter Tipp während des Leuchtens
    setPicker(null);
    setEvolving('glow');
    sfx.evolve(); // dauert so lange wie das Leuchten
    // Regionalform bleibt erhalten: Alola-Vulpix wird zu Alola-Vulnona
    const targetForm = form ? byId.get(target)?.forms?.find((f) => f.region === form.region)?.key ?? null : null;
    window.setTimeout(() => {
      onSelection({ id: target, form: targetForm, nonce: selection.nonce });
      setEvolving('reveal');
      setBurst((b) => b + 1);
      play(asset.sentence(targetForm ?? target));
      window.setTimeout(() => setEvolving(null), 600);
    }, GLOW_MS);
  };

  const onEvolve = () => {
    if (evolving) return;
    if (next.length === 1) evolveTo(next[0]!);
    else {
      sfx.tap();
      setPicker((v) => (v === 'evolve' ? null : 'evolve'));
    }
  };

  /** Mega-Entwicklung: Regenbogen-Aura, "Mega-Entwicklung!", dann die Mega-Form. */
  const megaEvolveTo = (key: string) => {
    if (evolving) return;
    setPicker(null);
    setEvolving('mega');
    sfx.megaEvolve();
    play(asset.fragment('megaEvolve'));
    window.setTimeout(() => {
      onSelection({ ...selection, form: key });
      setEvolving('reveal');
      setBurst((b) => b + 1);
      play(asset.sentence(key));
      window.setTimeout(() => setEvolving(null), 600);
    }, MEGA_MS);
  };

  const onMega = () => {
    if (evolving) return;
    if (isMega) {
      // zurückverwandeln
      sfx.release();
      onSelection({ ...selection, form: null });
      play(asset.sentence(pokemon.id));
    } else if (megas.length === 1) megaEvolveTo(megas[0]!.key);
    else {
      sfx.tap();
      setPicker((v) => (v === 'mega' ? null : 'mega'));
    }
  };

  const cycleForm = () => {
    const forms = pokemon.forms ?? [];
    const i = forms.findIndex((f) => f.key === selection.form);
    const nextForm = i + 1 < forms.length ? forms[i + 1]!.key : null;
    sfx.tap(); // nur 80 ms – vorbei, bevor der Satz startet
    onSelection({ ...selection, form: nextForm });
    play(asset.sentence(nextForm ?? pokemon.id));
  };

  const toggleTeam = () => {
    if (!onToggleTeam()) {
      setTeamShake((n) => n + 1);
      sfx.full();
    } else if (inTeam) sfx.release();
    else sfx.catchBall();
  };

  // Größen-Bühne: Familie + Entwicklungskette
  const peopleFigures: StageFigure[] = people.map((p) => ({ kind: 'person', ...p }));
  const sayComparison = (id: string | number, height: number) =>
    playSequence([asset.name(id), ...compareFragments(height, family).map(asset.fragment)]);
  const onStageTap = (f: StageFigure) => {
    if (f.kind === 'pokemon') sayComparison(f.assetId, f.height);
    else {
      const person = people.find((p) => p.key === f.key);
      if (person) play(asset.fragment(person.speech));
    }
  };
  const levels: StageFigure[][] = (chain ? ladder(chain, pokemon.id) : [[pokemon.id]]).map((level) =>
    level.map((id) => {
      const p = byId.get(id)!;
      const isCurrent = id === pokemon.id;
      return {
        kind: 'pokemon', key: String(id), label: isCurrent ? shown.name : p.name,
        height: isCurrent ? shown.height : p.height, assetId: isCurrent ? assetId : id, current: isCurrent,
        box: bbox[String(isCurrent ? assetId : id)] ?? [0, 0, 1, 1],
      };
    }),
  );

  return (
    <motion.div
      className="app-frame z-50 grid place-items-center bg-[#080a18]/80 p-3"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="flip-scene relative h-[min(calc(var(--app-h)*0.94),580px)] w-[min(96vw,980px)] short:h-[calc(var(--app-h)*0.96)] portrait:h-[min(calc(var(--app-h)*0.92),780px)] portrait:w-[min(94vw,560px)]"
        initial={{ scale: 0.85, y: 40 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 30 }}
        transition={{ type: 'spring', stiffness: 260, damping: 24 }}
        onClick={(e) => e.stopPropagation()}
      >
        <motion.div
          className="flip-inner relative h-full w-full"
          animate={{ rotateY: flipped ? 180 : 0 }}
          transition={{ duration: 0.6, ease: [0.3, 1.3, 0.5, 1] }}
        >
          {/* Vorderseite */}
          <div
            className="flip-face absolute inset-0 grid overflow-hidden rounded-[30px] border-[5px] border-white/90 shadow-2xl short:rounded-[22px] short:border-4 landscape:grid-cols-[1.15fr_1fr] landscape:grid-rows-[100%] portrait:grid-rows-[1fr_auto]"
            style={typeVars(shown.types)}
          >
            <section className="card-face foil relative grid min-h-0 place-items-center" data-shine={burst > 0}>
              <span className="absolute top-3 left-4 text-lg font-black text-white/85 drop-shadow">#{String(pokemon.id).padStart(3, '0')}</span>
              {form && (
                <span className={`absolute top-3 right-4 rounded-full px-3 py-1 text-sm font-extrabold ${isMega ? 'mega-badge' : 'bg-black/30'}`}>
                  {form.region === 'primal' ? 'PROTO' : form.region.toUpperCase()}
                </span>
              )}
              {shiny && <Sparkles className="absolute top-12 left-4 size-8 text-sun drop-shadow-[0_0_8px_white]" />}
              <AnimatePresence mode="popLayout">
                <motion.img
                  key={`${assetId}-${shiny}`}
                  src={asset.art(assetId, shiny)}
                  alt={shown.name}
                  className={`absolute inset-0 m-auto h-[84%] w-[92%] object-contain drop-shadow-[0_10px_0_rgb(0_0_0/0.22)] ${evolving === 'glow' ? 'evolve-glow' : evolving === 'mega' ? 'mega-glow' : ''}`}
                  initial={{ scale: evolving === 'reveal' ? 1.25 : 0.9, opacity: 0 }}
                  animate={evolving === 'glow'
                    ? { scale: [1, 1.08, 0.94, 1.12, 1], opacity: 1, transition: { duration: GLOW_MS / 1000, ease: 'easeInOut' } }
                    : evolving === 'mega'
                      ? { scale: [1, 0.92, 1.1, 0.95, 1.18, 1.05], rotate: [0, -3, 3, -2, 2, 0], opacity: 1, transition: { duration: MEGA_MS / 1000, ease: 'easeInOut' } }
                      : { scale: 1, rotate: 0, opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ type: 'spring', stiffness: 220, damping: 18 }}
                  onClick={() => play(asset.sentence(assetId))}
                />
              </AnimatePresence>
              {evolving === 'mega' && <MegaRings />}
              <SparkleBurst burst={burst} />

              {/* Auswahl: verzweigte Entwicklung (Evoli) oder mehrere Megas (Glurak X/Y) */}
              <AnimatePresence>
                {picker && (
                  <motion.div
                    className="absolute inset-x-3 bottom-3 flex flex-wrap justify-center gap-2 rounded-3xl bg-ink/85 p-3"
                    initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
                  >
                    {picker === 'evolve'
                      ? next.map((id) => (
                        <button key={id} onClick={() => evolveTo(id)} aria-label={byId.get(id)?.name}
                          className="chunky size-16 rounded-full bg-white/90 p-1">
                          <img src={asset.thumb(id)} alt="" className="size-full object-contain" />
                        </button>
                      ))
                      : megas.map((m) => (
                        <button key={m.key} onClick={() => megaEvolveTo(m.key)} aria-label={m.name}
                          className="chunky mega-badge size-16 rounded-full p-1">
                          <img src={asset.thumb(m.key)} alt="" className="size-full object-contain" />
                        </button>
                      ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </section>

            <section className="flex min-h-0 flex-col gap-3 overflow-hidden bg-ink/95 p-5 short:gap-2 short:p-3">
              <button onClick={() => play(asset.sentence(assetId))} className="flex items-center gap-3 text-left">
                <span className="text-[clamp(28px,4.6vw,50px)] leading-none font-black text-balance short:text-[28px]">{shown.name}</span>
                <Speaker className="size-8 shrink-0 text-sun short:size-6" />
              </button>
              <div className="flex flex-wrap gap-2">
                {shown.types.map((type) => (
                  <span key={type} className="flex items-center gap-1.5 rounded-full py-1 pr-3 pl-1 text-[15px] font-extrabold short:py-0.5 short:text-[13px]" style={{ background: TYPE_COLORS[type] }}>
                    <img src={asset.typeIcon(type)} alt="" className="size-7 short:size-5" />
                    {typeName(type)}
                  </span>
                ))}
              </div>
              {chainIds.length > 1 && (
                <div className="flex flex-wrap items-center gap-1.5 rounded-2xl bg-white/6 p-2 short:p-1.5">
                  {chainIds.map((id) => (
                    <button
                      key={id}
                      aria-label={byId.get(id)?.name}
                      onClick={() => id !== pokemon.id && jumpTo(id)}
                      className={`size-12 rounded-full p-0.5 short:size-9 ${id === pokemon.id ? 'bg-sun' : 'bg-white/12'}`}
                    >
                      <img src={asset.thumb(id)} alt="" className="size-full object-contain" />
                    </button>
                  ))}
                </div>
              )}
              <div className="mt-auto grid grid-cols-3 gap-2.5 short:gap-1.5">
                <ActionButton icon={<Speaker className="size-full" />} label={ui.cry} onClick={() => play(asset.cry(assetId))} />
                {canShiny && (
                  <ActionButton
                    icon={<Sparkles className="size-full" />} label={ui.shiny} active={shiny}
                    onClick={() => { setShiny((s) => !s); setBurst((b) => b + 1); sfx.shiny(); }}
                  />
                )}
                {!!pokemon.forms?.length && (
                  <ActionButton icon={<Globe className="size-full" />} label={ui.forms} active={!!form && !isMega} onClick={cycleForm} />
                )}
                {megas.length > 0 && (
                  <ActionButton icon={<MegaStone className="size-full" />} label={ui.mega} active={isMega || picker === 'mega'}
                    tone="mega-badge" onClick={onMega} />
                )}
                <ActionButton
                  icon={<Pokeball className="size-full" />}
                  label={inTeam ? ui.release : ui.catch}
                  active={inTeam}
                  shake={teamShake}
                  onClick={toggleTeam}
                />
                {next.length > 0 && (
                  <ActionButton icon={<Evolve className="size-full" />} label={ui.evolve} active={picker === 'evolve'} tone="bg-[#5b3fd6]" onClick={onEvolve} />
                )}
                <ActionButton icon={<Ruler className="size-full" />} label={ui.size} tone="bg-[#1f8a70]" onClick={() => { setFlipped(true); sfx.flip(); }} />
              </div>
            </section>
          </div>

          {/* Rückseite: Größen-Bühne */}
          <div
            className="flip-face absolute inset-0 flex flex-col overflow-hidden rounded-[30px] border-[5px] border-white/90 bg-[radial-gradient(120%_100%_at_50%_0%,#2f3a8a,#141836)] p-4 shadow-2xl short:rounded-[22px] short:border-4 short:p-2.5"
            style={{ transform: 'rotateY(180deg)' }}
          >
            <div className="flex items-center gap-3 pr-12">
              <button onClick={() => { setFlipped(false); sfx.flip(); }} className="chunky flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-[15px] font-extrabold short:py-1">
                <Flip className="size-6" /> {ui.back}
              </button>
              <span className="text-2xl font-black short:text-xl">{ui.size}</span>
              <button
                onClick={() => sayComparison(assetId, shown.height)}
                aria-label={ui.size}
                className="chunky ml-auto flex items-center gap-2 rounded-full bg-sun px-4 py-2 text-[15px] font-extrabold text-ink short:py-1"
              >
                <Speaker className="size-6" /> {shown.name}
              </button>
            </div>
            <div className="min-h-0 flex-1 pt-2">
              {flipped && (
                <SizeStage people={peopleFigures} levels={levels} shiny={shiny} onTap={onStageTap} />
              )}
            </div>
          </div>
        </motion.div>

        <button
          onClick={onClose}
          aria-label={ui.close}
          className="chunky absolute -top-2 -right-2 z-10 grid size-14 place-items-center rounded-full bg-white text-ink short:size-11"
        >
          <Close className="size-7" />
        </button>
      </motion.div>
    </motion.div>
  );
}
