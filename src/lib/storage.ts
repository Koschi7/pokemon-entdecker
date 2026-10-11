// Dauerhafter Speicher für Einstellungen, Team und Ansicht.
//
// Der Amazon-Kids-Browser behält localStorage nicht zuverlässig (je nach Kinderprofil-Einstellung
// "Cookies erlauben"), den Cache-Speicher des Service Workers dagegen schon. Deshalb wird jeder Wert
// zusätzlich im Cache Storage abgelegt und beim Start von dort zurückgeholt (`hydrate`).
const PREFIX = 'pe.';
const CACHE = 'pe-state';
const memory = new Map<string, string>();

const stateUrl = (key: string) => `/__pe-state/${encodeURIComponent(key)}`;

/** Beim Start einmal aufrufen (vor dem ersten Render): holt die Werte aus dem Cache Storage. */
export async function hydrate(): Promise<void> {
  try {
    const cache = await caches.open(CACHE);
    for (const request of await cache.keys()) {
      const key = decodeURIComponent(new URL(request.url).pathname.split('/').pop() ?? '');
      const response = await cache.match(request);
      if (key && response) memory.set(key, await response.text());
    }
  } catch {
    // kein Cache Storage – dann nur localStorage bzw. diese Sitzung
  }
  try {
    void navigator.storage?.persist?.(); // Bitte an den Browser, nichts davon wegzuräumen
  } catch {
    // egal
  }
}

function raw(key: string): string | null {
  try {
    const value = localStorage.getItem(PREFIX + key);
    if (value !== null) return value;
  } catch {
    // localStorage gesperrt
  }
  return memory.get(key) ?? null;
}

export function load<T>(key: string, fallback: T): T {
  try {
    const value = raw(key);
    return value ? { ...fallback, ...JSON.parse(value) } : fallback;
  } catch {
    return fallback;
  }
}

export function loadList(key: string): number[] {
  try {
    const list = JSON.parse(raw(key) ?? '[]');
    return Array.isArray(list) ? list.filter((x) => typeof x === 'number') : [];
  } catch {
    return [];
  }
}

export function save(key: string, value: unknown): void {
  const json = JSON.stringify(value);
  memory.set(key, json);
  try {
    localStorage.setItem(PREFIX + key, json);
  } catch {
    // localStorage voll oder gesperrt – der Cache Storage übernimmt
  }
  if (typeof caches === 'undefined') return;
  caches
    .open(CACHE)
    .then((cache) => cache.put(stateUrl(key), new Response(json, { headers: { 'Content-Type': 'application/json' } })))
    .catch(() => {});
}
