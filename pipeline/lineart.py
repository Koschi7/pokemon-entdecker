"""Ausmalbilder: macht aus jedem Artwork schwarze Linien auf Weiß (generated/img/line/<key>.png).

    .venv/bin/python pipeline/lineart.py            # nur fehlende Bilder
    .venv/bin/python pipeline/lineart.py --force    # alle neu
    .venv/bin/python pipeline/lineart.py 6 25       # nur diese

Vorgehen: kräftiger Außenumriss aus der Transparenz, dazu Linien an den Farbgrenzen (die Schattierung
wird vorher glattgezogen, damit sie keine Linien erzeugt) und die eigenen dunklen Linien des Artworks.
Große dunkle Flächen (Evolis Ohren) werden nur umrandet, kleine (Pupillen) bleiben gefüllt.
Ergebnis: auf den Inhalt zugeschnitten, doppelte Auflösung, geglättet, 1-Bit-PNG.
"""

import multiprocessing
import os
import sys

import cv2
import numpy as np
from PIL import Image

SRC = '.cache/sources/art'
OUT = 'generated/img/line'
WORK = 1024  # Rechengröße
SCALE = 2  # Ausgabe in doppelter Auflösung (für den Druck)
MARGIN = 24  # Rand um den Inhalt (in Rechengröße)


def keep_components(binary: np.ndarray, min_area: int) -> np.ndarray:
    n, labels, stats, _ = cv2.connectedComponentsWithStats(binary, 8)
    keep = np.zeros(n, bool)
    keep[1:] = stats[1:, cv2.CC_STAT_AREA] >= min_area
    return np.where(keep[labels], 255, 0).astype(np.uint8)


def lineart(path: str) -> Image.Image:
    rgba = np.array(Image.open(path).convert('RGBA').resize((WORK, WORK), Image.LANCZOS))
    alpha = rgba[..., 3]
    a = alpha[..., None].astype(np.float32) / 255
    rgb = (rgba[..., :3].astype(np.float32) * a + 255 * (1 - a)).astype(np.uint8)

    mask = (alpha > 128).astype(np.uint8) * 255
    inside = cv2.erode(mask, np.ones((9, 9), np.uint8))
    outer = cv2.morphologyEx(mask, cv2.MORPH_GRADIENT, np.ones((7, 7), np.uint8))

    flat = cv2.pyrMeanShiftFiltering(rgb, 14, 30)
    lab = cv2.cvtColor(flat, cv2.COLOR_RGB2LAB)
    edges = np.zeros(mask.shape, np.uint8)
    for channel, (low, high) in enumerate([(45, 120), (30, 80), (30, 80)]):
        edges |= cv2.Canny(cv2.GaussianBlur(lab[..., channel], (5, 5), 0), low, high)
    edges &= inside

    lightness = cv2.cvtColor(rgb, cv2.COLOR_RGB2LAB)[..., 0]
    dark = ((lightness < 75) & (mask > 0)).astype(np.uint8) * 255
    wide = cv2.morphologyEx(dark, cv2.MORPH_OPEN, np.ones((9, 9), np.uint8))
    n, labels, stats, _ = cv2.connectedComponentsWithStats(wide, 8)
    big = np.zeros(n, bool)
    big[1:] = stats[1:, cv2.CC_STAT_AREA] > 900
    dark &= ~np.where(big[labels], 255, 0).astype(np.uint8)

    lines = keep_components(outer | cv2.dilate(edges, np.ones((3, 3), np.uint8)) | dark, 60)

    # Zuschneiden auf den Inhalt
    ys, xs = np.nonzero(lines)
    y0, y1 = max(ys.min() - MARGIN, 0), min(ys.max() + MARGIN, WORK)
    x0, x1 = max(xs.min() - MARGIN, 0), min(xs.max() + MARGIN, WORK)
    lines = lines[y0:y1, x0:x1]

    # Hochskalieren und glätten: weich zeichnen, vergrößern, wieder schwellen → runde Linien
    soft = cv2.GaussianBlur(lines, (5, 5), 0)
    big_soft = cv2.resize(soft, (lines.shape[1] * SCALE, lines.shape[0] * SCALE), interpolation=cv2.INTER_CUBIC)
    return Image.fromarray(np.where(big_soft > 110, 0, 255).astype(np.uint8)).convert('1')


def job(key: str) -> str:
    lineart(f'{SRC}/{key}.png').save(f'{OUT}/{key}.png', optimize=True)
    return key


def main() -> None:
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    force = '--force' in sys.argv
    os.makedirs(OUT, exist_ok=True)
    keys = args or sorted(f[:-4] for f in os.listdir(SRC) if f.endswith('.png'))
    todo = [k for k in keys if force or args or not os.path.exists(f'{OUT}/{k}.png')]
    print(f'{len(keys)} Artworks, {len(todo)} zu erzeugen')
    with multiprocessing.Pool(max(1, (os.cpu_count() or 2) - 1)) as pool:
        for i, _ in enumerate(pool.imap_unordered(job, todo, chunksize=4), 1):
            if i % 100 == 0 or i == len(todo):
                print(f'  {i}/{len(todo)}', flush=True)


if __name__ == '__main__':
    main()
