import { describe, expect, test } from "bun:test";
import {
  H,
  W,
  cityFit,
  isoToScreen,
  lotFrontNode,
  lotToTile,
  nodeNeighbors,
  nodeToTile,
  roadPath,
  shopLayout,
  tileCenter,
} from "./sceneLayout";

describe("staden", () => {
  test("varje tomt (x,y) får en egen ruta med udda koordinater", () => {
    for (const n of [5, 6, 7]) {
      const seen = new Set<string>();
      for (let x = 1; x <= n; x++) {
        for (let y = 1; y <= n; y++) {
          const t = lotToTile(x, y, n);
          expect(t.x % 2).toBe(1);
          expect(t.y % 2).toBe(1);
          expect(t.x).toBeGreaterThanOrEqual(1);
          expect(t.x).toBeLessThanOrEqual(2 * n - 1);
          expect(t.y).toBeGreaterThanOrEqual(1);
          expect(t.y).toBeLessThanOrEqual(2 * n - 1);
          seen.add(`${t.x},${t.y}`);
        }
      }
      expect(seen.size).toBe(n * n);
    }
  });

  test("x ökar åt höger-ned och y åt höger-upp på skärmen", () => {
    const n = 5;
    const at = (x: number, y: number) => {
      const t = lotToTile(x, y, n);
      return tileCenter(t.x, t.y);
    };
    expect(at(2, 3).x).toBeGreaterThan(at(1, 3).x);
    expect(at(2, 3).y).toBeGreaterThan(at(1, 3).y);
    expect(at(2, 4).x).toBeGreaterThan(at(2, 3).x);
    expect(at(2, 4).y).toBeLessThan(at(2, 3).y);
  });

  test("vägen följer gatorna: ett steg i taget, start och mål stämmer", () => {
    const from = { a: 0, b: 5 };
    const to = { a: 4, b: 1 };
    const path = roadPath(from, to);
    expect(path[0]).toEqual(from);
    expect(path[path.length - 1]).toEqual(to);
    for (let i = 1; i < path.length; i++) {
      const d = Math.abs(path[i]!.a - path[i - 1]!.a) + Math.abs(path[i]!.b - path[i - 1]!.b);
      expect(d).toBe(1);
    }
    expect(roadPath(from, from)).toEqual([from]);
  });

  test("bilen stannar i ett av tomtens hörn", () => {
    const n = 6;
    for (let x = 1; x <= n; x++) {
      for (let y = 1; y <= n; y++) {
        const lot = lotToTile(x, y, n);
        const node = nodeToTile(lotFrontNode(x, y, n));
        expect(Math.abs(node.x - lot.x)).toBe(1);
        expect(Math.abs(node.y - lot.y)).toBe(1);
        // Hörnet närmast betraktaren: störst x+y.
        expect(node.x + node.y).toBeGreaterThan(lot.x + lot.y);
      }
    }
  });

  test("grannar stannar inom staden", () => {
    expect(nodeNeighbors({ a: 0, b: 0 }, 5)).toHaveLength(2);
    expect(nodeNeighbors({ a: 2, b: 3 }, 5)).toHaveLength(4);
    expect(nodeNeighbors({ a: 5, b: 5 }, 5)).toHaveLength(2);
  });

  test("hela staden ryms på skärmen för alla storlekar", () => {
    for (const n of [5, 6, 7]) {
      const fit = cityFit(n);
      const tiles = 2 * n + 1;
      const top = fit.y;
      const bottom = fit.y + tiles * 32 * fit.scale;
      const half = (tiles * 32 * fit.scale);
      expect(top).toBeGreaterThanOrEqual(0);
      expect(bottom).toBeLessThanOrEqual(H);
      expect(fit.x - half).toBeGreaterThanOrEqual(0);
      expect(fit.x + half).toBeLessThanOrEqual(W);
    }
    expect(isoToScreen(2, 0).x).toBe(64);
    expect(isoToScreen(0, 2).x).toBe(-64);
  });
});

describe("butikerna", () => {
  test("kön går från disken mot dörren, och alla platser ligger på skärmen", () => {
    for (const kind of ["pizzeria", "cafe"] as const) {
      const s = shopLayout(kind);
      expect(s.queue.length).toBeGreaterThanOrEqual(3);
      let prev = s.counter;
      for (const p of s.queue) {
        expect(p.x).toBeLessThan(prev.x);
        expect(p.y).toBeGreaterThan(prev.y);
        expect(p.x).toBeGreaterThan(0);
        expect(p.x).toBeLessThan(W);
        expect(p.y).toBeLessThan(H);
        prev = p;
      }
      expect(s.outside.x).toBeLessThan(0); // kunderna kommer utifrån
      expect(s.door.x).toBeGreaterThan(0);
    }
  });
});
