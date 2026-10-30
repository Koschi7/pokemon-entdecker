// Baut generated/review/index.html: alle Sprachclips nach Generation zum Durchhören.
// Falsch ausgesprochene Namen markieren (Taste F), Liste kopieren → Umschreibungen in pronunciation.ts.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import type { Pokemon } from './build-data.ts';
import { PRONUNCIATION } from './pronunciation.ts';

type Row = { id: string; gen: number; name: string; say: string | null; satz: boolean; nameClip: boolean };

async function main() {
  const { pokemon } = JSON.parse(await readFile('generated/pokemon.json', 'utf8')) as { pokemon: Pokemon[] };
  const manifest = JSON.parse(await readFile('generated/audio/de/manifest.json', 'utf8').catch(() => '{}')) as Record<string, unknown>;
  const rows: Row[] = pokemon.flatMap((p) => [
    { id: String(p.id), gen: p.generation, name: p.name.de },
    ...[...p.forms, ...p.megas].map((f) => ({ id: f.key, gen: p.generation, name: f.name.de })),
  ]).map((r) => ({
    ...r,
    say: PRONUNCIATION[r.name] ?? null,
    satz: `satz/${r.id}` in manifest,
    nameClip: `name/${r.id}` in manifest,
  }));
  const ready = rows.filter((r) => r.satz).length;

  const page = `<!doctype html>
<html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Aussprache prüfen</title>
<style>
:root { --bg:#fafaf7; --fg:#1d1d1b; --muted:#6b6b66; --line:#e4e2db; --accent:#d9412b; --card:#fff; --hl:#fff4d6; }
@media (prefers-color-scheme: dark) { :root { --bg:#161614; --fg:#ecebe6; --muted:#9a9890; --line:#2e2d29; --accent:#ff6a52; --card:#1f1e1b; --hl:#3a3220; } }
* { box-sizing:border-box }
body { margin:0; background:var(--bg); color:var(--fg); font:15px/1.4 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
header { position:sticky; top:0; z-index:2; background:var(--bg); border-bottom:1px solid var(--line); padding:12px 16px; }
header h1 { font-size:18px; margin:0 0 4px } header p { margin:0 0 8px; color:var(--muted); font-size:13px }
.bar { display:flex; flex-wrap:wrap; gap:8px; align-items:center }
button, select { font:inherit; border:1px solid var(--line); background:var(--card); color:var(--fg); border-radius:999px; padding:5px 12px; cursor:pointer }
button.primary { background:var(--accent); border-color:var(--accent); color:#fff }
main { max-width:900px; margin:0 auto; padding:8px 16px 80px }
.row { display:grid; grid-template-columns:56px 1fr auto auto auto; gap:12px; align-items:center; padding:6px 8px; border-bottom:1px solid var(--line); border-radius:8px }
.row img { width:48px; height:48px; object-fit:contain }
.row .n small { display:block; color:var(--muted); font-size:12px }
.row.current { background:var(--hl) }
.row.wrong .n { color:var(--accent); text-decoration:line-through }
.row button.mark.on { background:var(--accent); border-color:var(--accent); color:#fff }
.missing { color:var(--muted); font-size:12px }
#count { color:var(--muted); font-size:13px }
</style></head>
<body>
<header>
  <h1>Aussprache prüfen</h1>
  <p>${ready} von ${rows.length} Pokémon haben schon Audio. „▶ Durchspielen“ spielt die Generation ab. Tasten: <b>F</b> = falsch markieren · <b>Leertaste</b> = Pause · <b>→</b> = weiter.</p>
  <div class="bar">
    <select id="gen">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map((g) => `<option value="${g}">Generation ${g}</option>`).join('')}</select>
    <select id="kind"><option value="satz">„Das ist …!“</option><option value="name">nur Name</option></select>
    <button class="primary" id="play">▶ Durchspielen</button>
    <button id="copy">Falsche kopieren</button>
    <span id="count"></span>
  </div>
</header>
<main id="list"></main>
<script>
const ROWS = ${JSON.stringify(rows)};
const KEY = 'pokemon-review-wrong';
let wrong = new Set(JSON.parse(localStorage.getItem(KEY) || '[]'));
const audio = new Audio();
let queue = [], current = null, paused = false;
const $ = (s) => document.querySelector(s);

function save() { localStorage.setItem(KEY, JSON.stringify([...wrong])); $('#count').textContent = wrong.size + ' markiert'; }

function render() {
  const gen = Number($('#gen').value);
  $('#list').innerHTML = ROWS.filter((r) => r.gen === gen).map((r) => \`
    <div class="row \${wrong.has(r.name) ? 'wrong' : ''}" data-id="\${r.id}" data-name="\${r.name}">
      <img src="../img/thumb/\${r.id}.webp" alt="" loading="lazy" onerror="this.style.visibility='hidden'">
      <div class="n">\${r.name}\${r.say ? '<small>gesprochen als „' + r.say + '“</small>' : ''}</div>
      \${r.satz ? '<button data-play="satz">▶ Satz</button>' : '<span class="missing">noch kein Audio</span>'}
      \${r.nameClip ? '<button data-play="name">▶ Name</button>' : '<span></span>'}
      <button class="mark \${wrong.has(r.name) ? 'on' : ''}" data-mark>✗ falsch</button>
    </div>\`).join('');
}

function play(row, kind) {
  document.querySelectorAll('.row.current').forEach((r) => r.classList.remove('current'));
  current = row;
  row.classList.add('current');
  row.scrollIntoView({ block: 'center', behavior: 'smooth' });
  audio.src = '../audio/de/' + kind + '/' + row.dataset.id + '.m4a';
  audio.play();
}

function toggle(row) {
  const name = row.dataset.name;
  wrong.has(name) ? wrong.delete(name) : wrong.add(name);
  row.classList.toggle('wrong', wrong.has(name));
  row.querySelector('[data-mark]').classList.toggle('on', wrong.has(name));
  save();
}

audio.addEventListener('ended', () => {
  const next = queue.shift();
  if (next && !paused) setTimeout(() => play(next, $('#kind').value), 400);
});

$('#play').addEventListener('click', () => {
  const kind = $('#kind').value;
  queue = [...document.querySelectorAll('.row')].filter((r) => r.querySelector('[data-play="' + kind + '"]'));
  paused = false;
  if (queue.length) play(queue.shift(), kind);
});
$('#gen').addEventListener('change', () => { queue = []; audio.pause(); render(); });
$('#copy').addEventListener('click', async () => {
  await navigator.clipboard.writeText([...wrong].join(', '));
  $('#copy').textContent = 'Kopiert ✓';
  setTimeout(() => { $('#copy').textContent = 'Falsche kopieren'; }, 1500);
});
document.addEventListener('click', (e) => {
  const row = e.target.closest('.row');
  if (!row) return;
  if (e.target.dataset.play) { queue = []; play(row, e.target.dataset.play); }
  if (e.target.hasAttribute('data-mark')) toggle(row);
});
document.addEventListener('keydown', (e) => {
  if (e.target.tagName === 'SELECT') return;
  if (e.key === 'f' && current) toggle(current);
  if (e.key === ' ') { e.preventDefault(); paused = !paused; paused ? audio.pause() : audio.play(); }
  if (e.key === 'ArrowRight') { audio.pause(); const next = queue.shift(); if (next) play(next, $('#kind').value); }
});
render(); save();
</script>
</body></html>`;

  await mkdir('generated/review', { recursive: true });
  await writeFile('generated/review/index.html', page);
  console.log(`generated/review/index.html: ${ready}/${rows.length} mit Audio`);
}

await main();
