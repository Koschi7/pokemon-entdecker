// Lädt Artwork (normal + Shiny) und Rufe einmal herunter (Cache in .cache/) und erzeugt daraus
// die Dateien für die App: WebP in zwei Größen, Rufe als m4a mit angeglichener Lautstärke.
import { execFile } from 'node:child_process';
import { access, mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { promisify } from 'node:util';
import sharp from 'sharp';
import type { Art, Pokemon } from './build-data.ts';

const run = promisify(execFile);
const OUT = 'generated';
const CACHE = '.cache/sources';
const PARALLEL = 8;

const SIZES = {
  art: 512, // Detailkarte
  thumb: 160, // Raster
} as const;

async function exists(file: string): Promise<boolean> {
  return access(file).then(() => true, () => false);
}

async function download(url: string, file: string): Promise<void> {
  if (await exists(file)) return;
  for (let attempt = 1; ; attempt += 1) {
    const res = await fetch(url);
    if (res.ok) {
      await mkdir(dirname(file), { recursive: true });
      await writeFile(file, Buffer.from(await res.arrayBuffer()));
      return;
    }
    if (attempt >= 4) throw new Error(`Download ${res.status}: ${url}`);
    await new Promise((r) => setTimeout(r, 1000 * attempt));
  }
}

async function webp(src: string, dst: string, size: number): Promise<void> {
  if (await exists(dst)) return;
  await mkdir(dirname(dst), { recursive: true });
  await sharp(src).resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .webp({ quality: 80, alphaQuality: 90, effort: 5 }).toFile(dst);
}

/** Rufe sind unterschiedlich laut (und teils MP3 mit .ogg-Endung): Spitze auf -1 dB, 44,1 kHz AAC. */
async function cry(src: string, dst: string): Promise<void> {
  if (await exists(dst)) return;
  await mkdir(dirname(dst), { recursive: true });
  const { stderr } = await run('ffmpeg', ['-i', src, '-af', 'volumedetect', '-f', 'null', '-']);
  const peak = Number(stderr.match(/max_volume: (-?[\d.]+) dB/)?.[1] ?? 0);
  await run('ffmpeg', ['-y', '-loglevel', 'error', '-i', src, '-af', `volume=${(-1 - peak).toFixed(1)}dB`,
    '-ac', '1', '-ar', '44100', '-c:a', 'aac', '-b:a', '64k', dst]);
}

type Job = { id: string; art: Art; cry: string | null };

async function processJob(job: Job): Promise<void> {
  if (job.art.normal) {
    const src = `${CACHE}/art/${job.id}.png`;
    await download(job.art.normal, src);
    await webp(src, `${OUT}/img/art/${job.id}.webp`, SIZES.art);
    await webp(src, `${OUT}/img/thumb/${job.id}.webp`, SIZES.thumb);
  }
  if (job.art.shiny) {
    const src = `${CACHE}/art-shiny/${job.id}.png`;
    await download(job.art.shiny, src);
    await webp(src, `${OUT}/img/shiny/${job.id}.webp`, SIZES.art);
  }
  if (job.cry) {
    const src = `${CACHE}/cry/${job.id}.audio`;
    await download(job.cry, src);
    await cry(src, `${OUT}/audio/cry/${job.id}.m4a`);
  }
}

/**
 * Sichtbarer Umriss jedes Artworks (Anteil an der quadratischen Fläche). Die Größen-Bühne skaliert damit
 * die Figur selbst – nicht den transparenten Rand – auf die echte Größe. Shinys haben denselben Umriss.
 */
async function boundingBoxes(ids: string[]): Promise<Record<string, [number, number, number, number]>> {
  const boxes: Record<string, [number, number, number, number]> = {};
  const r = (n: number) => Math.round(n * 1000) / 1000;
  for (const id of ids) {
    const file = `${OUT}/img/art/${id}.webp`;
    if (!(await exists(file))) continue;
    const { info } = await sharp(file).trim({ threshold: 10 }).toBuffer({ resolveWithObject: true });
    const size = SIZES.art;
    boxes[id] = [r(-(info.trimOffsetLeft ?? 0) / size), r(-(info.trimOffsetTop ?? 0) / size), r(info.width / size), r(info.height / size)];
  }
  return boxes;
}

async function folderSize(dir: string, files: string[]): Promise<number> {
  const sizes = await Promise.all(files.map((f) => stat(`${dir}/${f}`).then((s) => s.size, () => 0)));
  return sizes.reduce((a, b) => a + b, 0);
}

async function main() {
  const { pokemon } = JSON.parse(await readFile(`${OUT}/pokemon.json`, 'utf8')) as { pokemon: Pokemon[] };
  const jobs: Job[] = pokemon.flatMap((p) => [
    { id: String(p.id), art: p.art, cry: p.cry },
    ...p.forms.map((f) => ({ id: f.key, art: f.art, cry: f.cry })),
  ]);

  let done = 0;
  const queue = [...jobs];
  await Promise.all(Array.from({ length: PARALLEL }, async () => {
    for (let job = queue.shift(); job; job = queue.shift()) {
      await processJob(job);
      done += 1;
      if (done % 100 === 0) console.log(`  ${done}/${jobs.length}`);
    }
  }));

  const ids = jobs.map((j) => j.id);
  await writeFile(`${OUT}/data/bbox.json`, JSON.stringify(await boundingBoxes(ids)));
  const mb = (n: number) => `${(n / 1e6).toFixed(1)} MB`;
  console.log(`fertig: ${jobs.length} Einträge`);
  for (const [dir, ext] of [['img/thumb', 'webp'], ['img/art', 'webp'], ['img/shiny', 'webp'], ['audio/cry', 'm4a']] as const) {
    console.log(`  ${dir.padEnd(10)} ${mb(await folderSize(`${OUT}/${dir}`, ids.map((id) => `${id}.${ext}`)))}`);
  }
}

await main();
