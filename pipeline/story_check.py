"""Prüft die vertonten Kapitel einer Geschichte (aufgerufen von pipeline/story.ts).

    .venv/bin/python pipeline/story_check.py <geschichte.md> <ordner mit 01.mp3, 02.mp3, …>

Je Kapitel: Spracherkennung (faster-whisper, lokal) gegen den Text – fehlt etwas? –, Sprechtempo und Tonhöhe am
Anfang und am Ende. Steigt die Tonhöhe zum Ende deutlich, ist die Stimme aufgedreht; über 148 Wörter pro Minute
ist es zu schnell für ruhiges Zuhören. Dann das Kapitel neu vertonen (pnpm story <datei> --chapter N).
Die Transkripte landen als NN.txt neben den MP3s.
"""

import difflib
import os
import re
import subprocess
import sys

import numpy as np
from faster_whisper import WhisperModel

SR = 16000
NUMBERS = ['eins', 'zwei', 'drei', 'vier', 'fünf', 'sechs', 'sieben', 'acht', 'neun', 'zehn']


def fold(text: str) -> list[str]:
    return re.sub(r'[^a-zäöüß ]', ' ', text.lower()).split()


def chapters(markdown: str) -> list[str]:
    blocks = re.split(r'^## ', markdown, flags=re.M)[1:]
    return [re.sub(r'Kapitel (\d+)', lambda m: 'Kapitel ' + NUMBERS[int(m[1]) - 1], b) for b in blocks]


def pitch(audio: np.ndarray, start: float, end: float) -> float:
    """Median-Grundfrequenz (Autokorrelation) der stimmhaften 40-ms-Fenster zwischen start und end"""
    win, found = int(0.04 * SR), []
    for i in range(int(start * SR), min(len(audio), int(end * SR)) - win, win // 2):
        frame = audio[i:i + win] - audio[i:i + win].mean()
        if np.sqrt((frame ** 2).mean()) < 0.01:
            continue
        ac = np.correlate(frame, frame, 'full')[win - 1:]
        lag = SR // 400 + int(np.argmax(ac[SR // 400:SR // 70]))
        if ac[lag] > 0.35 * ac[0]:
            found.append(SR / lag)
    return float(np.median(found)) if found else 0.0


def main() -> None:
    md, folder = sys.argv[1], sys.argv[2]
    texts = chapters(open(md).read())
    model = WhisperModel('small', device='cpu', compute_type='int8')
    print('  Kapitel  Dauer  Text   Tempo    Tonhöhe Anfang → Ende')
    for n, text in enumerate(texts, 1):
        mp3 = f'{folder}/{n:02d}.mp3'
        if not os.path.exists(mp3):
            print(f'  {n:02d}       fehlt noch')
            continue
        # vad_filter: sonst "hört" Whisper in der Stille am Kapitelende manchmal Wörter
        segments, info = model.transcribe(mp3, language='de', beam_size=5, word_timestamps=True,
                                          condition_on_previous_text=False, vad_filter=True)
        words = [w for s in segments for w in s.words]
        heard = ''.join(w.word for w in words).strip()
        with open(f'{folder}/{n:02d}.txt', 'w') as f:
            f.write(heard + '\n')
        match = difflib.SequenceMatcher(a=fold(text), b=fold(heard), autojunk=False).ratio()
        speech = words[-1].end - words[0].start
        raw = subprocess.run(['ffmpeg', '-loglevel', 'error', '-i', mp3, '-ac', '1', '-ar', str(SR), '-f', 's16le', '-'],
                             capture_output=True, check=True).stdout
        audio = np.frombuffer(raw, np.int16).astype(np.float32) / 32768
        first = pitch(audio, words[0].start, words[0].start + 60)
        last = pitch(audio, words[-1].end - 30, words[-1].end)
        notes = []
        if match < 0.85:
            notes.append('Text fehlt? anhören')
        if last > first * 1.12:
            notes.append('dreht am Ende auf – neu vertonen')
        pace = len(words) / speech * 60
        if pace > 148:
            notes.append('zu schnell')
        print(f'  {n:02d}    {info.duration / 60:4.1f} min  {match:4.0%}  {pace:3.0f} W/min  '
              f'{first:3.0f} → {last:3.0f} Hz  {"  ".join(notes)}')


if __name__ == '__main__':
    main()
