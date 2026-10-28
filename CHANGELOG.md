# Changelog / Änderungsprotokoll

**[Deutsch](#deutsch) | [English](#english)**

---

## Deutsch

### 2026-10-28

**Spiele**
- Neuer Knopf „Spiele“ in der Leiste mit Spielauswahl
- Beide Spiele mit 3 Leben (Pokébälle), Punkten bis 100 und Rekord pro Tablet; bei 100 Siegerfeier mit Pokal, Konfetti und Fanfare
- Quiz „Wer ist das Pokémon?“: Punkt nur beim ersten Versuch, ein Fehltipp kostet einen Pokéball
- Neues Spiel „Wer ist größer?“: zwei Pokémon gleich groß gezoomt, nach dem Tipp wachsen beide auf den echten Maßstab; je höher der Punktestand, desto knapper die Größen

**Sprache**
- Alle 1.025 Pokémon und 57 Regionalformen sind jetzt vertont, dazu die Sätze für die Spiele

### 2026-10-11

**v3: Neubau als statische Offline-PWA**
- Statische Offline-PWA (Vite, React, TypeScript, Tailwind) statt FastAPI/HTMX/SQLite – auf dem Server läuft kein eigener Dienst mehr
- Neue Pipeline: alle 1.025 Pokémon plus 57 Regionalformen, vollständige Entwicklungsbäume, WebP-Bilder und Rufe
- Neue Stimme: Gemini („Puck“) mit korrekter deutscher Aussprache – das alte edge-tts schickte `en-US`, deshalb wurden die Namen englisch vorgelesen
- Pokémon-Bilder, Rufe und Sprachclips liegen nie im Repo, sie werden lokal erzeugt und separat hochgeladen

**Neue Funktionen**
- Sammelkarten zum Umdrehen
- Größen-Bühne: Pokémon und Entwicklungskette maßstabsgetreu neben der eigenen Familie, mit gesprochenen Vergleichen („… ist größer als du!“)
- Entwickeln-Animation, auch bei verzweigten Entwicklungen wie Evoli
- Shiny-Umschalter und seltene Shiny-Überraschung
- Regionalformen (Alola, Galar, Hisui, Paldea)
- „Mein Team“ mit 6 Plätzen ersetzt die unbegrenzten Favoriten
- Namen und Körpergrößen der Familie bleiben auf dem Tablet und werden nie hochgeladen
- Quiz „Wer ist das Pokémon?“: Silhouette erraten, drei Bilder zur Auswahl, Sterne für die Runde
- Sound-Effekte, direkt im Browser erzeugt (Antippen, Karte umdrehen, Poké Ball, Shiny, Entwicklung, Quiz) – abschaltbar in den Eltern-Einstellungen

**Layout**
- Kompaktes Layout für den Amazon-Kids-Browser (ca. 350 px Höhe)
- Vollbild mit freien Rändern für die Android-Systemleisten

**Behobene Fehler aus v2**
- Der Service Worker hat CSS/JS nie aktualisiert – Updates kamen nicht auf den Tablets an
- Audio wurde nie offline gecacht (HTTP-206-Range-Antworten); Clips werden jetzt als ganze Dateien geladen
- Verzweigte Entwicklungen wurden als Kette angezeigt
- Der öffentliche, ungeschützte Einstellungs-/Neuladen-Endpunkt (Reseed) ist weg

**Projekt**
- Alter v2-Code entfernt, README auf Englisch, MIT-Lizenz (nur für den Code), ESLint, GitHub Actions (CI und manueller Deploy)

### 2026-04-11

**Font Awesome Icons**
- Suche und Favoriten im Header als Icons (Lupe, Herz) statt Text — spart Platz auf kleinen Bildschirmen
- Favoriten-Herz auf Detailkarte nutzt Font Awesome statt Emoji fur konsistente Darstellung

### 2026-04-09

**Zweisprachigkeit (Deutsch + Englisch)**
- Sprache umschaltbar in den Einstellungen
- Alle UI-Texte, Pokemon-Namen, Typ-Labels und Grossenvergleiche in beiden Sprachen
- Sprachausgabe (TTS) wird fur beide Sprachen generiert
- Suche funktioniert in der aktiven Sprache

**Favoriten**
- Herz-Button auf der Detailkarte zum Markieren von Lieblings-Pokemon
- Neuer Favoriten-Tab im Header zeigt alle markierten Pokemon

**Suchfunktion**
- Neuer "Suche"-Modus im Header
- Pokemon nach Namen filtern mit Echtzeit-Ergebnissen (300ms Debounce)

**Offline & PWA**
- Service Worker cached CSS, JS, Icons, Audio und Pokemon-Bilder
- Web App Manifest fur Installation als App (Android/iOS)

**Verbesserungen**
- Seed-Button wird deaktiviert wahrend Daten geladen werden (kein Doppelklick)
- Fehlerbehandlung und Logging im Hintergrund-Task
- Datenbank-Indexes fur schnellere Filter-Abfragen
- Kompakteres Tablet-Layout fur Fire Tablet 8
- TTS Retry-Logik bei Rate-Limiting

### 2026-04-03

**Bugfixes & Verbesserungen**
- Daten neu laden läuft jetzt im Hintergrund — kein Timeout mehr auf der Einstellungsseite
- Fortschrittsbalken auf der Einstellungsseite: zeigt Phase (Pokémon laden / Audio generieren), aktuellen Stand und Abschluss
- Entwicklungsketten zeigen nur noch Pokémon aus aktiven Generationen

### 2026-03-29

**Automatische Sprachausgabe beim Neu-Laden**
- Sprachausgabe (Namen + Größenvergleiche) wird automatisch im Hintergrund generiert, wenn Eltern über die Einstellungen Daten neu laden
- Kein CLI-Zugriff mehr nötig für neue Generationen

**Größenvergleiche verbessert (Seed)**
- Größen-Audio wird jetzt immer neu generiert beim Seeden

### 2026-03-28

**TTS-Aussprache optimiert**
- Phonetische Korrekturen für deutsche Pokémon-Namen (Gen 1–9), z.B. „Krabby" → „Krabbi", „Mewtu" → „Mjutu"
- „Zentimeter" wird korrekt als „Tsentimeter" ausgesprochen
- „Papa" → „Pappa" (verhindert französische Betonung)
- Komma statt Punkt als Trenner zwischen Höhe und Vergleich

**Kindgerechte Größenvergleiche**
- 12 Größenkategorien mit Vergleichen wie „So groß wie ein Teddy!", „So groß wie du!", „So groß wie ein Haus!"
- Klickbare Größenbeschreibung mit Lautsprecher-Symbol
- Separate Display- und Sprachversionen (z.B. „1,7 m" vs. „1 Meter 70")

**Nidoran-Darstellung**
- ♀/♂-Symbole werden als „Weiblich"/„Männlich" angezeigt

**Kompaktes Mobile-Layout**
- Header und Filter-Buttons in einer kompakten, sticky Zeile
- Typ-Icons als horizontale Scroll-Leiste (nur Icons, ohne Text)
- Umschalter Farbe/Typ im Header

**Detailkarten-Fix**
- Kein Flackern mehr beim Öffnen der Detailkarte

**Typ-Icons**
- Scarlet/Violet-Style SVG-Icons von [partywhale/pokemon-type-icons](https://github.com/partywhale/pokemon-type-icons)

### 2026-03-27

**Erster Release**
- Pokémon-Daten von PokéAPI (Gen 1–9)
- Filter nach Farbe und Typ
- Detailkarten mit Artwork und Entwicklungskette
- Deutsche Sprachausgabe (Edge TTS)
- Eltern-Einstellungen mit Long-Press
- SQLite-Datenbank

---

## English

### 2026-10-28

**Games**
- New "Games" button in the rail with a game picker
- Both games have 3 lives (Poké Balls), a score up to 100 and a record per tablet; reaching 100 triggers a celebration with trophy, confetti and fanfare
- Quiz "Wer ist das Pokémon?": a point only on the first try; a wrong tap costs a Poké Ball
- New game "Wer ist größer?": two Pokémon zoomed to the same size; after the tap both grow or shrink to their real scale; the higher the score, the closer the sizes

**Voice**
- All 1,025 Pokémon and 57 regional forms are now voiced, plus the game lines

### 2026-10-11

**v3: Rebuilt as a static offline PWA**
- Static offline PWA (Vite, React, TypeScript, Tailwind) instead of FastAPI/HTMX/SQLite – no service runs on the server anymore
- New pipeline: all 1,025 Pokémon plus 57 regional forms, full evolution trees, WebP artwork and cries
- New voice: Gemini ("Puck") with correct German pronunciation – the old edge-tts setup sent `en-US`, so names were read in English
- Pokémon artwork, cries and voice clips are never in the repo; they are generated locally and uploaded separately

**New features**
- Collectible flip cards
- Size stage: the Pokémon and its evolution line to scale next to your own family, with spoken comparisons ("… ist größer als du!")
- Evolve animation, including branching evolutions such as Eevee
- Shiny toggle and a rare shiny surprise
- Regional forms (Alola, Galar, Hisui, Paldea)
- "My Team" with 6 slots replaces unlimited favorites
- Family names and heights stay on the tablet and are never uploaded
- Quiz "Who's that Pokémon?": guess the silhouette, three pictures to choose from, stars for the session
- Sound effects synthesized in the browser (tap, card flip, Poké Ball, shiny, evolution, quiz) – can be switched off in the parent settings

**Layout**
- Compact layout for the Amazon Kids browser (about 350 px tall)
- Fullscreen with reserved margins for the Android system bars

**Fixed v2 bugs**
- The service worker never updated CSS/JS – updates never reached the tablets
- Audio was never cached for offline use (HTTP 206 range responses); clips are now fetched as whole files
- Branching evolutions were shown as a chain
- The public, unauthenticated settings/reseed endpoint is gone

**Project**
- Removed the old v2 code, English README, MIT license (code only), ESLint, GitHub Actions (CI and manual deploy)

### 2026-04-11

**Font Awesome Icons**
- Search and favorites in header as icons (magnifying glass, heart) instead of text — saves space on small screens
- Favorite heart on detail card uses Font Awesome instead of emoji for consistent rendering

### 2026-04-09

**Bilingual support (German + English)**
- Language switchable in settings
- All UI text, Pokemon names, type labels, and size comparisons in both languages
- Text-to-speech (TTS) generated for both languages
- Search works in the active language

**Favorites**
- Heart button on detail card to mark favorite Pokemon
- New favorites tab in header shows all marked Pokemon

**Search**
- New "Search" mode in header
- Filter Pokemon by name with real-time results (300ms debounce)

**Offline & PWA**
- Service Worker caches CSS, JS, icons, audio, and Pokemon images
- Web App Manifest for installation as app (Android/iOS)

**Improvements**
- Seed button disabled while data is loading (prevents double-click)
- Error handling and logging in background task
- Database indexes for faster filter queries
- Compact tablet layout optimized for Fire Tablet 8
- TTS retry logic for rate limiting

### 2026-04-03

**Bugfixes & improvements**
- Re-seeding now runs in the background — no more timeout on the settings page
- Progress bar on settings page showing phase (loading Pokémon / generating audio), current progress, and completion
- Evolution chains only show Pokémon from active generations

### 2026-03-29

**Auto-generate audio on re-seed**
- TTS audio (names + size descriptions) is now automatically generated in the background when parents re-seed data via settings
- No CLI access needed for new generations

**Size audio always regenerated on seed**
- Size description audio is now force-regenerated during seeding

### 2026-03-28

**TTS pronunciation improvements**
- Phonetic overrides for German Pokémon names (Gen 1–9), e.g. "Krabby" → "Krabbi", "Mewtu" → "Mjutu"
- "Zentimeter" correctly pronounced as "Tsentimeter"
- "Papa" → "Pappa" (prevents French-sounding stress)
- Comma separator between height and comparison in spoken text

**Kid-friendly size comparisons**
- 12 size categories with comparisons like "As tall as a teddy!", "As tall as you!", "As tall as a house!"
- Clickable size description with speaker icon
- Separate display and spoken versions (e.g. "1,7 m" vs. "1 Meter 70")

**Nidoran display**
- ♀/♂ symbols shown as "Weiblich"/"Männlich"

**Compact mobile layout**
- Header and filter buttons in a compact sticky row
- Type icons as horizontal scroll bar (icons only, no text)
- Color/type mode toggle in header

**Detail card fix**
- No more flicker when opening detail cards

**Type icons**
- Scarlet/Violet-style SVG icons from [partywhale/pokemon-type-icons](https://github.com/partywhale/pokemon-type-icons)

### 2026-03-27

**Initial release**
- Pokémon data from PokéAPI (Gen 1–9)
- Filter by color and type
- Detail cards with artwork and evolution chains
- German text-to-speech (Edge TTS)
- Hidden parent settings via long-press
- SQLite database
