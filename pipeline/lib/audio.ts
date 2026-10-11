// ffmpeg-Helfer: Stapel-Audio normalisieren, Pausen finden, Clips schneiden.
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const run = promisify(execFile);

export async function duration(file: string): Promise<number> {
  const { stdout } = await run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file]);
  return Number(stdout.trim());
}

/** Lautheit über den ganzen Stapel angleichen (auf kurzen Einzelclips ist loudnorm unzuverlässig). */
export async function normalize(src: string, dst: string): Promise<void> {
  await run('ffmpeg', ['-y', '-loglevel', 'error', '-i', src, '-af', 'loudnorm=I=-16:TP=-1.5:LRA=11', '-ar', '24000', '-ac', '1', dst]);
}

export type Silence = { start: number; end: number };

export async function silences(file: string, minPause = 0.12, noiseDb = -38): Promise<Silence[]> {
  const { stderr } = await run('ffmpeg', ['-i', file, '-af', `silencedetect=noise=${noiseDb}dB:d=${minPause}`, '-f', 'null', '-']);
  const starts = [...stderr.matchAll(/silence_start: ([\d.]+)/g)].map((m) => Number(m[1]));
  const ends = [...stderr.matchAll(/silence_end: ([\d.]+)/g)].map((m) => Number(m[1]));
  return starts.map((start, i) => ({ start, end: ends[i] ?? Infinity }));
}

export type Segment = { start: number; end: number };

/**
 * Zerlegt einen Stapel mit `count` Äußerungen. Grenzen sind die count-1 längsten inneren Pausen –
 * robuster als ein fester Schwellwert, weil Pausen zwischen Zeilen deutlich länger sind als in Namen
 * wie "Ho-Oh". Liefert null, wenn die Trennung nicht eindeutig ist.
 */
export function splitByLongestPauses(all: Silence[], total: number, count: number): Segment[] | null {
  const inner = all.filter((s) => s.start > 0.05 && s.end < total - 0.05);
  if (inner.length < count - 1) return null;
  const byLength = [...inner].sort((a, b) => (b.end - b.start) - (a.end - a.start));
  const chosen = byLength.slice(0, count - 1);
  const rest = byLength.slice(count - 1);
  const shortestChosen = Math.min(...chosen.map((s) => s.end - s.start));
  const longestRest = rest.length ? rest[0]!.end - rest[0]!.start : 0;
  if (rest.length && shortestChosen < longestRest * 1.25) return null;

  chosen.sort((a, b) => a.start - b.start);
  const lead = all.find((s) => s.start <= 0.05);
  const tail = all.find((s) => s.end >= total - 0.05);
  const segments: Segment[] = [];
  let cursor = lead ? lead.end : 0;
  for (const s of chosen) {
    segments.push({ start: cursor, end: s.start });
    cursor = s.end;
  }
  segments.push({ start: cursor, end: tail ? tail.start : total });
  return segments;
}

export async function cutClip(src: string, dst: string, seg: Segment): Promise<void> {
  const start = Math.max(0, seg.start - 0.04);
  const end = seg.end + 0.08;
  await run('ffmpeg', ['-y', '-loglevel', 'error', '-i', src, '-ss', start.toFixed(3), '-to', end.toFixed(3),
    '-ac', '1', '-ar', '24000', '-c:a', 'aac', '-b:a', '48k', dst]);
}
