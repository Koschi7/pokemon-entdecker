// Erzeugt die Sprachclips mit Gemini (Stimme Puck): "Das ist <Name>!" und "<Name>!" für jedes Pokémon
// und jede Regionalform. Stapelweise (viele Zeilen pro Anfrage), fortsetzbar; wartet bei Minutenlimits,
// hört beim Tageslimit auf.
//
//   pnpm tts                      # bis zu 30 Anfragen, Stapel à 100
//   pnpm tts --batch 30 --max-requests 3
//   pnpm tts --dry-run            # nur anzeigen, was fehlt
import { appendFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { parseArgs } from 'node:util';
import type { Pokemon } from './build-data.ts';
import { cutClip, duration, normalize, silences, splitByLongestPauses } from './lib/audio.ts';
import { QuotaExceeded, synthesize } from './lib/gemini.ts';
import { FRAGMENTS } from '../src/data/compare.ts';
import { spoken } from './pronunciation.ts';

const MODEL = 'gemini-3.8-flash-tts';
const VOICE = 'Puck';
const OUT = 'generated/audio/de';
const MANIFEST = `${OUT}/manifest.json`;
const RAW = '.cache/tts';

type Kind = 'satz' | 'name' | 'frag';
type Utterance = { key: string; kind: Kind; text: string };
type Clip = { text: string; voice: string; file: string; duration: number };
type Manifest = Record<string, Clip>;

const { values: args } = parseArgs({
  options: {
    batch: { type: 'string', default: '100' },
    'max-requests': { type: 'string', default: '30' },
    'dry-run': { type: 'boolean', default: false },
  },
});

function utterances(pokemon: Pokemon[]): Utterance[] {
  // Bausteine für die Größenvergleiche zuerst – ein einziger Stapel
  const list: Utterance[] = Object.entries(FRAGMENTS).map(([key, text]) => ({ key: `frag/${key}`, kind: 'frag', text }));
  for (const p of pokemon) {
    for (const [id, nameDe] of [[String(p.id), p.name.de], ...p.forms.map((f) => [f.key, f.name.de])] as const) {
      const say = spoken(nameDe);
      list.push({ key: `satz/${id}`, kind: 'satz', text: `Das ist ${say}!` });
      list.push({ key: `name/${id}`, kind: 'name', text: `${say}!` });
    }
  }
  return list;
}

async function loadJson<T>(file: string, fallback: T): Promise<T> {
  try {
    return JSON.parse(await readFile(file, 'utf8')) as T;
  } catch {
    return fallback;
  }
}

/** Nächster Stapel: die ersten offenen Zeilen derselben Art, in Pokédex-Reihenfolge. */
function nextBatch(pending: Utterance[], size: number): Utterance[] {
  const kind = pending[0]?.kind;
  return pending.filter((u) => u.kind === kind).slice(0, size);
}

/** Plausibilität: Clip-Länge pro Zeichen darf nicht stark vom Stapel-Median abweichen. */
function plausible(batch: Utterance[], durations: number[]): boolean {
  const ratios = durations.map((d, i) => d / batch[i]!.text.length);
  const median = [...ratios].sort((a, b) => a - b)[Math.floor(ratios.length / 2)]!;
  return ratios.every((r) => r < median * 2.5 && r > median * 0.4);
}

async function runBatch(batch: Utterance[], manifest: Manifest): Promise<boolean> {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const raw = `${RAW}/${stamp}-${batch[0]!.kind}.wav`;
  const norm = `${RAW}/${stamp}-${batch[0]!.kind}-norm.wav`;
  await synthesize(MODEL, VOICE, batch.map((u) => u.text).join('\n\n'), raw);
  await normalize(raw, norm);

  const total = await duration(norm);
  const segments = splitByLongestPauses(await silences(norm), total, batch.length);
  if (!segments) {
    console.log(`  ✗ Pausen nicht eindeutig (${batch.length} Zeilen, ${total.toFixed(1)} s) – ${raw}`);
    return false;
  }
  if (!plausible(batch, segments.map((s) => s.end - s.start))) {
    console.log(`  ✗ Clip-Längen unplausibel, Stapel verworfen – ${raw}`);
    return false;
  }
  for (const [i, u] of batch.entries()) {
    const file = `${OUT}/${u.key}.m4a`;
    await cutClip(norm, file, segments[i]!);
    manifest[u.key] = { text: u.text, voice: VOICE, file: `${u.key}.m4a`, duration: Number((segments[i]!.end - segments[i]!.start).toFixed(2)) };
  }
  await writeFile(MANIFEST, JSON.stringify(manifest, null, 1));
  return true;
}

async function main() {
  const { pokemon } = JSON.parse(await readFile('generated/pokemon.json', 'utf8')) as { pokemon: Pokemon[] };
  const manifest = await loadJson<Manifest>(MANIFEST, {});
  const all = utterances(pokemon);
  let pending = all.filter((u) => manifest[u.key]?.text !== u.text || manifest[u.key]?.voice !== VOICE);
  console.log(`${all.length} Clips gesamt, ${all.length - pending.length} fertig, ${pending.length} offen`);
  if (args['dry-run'] || !pending.length) return;

  await mkdir(`${OUT}/satz`, { recursive: true });
  await mkdir(`${OUT}/name`, { recursive: true });
  await mkdir(`${OUT}/frag`, { recursive: true });
  await mkdir(RAW, { recursive: true });

  let size = Number(args.batch);
  let rateLimited = 0;
  const maxRequests = Number(args['max-requests']);
  for (let request = 1; request <= maxRequests && pending.length; request += 1) {
    const batch = nextBatch(pending, size);
    const label = `${batch[0]!.key} … ${batch.at(-1)!.key}`;
    console.log(`Anfrage ${request}/${maxRequests}: ${batch.length} × ${batch[0]!.kind} (${label})`);
    let ok: boolean;
    try {
      ok = await runBatch(batch, manifest);
      rateLimited = 0;
    } catch (err) {
      if (!(err instanceof QuotaExceeded)) throw err;
      const limit = err.message.match(/"quotaId":\s*"([^"]+)"/)?.[1] ?? 'unbekannt';
      await appendFile(`${OUT}/requests.log`, `${new Date().toISOString()} 429 ${limit} ${label}\n`);
      rateLimited += 1;
      // Tageslimit: aufhören. Minutenlimit (oder unbekannt): kurz warten und denselben Stapel nochmal.
      if (/PerDay/i.test(limit) || rateLimited > 3) {
        console.log(`Limit erreicht (${limit}) – später einfach \`pnpm tts\` erneut starten.`);
        break;
      }
      console.log(`  ⏸ Limit (${limit}), warte 70 s …`);
      await new Promise((r) => setTimeout(r, 70_000));
      continue;
    }
    await appendFile(`${OUT}/requests.log`, `${new Date().toISOString()} ${ok ? 'ok' : 'split-fail'} ${batch.length} ${label}\n`);
    if (ok) {
      pending = pending.filter((u) => !batch.includes(u));
    } else {
      size = Math.max(5, Math.floor(size / 2));
      console.log(`  → nächster Versuch mit ${size} Zeilen pro Stapel`);
    }
  }
  console.log(`Stand: ${all.length - pending.length}/${all.length} Clips fertig`);
}

await main();
