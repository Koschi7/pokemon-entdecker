# Pokémon Entdecker

A kid-friendly Pokémon explorer for children who can't read yet. Everything works with pictures,
colors and a spoken German voice. It was built for Amazon Fire tablets running the Amazon Kids
browser and is an offline-first Progressive Web App (PWA): once it's loaded, it works in the car
without Wi-Fi.

This is a non-commercial fan project. See [Legal](#legal) before you use it.

## Features

- **Filter by color, type and generation.** Colors use PokéAPI's species colors, types use icons, and each generation is shown as its starter (kids recognize Bulbasaur, not the number 1).
- **Sort small → big.** One tap sorts the grid by height.
- **Collectible flip cards.** Every Pokémon opens as a trading card with its artwork, types, cry, name and an "Das ist …!" voice line. Flip the card to see the size stage.
- **Size stage.** The Pokémon, its evolution line and your family stand side by side to scale. Tap a figure to hear a comparison such as "Glurak ist größer als du!" or "Genau so groß wie Papa!".
- **Evolution trees.** Full evolution families, including branches (e.g. Eevee). An evolve button plays a glow-and-reveal animation, and for branching evolutions the child picks the target.
- **Shiny.** A toggle shows the shiny artwork, and every card has a small chance of opening as a shiny surprise.
- **Regional forms.** Alolan, Galarian, Hisuian and Paldean forms. Evolving keeps the region (Alolan Vulpix → Alolan Ninetales).
- **Mega Evolution.** 99 Mega and Primal forms, including the new ones from Legends Z-A. A Mega button with a rainbow animation; for Pokémon with several Megas (Charizard X/Y) the child picks one. Tiles show a Mega stone badge.
- **My Team.** Catch up to 6 Pokémon with the Poké Ball button.
- **Games.** Two games, each with 3 lives (Poké Balls), a score up to 100, a record saved on the tablet, and a celebration with trophy and confetti at 100:
  - **"Wer ist das Pokémon?"**: a silhouette and three pictures to choose from. Distractors always have a different color, so even four-year-olds have a fair chance. A wrong tap costs a Poké Ball, but the child may keep looking.
  - **"Wer ist größer?"**: two Pokémon shown at the same size, so you have to know it rather than see it. After the tap, both grow or shrink to their real scale with their heights. Pairs get closer in size as the score rises.
- **Sound effects.** Taps, card flips, the Poké Ball, shinies, evolutions and the games have small sounds, synthesized with the Web Audio API (no audio files, no licenses, works offline). Parents can switch them off.
- **Parent settings.** Hold the blue Pokédex lens for 3 seconds to open them. Parents can set family names and heights, toggle sound effects and download everything for offline use (about 80 MB).
- **Privacy.** Family names and heights are stored only on the device (`localStorage`) and never uploaded. Voice lines refer to roles ("du", "dein Bruder"), so children's names are never sent to the speech service. There are no accounts and no tracking.
- **Language.** The voice is German. UI labels exist in German and English (`src/data/labels.ts`).
- **Tablet layout.** A compact layout fits the Amazon Kids browser (about 350 px tall in landscape). Fullscreen mode keeps clear margins where Android overlays its system bars.

## Architecture

```
PokéAPI ─────────────► pnpm data   ─► generated/data/pokemon.json        (all species, forms, evolution trees)
artwork + cries ─────► pnpm assets ─► generated/img/{art,shiny,thumb}/    (WebP, 512 px / 160 px)
                                      generated/audio/cry/                (AAC, loudness-matched)
                                      generated/data/bbox.json            (visible outline per artwork)
Gemini TTS ──────────► pnpm tts    ─► generated/audio/de/{satz,name,frag}/
                                                │
src/ ─► pnpm build ─► dist/ (app shell + service worker)
                                                ▼
                 static web server: dist/ + data/ + img/ + audio/ on one origin
```

- **Pipeline (`pipeline/`).** TypeScript scripts run with `tsx`. They fetch each PokéAPI URL only once (disk cache in `.cache/`), following PokéAPI's fair-use policy. The scripts can resume after an interruption. Their output goes to `generated/`, which is gitignored and never committed.
- **App (`src/`).** Built with Vite, React 19, TypeScript (strict), Tailwind CSS v4 and Motion. The app loads one JSON file and derives every asset path by convention (`src/data/assets.ts`). In development, Vite serves `generated/` under `/data`, `/img` and `/audio`, the same paths nginx uses in production.
- **Service worker (`vite-plugin-pwa` / Workbox).**
  - The app shell (HTML, JS, CSS, icons, font) is precached and updates automatically.
  - `pokemon.json` uses stale-while-revalidate.
  - Thumbnails, artwork, shinies and audio are cache-first.
  - On first start, the app quietly downloads a core set (thumbnails and "Das ist …!" clips, about 15 MB) once per data version. The rest comes on demand or via "Download everything" in the parent settings.
- **Why audio is fetched as whole files.** An `<audio src>` element streams with HTTP range requests, and the server answers `206 Partial Content`. The Cache API cannot store 206 responses, so audio was never available offline. Here, clips are loaded with `fetch()` as complete files (cacheable `200` responses) and played from blob URLs (`src/lib/audio.ts`).
- **Voice.** The pipeline uses Gemini TTS with the voice "Puck". It sends many lines per request and cuts the result at the pauses with ffmpeg. `pipeline/pronunciation.ts` holds respellings for names the voice gets wrong. Size comparisons are built from a name clip plus a shared phrase clip, e.g. "Glurak" + "ist größer als du!".

## Getting started

Requirements:

- Node.js 20.19+ or 22.13+
- pnpm, via Corepack: `corepack enable`
- ffmpeg and ffprobe on your `PATH`, for `pnpm assets` and `pnpm tts`
- A Google AI Studio API key, only for the voice clips

```bash
git clone https://github.com/Koschi7/pokemon-entdecker.git
cd pokemon-entdecker
pnpm install

# Generate data, images and audio into generated/ (first run takes a while)
pnpm data
pnpm assets
echo "GEMINI_API_KEY=your-key" > .env   # never commit this file
pnpm tts

pnpm dev                                 # http://localhost:5173
```

`pnpm tts` runs on the Gemini free tier. Quotas are small (roughly 10 requests per model per day), so it stops at the daily limit. Run it again later and it continues where it left off. `pnpm tts --dry-run` shows how many clips are still missing.

To check pronunciation, run `pnpm review` and open `generated/review/index.html`. The page plays all clips by generation and lets you mark wrong ones. Add fixes to `pipeline/pronunciation.ts` and run `pnpm tts` again.

## Scripts

| Script | What it does |
|---|---|
| `pnpm dev` | Start the Vite dev server (serves `generated/` assets too) |
| `pnpm build` | Type-check and build the app into `dist/` |
| `pnpm preview` | Preview the production build |
| `pnpm test` | Run unit tests (Vitest) |
| `pnpm lint` | Run ESLint |
| `pnpm typecheck` | Run `tsc --noEmit` |
| `pnpm data` | Build `generated/data/pokemon.json` from PokéAPI |
| `pnpm assets` | Download artwork and cries, convert to WebP/AAC, compute outlines |
| `pnpm tts` | Generate German voice clips with Gemini (resumable; `--batch`, `--max-requests`, `--dry-run`) |
| `pnpm review` | Build `generated/review/index.html` for checking pronunciation |

## Deployment

The app is plain static files behind nginx, with no server-side code. The app shell (`dist/`) and the generated assets (`data/`, `img/`, `audio/`) are deployed to the same directory:

- `infra/nginx-pokemon.conf` sets cache headers so updates reach the tablets.
- [`infra/DEPLOY.md`](infra/DEPLOY.md) has the rsync commands.
- The manual **Deploy** GitHub Actions workflow builds and uploads the app shell, using the secrets `DEPLOY_SSH_KEY` and `DEPLOY_HOST`.
- Generated assets are always uploaded from your own machine.

CI (`.github/workflows/ci.yml`) runs lint, type check, tests and build on every push and pull request to `main`.

## Legal

- This is a non-commercial fan project made for one family's kids. It is **not affiliated with, endorsed or sponsored by** Nintendo, Creatures Inc., GAME FREAK inc. or The Pokémon Company.
- Pokémon and Pokémon character names are trademarks of Nintendo. Pokémon artwork and cries are © Nintendo / Creatures Inc. / GAME FREAK inc. / The Pokémon Company.
- **No Pokémon assets are included in this repository.** Data comes from [PokéAPI](https://pokeapi.co), and artwork and cries come from PokéAPI's sprite and cry repositories. The pipeline downloads them to your machine at build time.
- If you run this yourself, keep it private: for your own family, not publicly indexed (the included nginx config sends `noindex`). Don't redistribute the generated assets.
- The [MIT license](LICENSE) covers only the source code in this repository. It grants no rights to Pokémon names, artwork, sounds or other Pokémon intellectual property.

## Credits

- [PokéAPI](https://pokeapi.co) for Pokémon data, plus [PokeAPI/sprites](https://github.com/PokeAPI/sprites) (official artwork) and [PokeAPI/cries](https://github.com/PokeAPI/cries) (cries).
- Type icons by James Watkins from [partywhale/pokemon-type-icons](https://github.com/partywhale/pokemon-type-icons), under the MIT License. The notice is in [`public/types/LICENSE`](public/types/LICENSE).
- [Grandstander](https://github.com/Etcetera-Type-Co/Grandstander) font by Etcetera Type Co., under the SIL Open Font License 1.1, via [Fontsource](https://fontsource.org).
- Voice clips generated with Google Gemini TTS.

## License

Source code: [MIT](LICENSE) © 2026 Oliver Kosmol. Third-party material is covered by its own license (see [Credits](#credits) and [Legal](#legal)).
