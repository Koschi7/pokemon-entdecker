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

type Response = { candidates?: Array<{ content?: { parts?: Array<{ inlineData?: { data: string; mimeType?: string } }> } }> };

export async function synthesize(model: string, voice: string, text: string, wavOut: string): Promise<void> {
  const res = await fetch(`${API}/models/${model}:generateContent`, {
    method: 'POST',
    headers: { 'x-goog-api-key': apiKey(), 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text }] }],
      generationConfig: {
        responseModalities: ['AUDIO'],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } } },
      },
    }),
  });
  if (res.status === 429) throw new QuotaExceeded(await res.text());
  if (!res.ok) throw new Error(`Gemini HTTP ${res.status}: ${(await res.text()).slice(0, 500)}`);

  const part = ((await res.json()) as Response).candidates?.[0]?.content?.parts?.[0]?.inlineData;
  if (!part) throw new Error('Gemini: keine Audiodaten in der Antwort');
  const bytes = Buffer.from(part.data, 'base64');
  const mime = part.mimeType ?? '';
  if (mime.includes('wav')) {
    await writeFile(wavOut, bytes);
    return;
  }
  // rohes PCM, z. B. "audio/L16;codec=pcm;rate=24000"
  const rate = mime.match(/rate=(\d+)/)?.[1] ?? '24000';
  const pcm = `${wavOut}.pcm`;
  await writeFile(pcm, bytes);
  await run('ffmpeg', ['-y', '-loglevel', 'error', '-f', 's16le', '-ar', rate, '-ac', '1', '-i', pcm, wavOut]);
  await unlink(pcm);
}
