/**
 * Geometri för scenerna (ren matte, ingen grafik): isometriska koordinater,
 * vägar i staden och platser i butikerna. Ligger i shared/ så att den kan
 * enhetstestas utan webbläsare. Scenmotorn (client/src/scene) ritar efter detta.
 *
 * Scenernas "världsstorlek" är alltid 1280×720 (16:9) och skalas till skärmen.
 */

export interface Pt {
  x: number;
  y: number;
}

export const W = 1280;
export const H = 720;

/** Isometrisk 2:1-ruta. */
export const TILE = { w: 64, h: 32 } as const;

/** Rutnätskoordinat (tx,ty) till skärmen. tx ökar åt höger-ned, ty åt vänster-ned. */
export function isoToScreen(tx: number, ty: number, origin: Pt = { x: 0, y: 0 }): Pt {
  return {
    x: origin.x + ((tx - ty) * TILE.w) / 2,
    y: origin.y + ((tx + ty) * TILE.h) / 2,
  };
}

/** Mitten av ruta (i,j), där ruta (i,j) täcker [i,i+1]×[j,j+1]. */
export const tileCenter = (i: number, j: number): Pt => isoToScreen(i + 0.5, j + 0.5);

// ---------------------------------------------------------------------------
// Staden (cupcake-leverans)
//
// Staden är (2n+1)×(2n+1) rutor. Rutor där både i och j är udda är tomter med
// hus, resten är gator. Tomt (x,y) med x,y i 1..n är samma koordinater som
// spelaren får: x ökar åt höger-ned och y åt höger-upp.
// ---------------------------------------------------------------------------

export interface Node {
  a: number;
  b: number;
}

/** Rutan (i,j) som tomt (x,y) ligger på. */
export function lotToTile(x: number, y: number, n: number): Pt {
  return { x: 2 * x - 1, y: 2 * (n - y) + 1 };
}

/** Gatukorsning (a,b), a och b i 0..n, ligger på ruta (2a,2b). */
export const nodeToTile = (nd: Node): Pt => ({ x: 2 * nd.a, y: 2 * nd.b });

/** Korsningen vid tomtens hörn närmast betraktaren. Dit kör bilen. */
export const lotFrontNode = (x: number, y: number, n: number): Node => ({ a: x, b: n - y + 1 });

/** Väg längs gatorna: först i a-led, sedan i b-led. Inkluderar start och mål. */
export function roadPath(from: Node, to: Node): Node[] {
  const path: Node[] = [{ ...from }];
  let { a, b } = from;
  const stepA = Math.sign(to.a - a);
  const stepB = Math.sign(to.b - b);
  while (a !== to.a) {
    a += stepA;
    path.push({ a, b });
  }
  while (b !== to.b) {
    b += stepB;
    path.push({ a, b });
  }
  return path;
}

export function nodeNeighbors(nd: Node, n: number): Node[] {
  const all = [
    { a: nd.a + 1, b: nd.b },
    { a: nd.a - 1, b: nd.b },
    { a: nd.a, b: nd.b + 1 },
    { a: nd.a, b: nd.b - 1 },
  ];
  return all.filter((p) => p.a >= 0 && p.a <= n && p.b >= 0 && p.b <= n);
}

/** Var staden ska ligga och hur stor den ska vara, så att den alltid får plats. */
export function cityFit(n: number): { x: number; y: number; scale: number } {
  const tiles = 2 * n + 1;
  const scale = Math.min(1.6, 590 / (tiles * TILE.h + 50), 1180 / (tiles * TILE.w));
  return { x: W / 2, y: (H - tiles * TILE.h * scale) / 2 + 28 * scale, scale };
}

// ---------------------------------------------------------------------------
// Butikerna (pizzeria och café)
// ---------------------------------------------------------------------------

export type ShopKind = "pizzeria" | "cafe";

export interface ShopLayout {
  /** Utanför, där kunderna dyker upp. */
  outside: Pt;
  door: Pt;
  /** Där kunden står när hen lägger sin beställning. */
  counter: Pt;
  /** Platser i kön. Plats 0 är närmast disken. */
  queue: Pt[];
}

const QUEUE_STEP = { x: -60, y: 26 };

function queueFrom(counter: Pt, slots: number): Pt[] {
  return Array.from({ length: slots }, (_, i) => ({
    x: counter.x + QUEUE_STEP.x * (i + 1),
    y: counter.y + QUEUE_STEP.y * (i + 1),
  }));
}

export function shopLayout(kind: ShopKind): ShopLayout {
  if (kind === "pizzeria") {
    const counter = { x: 860, y: 420 };
    return { outside: { x: -80, y: 730 }, door: { x: 250, y: 616 }, counter, queue: queueFrom(counter, 8) };
  }
  const counter = { x: 860, y: 430 };
  return { outside: { x: -80, y: 700 }, door: { x: 300, y: 640 }, counter, queue: queueFrom(counter, 3) };
}
