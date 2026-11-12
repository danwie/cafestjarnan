/**
 * Spelreglerna som rena funktioner (inga bieffekter, ingen DOM, ingen server).
 * Klienten använder dem för att spela, servern kan använda samma funktioner
 * för att kontrollera resultat.
 *
 * Mängder räknas i FJÄRDEDELAR av en portion/pizza ("Quarters"). 4 = en hel.
 * Då slipper vi flyttal: lagret kan visa 2 1/2 ost och en halv pizza drar 2.
 */
import {
  BASE_MENU_SLOTS,
  CUPCAKE_BASE_ORDERS,
  MAX_SAME_TOPPING,
  MAX_TOPPINGS_TOTAL,
  SELLERS,
  STARTER_PORTIONS,
  UPGRADES,
  getIngredient,
  unlockedIngredients,
  type Restaurant,
} from "./data";
import { pick, randInt, weightedPick, type Rng } from "./rng";

export type Quarters = number;
export type Upgrades = Readonly<Record<string, number>>;
/** Lager i fjärdedelar av en portion. */
export type Stock = Readonly<Record<string, Quarters>>;

export interface Variant {
  id: string;
  name: string;
  /** Ingrediens-id:n. Samma topping kan förekomma flera gånger. Cupcake: exakt en frosting. */
  ingredients: readonly string[];
  /** Pris för en hel pizza/cupcake i hela kronor. */
  price: number;
}

export interface OrderLine {
  variantId: string;
  qty: Quarters;
}

export const level = (u: Upgrades, id: string): number => u[id] ?? 0;

// ---------------------------------------------------------------------------
// Meny och priser
// ---------------------------------------------------------------------------

/** Referenskostnad: summan av ingrediensernas pris hos säljare 1. */
export function variantCost(r: Restaurant, ids: readonly string[]): number {
  return ids.reduce((sum, id) => sum + getIngredient(r, id).price, 0);
}

/** Antal av varje ingrediens i en variant. */
export function countIngredients(ids: readonly string[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const id of ids) counts.set(id, (counts.get(id) ?? 0) + 1);
  return counts;
}

/** Returnerar ett felmeddelande, eller null om varianten är giltig. */
export function validateVariant(r: Restaurant, ids: readonly string[]): string | null {
  let frostings = 0;
  let toppings = 0;
  for (const [id, count] of countIngredients(ids)) {
    let ingredient;
    try {
      ingredient = getIngredient(r, id);
    } catch {
      return "Okänd ingrediens.";
    }
    if (ingredient.kind === "frosting") {
      frostings += count;
    } else {
      toppings += count;
      if (count > MAX_SAME_TOPPING[r]) return `Högst ${MAX_SAME_TOPPING[r]} av samma ingrediens.`;
    }
  }
  if (r === "cupcake" && frostings !== 1) return "En cupcake måste ha exakt en frosting.";
  if (r === "pizza" && frostings !== 0) return "Pizza har ingen frosting.";
  if (toppings > MAX_TOPPINGS_TOTAL[r]) return `Högst ${MAX_TOPPINGS_TOTAL[r]} toppings totalt.`;
  return null;
}

/** Hur många fjärdedelar en beställning kan ändras i, dag för dag. */
export function qtyStep(r: Restaurant, day: number): Quarters {
  if (r === "cupcake") return 4;
  if (day >= 7) return 1; // fjärdedelar
  if (day >= 4) return 2; // halvor
  return 4; // hela
}

/** Priser måste vara delbara med detta, så att alla delar blir hela kronor. */
export function priceStep(r: Restaurant, day: number): number {
  return 4 / qtyStep(r, day);
}

export const roundUpToStep = (n: number, step: number): number => Math.ceil(n / step) * step;

/** Lägsta tillåtna pris: kostnaden + 1 kr, uppåt till närmaste tillåtna steg. */
export function minPrice(r: Restaurant, ids: readonly string[], day: number): number {
  return roundUpToStep(variantCost(r, ids) + 1, priceStep(r, day));
}

export function validatePrice(
  r: Restaurant,
  ids: readonly string[],
  price: number,
  day: number,
): string | null {
  if (!Number.isInteger(price)) return "Priset måste vara hela kronor.";
  if (price < minPrice(r, ids, day)) return "Priset måste vara högre än vad ingredienserna kostar.";
  const step = priceStep(r, day);
  if (price % step !== 0) return `Priset måste vara delbart med ${step}.`;
  return null;
}

export function menuSlots(r: Restaurant, upgrades: Upgrades): number {
  return BASE_MENU_SLOTS[r] + level(upgrades, r === "cupcake" ? "ugn" : "menyplatser");
}

export function formatQuarters(q: Quarters): string {
  const whole = Math.floor(q / 4);
  const frac = ({ 0: "", 1: "1/4", 2: "1/2", 3: "3/4" } as const)[(q % 4) as 0 | 1 | 2 | 3];
  if (whole === 0) return frac || "0";
  return frac ? `${whole} ${frac}` : String(whole);
}

// ---------------------------------------------------------------------------
// Lager
// ---------------------------------------------------------------------------

/** Så många fjärdedelar behövs av varje ingrediens för en beställning. */
export function needFor(
  lines: readonly OrderLine[],
  menu: readonly Variant[],
): Record<string, Quarters> {
  const need: Record<string, Quarters> = {};
  for (const line of lines) {
    const v = menu.find((m) => m.id === line.variantId);
    if (!v) throw new Error(`Okänd variant ${line.variantId}`);
    for (const id of v.ingredients) need[id] = (need[id] ?? 0) + line.qty;
  }
  return need;
}

/** Startlager: STARTER_PORTIONS av varje ingrediens som finns dag 1. */
export function startStock(r: Restaurant): Stock {
  const stock: Record<string, Quarters> = {};
  for (const i of unlockedIngredients(r, 1)) stock[i.id] = STARTER_PORTIONS * 4;
  return stock;
}

export function consumeStock(stock: Stock, need: Readonly<Record<string, Quarters>>): Stock {
  const next: Record<string, Quarters> = { ...stock };
  for (const [id, q] of Object.entries(need)) {
    if ((next[id] ?? 0) < q) throw new Error(`För lite ${id} i lagret`);
    next[id] = (next[id] ?? 0) - q;
  }
  return next;
}

/** Läggs tillbaka när en kund går efter att beställningen tagits emot. */
export function refundStock(stock: Stock, need: Readonly<Record<string, Quarters>>): Stock {
  const next: Record<string, Quarters> = { ...stock };
  for (const [id, q] of Object.entries(need)) next[id] = (next[id] ?? 0) + q;
  return next;
}

/** Största antal fjärdedelar som går att tillverka av varianten med detta lager. */
export function maxMakeable(v: Variant, stock: Stock): Quarters {
  let most = Infinity;
  for (const [id, count] of countIngredients(v.ingredients)) {
    most = Math.min(most, Math.floor((stock[id] ?? 0) / count));
  }
  return most;
}

export function isAvailable(v: Variant, stock: Stock, step: Quarters = 4): boolean {
  return maxMakeable(v, stock) >= step;
}

// ---------------------------------------------------------------------------
// Kunder och beställningar
// ---------------------------------------------------------------------------

export interface Customer {
  /** 1-2 favoritingredienser. Visas aldrig för spelaren. */
  favorites: readonly string[];
  /** Maxpris-faktor mellan 1,5 och 3 gånger referenskostnaden. */
  factor: number;
}

export function makeCustomer(r: Restaurant, rng: Rng, day: number): Customer {
  const pool = unlockedIngredients(r, day).map((i) => i.id);
  const count = Math.min(randInt(rng, 1, 2), pool.length);
  const favorites: string[] = [];
  while (favorites.length < count) {
    const id = pick(rng, pool);
    if (!favorites.includes(id)) favorites.push(id);
  }
  return { favorites, factor: 1.5 + rng() * 1.5 };
}

export function hasFavorite(c: Customer, ids: readonly string[]): boolean {
  return ids.some((id) => c.favorites.includes(id));
}

/** Kundens dolda maxpris för en hel variant, i hela kronor. */
export function maxPriceFor(
  r: Restaurant,
  c: Customer,
  ids: readonly string[],
  upgrades: Upgrades,
): number {
  const ref = Math.max(variantCost(r, ids), 1);
  const favoriteBonus = hasFavorite(c, ids) ? 1.25 : 1;
  const sign = r === "cupcake" ? 1 + 0.1 * level(upgrades, "skylt") : 1;
  return Math.round(ref * c.factor * favoriteBonus * sign);
}

/** Favoriter väljs tre gånger så ofta som övriga varianter. */
export function chooseVariant(rng: Rng, c: Customer, pool: readonly Variant[]): Variant {
  return weightedPick(
    rng,
    pool,
    pool.map((v) => (hasFavorite(c, v.ingredients) ? 3 : 1)),
  );
}

export type PriceReaction = "buy" | "leave" | "half";

/** För dyrt: 70 % går, 30 % stannar och köper hälften. */
export function priceReaction(rng: Rng, price: number, maxPrice: number): PriceReaction {
  if (price <= maxPrice) return "buy";
  return rng() < 0.7 ? "leave" : "half";
}

/** Hälften, nedrundat till tillåtet steg, minst ett steg. */
export function halfQty(qty: Quarters, step: Quarters): Quarters {
  return Math.max(step, Math.floor(qty / 2 / step) * step);
}

interface OrderLimits {
  maxLines: number;
  maxWholes: number;
}

/** Beställningarna växer med dagarna. */
export function orderLimits(r: Restaurant, day: number): OrderLimits {
  if (r === "cupcake") {
    return {
      maxLines: day >= 5 ? 3 : day >= 3 ? 2 : 1,
      maxWholes: day >= 4 ? 4 : day >= 2 ? 3 : 2,
    };
  }
  return {
    maxLines: day >= 7 ? 3 : day >= 4 ? 2 : 1,
    maxWholes: day >= 7 ? 4 : day >= 4 ? 3 : 2,
  };
}

/** Vilka bråkdelar (i fjärdedelar) som får förekomma en viss dag. */
export function allowedFractions(r: Restaurant, day: number): Quarters[] {
  if (r === "cupcake") return [];
  if (day >= 7) return [1, 2, 3];
  if (day >= 4) return [2];
  return [];
}

function drawQty(rng: Rng, r: Restaurant, day: number, maxWholes: number): Quarters {
  const fractions = allowedFractions(r, day);
  if (fractions.length > 0 && rng() < 0.3) {
    const wholes = randInt(rng, 0, maxWholes - 1);
    return wholes * 4 + pick(rng, fractions);
  }
  return randInt(rng, 1, maxWholes) * 4;
}

export type OrderResult =
  /** Inga varianter alls går att beställa (slut på ingredienser). */
  | { kind: "noneAvailable" }
  /** Kunden tyckte att allt var för dyrt och gick. */
  | { kind: "leftPrice" }
  | { kind: "order"; lines: OrderLine[]; hesitant: boolean };

export interface OrderContext {
  r: Restaurant;
  day: number;
  rng: Rng;
  customer: Customer;
  menu: readonly Variant[];
  stock: Stock;
  upgrades: Upgrades;
}

/**
 * Skapar en kunds beställning. Beställningen går alltid att tillverka med
 * lagret, eftersom antalet begränsas av vad som finns. Kunden ser menyn och
 * väljer bara bland varianter som är för dyra eller inte. Är något för dyrt
 * går kunden eller köper hälften (se priceReaction).
 */
export function generateOrder(ctx: OrderContext): OrderResult {
  const { r, day, rng, customer, menu, upgrades } = ctx;
  const step = qtyStep(r, day);
  const { maxLines, maxWholes } = orderLimits(r, day);
  const temp: Record<string, Quarters> = { ...ctx.stock };

  let pool = menu.filter((v) => isAvailable(v, temp, step));
  if (pool.length === 0) return { kind: "noneAvailable" };

  const wantLines = randInt(rng, 1, Math.min(maxLines, pool.length));
  const lines: OrderLine[] = [];
  const used = new Set<string>();
  let priceLeft = 0;
  let hesitant = false;

  for (let i = 0; i < wantLines; i++) {
    pool = pool.filter((v) => !used.has(v.id) && isAvailable(v, temp, step));
    if (pool.length === 0) break;
    const v = chooseVariant(rng, customer, pool);
    used.add(v.id);

    let qty = drawQty(rng, r, day, maxWholes);
    const feasible = Math.floor(maxMakeable(v, temp) / step) * step;
    qty = Math.min(qty, feasible);
    qty = Math.max(step, Math.floor(qty / step) * step);

    const reaction = priceReaction(rng, v.price, maxPriceFor(r, customer, v.ingredients, upgrades));
    if (reaction === "leave") {
      priceLeft++;
      continue;
    }
    if (reaction === "half") {
      qty = halfQty(qty, step);
      hesitant = true;
    }
    lines.push({ variantId: v.id, qty });
    for (const id of v.ingredients) temp[id] = (temp[id] ?? 0) - qty;
  }

  if (lines.length === 0) return priceLeft > 0 ? { kind: "leftPrice" } : { kind: "noneAvailable" };
  return { kind: "order", lines, hesitant };
}

/** Summan spelaren ska räkna ut. Alltid hela kronor om priserna följer priceStep. */
export function orderTotal(lines: readonly OrderLine[], menu: readonly Variant[]): number {
  let quarterKr = 0;
  for (const line of lines) {
    const v = menu.find((m) => m.id === line.variantId);
    if (!v) throw new Error(`Okänd variant ${line.variantId}`);
    quarterKr += v.price * line.qty;
  }
  if (quarterKr % 4 !== 0) throw new Error("Summan blev inte hela kronor: kontrollera priser");
  return quarterKr / 4;
}

// ---------------------------------------------------------------------------
// Cupcake
// ---------------------------------------------------------------------------

/** Antal beställningar per dag innan leveranserna startar (bil: 5 -> 6 -> 7). */
export function cupcakeOrdersPerDay(upgrades: Upgrades): number {
  return CUPCAKE_BASE_ORDERS + level(upgrades, "bil");
}

/** Dricks per nöjd kund (dricksburk: +1 / +2 kr). */
export function tipPerHappyCustomer(upgrades: Upgrades): number {
  return level(upgrades, "dricksburk");
}

/** Rutnätets sida per dag: 5, 6 eller 7. */
export function gridSize(day: number): number {
  return day >= 5 ? 7 : day >= 3 ? 6 : 5;
}

// ---------------------------------------------------------------------------
// Pizza: kö, tålamod, fart
// ---------------------------------------------------------------------------

/** Kö: 8 kunder dag 1 till 14 dag 10, +2 per skylt-nivå. */
export function queueSize(day: number, upgrades: Upgrades): number {
  return 8 + Math.round(((day - 1) * 6) / 9) + 2 * level(upgrades, "skylt");
}

/** Tålamod i sekunder: 20 s dag 1 till 11 s dag 10, +3 s per extra sort, +15 % per ugn. */
export function patienceSeconds(day: number, lineCount: number, upgrades: Upgrades): number {
  const base = 20 - (day - 1);
  const extra = 3 * Math.max(0, lineCount - 1);
  return (base + extra) * (1 + 0.15 * level(upgrades, "ugn"));
}

export interface Pace {
  /** Rätt i rad. */
  streak: number;
  /** Multiplicerar tålamodet, mellan 0,7 och 1. */
  factor: number;
}
export const INITIAL_PACE: Pace = { streak: 0, factor: 1 };

/** Var tredje rätt i rad minskar tålamodet med 5 %, lägst 70 %. */
export function paceOnCorrect(p: Pace): Pace {
  const streak = p.streak + 1;
  const factor = streak % 3 === 0 ? Math.max(0.7, p.factor - 0.05) : p.factor;
  return { streak, factor };
}

/** Ett fel nollställer serien och ger tillbaka 10 %. */
export function paceOnWrong(p: Pace): Pace {
  return { streak: 0, factor: Math.min(1, p.factor + 0.1) };
}

/** Fel summa: mätaren går dubbelt så fort. */
export const WRONG_ANSWER_DRAIN = 2;

// ---------------------------------------------------------------------------
// Marknad och inköp
// ---------------------------------------------------------------------------

export interface PackageOffer {
  sellerId: number;
  qty: number;
  price: number;
  /** Styckpris, ej avrundat. */
  unit: number;
}

/** Paketpris för en ingrediens: Ost-priset skalat med ingrediensens pris / 5. */
export function packagePrice(refPrice: number, ingredientPrice: number): number {
  return Math.max(1, Math.round((refPrice * ingredientPrice) / 5));
}

export function offersFor(r: Restaurant, day: number, ingredientId: string): PackageOffer[] {
  const ingredient = getIngredient(r, ingredientId);
  const offers: PackageOffer[] = [];
  for (const seller of SELLERS[r]) {
    if (seller.unlockDay > day) continue;
    for (const p of seller.packages) {
      const price = packagePrice(p.refPrice, ingredient.price);
      offers.push({ sellerId: seller.id, qty: p.qty, price, unit: price / p.qty });
    }
  }
  return offers;
}

export interface PurchaseFeedback {
  /** Valde spelaren lägsta styckpris? */
  best: boolean;
  /** Om best: kr sparat jämfört med dyraste styckpriset. Annars: kr man kunde ha sparat. */
  amount: number;
  /** Erbjudandet som hade varit bäst. */
  bestOffer: PackageOffer;
}

/** Feedback efter ett inköp ("Bra val! Du sparade x kr"). Jämför styckpriser. */
export function purchaseFeedback(
  r: Restaurant,
  day: number,
  ingredientId: string,
  chosen: { sellerId: number; qty: number },
): PurchaseFeedback {
  const offers = offersFor(r, day, ingredientId);
  const mine = offers.find((o) => o.sellerId === chosen.sellerId && o.qty === chosen.qty);
  if (!mine) throw new Error("Okänt paket");
  const bestOffer = offers.reduce((a, b) => (b.unit < a.unit ? b : a));
  const worst = offers.reduce((a, b) => (b.unit > a.unit ? b : a));
  if (mine.unit <= bestOffer.unit + 1e-9) {
    return { best: true, amount: Math.round((worst.unit - mine.unit) * mine.qty), bestOffer };
  }
  return { best: false, amount: Math.round((mine.unit - bestOffer.unit) * mine.qty), bestOffer };
}

// ---------------------------------------------------------------------------
// Uppgraderingar
// ---------------------------------------------------------------------------

/** Pris för nästa nivå, eller null om uppgraderingen redan är på högsta nivån. */
export function nextUpgradeCost(r: Restaurant, id: string, upgrades: Upgrades): number | null {
  const costs = UPGRADES[r][id];
  if (!costs) throw new Error(`Okänd uppgradering ${id}`);
  return costs[level(upgrades, id)] ?? null;
}
