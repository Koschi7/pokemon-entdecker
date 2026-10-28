// Kleine Geräusche als Tipp-Feedback, komplett mit Web Audio erzeugt: keine Dateien, kein Download,
// klappt offline. Bewusst leise und weich – die gesprochenen Clips (lib/audio.ts) sollen immer klar bleiben.
// Geht etwas schief oder fehlt Web Audio, bleibt es einfach still.

const MASTER = 0.35;
const IDLE_MS = 8000; // danach schläft der AudioContext – spart Akku und CPU auf dem Fire-Tablet

type Kit = { ac: AudioContext; out: GainNode; t: number };

let enabled = true;
let unavailable = false;
let ctx: AudioContext | null = null;
let out: GainNode | null = null;
let noiseBuf: AudioBuffer | null = null;
let idleTimer: ReturnType<typeof setTimeout> | undefined;

export function setEffectsEnabled(on: boolean): void {
  enabled = on;
}

export function effectsEnabled(): boolean {
  return enabled;
}

function kit(): Kit | null {
  if (!enabled || unavailable) return null;
  try {
    if (!ctx) {
      if (typeof AudioContext === 'undefined') {
        unavailable = true;
        return null;
      }
      // Erst nach der ersten Berührung anlegen: vorher startet der Browser ihn stumm
      // und würde die Töne später zur falschen Zeit nachholen.
      if (typeof navigator !== 'undefined' && navigator.userActivation?.hasBeenActive === false) return null;
      ctx = new AudioContext();
      out = ctx.createGain();
      out.gain.value = MASTER;
      out.connect(ctx.destination);
    }
    if (ctx.state !== 'running') ctx.resume().catch(() => {});
    return { ac: ctx, out: out!, t: ctx.currentTime + 0.01 };
  } catch {
    unavailable = true;
    return null;
  }
}

function play(length: number, build: (k: Kit) => void): void {
  const k = kit();
  if (!k) return;
  try {
    build(k);
  } catch {
    // lieber still als kaputt
  }
  clearTimeout(idleTimer);
  idleTimer = setTimeout(() => {
    k.ac.suspend().catch(() => {});
  }, length * 1000 + IDLE_MS);
}

/** Weiche Hüllkurve: kurzer Anstieg, dann exponentiell ausklingen – ohne Knacken am Ende. */
function envelope({ ac, out }: Kit, t: number, dur: number, peak: number, attack: number): GainNode {
  const g = ac.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(peak, t + attack);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  g.connect(out);
  return g;
}

type ToneOpts = {
  freq: number;
  to?: number; // gleitet über die ganze Dauer dorthin
  at?: number; // Start in Sekunden ab jetzt
  dur: number;
  type?: OscillatorType;
  gain?: number;
  attack?: number;
  detune?: number; // Cent
};

function tone(k: Kit, o: ToneOpts): OscillatorNode {
  const t = k.t + (o.at ?? 0);
  const osc = k.ac.createOscillator();
  osc.type = o.type ?? 'sine';
  osc.frequency.setValueAtTime(o.freq, t);
  if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, t + o.dur);
  if (o.detune) osc.detune.value = o.detune;
  const g = envelope(k, t, o.dur, o.gain ?? 0.5, o.attack ?? 0.006);
  osc.connect(g);
  osc.start(t);
  osc.stop(t + o.dur + 0.02);
  osc.onended = () => {
    osc.disconnect();
    g.disconnect();
  };
  return osc;
}

/** Glockiger Ton: Dreieck plus leise Oktave darüber. */
function bell(k: Kit, freq: number, at: number, dur: number, gain: number): void {
  tone(k, { type: 'triangle', freq, at, dur, gain, attack: 0.004 });
  tone(k, { freq: freq * 2, at, dur: dur * 0.6, gain: gain * 0.25, attack: 0.004 });
}

type WhooshOpts = { from: number; to: number; at?: number; dur: number; q?: number; gain?: number; attack?: number };

/** Rauschen durch einen wandernden Bandpass – klingt wie ein Luftzug. */
function whoosh(k: Kit, o: WhooshOpts): void {
  const { ac } = k;
  const t = k.t + (o.at ?? 0);
  if (!noiseBuf) {
    noiseBuf = ac.createBuffer(1, Math.floor(ac.sampleRate / 2), ac.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  const src = ac.createBufferSource();
  src.buffer = noiseBuf;
  src.loop = true;
  const bp = ac.createBiquadFilter();
  bp.type = 'bandpass';
  bp.Q.value = o.q ?? 0.8;
  bp.frequency.setValueAtTime(o.from, t);
  bp.frequency.exponentialRampToValueAtTime(o.to, t + o.dur);
  const g = envelope(k, t, o.dur, o.gain ?? 1, o.attack ?? o.dur * 0.4);
  src.connect(bp).connect(g);
  src.start(t, Math.random() * 0.4); // jedes Mal ein anderer Ausschnitt
  src.stop(t + o.dur + 0.02);
  src.onended = () => {
    src.disconnect();
    bp.disconnect();
    g.disconnect();
  };
}

const vary = (f: number) => f * (0.96 + Math.random() * 0.08); // gleiche Töne nicht roboterhaft gleich

// Noten (Hz)
const C5 = 523.25, E5 = 659.25, G5 = 783.99, C6 = 1046.5, E6 = 1318.5, G6 = 1568, C7 = 2093, E7 = 2637;

export const sfx = {
  /** Weiches „Plopp“ für Knöpfe. */
  tap: () => play(0.1, (k) => {
    tone(k, { freq: vary(400), to: 780, dur: 0.08, gain: 0.8, attack: 0.004 });
  }),

  /** Karte geht auf: kleiner Hüpfer nach oben mit Luftzug. */
  open: () => play(0.22, (k) => {
    tone(k, { type: 'triangle', freq: vary(330), to: 990, dur: 0.2, gain: 0.7, attack: 0.01 });
    whoosh(k, { from: 700, to: 2600, dur: 0.18, gain: 1.5 });
  }),

  /** Karte umdrehen: Wisch-Geräusch und leises Aufsetzen. */
  flip: () => play(0.28, (k) => {
    whoosh(k, { from: 450, to: 3000, dur: 0.24, attack: 0.1, gain: 1.9, q: 0.7 });
    tone(k, { type: 'triangle', freq: 900, to: 600, at: 0.21, dur: 0.05, gain: 0.22, attack: 0.002 });
  }),

  /** Poké Ball: Wurf, Klick, dreimal Wackeln, fröhliches „Pling-Pling“ (≤ 1,2 s). */
  catchBall: () => play(1.2, (k) => {
    whoosh(k, { from: 500, to: 2600, dur: 0.22, attack: 0.08, gain: 2.2 });
    tone(k, { type: 'triangle', freq: 1500, to: 900, at: 0.24, dur: 0.035, gain: 0.6, attack: 0.002 });
    tone(k, { type: 'triangle', freq: 520, to: 300, at: 0.24, dur: 0.09, gain: 0.8, attack: 0.002 });
    [0.42, 0.6, 0.78].forEach((at, i) =>
      tone(k, { type: 'triangle', freq: vary(i === 1 ? 420 : 460), to: 360, at, dur: 0.1, gain: 0.7 - i * 0.08, attack: 0.01 }));
    bell(k, C6, 0.9, 0.14, 0.6);
    bell(k, G6, 0.98, 0.22, 0.6);
    tone(k, { freq: E6, at: 0.98, dur: 0.22, gain: 0.25 });
  }),

  /** Aus dem Team entlassen: sanft absteigend. */
  release: () => play(0.32, (k) => {
    tone(k, { freq: 880, to: 520, dur: 0.14, gain: 0.65 });
    tone(k, { freq: 660, to: 330, at: 0.1, dur: 0.2, gain: 0.55 });
    whoosh(k, { from: 2200, to: 600, dur: 0.22, gain: 0.8 });
  }),

  /** Team voll: freundliches, tiefes „Bonk-Bonk“ – kein Alarm. */
  full: () => play(0.38, (k) => {
    tone(k, { type: 'triangle', freq: 392, to: 300, dur: 0.14, gain: 0.8 });
    tone(k, { type: 'triangle', freq: 330, to: 250, at: 0.18, dur: 0.18, gain: 0.8 });
  }),

  /** Shiny: schnelles Glitzer-Arpeggio, leicht verstimmt doppelt → schimmert. */
  shiny: () => play(0.6, (k) => {
    [C6, E6, G6, C7, E7].forEach((freq, i) => {
      const at = i * 0.065;
      const gain = 0.36 - i * 0.04;
      tone(k, { freq, at, dur: 0.3, gain, detune: -8 });
      tone(k, { freq, at, dur: 0.3, gain, detune: 8 });
    });
  }),

  /** Entwicklung (passend zum 1,4-s-Leuchten): wabernd ansteigend mit Funkeln, am Ende ein heller Akkord.
   *  Der Akkord klingt bis 1,4 s weitgehend aus – dann spricht die App den neuen Namen. */
  evolve: () => play(1.75, (k) => {
    const { ac, t } = k;
    const rise = 1.15;
    // Vibrato, das schneller und tiefer wird – wie beim Leuchten
    const lfo = ac.createOscillator();
    const depth = ac.createGain();
    lfo.frequency.setValueAtTime(5, t);
    lfo.frequency.linearRampToValueAtTime(13, t + rise);
    depth.gain.setValueAtTime(0, t);
    depth.gain.linearRampToValueAtTime(60, t + rise); // Cent
    lfo.connect(depth);
    const a = tone(k, { type: 'triangle', freq: 262, to: C6, dur: rise + 0.05, gain: 0.55, attack: rise * 0.94 });
    const b = tone(k, { freq: 392, to: G6, dur: rise + 0.05, gain: 0.17, attack: rise * 0.94 });
    depth.connect(a.detune);
    depth.connect(b.detune);
    lfo.start(t);
    lfo.stop(t + rise + 0.07);
    lfo.onended = () => {
      lfo.disconnect();
      depth.disconnect();
    };
    // Funkeln
    [1568, 1760, 2093, 2349, 2637].forEach((freq, i) =>
      tone(k, { freq, at: 0.3 + i * 0.16, dur: 0.12, gain: 0.1, attack: 0.003 }));
    // heller Dur-Akkord
    bell(k, C5, rise, 0.6, 0.28);
    tone(k, { freq: E5, at: rise, dur: 0.6, gain: 0.21, attack: 0.004 });
    tone(k, { freq: G5, at: rise, dur: 0.6, gain: 0.21, attack: 0.004 });
    tone(k, { freq: C6, at: rise, dur: 0.5, gain: 0.17, attack: 0.004 });
  }),

  /** Quiz richtig: fröhlich zwei Töne nach oben. */
  correct: () => play(0.45, (k) => {
    bell(k, G5, 0, 0.16, 0.75);
    bell(k, C6, 0.11, 0.32, 0.75);
  }),

  /** Quiz falsch: weiches „Hm“ nach unten. */
  wrong: () => play(0.35, (k) => {
    tone(k, { type: 'triangle', freq: 349, to: 262, dur: 0.32, gain: 0.55, attack: 0.04 });
  }),

  /** Ein Leben (Pokéball) weg: kleines „Plopp“ beim Aufspringen, dann ein Hauch nach unten. */
  lifeLost: () => play(0.5, (k) => {
    tone(k, { type: 'triangle', freq: 700, to: 1100, dur: 0.06, gain: 0.5, attack: 0.002 });
    whoosh(k, { from: 2400, to: 500, at: 0.05, dur: 0.3, gain: 0.9 });
    tone(k, { freq: 520, to: 260, at: 0.08, dur: 0.35, gain: 0.35 });
  }),

  /** Spiel vorbei: drei freundliche Töne abwärts, kein Trauermarsch. */
  gameOver: () => play(0.9, (k) => {
    [G5, E5, C5].forEach((freq, i) => bell(k, freq, i * 0.18, 0.4, 0.5));
  }),

  /** Neuer Rekord: kurzes Funkeln nach oben. */
  newBest: () => play(0.7, (k) => {
    [C6, E6, G6, C7].forEach((freq, i) => bell(k, freq, i * 0.08, 0.35, 0.4 - i * 0.05));
  }),

  /** 100 geschafft: kleine Fanfare – Auftakt, Dur-Akkord, Glitzer obendrauf (~2 s). */
  victory: () => play(2.2, (k) => {
    bell(k, G5, 0, 0.14, 0.6);
    bell(k, G5, 0.15, 0.14, 0.6);
    bell(k, G5, 0.3, 0.14, 0.6);
    bell(k, C6, 0.46, 0.9, 0.7);
    tone(k, { type: 'triangle', freq: E5, at: 0.46, dur: 1.2, gain: 0.35, attack: 0.01 });
    tone(k, { type: 'triangle', freq: G5, at: 0.46, dur: 1.2, gain: 0.3, attack: 0.01 });
    tone(k, { type: 'triangle', freq: C5, at: 0.46, dur: 1.3, gain: 0.3, attack: 0.01 });
    [C6, E6, G6, C7, E7, G6, C7, E7].forEach((freq, i) => {
      tone(k, { freq, at: 0.7 + i * 0.09, dur: 0.25, gain: 0.16, detune: -6 });
      tone(k, { freq, at: 0.7 + i * 0.09, dur: 0.25, gain: 0.16, detune: 6 });
    });
    whoosh(k, { from: 800, to: 5000, at: 0.4, dur: 0.8, gain: 0.6 });
  }),
};
