"""Druckaufträge für den HP: macht aus jedem Ausmalbild ein fertiges A4-Blatt und packt es in eine
IPP-Anfrage (generated/print/<key>.ipp). Home Assistant schickt die Datei nur noch an den Drucker.

    .venv/bin/python pipeline/printsheet.py            # nur fehlende
    .venv/bin/python pipeline/printsheet.py --force    # alle neu
    .venv/bin/python pipeline/printsheet.py 6 25       # nur diese (zusätzlich als JPEG zum Ansehen)

Das Blatt: Ausmalbild so groß wie möglich, darunter der Name in Umrissbuchstaben. Hoch- oder Querformat
nach derselben Regel wie in der App (src/data/print.ts). Querformat wird um 90° gedreht, damit der
Drucker immer ein A4-Hochformat-Bild bekommt.
"""

import io
import json
import os
import struct
import sys

from PIL import Image, ImageDraw, ImageFont

LINE = 'generated/img/line'
OUT = 'generated/print'
FONT = 'node_modules/@fontsource-variable/grandstander/files/grandstander-latin-wght-normal.woff2'
DPI = 300
MM = DPI / 25.4
PAGE_LONG, PAGE_SHORT, NAME_MM = 297 - 24, 210 - 24, 34  # wie PAGE in src/data/print.ts
MARGIN_MM = 12


def names() -> dict[str, str]:
    """Deutscher Name je Bild-Schlüssel (Pokédex-Nummer oder Form)."""
    with open('generated/data/pokemon.json', encoding='utf-8') as f:
        data = json.load(f)
    out = {}
    for p in data['pokemon']:
        out[str(p['id'])] = p['name']
        for form in p.get('forms', []) + p.get('megas', []):
            out[form['key']] = form['name']
    return out


def orientation(width: int, height: int) -> str:
    def scale(page_w: float, page_h: float) -> float:
        return min(page_w / width, (page_h - NAME_MM) / height)
    return 'landscape' if scale(PAGE_LONG, PAGE_SHORT) > scale(PAGE_SHORT, PAGE_LONG) else 'portrait'


def sheet(key: str, name: str) -> Image.Image:
    art = Image.open(f'{LINE}/{key}.png').convert('L')
    landscape = orientation(*art.size) == 'landscape'
    page_w, page_h = (297, 210) if landscape else (210, 297)
    page = Image.new('L', (round(page_w * MM), round(page_h * MM)), 255)

    # Pokémon in die Fläche über dem Namen einpassen
    box_w = (page_w - 2 * MARGIN_MM) * MM
    box_h = (page_h - 2 * MARGIN_MM - NAME_MM) * MM
    scale = min(box_w / art.width, box_h / art.height)
    art = art.resize((round(art.width * scale), round(art.height * scale)), Image.LANCZOS)
    left = (page.width - art.width) // 2
    top = round(MARGIN_MM * MM + (box_h - art.height) / 2)
    page.paste(art, (left, top))

    # Name in Umrissbuchstaben – zum Ausmalen
    font = ImageFont.truetype(FONT, round(25 * MM))  # gut 70 pt
    font.set_variation_by_axes([900])
    draw = ImageDraw.Draw(page)
    y = page.height - MARGIN_MM * MM - NAME_MM * MM / 2
    draw.text((page.width / 2, y), name, font=font, anchor='mm', fill=255, stroke_width=round(0.9 * MM), stroke_fill=0)

    return page.rotate(90, expand=True) if landscape else page


def attribute(tag: int, name: str, value: str) -> bytes:
    n, v = name.encode(), value.encode()
    return struct.pack('>BH', tag, len(n)) + n + struct.pack('>H', len(v)) + v


def ipp_print_job(jpeg: bytes, job_name: str) -> bytes:
    """IPP/1.1 Print-Job mit dem JPEG als Dokument. Der HP nimmt image/jpeg direkt an."""
    head = struct.pack('>BBHI', 1, 1, 0x0002, 1)  # Version 1.1, Print-Job, Request-ID 1
    head += b'\x01'  # operation-attributes-tag
    head += attribute(0x47, 'attributes-charset', 'utf-8')
    head += attribute(0x48, 'attributes-natural-language', 'de')
    head += attribute(0x45, 'printer-uri', 'ipp://localhost/ipp/printer')
    head += attribute(0x42, 'requesting-user-name', 'pokemon-entdecker')
    head += attribute(0x42, 'job-name', job_name)
    head += attribute(0x49, 'document-format', 'image/jpeg')
    head += b'\x02'  # job-attributes-tag
    head += attribute(0x44, 'media', 'iso_a4_210x297mm')
    head += attribute(0x44, 'print-color-mode', 'monochrome')
    head += b'\x03'  # end-of-attributes-tag
    return head + jpeg


def main() -> None:
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    force = '--force' in sys.argv
    os.makedirs(OUT, exist_ok=True)
    all_names = names()
    keys = args or sorted(f[:-4] for f in os.listdir(LINE) if f.endswith('.png'))
    todo = [k for k in keys if force or args or not os.path.exists(f'{OUT}/{k}.ipp')]
    print(f'{len(keys)} Ausmalbilder, {len(todo)} Druckaufträge zu erzeugen')
    for i, key in enumerate(todo, 1):
        page = sheet(key, all_names.get(key, ''))
        buf = io.BytesIO()
        page.save(buf, 'JPEG', quality=80, dpi=(DPI, DPI), optimize=True)
        with open(f'{OUT}/{key}.ipp', 'wb') as f:
            f.write(ipp_print_job(buf.getvalue(), f'Pokemon {key}'))
        if args:
            page.save(f'{OUT}/{key}.jpg', quality=80, dpi=(DPI, DPI))
        if i % 100 == 0 or i == len(todo):
            print(f'  {i}/{len(todo)}', flush=True)


if __name__ == '__main__':
    main()
