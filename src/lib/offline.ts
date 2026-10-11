// Offline-Vorrat: Der Service Worker cacht alles, was über fetch() geladen wird.
// Kern (~15 MB: Vorschaubilder + "Das ist …!") lädt automatisch im Hintergrund,
// der Rest (große Bilder, Shinys, Rufe, Namen) über "Alles offline laden" in den Eltern-Einstellungen.
import { asset } from '../data/assets';
import type { AppData } from '../data/types';
import { load, save } from './storage';

type Progress = (done: number, total: number) => void;

function allIds(data: AppData): Array<string | number> {
  return data.pokemon.flatMap((p) => [p.id, ...(p.forms ?? []).map((f) => f.key)]);
}

async function fetchAll(urls: string[], onProgress?: Progress, parallel = 4): Promise<number> {
  let done = 0;
  let failed = 0;
  const queue = [...urls];
  await Promise.all(Array.from({ length: parallel }, async () => {
    for (let url = queue.shift(); url; url = queue.shift()) {
      try {
        const res = await fetch(url);
        if (!res.ok) failed += 1;
        await res.arrayBuffer(); // vollständig lesen, damit der Cache-Eintrag komplett ist
      } catch {
        failed += 1;
      }
      done += 1;
      onProgress?.(done, urls.length);
    }
  }));
  return failed;
}

export function coreUrls(data: AppData): string[] {
  return allIds(data).flatMap((id) => [asset.thumb(id), asset.sentence(id)]);
}

export function fullUrls(data: AppData): string[] {
  return allIds(data).flatMap((id) => [asset.art(id), asset.art(id, true), asset.cry(id), asset.name(id)]);
}

/** Lädt den Kern einmal pro Datenversion im Hintergrund, sobald der Service Worker aktiv ist. */
export async function warmCore(data: AppData): Promise<void> {
  if (!('serviceWorker' in navigator) || !navigator.onLine) return;
  const state = load('offline', { core: '' });
  if (state.core === data.version) return;
  await navigator.serviceWorker.ready;
  const failed = await fetchAll(coreUrls(data), undefined, 2);
  if (failed === 0) save('offline', { ...state, core: data.version });
}

export async function downloadAll(data: AppData, onProgress: Progress): Promise<number> {
  return fetchAll([...coreUrls(data), ...fullUrls(data)], onProgress, 6);
}
