/** Slumptalsgenerator med frö, så att en omgång alltid går att spela om och kontrollera. */
export type Rng = () => number;

/** mulberry32: liten, snabb och tillräckligt bra för ett spel. Ger tal i [0, 1). */
export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Heltal mellan min och max, båda inkluderade. */
export function randInt(rng: Rng, min: number, max: number): number {
  return min + Math.floor(rng() * (max - min + 1));
}

export function pick<T>(rng: Rng, items: readonly T[]): T {
  if (items.length === 0) throw new Error("pick: tom lista");
  return items[Math.floor(rng() * items.length)] as T;
}

/** Slumpar ett element där varje element har en vikt (större vikt = oftare). */
export function weightedPick<T>(rng: Rng, items: readonly T[], weights: readonly number[]): T {
  if (items.length === 0) throw new Error("weightedPick: tom lista");
  const total = weights.reduce((a, b) => a + b, 0);
  let x = rng() * total;
  for (let i = 0; i < items.length; i++) {
    x -= weights[i] as number;
    if (x < 0) return items[i] as T;
  }
  return items[items.length - 1] as T;
}
