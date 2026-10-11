// Spielt kurze Clips ab. Die Dateien werden per fetch() geladen (ganze Datei, keine Range-Anfrage),
// damit der Service Worker sie zuverlässig offline cachen kann – der Bug der alten App.
const blobs = new Map<string, string>();
let current: HTMLAudioElement | null = null;
let generation = 0; // jeder neue Abspielwunsch bricht laufende Clips/Sequenzen ab

async function objectUrl(url: string): Promise<string> {
  const cached = blobs.get(url);
  if (cached) return cached;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  const blobUrl = URL.createObjectURL(await res.blob());
  blobs.set(url, blobUrl);
  return blobUrl;
}

export function stop(): void {
  generation += 1;
  current?.pause();
  current = null;
}

async function playOne(url: string, gen: number): Promise<void> {
  const src = await objectUrl(url);
  if (gen !== generation) return;
  const audio = new Audio(src);
  current = audio;
  await new Promise<void>((resolve) => {
    audio.onended = () => resolve();
    audio.onerror = () => resolve();
    audio.onpause = () => resolve();
    audio.play().catch(() => resolve());
  });
}

/** Mehrere Clips nacheinander, z. B. "Glurak" + "ist größer als du". Fehlende Clips werden übersprungen. */
export async function playSequence(urls: string[]): Promise<void> {
  stop();
  const gen = generation;
  for (const url of urls) {
    if (gen !== generation) return;
    try {
      await playOne(url, gen);
    } catch {
      // Clip noch nicht erzeugt oder offline nicht im Cache
    }
  }
}

export function play(url: string): Promise<void> {
  return playSequence([url]);
}
