// Gemini-TTS über die Gratisstufe (AI-Studio-Key in .env). Gibt WAV-Bytes zurück.
import { execFile } from 'node:child_process';
import { writeFile, unlink } from 'node:fs/promises';
import { promisify } from 'node:util';

const run = promisify(execFile);
const API = 'https://generativelanguage.googleapis.com/v1beta';

export class QuotaExceeded extends Error {}

function apiKey(): string {
  try {
    process.loadEnvFile('.env');
  } catch {
    // keine .env – vielleicht ist die Variable gesetzt
  }
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('GEMINI_API_KEY fehlt (.env im Repo-Root)');
  return key;
}

type Response = {
  candidates?: Array<{ finishReason?: string; content?: { parts?: Array<{ inlineData?: { data: string; mimeType?: string } }> } }>;
};

/** temperature: kleiner = gleichmäßigerer Vortrag (Standard der API: 1).
 *  Gibt den finishReason zurück – "MAX_TOKENS" heißt: Die Aufnahme bricht vor dem Ende des Textes ab. */
export async function synthesize(
  model: string, voice: string, text: string, wavOut: string, options: { temperature?: number } = {},
): Promise<string | undefined> {
  const res = await fetch(`${API}/models/${model}:generateContent`, {
    method: 'POST',
    headers: { 'x-goog-api-key': apiKey(), 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text }] }],
      generationConfig: {
        ...(options.temperature !== undefined ? { temperature: options.temperature } : {}),
        responseModalities: ['AUDIO'],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } } },
      },
    }),
  });
  if (res.status === 429) throw new QuotaExceeded(await res.text());
  if (!res.ok) throw new Error(`Gemini HTTP ${res.status}: ${(await res.text()).slice(0, 500)}`);

  const candidate = ((await res.json()) as Response).candidates?.[0];
  const part = candidate?.content?.parts?.[0]?.inlineData;
  if (!part) throw new Error('Gemini: keine Audiodaten in der Antwort');
  const bytes = Buffer.from(part.data, 'base64');
  const mime = part.mimeType ?? '';
  if (mime.includes('wav')) {
    await writeFile(wavOut, bytes);
    return candidate?.finishReason;
  }
  // rohes PCM, z. B. "audio/L16;codec=pcm;rate=24000"
  const rate = mime.match(/rate=(\d+)/)?.[1] ?? '24000';
  const pcm = `${wavOut}.pcm`;
  await writeFile(pcm, bytes);
  await run('ffmpeg', ['-y', '-loglevel', 'error', '-f', 's16le', '-ar', rate, '-ac', '1', '-i', pcm, wavOut]);
  await unlink(pcm);
  return candidate?.finishReason;
}

type Interaction = {
  status?: string;
  steps?: Array<{ type: string; content?: Array<{ type: string; data?: string }> }>;
};

/** Interactions-API für längere Erzählungen: jeder Absatz trägt dieselbe Sprechweise als eigene Angabe.
 *  Die wird nicht vorgelesen, und die Stimme driftet nicht ab wie bei Regieanweisungen im Text.
 *  Im Text gehen Pausen wie "<long pause>". Ergebnis: WAV, 24 kHz mono. */
export async function narrate(
  model: string, voice: string, paragraphs: string[], style: string, wavOut: string, options: { temperature?: number } = {},
): Promise<void> {
  const res = await fetch(`${API}/interactions`, {
    method: 'POST',
    headers: { 'x-goog-api-key': apiKey(), 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      input: [{
        type: 'user_input',
        content: paragraphs.map((text) => ({ type: 'text', text, annotations: [{ type: 'speech_metadata', style }] })),
      }],
      response_format: { type: 'audio' },
      generation_config: {
        ...(options.temperature !== undefined ? { temperature: options.temperature } : {}),
        speech_config: [{ voice }],
      },
    }),
  });
  if (res.status === 429) throw new QuotaExceeded(await res.text());
  if (!res.ok) throw new Error(`Gemini HTTP ${res.status}: ${(await res.text()).slice(0, 500)}`);

  const interaction = (await res.json()) as Interaction;
  if (interaction.status !== 'completed') throw new Error(`Gemini: Aufnahme unvollständig (${interaction.status})`);
  const audio = interaction.steps?.find((s) => s.type === 'model_output')?.content?.find((c) => c.type === 'audio');
  if (!audio?.data) throw new Error('Gemini: keine Audiodaten in der Antwort');
  await writeFile(wavOut, Buffer.from(audio.data, 'base64'));
}
