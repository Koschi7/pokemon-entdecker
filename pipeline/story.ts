// Geschichten für den Kreativ-Tonie: liest eine Geschichte als Markdown ("# Titel", "## Kapitel …") und vertont
// sie kapitelweise mit Gemini – auf dem Tonie wird daraus je ein Kapitel. Die Sprechweise steht als eigene Angabe an
// jedem Absatz (Interactions-API): So wird sie nicht mitgelesen, und die Stimme dreht zum Kapitelende nicht auf –
// Regieanweisungen im Text lassen sie abdriften. Danach prüft pipeline/story_check.py jedes Kapitel.
// Die Texte liegen nur lokal (generated/stories/, gitignored): Sie enthalten die Namen der Kinder.
//
//   pnpm story generated/stories/04-der-funke-im-apfelgarten.md
//   pnpm story <datei> --chapter 3      # nur Kapitel 3 (neu) vertonen
//   pnpm story <datei> --force          # alle Kapitel neu vertonen
//   pnpm story <datei> --voice Sulafat  # andere Stimme
//   pnpm story <datei> --name Fukano    # Kurzname in den Tonie-Titeln ("Fukano 4 – Geowaz")
//
// Fertige Kapitel werden übersprungen: Nach dem Tageslimit einfach am nächsten Tag denselben Befehl starten.
// Sind alle Kapitel da, landen sie mit Titeln (ID3) im Ordner "Tonie – <Titel>" – so in die Tonie-App ziehen.
// Voraussetzung für die Prüfung: .venv/bin/pip install -r pipeline/requirements-story.txt
import { execFile } from 'node:child_process';
import { access, appendFile, mkdir, readFile, unlink } from 'node:fs/promises';
import { basename, dirname, join } from 'node:path';
import { parseArgs, promisify } from 'node:util';
import { QuotaExceeded, narrate } from './lib/gemini.ts';

const run = promisify(execFile);
const MODEL = 'gemini-3.8-flash-tts';
const TEMPERATURE = 0.5; // gleichmäßiger Vortrag
// kurz halten und an jedem Absatz gleich lassen – längere Anweisungen lassen die Stimme laut Google abdriften
const STYLE = 'ruhig und warm erzählend, wie beim Vorlesen eines Kinderhörspiels, gleichmäßiges, eher langsames Tempo';
const NUMBERS = ['eins', 'zwei', 'drei', 'vier', 'fünf', 'sechs', 'sieben', 'acht', 'neun', 'zehn'];

const { values: args, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    voice: { type: 'string', default: 'Achernar' },
    force: { type: 'boolean', default: false },
    chapter: { type: 'string' },
    name: { type: 'string' },
  },
});

type Chapter = { title: string; paragraphs: string[] };

/** "# Titel" und "## Kapitel 1: …"-Abschnitte, Absätze getrennt durch Leerzeilen */
function parse(markdown: string): { title: string; chapters: Chapter[] } {
  const title = markdown.match(/^# (.+)$/m)?.[1]?.trim() ?? 'Geschichte';
  const chapters = markdown.split(/^## /m).slice(1).map((block) => {
    const [heading = '', ...body] = block.split('\n');
    const paragraphs = body.join('\n').split(/\n\s*\n/).map((p) => p.replace(/\s*\n\s*/g, ' ').trim()).filter(Boolean);
    return { title: heading.trim(), paragraphs };
  });
  return { title, chapters };
}

/** "Kapitel 2: Das Hindernis" → "Kapitel zwei. Das Hindernis." (Ziffern liest die Stimme sonst hölzern) */
function spokenHeading(heading: string): string {
  return heading
    .replace(/Kapitel (\d+)/, (_, n: string) => `Kapitel ${NUMBERS[Number(n) - 1] ?? n}`)
    .replace(/:\s*/, '. ') + '.';
}

async function exists(file: string): Promise<boolean> {
  return access(file).then(() => true, () => false);
}

async function main() {
  const file = positionals[0];
  if (!file) throw new Error('Aufruf: pnpm story <geschichte.md>');
  const { title, chapters } = parse(await readFile(file, 'utf8'));
  const outDir = join(dirname(file), basename(file, '.md'));
  const only = args.chapter ? Number(args.chapter) : undefined;
  await mkdir(outDir, { recursive: true });
  console.log(`${title}: ${chapters.length} Kapitel, Stimme ${args.voice}`);

  for (const [i, chapter] of chapters.entries()) {
    const nn = String(i + 1).padStart(2, '0');
    const mp3 = join(outDir, `${nn}.mp3`);
    if (only !== undefined && i + 1 !== only) continue;
    if (only === undefined && !args.force && (await exists(mp3))) continue;

    const heading = `${i === 0 ? `${title}. ` : ''}${spokenHeading(chapter.title)} <long pause>`;
    const wav = join(outDir, `${nn}.wav`);
    try {
      await narrate(MODEL, args.voice!, [heading, ...chapter.paragraphs], STYLE, wav, { temperature: TEMPERATURE });
    } catch (err) {
      if (err instanceof QuotaExceeded) {
        console.log('Tageslimit von Gemini erreicht – morgen denselben Befehl starten, fertige Kapitel bleiben.');
        return;
      }
      throw err;
    }
    await appendFile('generated/audio/de/requests.log', `${new Date().toISOString()} ok story ${basename(file)} Kapitel ${i + 1}\n`);
    // gleiche Lautheit für alle Kapitel, 1 s Ruhe davor und 2 s danach
    await run('ffmpeg', ['-y', '-loglevel', 'error', '-i', wav, '-af', 'loudnorm=I=-21:TP=-2:LRA=11,adelay=1000:all=1,apad=pad_dur=2',
      '-ac', '1', '-ar', '44100', '-c:a', 'libmp3lame', '-b:a', '112k', mp3]);
    await unlink(wav);
    console.log(`  ${nn}.mp3  ${chapter.title}`);
  }

  const { stdout } = await run('.venv/bin/python', ['pipeline/story_check.py', file, outDir], { maxBuffer: 1 << 24 });
  process.stdout.write(stdout);

  const mp3s = chapters.map((_, i) => join(outDir, `${String(i + 1).padStart(2, '0')}.mp3`));
  if ((await Promise.all(mp3s.map(exists))).every(Boolean)) await exportForTonie(title, chapters, mp3s, dirname(file));
}

/** "Tonie – <Titel>/04 Fukano 4 – Geowaz.mp3": Dateiname und ID3-Titel sind das, was die Tonie-App anzeigt */
async function exportForTonie(title: string, chapters: Chapter[], mp3s: string[], storiesDir: string) {
  const dir = join(storiesDir, `Tonie – ${title}`);
  await mkdir(dir, { recursive: true });
  for (const [i, chapter] of chapters.entries()) {
    const name = `${args.name ?? title} ${i + 1} – ${chapter.title.replace(/^Kapitel \d+:\s*/, '')}`;
    await run('ffmpeg', ['-y', '-loglevel', 'error', '-i', mp3s[i]!, '-c', 'copy', '-map_metadata', '-1', '-id3v2_version', '3',
      '-metadata', `title=${name}`, '-metadata', `track=${i + 1}`, '-metadata', 'album=Pokémon-Geschichten',
      join(dir, `${String(i + 1).padStart(2, '0')} ${name}.mp3`)]);
  }
  console.log(`  Für den Tonie: ${dir}`);
}

await main();
