import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import { App } from './App';
import { hydrate, load } from './lib/storage';
import { defaultSettings } from './settings';
import './styles.css';

// Service Worker mit Auto-Update: Die App bleibt im Kinder-Browser oft tagelang offen. Deshalb nicht nur
// beim Öffnen nach einer neuen Version schauen, sondern auch beim Zurückholen in den Vordergrund und
// jede halbe Stunde. Findet sich eine, lädt die Seite neu – Ansicht und Karte sind gespeichert.
registerSW({
  immediate: true,
  onRegisteredSW(_url, registration) {
    if (!registration) return;
    const check = () => {
      if (navigator.onLine) registration.update().catch(() => {});
    };
    window.setInterval(check, 30 * 60 * 1000);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') check();
    });
  },
});

// Cache der alten App (v2) aufräumen – deren Service Worker wird durch unseren ersetzt.
if ('caches' in window) void caches.delete('pokemon-entdecker-v1');

// Der Kinder-Browser zeigt Tab- und Adressleiste. Beim Antippen außerhalb des Vollbilds Vollbild
// anfordern (abschaltbar in den Eltern-Einstellungen). Hat der Browser das Vollbild gerade verlassen
// (Zurück-Geste, Tastatur, …), erst nach einer halben Minute wieder – sonst springt die Höhe ständig
// zwischen ~350 und ~600 px hin und her. Während getippt wird (Suche) nie.
const REENTER_AFTER_EXIT_MS = 30_000;
let lastFullscreenChange = 0;
let lastFullscreenExit = 0;
document.addEventListener('fullscreenchange', () => {
  lastFullscreenChange = Date.now();
  if (!document.fullscreenElement) lastFullscreenExit = lastFullscreenChange;
});
document.addEventListener('pointerup', () => {
  const root = document.documentElement;
  const now = Date.now();
  if (document.fullscreenElement || !root.requestFullscreen || !load('settings', defaultSettings).fullscreen) return;
  if (now - lastFullscreenChange < 3000 || now - lastFullscreenExit < REENTER_AFTER_EXIT_MS) return;
  if (document.activeElement instanceof HTMLInputElement) return;
  lastFullscreenChange = now;
  root.requestFullscreen().catch(() => {});
});

// Erst gespeicherte Einstellungen aus dem Cache Storage holen, dann rendern (dauert Millisekunden)
void hydrate().finally(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
});
