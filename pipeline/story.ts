// Gutenachtgeschichten für den Kreativ-Tonie: liest eine Geschichte als Markdown ("# Titel", "## Kapitel …"),
// vertont sie mit Gemini in EINER Anfrage (sonst klingt jedes Kapitel ein bisschen anders) und teilt die
// Aufnahme danach in Kapitel (pipeline/story_split.py) – auf dem Tonie wird daraus je ein Kapitel.
// Die Texte liegen nur lokal (generated/stories/, gitignored): Sie enthalten die Namen der Kinder.
//
//   pnpm story generated/stories/01-sternschnuppennacht.md
//   pnpm story <datei> --force          # neu vertonen, auch wenn es die Kapitel schon gibt
//   pnpm story <datei> --voice Sulafat  # andere Stimme
//
// Voraussetzung für das Aufteilen: .venv/bin/pip install -r pipeline/requirements-story.txt
import { execFile } from 'node:child_process';
import { access, appendFile, mkdir, readFile, unlink } from 'node:fs/promises';
import { basename, dirname, join } from 'node:path';
import { parseArgs, promisify } from 'node:util';
import { QuotaExceeded, synthesize } from './lib/gemini.ts';

const run = promisify(execFile);
const MODEL = 'gemini-3.8-flash-tts';
const TEMPERATURE = 0.5; // gleichmäßiger Vortrag über die ganze Geschichte
// Gemini liest diese Anweisung mit vor (eine getrennte Systemanweisung lehnt das TTS-Modell ab);
// story_split.py schneidet sie weg. Sie wirkt trotzdem auf die Sprechweise.
const STYLE = 'Lies die folgende Gutenachtgeschichte von Anfang bis Ende gleichmäßig ruhig, sanft und leise vor, '
  + 'mit kleinen Pausen zwischen den Sätzen. Auch bei wörtlicher Rede und spannenden Stellen bleibt die Stimme '
  + 'weich und gemütlich:';
const NUMBERS = ['eins', 'zwei', 'drei', 'vier', 'fünf', 'sechs', 'sieben', 'acht', 'neun', 'zehn'];

const { values: args, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    voice: { type: 'string', default: 'Achernar' },
    force: { type: 'boolean', default: false },
  },
});

type Chapter = { title: string; text: string };

/** "# Titel" und "## Kapitel 1: …"-Abschnitte */
function parse(markdown: string): { title: string; chapters: Chapter[] } {
  const title = markdown.match(/^# (.+)$/m)?.[1]?.trim() ?? 'Geschichte';
  const chapters = markdown.split(/^## /m).slice(1).map((block) => {
    const [heading = '', ...body] = block.split('\n');
    return { title: heading.trim(), text: body.join('\n').trim() };
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
  await mkdir(outDir, { recursive: true });
  if (!args.force && (await exists(join(outDir, '01.mp3')))) {
    console.log(`${outDir} gibt es schon – mit --force neu vertonen`);
    return;
  }
  console.log(`${title}: ${chapters.length} Kapitel, Stimme ${args.voice}, eine Anfrage`);

  const spoken = chapters.map((c, i) => `${i === 0 ? `${title}. ` : ''}${spokenHeading(c.title)}\n\n${c.text}`);
  const wav = join(outDir, 'ganz.wav');
  try {
    await synthesize(MODEL, args.voice!, `${STYLE}\n\n${spoken.join('\n\n')}`, wav, { temperature: TEMPERATURE });
  } catch (err) {
    if (err instanceof QuotaExceeded) {
      console.log('Tageslimit von Gemini erreicht – später nochmal starten.');
      return;
    }
    throw err;
  }
  await appendFile('generated/audio/de/requests.log', `${new Date().toISOString()} ok story ${basename(file)} (ganz)\n`);

  const { stdout } = await run('.venv/bin/python', ['pipeline/story_split.py', wav, outDir, String(chapters.length), title]);
  process.stdout.write(stdout);
  await unlink(wav);
  await unlink(`${wav}.norm.wav`);
}

await main();
