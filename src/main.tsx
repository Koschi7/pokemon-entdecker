import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import { App } from './App';
import { hydrate } from './lib/storage';
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

// Der Kinder-Browser zeigt Tab- und Adressleiste. Beim Antippen außerhalb des Vollbilds (erster Start,
// oder nach der Zurück-Taste) Vollbild anfordern – aber höchstens alle 3 Sekunden, damit die Höhe nicht
// zwischen ~350 und ~600 px hin- und herspringen kann. Klappt es nicht, passiert nichts.
let lastFullscreenChange = 0;
document.addEventListener('fullscreenchange', () => { lastFullscreenChange = Date.now(); });
document.addEventListener('pointerup', () => {
  const root = document.documentElement;
  if (document.fullscreenElement || !root.requestFullscreen || Date.now() - lastFullscreenChange < 3000) return;
  lastFullscreenChange = Date.now();
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
