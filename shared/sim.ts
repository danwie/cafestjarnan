/**
 * Simulator utan grafik: en enkel "bot" spelar igenom en hel omgång med samma
 * regler som spelet (rules.ts). Används för att balansera siffror i data.ts.
 *
 * Boten är medvetet enkel. Den visar ungefär vad en hygglig spelare tjänar,
 * inte vad en perfekt spelare tjänar.
 */
import {
  CUPCAKE_SPARE_CUSTOMERS,
  DAYS,
  START_CASH,
  PIZZA_SALES_SECONDS,
  getIngredient,
  unlockedIngredients,
  type Restaurant,
} from "./data";
import { mulberry32, type Rng } from "./rng";
import {
  INITIAL_PACE,
  WRONG_ANSWER_DRAIN,
  consumeStock,
  cupcakeOrdersPerDay,
  generateOrder,
  isAvailable,
  makeCustomer,
  menuSlots,
  needFor,
  nextUpgradeCost,
  offersFor,
  orderTotal,
  paceOnCorrect,
  paceOnWrong,
  patienceSeconds,
  priceStep,
  queueSize,
  refundStock,
  roundUpToStep,
  startStock,
  tipPerHappyCustomer,
  variantCost,
  type Stock,
  type Upgrades,
  type Variant,
} from "./rules";

export interface Strategy {
  name: string;
  /** Pris = kostnad × markup (avrundat uppåt till tillåtet steg). */
  markup: number;
  /** Boten fyller på varje använd ingrediens upp till så här många portioner. */
  restockPortions: number;
  buyUpgrades: boolean;
  /** Vilka uppgraderingar som köps och i vilken ordning. Standard: se UPGRADE_PRIORITY. */
  upgradeOrder?: readonly string[];
  /** Cupcake: reservkunder, standard CUPCAKE_SPARE_CUSTOMERS. */
  spareCustomers?: number;
  // Bara pizza (sekunder):
  tapSeconds: number;
  thinkBase: number;
  thinkPerLine: number;
  thinkPerFraction: number;
  errorRate: number;
}

const base: Omit<Strategy, "name"> = {
  markup: 2,
  restockPortions: 8,
  buyUpgrades: true,
  tapSeconds: 1,
  thinkBase: 3,
  thinkPerLine: 2,
  thinkPerFraction: 1.5,
  errorRate: 0.05,
};

export const STRATEGIES: Record<string, Strategy> = {
  // Snabb och duktig spelare.
  snabb: { name: "snabb", ...base },
  // Lugnare spelare som räknar långsammare och gör fler fel.
  lugn: { name: "lugn", ...base, thinkBase: 5, thinkPerLine: 3, thinkPerFraction: 2.5, errorRate: 0.12 },
  // Tar för högt pris.
  girig: { name: "girig", ...base, markup: 3 },
  // Tar för lågt pris.
  snall: { name: "snall", ...base, markup: 1.3 },
  // Köper aldrig uppgraderingar.
  utanUppgr: { name: "utanUppgr", ...base, buyUpgrades: false },
};

export interface DayResult {
  day: number;
  income: number;
  tips: number;
  purchases: number;
  upgrades: number;
  profit: number;
  served: number;
  lostPrice: number;
  /** Pizza: kunden tröttnade. */
  lostPatience: number;
  /** Pizza: minuten tog slut mitt i en beställning. */
  lostTime: number;
  /** Pizza: aldrig hunnit med. */
  unseen: number;
  /** Kunder som gick eftersom inget gick att beställa. */
  noStock: number;
}

export interface GameResult {
  restaurant: Restaurant;
  seed: number;
  strategy: string;
  days: DayResult[];
  /** Kassan vid slutet = total vinst (man börjar på 0 kr). */
  finalMoney: number;
  /** Vinst = kassan vid slutet minus startkapitalet. */
  profit: number;
  gameOver: boolean;
}

function subsets<T>(items: readonly T[], minSize: number, maxSize: number): T[][] {
  const out: T[][] = [];
  const rec = (start: number, cur: T[]): void => {
    if (cur.length >= minSize) out.push([...cur]);
    if (cur.length === maxSize) return;
    for (let i = start; i < items.length; i++) {
      cur.push(items[i] as T);
      rec(i + 1, cur);
      cur.pop();
    }
  };
  rec(0, []);
  return out;
}

/** Boten väljer varianter jämnt fördelade från billigast till dyrast. */
export function buildMenu(r: Restaurant, day: number, slots: number, markup: number): Variant[] {
  const unlocked = unlockedIngredients(r, day);
  const toppings = unlocked.filter((i) => i.kind === "topping").map((i) => i.id);
  const frostings = unlocked.filter((i) => i.kind === "frosting").map((i) => i.id);

  let cands: string[][];
  if (r === "cupcake") {
    cands = frostings.flatMap((f) => subsets(toppings, 0, 2).map((s) => [...s, f]));
  } else {
    cands = subsets(toppings, 1, 4);
  }
  cands.sort(
    (a, b) => variantCost(r, a) - variantCost(r, b) || a.join().localeCompare(b.join()),
  );

  const n = Math.min(slots, cands.length);
  const indices = new Set<number>();
  for (let i = 0; i < n; i++) {
    indices.add(n === 1 ? Math.floor((cands.length - 1) / 2) : Math.round((i * (cands.length - 1)) / (n - 1)));
  }
  const step = priceStep(r, day);
  return [...indices].map((idx, k) => {
    const ids = cands[idx] as string[];
    const cost = variantCost(r, ids);
    const price = roundUpToStep(Math.max(Math.round(cost * markup), cost + 1), step);
    return { id: `v${k}`, name: `Sort ${k + 1}`, ingredients: ids, price };
  });
}

/** Köper de billigaste paketen per styck tills lagret når målet eller pengarna tar slut. */
function restock(
  r: Restaurant,
  day: number,
  menu: readonly Variant[],
  stock: Stock,
  money: number,
  targetPortions: number,
): { stock: Stock; money: number; spent: number } {
  const next: Record<string, number> = { ...stock };
  const ids = [...new Set(menu.flatMap((v) => v.ingredients))].sort(
    (a, b) => getIngredient(r, a).price - getIngredient(r, b).price,
  );
  let spent = 0;
  for (const id of ids) {
    const have = next[id] ?? 0;
    const want = targetPortions * 4;
    if (have >= want) continue;
    let remaining = Math.ceil((want - have) / 4);
    const offers = offersFor(r, day, id);
    while (remaining > 0) {
      const fitting = offers.filter((o) => o.qty <= remaining && o.price <= money);
      const choice = fitting.length
        ? fitting.reduce((a, b) => (b.unit < a.unit ? b : a))
        : offers.filter((o) => o.price <= money).sort((a, b) => a.qty - b.qty)[0];
      if (!choice) break;
      money -= choice.price;
      spent += choice.price;
      next[id] = (next[id] ?? 0) + choice.qty * 4;
      remaining -= choice.qty;
    }
  }
  return { stock: next, money, spent };
}

const UPGRADE_PRIORITY: Record<Restaurant, readonly string[]> = {
  cupcake: ["bil", "ugn", "skylt", "dricksburk"],
  pizza: ["skylt", "ugn", "menyplatser"],
};

function emptyDay(day: number): DayResult {
  return {
    day,
    income: 0,
    tips: 0,
    purchases: 0,
    upgrades: 0,
    profit: 0,
    served: 0,
    lostPrice: 0,
    lostPatience: 0,
    lostTime: 0,
    unseen: 0,
    noStock: 0,
  };
}

interface SaleState {
  r: Restaurant;
  day: number;
  rng: Rng;
  menu: Variant[];
  stock: Stock;
  upgrades: Upgrades;
  strat: Strategy;
  result: DayResult;
}

function sellCupcake(s: SaleState): Stock {
  let stock = s.stock;
  const target = cupcakeOrdersPerDay(s.upgrades);
  let accepted = 0;
  const arrivals = target + (s.strat.spareCustomers ?? CUPCAKE_SPARE_CUSTOMERS);
  for (let customersSoFar = 0; accepted < target && customersSoFar < arrivals; customersSoFar++) {
    const customer = makeCustomer(s.r, s.rng, s.day);
    const res = generateOrder({ ...s, customer, stock });
    if (res.kind === "noneAvailable") {
      s.result.noStock++;
      break;
    }
    if (res.kind === "leftPrice") {
      s.result.lostPrice++; // kunden ersätts av en ny
      continue;
    }
    stock = consumeStock(stock, needFor(res.lines, s.menu));
    s.result.income += orderTotal(res.lines, s.menu);
    if (!res.hesitant) s.result.tips += tipPerHappyCustomer(s.upgrades);
    s.result.served++;
    accepted++;
  }
  return stock;
}

function sellPizza(s: SaleState): Stock {
  let stock = s.stock;
  let time = 0;
  let pace = INITIAL_PACE;
  const queue = queueSize(s.day, s.upgrades);
  const { strat } = s;

  for (let i = 0; i < queue; i++) {
    if (time >= PIZZA_SALES_SECONDS) {
      s.result.unseen += queue - i;
      break;
    }
    const customer = makeCustomer(s.r, s.rng, s.day);
    const res = generateOrder({ ...s, customer, stock });
    if (res.kind === "noneAvailable") {
      s.result.noStock += queue - i;
      break;
    }
    time += strat.tapSeconds;
    if (res.kind === "leftPrice") {
      s.result.lostPrice++;
      continue;
    }

    const need = needFor(res.lines, s.menu);
    stock = consumeStock(stock, need);
    const fractional = res.lines.filter((l) => l.qty % 4 !== 0).length;
    const think =
      strat.thinkBase + strat.thinkPerLine * (res.lines.length - 1) + strat.thinkPerFraction * fractional;
    const patience = patienceSeconds(s.day, res.lines.length, s.upgrades) * pace.factor;
    const remainingTime = PIZZA_SALES_SECONDS - time;

    let spent = 0;
    let served = false;
    let firstTry = true;

    if (think >= patience) {
      spent = patience;
      s.result.lostPatience++;
    } else if (s.rng() >= strat.errorRate) {
      spent = think;
      served = true;
      pace = paceOnCorrect(pace);
    } else {
      firstTry = false;
      pace = paceOnWrong(pace);
      const left = (patience - think) / WRONG_ANSWER_DRAIN;
      const retry = think * 0.6;
      if (retry >= left) {
        spent = think + left;
        s.result.lostPatience++;
      } else if (s.rng() < strat.errorRate) {
        spent = think + retry;
        s.result.lostPatience++; // andra felet: kunden går
      } else {
        spent = think + retry;
        served = true;
      }
    }

    if (served && spent > remainingTime) {
      served = false;
      spent = remainingTime;
      s.result.lostTime++;
    }
    time += spent;

    if (served) {
      s.result.income += orderTotal(res.lines, s.menu);
      if (!res.hesitant && firstTry) s.result.tips += tipPerHappyCustomer(s.upgrades);
      s.result.served++;
    } else {
      stock = refundStock(stock, need); // kunden gick: ingredienserna läggs tillbaka
    }
  }
  return stock;
}

export function simulateGame(r: Restaurant, seed: number, strat: Strategy): GameResult {
  const rng = mulberry32(seed);
  const totalDays = DAYS[r];
  let money = START_CASH[r];
  let stock: Stock = startStock(r);
  let upgrades: Upgrades = {};
  const days: DayResult[] = [];
  let gameOver = false;

  for (let day = 1; day <= totalDays; day++) {
    const result = emptyDay(day);

    // 1. Marknad: meny, inköp, uppgraderingar
    const menu = buildMenu(r, day, menuSlots(r, upgrades), strat.markup);
    const bought = restock(r, day, menu, stock, money, strat.restockPortions);
    stock = bought.stock;
    money = bought.money;
    result.purchases = bought.spent;

    if (strat.buyUpgrades && day <= totalDays - 2) {
      for (const id of strat.upgradeOrder ?? UPGRADE_PRIORITY[r]) {
        const cost = nextUpgradeCost(r, id, upgrades);
        if (cost !== null && money >= cost) {
          money -= cost;
          result.upgrades += cost;
          upgrades = { ...upgrades, [id]: (upgrades[id] ?? 0) + 1 };
        }
      }
    }

    if (menu.every((v) => !isAvailable(v, stock, 1)) && money < 1) {
      gameOver = true;
      break;
    }

    // 2. Försäljning
    const state: SaleState = { r, day, rng, menu, stock, upgrades, strat, result };
    stock = r === "cupcake" ? sellCupcake(state) : sellPizza(state);
    money += result.income + result.tips;
    result.profit = result.income + result.tips - result.purchases - result.upgrades;
    days.push(result);
  }

  return { restaurant: r, seed, strategy: strat.name, days, finalMoney: money, profit: money - START_CASH[r], gameOver };
}
