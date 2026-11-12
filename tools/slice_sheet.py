#!/usr/bin/env python3
"""Skär ut enskilda bilder ur ett ark som bild-AI:n gjort (flera bilder på ett ark, platt bakgrund).

Användning:
  python3 tools/slice_sheet.py ark.png --cols 3 --rows 3 --names rav_vantar,rav_pratar,... --out client/public/art/kunder [--size 512] [--key FF00FF]

- Bakgrunden (standard magenta #FF00FF) görs genomskinlig, med mjuk kant och utan färgkant.
- Bilderna hittas som separata figurer (inte med exakt rutnät), så att AI:ns ojämna rutnät inte spelar roll.
  Det krävs bara att figurerna inte rör vid varandra. Antalet måste stämma med --cols x --rows, annars avbryts det.
- Ordningen är rad för rad, uppifrån och ned, vänster till höger. --names ger filnamn i samma ordning.
- --size gör att längsta sidan blir så många bildpunkter (valfritt). --pad är marginal runt varje bild.
Kräver Pillow, numpy och scipy.
"""
import argparse
import os
import sys

import numpy as np
from PIL import Image
from scipy import ndimage


def key_out(img: Image.Image, key: tuple[int, int, int], tol: float, soft: float) -> Image.Image:
    a = np.asarray(img.convert("RGB")).astype(np.float32)
    k = np.array(key, dtype=np.float32)
    d = np.sqrt(((a - k) ** 2).sum(axis=2))
    alpha = np.clip((d - tol) / soft, 0, 1)
    rgb = a.copy()
    # ta bort färgkant: där bilden delvis är bakgrund, dra färgen bort från nyckelfärgen
    edge = (alpha > 0) & (alpha < 1)
    if edge.any():
        al = alpha[edge][:, None]
        rgb[edge] = np.clip((rgb[edge] - (1 - al) * k) / np.maximum(al, 1e-3), 0, 255)
    out = np.dstack([rgb, alpha * 255]).astype(np.uint8)
    return Image.fromarray(out, "RGBA")


def find_blobs(alpha: np.ndarray, grow: int, min_area: int, want: int) -> list[tuple[int, int, int, int]]:
    """Hittar figurer. De `want` största blir kärnor; lösa småbitar (strössel, öron, hjärtan) hör till närmaste kärna."""
    solid = alpha > 40
    merged = ndimage.binary_dilation(solid, iterations=grow)
    labels, _ = ndimage.label(merged)
    blobs = []
    for i, sl in enumerate(ndimage.find_objects(labels), start=1):
        if sl is None:
            continue
        mask = solid[sl] & (labels[sl] == i)
        area = int(mask.sum())
        if area < min_area:
            continue
        yy, xx = np.nonzero(mask)
        blobs.append({"area": area, "box": [sl[1].start + xx.min(), sl[0].start + yy.min(), sl[1].start + xx.max() + 1, sl[0].start + yy.max() + 1]})
    if len(blobs) < want:
        return [bl["box"] for bl in blobs]
    blobs.sort(key=lambda bl: -bl["area"])
    cores, rest = blobs[:want], blobs[want:]

    def centre(bx):
        return ((bx[0] + bx[2]) / 2, (bx[1] + bx[3]) / 2)

    for bl in rest:
        cx, cy = centre(bl["box"])
        core = min(cores, key=lambda c: (centre(c["box"])[0] - cx) ** 2 + (centre(c["box"])[1] - cy) ** 2)
        bx = core["box"]
        core["box"] = [min(bx[0], bl["box"][0]), min(bx[1], bl["box"][1]), max(bx[2], bl["box"][2]), max(bx[3], bl["box"][3])]
    areas = sorted(c["area"] for c in cores)
    if areas[0] < 0.2 * areas[len(areas) // 2]:
        print("VARNING: en av figurerna är mycket mindre än de andra. Kanske är rutnätet fel (--cols/--rows) eller så är en figur delad.", file=sys.stderr)
    return [tuple(c["box"]) for c in cores]


def order_boxes(boxes, rows: int, cols: int):
    """Rad för rad: sortera på mittens y, dela i rader, sortera varje rad på x."""
    boxes = sorted(boxes, key=lambda b: (b[1] + b[3]) / 2)
    per = len(boxes) // rows
    ordered = []
    for r in range(rows):
        row = boxes[r * per:(r + 1) * per]
        ordered += sorted(row, key=lambda b: (b[0] + b[2]) / 2)
    return ordered


def main() -> int:
    p = argparse.ArgumentParser()
    p.add_argument("sheet")
    p.add_argument("--cols", type=int, required=True)
    p.add_argument("--rows", type=int, required=True)
    p.add_argument("--names", required=True)
    p.add_argument("--out", required=True)
    p.add_argument("--key", default="FF00FF")
    p.add_argument("--tol", type=float, default=90)
    p.add_argument("--soft", type=float, default=60)
    p.add_argument("--grow", type=int, default=6, help="slår ihop delar av samma figur som ligger nära (bildpunkter)")
    p.add_argument("--pad", type=int, default=8)
    p.add_argument("--size", type=int, default=0)
    p.add_argument("--min-area", type=int, default=400)
    a = p.parse_args()

    names = [n.strip() for n in a.names.split(",") if n.strip()]
    want = a.cols * a.rows
    if len(names) != want:
        print(f"FEL: {len(names)} namn men rutnätet har {want} rutor.")
        return 2
    key = tuple(int(a.key[i:i + 2], 16) for i in (0, 2, 4))
    img = key_out(Image.open(a.sheet), key, a.tol, a.soft)
    alpha = np.asarray(img)[:, :, 3]
    boxes = find_blobs(alpha, a.grow, a.min_area, want)
    if len(boxes) != want:
        print(f"FEL: hittade {len(boxes)} figurer men väntade {want}. Rör figurerna vid varandra, eller är det fler/färre figurer än väntat? Justera --min-area.")
        return 3
    os.makedirs(a.out, exist_ok=True)
    for name, (x0, y0, x1, y1) in zip(names, order_boxes(boxes, a.rows, a.cols)):
        crop = img.crop((max(0, x0 - a.pad), max(0, y0 - a.pad), min(img.width, x1 + a.pad), min(img.height, y1 + a.pad)))
        if a.size:
            s = a.size / max(crop.size)
            crop = crop.resize((max(1, round(crop.width * s)), max(1, round(crop.height * s))), Image.LANCZOS)
        path = os.path.join(a.out, f"{name}.png")
        crop.save(path)
        print(path, crop.size)
    return 0


if __name__ == "__main__":
    sys.exit(main())
