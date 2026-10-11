/// <reference types="vitest/config" />
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import sirv from 'sirv';

// Daten, Bilder und Audio erzeugt die Pipeline in generated/ – sie werden getrennt deployt und
// nie committet. Der Dev-Server liefert sie unter denselben Pfaden aus wie später nginx.
function generatedAssets(): Plugin {
  return {
    name: 'generated-assets',
    configureServer(server) {
      const serve = sirv('generated', { dev: true });
      server.middlewares.use((req, res, next) => {
        if (/^\/(data|img|audio)\//.test(req.url ?? '')) serve(req, res, next);
        else next();
      });
    },
  };
}

export default defineConfig({
  // Nur die eigenen Tests – nicht die in Arbeitskopien unter .claude/worktrees
  test: { include: ['src/**/*.test.ts'] },
  plugins: [
    react(),
    tailwindcss(),
    generatedAssets(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: false, // Registrierung in src/main.tsx – mit regelmäßiger Update-Prüfung
      includeAssets: ['icon.svg', 'types/*.svg'],
      manifest: {
        name: 'Pokémon Entdecker',
        short_name: 'Pokémon',
        lang: 'de',
        display: 'fullscreen',
        orientation: 'any',
        background_color: '#161a33',
        theme_color: '#e3350d',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/(data|img|audio|probe)\//],
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          { urlPattern: /\/data\/.*\.json$/, handler: 'StaleWhileRevalidate', options: { cacheName: 'data' } },
          {
            urlPattern: /\/img\/thumb\//,
            handler: 'CacheFirst',
            options: { cacheName: 'thumbs', cacheableResponse: { statuses: [0, 200] } },
          },
          {
            // Audio wird per fetch() komplett geladen (src/lib/audio.ts) – Range-Anfragen fallen weg
            urlPattern: /\/audio\//,
            handler: 'CacheFirst',
            options: { cacheName: 'audio', cacheableResponse: { statuses: [0, 200] } },
          },
          {
            urlPattern: /\/img\/(art|shiny)\//,
            handler: 'CacheFirst',
            options: { cacheName: 'art', cacheableResponse: { statuses: [0, 200] } },
          },
        ],
      },
    }),
  ],
});
