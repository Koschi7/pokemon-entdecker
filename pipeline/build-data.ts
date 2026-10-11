// Baut generated/pokemon.json aus der PokéAPI: alle Arten, Entwicklungsbäume, Regionalformen.
// Bilder und Rufe werden hier nur als Quell-URL vermerkt; Download/Konvertierung macht ein eigener Schritt.
import { mkdir, writeFile } from 'node:fs/promises';
import type { AppData } from '../src/data/types.ts';
import {
  get, idFromUrl,
  type ChainLink, type EvolutionChain, type LocalizedName, type PokemonData, type PokemonForm, type Species,
} from './lib/pokeapi.ts';

export type Art = { normal: string | null; shiny: string | null };
export type Form = {
  key: string; // PokéAPI-Name, z. B. "vulpix-alola"
  region: string;
  name: { de: string; en: string };
  types: string[];
  height: number;
  weight: number;
  art: Art;
  cry: string | null;
};
export type Pokemon = {
  id: number;
  slug: string;
  name: { de: string; en: string };
  generation: number;
  color: string;
  types: string[];
  height: number; // Meter
  weight: number; // Kilogramm
  legendary: boolean;
  chain: number | null;
  evolvesFrom: number | null;
  art: Art;
  cry: string | null;
  forms: Form[];
};
export type ChainNode = { id: number; to: ChainNode[] };

const ROMAN: Record<string, number> = { i: 1, ii: 2, iii: 3, iv: 4, v: 5, vi: 6, vii: 7, viii: 8, ix: 9 };
const REGION_FORM = /-(alola|galar|hisui|paldea)(-|$)/;
const SKIP_FORM = /-(zen|cap|totem|gmax|mega)/;
const REGION_DE: Record<string, string> = { alola: 'Alola', galar: 'Galar', hisui: 'Hisui', paldea: 'Paldea' };
// Die PokéAPI liefert für die drei Paldea-Tauros denselben deutschen Namen.
const FORM_NAME_DE: Record<string, string> = {
  'tauros-paldea-combat-breed': 'Paldea-Tauros (Gefechtsrasse)',
  'tauros-paldea-blaze-breed': 'Paldea-Tauros (Flammenrasse)',
  'tauros-paldea-aqua-breed': 'Paldea-Tauros (Flutenrasse)',
};

const localized = (names: LocalizedName[], lang: string) => names.find((n) => n.language.name === lang)?.name;
const titleCase = (slug: string) => slug.split('-').map((w) => w[0]?.toUpperCase() + w.slice(1)).join('-');

function base(p: PokemonData) {
  const art = p.sprites.other?.['official-artwork'];
  return {
    types: [...p.types].sort((a, b) => a.slot - b.slot).map((t) => t.type.name),
    height: p.height / 10,
    weight: p.weight / 10,
    art: { normal: art?.front_default ?? null, shiny: art?.front_shiny ?? null },
    cry: p.cries?.latest ?? p.cries?.legacy ?? null,
  };
}

async function buildForm(ref: { name: string; url: string }, speciesName: { de: string; en: string }): Promise<Form> {
  const p = await get<PokemonData>(ref.url);
  const region = ref.name.match(REGION_FORM)?.[1] ?? '';
  const formRef = p.forms[0];
  const form = formRef ? await get<PokemonForm>(formRef.url) : null;
  const de = FORM_NAME_DE[ref.name] ?? (form && localized(form.names, 'de')) ?? `${REGION_DE[region]}-${speciesName.de}`;
  const en = (form && localized(form.names, 'en')) ?? `${titleCase(region)} ${speciesName.en}`;
  return { key: ref.name, region, name: { de, en }, ...base(p) };
}

function toNode(link: ChainLink): ChainNode {
  return { id: idFromUrl(link.species.url), to: link.evolves_to.map(toNode) };
}

async function main() {
  const list = await get<{ results: Array<{ name: string; url: string }> }>('pokemon-species?limit=2000');
  console.log(`${list.results.length} Arten`);

  let done = 0;
  const pokemon = await Promise.all(list.results.map(async (ref): Promise<Pokemon> => {
    const s = await get<Species>(ref.url);
    const defaultVariety = s.varieties.find((v) => v.is_default) ?? s.varieties[0];
    if (!defaultVariety) throw new Error(`keine Variante: ${s.name}`);
    const p = await get<PokemonData>(defaultVariety.pokemon.url);
    const name = { de: localized(s.names, 'de') ?? titleCase(s.name), en: localized(s.names, 'en') ?? titleCase(s.name) };
    const formRefs = s.varieties
      .map((v) => v.pokemon)
      .filter((v) => REGION_FORM.test(v.name) && !SKIP_FORM.test(v.name));
    const forms = await Promise.all(formRefs.map((f) => buildForm(f, name)));
    done += 1;
    if (done % 100 === 0) console.log(`  ${done}/${list.results.length}`);
    return {
      id: s.id,
      slug: s.name,
      name,
      generation: ROMAN[s.generation.name.replace('generation-', '')] ?? 0,
      color: s.color.name,
      legendary: s.is_legendary || s.is_mythical,
      chain: s.evolution_chain ? idFromUrl(s.evolution_chain.url) : null,
      evolvesFrom: s.evolves_from_species ? idFromUrl(s.evolves_from_species.url) : null,
      ...base(p),
      forms,
    };
  }));
  pokemon.sort((a, b) => a.id - b.id);

  const chainIds = [...new Set(pokemon.map((p) => p.chain).filter((c): c is number => c !== null))];
  const chains: Record<number, ChainNode> = {};
  await Promise.all(chainIds.map(async (id) => {
    chains[id] = toNode((await get<EvolutionChain>(`evolution-chain/${id}`)).chain);
  }));

  await mkdir('generated/data', { recursive: true });
  await writeFile('generated/pokemon.json', JSON.stringify({ generatedAt: new Date().toISOString(), pokemon, chains }));

  // Schlanke Fassung für die App (ohne Quell-URLs; Dateipfade folgen einer festen Konvention)
  const app: AppData = {
    version: new Date().toISOString().slice(0, 10),
    pokemon: pokemon.map((p) => ({
      id: p.id, name: p.name.de, nameEn: p.name.en, gen: p.generation, color: p.color, types: p.types,
      height: p.height, weight: p.weight, chain: p.chain,
      ...(p.legendary ? { legendary: true as const } : {}),
      ...(p.forms.length ? {
        forms: p.forms.map((f) => ({
          key: f.key, region: f.region, name: f.name.de, nameEn: f.name.en, types: f.types, height: f.height, weight: f.weight,
        })),
      } : {}),
    })),
    chains,
  };
  await writeFile('generated/data/pokemon.json', JSON.stringify(app));

  const forms = pokemon.flatMap((p) => p.forms);
  const missing = {
    art: pokemon.filter((p) => !p.art.normal).map((p) => p.slug),
    shiny: pokemon.filter((p) => !p.art.shiny).map((p) => p.slug),
    cry: pokemon.filter((p) => !p.cry).map((p) => p.slug),
    formShiny: forms.filter((f) => !f.art.shiny).map((f) => f.key),
  };
  console.log(`fertig: ${pokemon.length} Pokémon, ${forms.length} Regionalformen, ${chainIds.length} Entwicklungsketten`);
  console.log('fehlt:', JSON.stringify(missing));
}

await main();
