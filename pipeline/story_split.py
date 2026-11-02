"""Teilt eine am Stück vertonte Geschichte in Tonie-Kapitel (aufgerufen von pipeline/story.ts).

    .venv/bin/python pipeline/story_split.py <ganze-geschichte.wav> <zielordner> <kapitelzahl> "<Titel>"

Gemini liest die Sprechanweisung am Anfang mit vor. Eine Spracherkennung (faster-whisper, lokal) liefert
Zeitstempel für jedes Wort: Die Geschichte beginnt beim Titel direkt vor dem ersten "Kapitel", jedes
weitere Kapitel beim nächsten "Kapitel". Lautstärke wird für die ganze Geschichte gemeinsam angeglichen,
damit alle Kapitel gleich laut sind. Ergebnis: 01.mp3, 02.mp3, … im Zielordner, dazu transkript.txt
(was die Spracherkennung gehört hat – zum Abgleich mit dem Text).
"""

import re
import subprocess
import sys

from faster_whisper import WhisperModel


def fold(word: str) -> str:
    return re.sub(r'[^a-zäöüß]', '', word.lower())


def main() -> None:
    wav, out_dir, count, title = sys.argv[1], sys.argv[2], int(sys.argv[3]), sys.argv[4]
    model = WhisperModel('small', device='cpu', compute_type='int8')
    segments, info = model.transcribe(wav, language='de', beam_size=3, word_timestamps=True,
                                      condition_on_previous_text=False)
    heard = [w for s in segments for w in s.words]
    words = [(fold(w.word), w.start) for w in heard]
    with open(f'{out_dir}/transkript.txt', 'w') as f:
        f.write(''.join(w.word for w in heard).strip() + '\n')

    chapters = [i for i, (w, _) in enumerate(words) if w.startswith('kapitel')]
    if len(chapters) != count:
        sys.exit(f'{len(chapters)} mal "Kapitel" gehört, erwartet {count} – Aufnahme bitte anhören')

    # Titel kurz vor dem ersten "Kapitel" suchen; alles davor ist die mitgelesene Anweisung
    start = chapters[0]
    first = fold(title.split()[0])
    for j in range(chapters[0] - 1, max(-1, chapters[0] - 15), -1):
        if words[j][0] == first:
            start = j
            break
    cuts = [max(0.0, words[i][1] - 0.35) for i in [start, *chapters[1:]]] + [info.duration]

    normalized = f'{wav}.norm.wav'
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-ss', f'{cuts[0]:.2f}', '-i', wav,
                    '-af', 'loudnorm=I=-21:TP=-2:LRA=11', normalized], check=True)
    for n in range(count):
        a, b = cuts[n] - cuts[0], cuts[n + 1] - cuts[0]
        subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-ss', f'{a:.2f}', '-to', f'{b:.2f}', '-i', normalized,
                        '-af', 'adelay=1000:all=1,apad=pad_dur=2', '-ac', '1', '-ar', '44100',
                        '-c:a', 'libmp3lame', '-b:a', '112k', f'{out_dir}/{n + 1:02d}.mp3'], check=True)
        print(f'  {n + 1:02d}.mp3  {(b - a) / 60:.1f} min')
    print(f'  Anweisung bis {cuts[0]:.1f} s abgeschnitten')
    print(f'  Ende: …{"".join(w.word for w in heard[-8:])}')


if __name__ == '__main__':
    main()
