import type { Graphics } from "pixi.js";
import { INK } from "./manifest";

export interface Pt {
  x: number;
  y: number;
}

/** Rutnätskoordinat (och höjd z i pixlar) till skärmkoordinat. */
export type Proj = (gx: number, gy: number, z?: number) => Pt;

/** Isometrisk projektion: origo (ox, oy), halv rutbredd hw och halv rutehöjd hh. */
export const makeProj =
  (ox: number, oy: number, hw: number, hh: number): Proj =>
  (gx, gy, z = 0) => ({ x: ox + (gx - gy) * hw, y: oy + (gx + gy) * hh - z });

export function shade(color: number, f: number): number {
  const r = Math.min(255, Math.round(((color >> 16) & 255) * f));
  const g = Math.min(255, Math.round(((color >> 8) & 255) * f));
  const b = Math.min(255, Math.round((color & 255) * f));
  return (r << 16) | (g << 8) | b;
}

/** Fylld och konturerad polygon (cel-shadad look). */
export function poly(g: Graphics, pts: Pt[], fill: number, outline = true, alpha = 1): void {
  g.poly(pts.flatMap((p) => [p.x, p.y])).fill({ color: fill, alpha });
  if (outline) g.stroke({ width: 3, color: INK, join: "round" });
}

/** Ruta på golvet. */
export function tile(g: Graphics, p: Proj, gx: number, gy: number, w: number, d: number, color: number, outline = false): void {
  poly(g, [p(gx, gy), p(gx + w, gy), p(gx + w, gy + d), p(gx, gy + d)], color, outline);
}

/** Låda med tre synliga sidor. Ljus från övre vänster: vänster sida ljusare än höger. */
export function isoBox(
  g: Graphics,
  p: Proj,
  gx: number,
  gy: number,
  w: number,
  d: number,
  h: number,
  color: number,
  z0 = 0,
): void {
  const z1 = z0 + h;
  poly(g, [p(gx, gy + d, z0), p(gx + w, gy + d, z0), p(gx + w, gy + d, z1), p(gx, gy + d, z1)], shade(color, 1.0));
  poly(g, [p(gx + w, gy, z0), p(gx + w, gy + d, z0), p(gx + w, gy + d, z1), p(gx + w, gy, z1)], shade(color, 0.78));
  poly(g, [p(gx, gy, z1), p(gx + w, gy, z1), p(gx + w, gy + d, z1), p(gx, gy + d, z1)], shade(color, 1.15));
}
