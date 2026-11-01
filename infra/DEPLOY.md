# Deployment (Flavor A: statisch, host-nginx)

Die App ist eine statische PWA. Es läuft kein eigener Dienst auf dem Server.

| Was | Woher | Wohin |
|---|---|---|
| App (HTML/JS/CSS, Service Worker) | `pnpm build` → `dist/` | `/var/www/pokemon-entdecker/` |
| Daten, Bilder, Audio | `pnpm data && pnpm assets && pnpm tts` → `generated/` | `/var/www/pokemon-entdecker/{data,img,audio}/` |

Pokémon-Artwork, Rufe und Sprachclips gehören Nintendo/The Pokémon Company bzw. werden erzeugt –
sie liegen nie im Repo, sondern werden lokal gebaut und separat hochgeladen.

## App aktualisieren

```bash
pnpm build
rsync -az --delete --exclude data/ --exclude img/ --exclude audio/ --exclude print/ dist/ root@49.12.43.239:/var/www/pokemon-entdecker/
ssh root@49.12.43.239 'chown -R www-data:www-data /var/www/pokemon-entdecker'
```

### Alternativ per GitHub Actions

Der Workflow **Deploy** (`.github/workflows/deploy.yml`, nur manuell: *Actions → Deploy → Run workflow*)
baut die App und macht genau dasselbe: `rsync` von `dist/` nach `/var/www/pokemon-entdecker/` ohne
`data/`, `img/`, `audio/` und `print/`, danach `chown -R www-data:www-data`. Daten, Bilder, Audio und
Druckaufträge lädt er nie hoch – und dank der Ausnahmen löscht `--delete` sie auch nicht.

Benötigte Secrets – muss der Owner einmalig unter *Settings → Secrets and variables → Actions* im
GitHub-Repo anlegen:

| Secret | Inhalt |
|---|---|
| `DEPLOY_SSH_KEY` | privater SSH-Schlüssel (eigenes Schlüsselpaar nur für den Deploy; öffentlicher Teil in `~/.ssh/authorized_keys` auf dem Server) |
| `DEPLOY_HOST` | `user@host`, z. B. `root@49.12.43.239` |

Der Host-Schlüssel wird beim Lauf per `ssh-keyscan` geholt. Strenger wäre ein fest hinterlegter
`known_hosts`-Eintrag und ein eingeschränkter Deploy-Benutzer statt `root`.

Der Workflow **CI** (`.github/workflows/ci.yml`) läuft bei jedem Push und Pull Request auf `main`:
`pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`.

## Assets aktualisieren (nur wenn sich Daten, Bilder oder Stimme ändern)

```bash
rsync -az --delete generated/data generated/img root@49.12.43.239:/var/www/pokemon-entdecker/
rsync -az --delete --exclude '*.json' --exclude '*.log' generated/audio root@49.12.43.239:/var/www/pokemon-entdecker/
ssh root@49.12.43.239 'chown -R www-data:www-data /var/www/pokemon-entdecker'
```

## nginx (einmalig bzw. bei Änderungen)

```bash
scp infra/nginx-pokemon.conf root@49.12.43.239:/etc/nginx/sites-available/pokemon
ssh root@49.12.43.239 'nginx -t && systemctl reload nginx'
```

TLS-Zertifikat: bestehendes certbot-Zertifikat `pokemon.familie-kosmol.de` (Auto-Renewal).

## Sprachclips (Gemini-Gratisstufe)

`GEMINI_API_KEY` in `.env` (nie committen). Das Kontingent liegt bei etwa 10 Anfragen pro Tag und Modell
und setzt sich um 09:00 Uhr deutscher Zeit zurück. `pnpm tts` macht dort weiter, wo es aufgehört hat.

## Zurückrollen auf v2 (FastAPI)

Die alte App liegt archiviert unter `/var/backups/decommissioned/pokemon-farbsortierer-2026-10-10.tar.gz`,
die alte nginx-Konfiguration unter `/var/backups/nginx-pokemon-2026-10-10.conf`.

## Drucken vom Kinder-Tablet

Der Kinder-Browser kann nicht drucken (`window.print()` tut in der Android-WebView nichts). Deshalb:

1. **Druckaufträge erzeugen und hochladen** (nach neuen Ausmalbildern):
   ```bash
   pnpm lineart && pnpm printsheets
   rsync -az generated/print root@49.12.43.239:/var/www/pokemon-entdecker/
   ssh root@49.12.43.239 'chown -R www-data:www-data /var/www/pokemon-entdecker/print'
   ```
2. **nginx** (einmalig): `infra/nginx-pokemon.conf` bindet `/etc/nginx/snippets/pokemon-print*.conf` ein.
   Die echte Datei nach `infra/nginx-pokemon-print.conf.example` anlegen (Druck-Code, HA-Hostname,
   Webhook-ID eintragen, `chmod 600`), dazu `/etc/nginx/conf.d/pokemon-print-zone.conf` mit
   `limit_req_zone $binary_remote_addr zone=pokemon_print:1m rate=6r/m;`. Dann `nginx -t && systemctl reload nginx`.
3. **Home Assistant** (einmalig): `shell_command`, Zähler und Automation nach `infra/ha-pokemon-print.yaml`.
4. **Tablets**: In den Eltern-Einstellungen den Druck-Code eintragen.

Schutz: Ohne gültigen Code antwortet nginx mit 403. HA druckt höchstens 10 Blätter am Tag zwischen 7 und
19 Uhr, die App sperrt den Knopf nach einem Druck 20 Sekunden lang.
