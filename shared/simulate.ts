/**
 * Kör simulatorn många gånger och skriver ut tabeller.
 *
 *   bun shared/simulate.ts [cupcake|pizza|both] [omgångar] [nyckel=värde ...]
 *   bun shared/simulate.ts sweep pizza 200      # vinst per prisnivå (markup)
 *   bun shared/simulate.ts upgrades pizza 200   # vad varje uppgradering ger, en i taget
 *
 * Nyckel=värde ändrar alla strategier: markup=2.5 restock=16 spare=2 think=4 error=0.1
 */
import { DAYS, UPGRADES, type Restaurant } from "./data";
import { STRATEGIES, simulateGame, type DayResult, type GameResult, type Strategy } from "./sim";

const args = process.argv.slice(2);
const mode = ["sweep", "upgrades"].includes(args[0] ?? "") ? (args.shift() as string) : "table";
const restaurants: Restaurant[] =
  !args[0] || args[0] === "both" ? ["cupcake", "pizza"] : [args[0] as Restaurant];
args.shift();
const runs = Number(args.shift() ?? 200);

const overrides: Partial<Strategy> = {};
for (const a of args) {
  const [k, v] = a.split("=");
  const n = Number(v);
  if (k === "markup") overrides.markup = n;
  else if (k === "restock") overrides.restockPortions = n;
  else if (k === "spare") overrides.spareCustomers = n;
  else if (k === "think") overrides.thinkBase = n;
  else if (k === "error") overrides.errorRate = n;
  else throw new Error(`Okänd parameter: ${a}`);
}

const avg = (xs: number[]): number => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const f = (n: number, d = 0): string => n.toFixed(d);

function play(r: Restaurant, strat: Strategy): GameResult[] {
  const games: GameResult[] = [];
  for (let seed = 1; seed <= runs; seed++) games.push(simulateGame(r, seed, { ...strat, ...overrides }));
  return games;
}

const meanProfit = (games: GameResult[]): number => avg(games.map((g) => g.profit));

for (const r of restaurants) {
  if (mode === "sweep") {
    console.log(`\n=== ${r}: total vinst per prisnivå (kostnad × markup), snabb spelare ===`);
    const base = STRATEGIES.snabb as Strategy;
    for (let m = 1.2; m <= 3.61; m += 0.2) {
      const games = play(r, { ...base, markup: Number(m.toFixed(1)) });
      const lost = avg(games.flatMap((g) => g.days.map((d) => d.lostPrice)));
      console.log(
        `markup ${m.toFixed(1)}: vinst ${f(meanProfit(games)).padStart(5)} kr   kunder som går pga pris/dag ${f(lost, 1)}`,
      );
    }
    continue;
  }

  if (mode === "upgrades") {
    console.log(`\n=== ${r}: total vinst med en uppgradering i taget (köps så snart råd finns) ===`);
    const base = { ...(STRATEGIES.snabb as Strategy) };
    console.log(`ingen            : ${f(meanProfit(play(r, { ...base, buyUpgrades: false }))).padStart(5)} kr`);
    for (const id of Object.keys(UPGRADES[r])) {
      const g = play(r, { ...base, upgradeOrder: [id] });
      const bought = avg(g.map((x) => x.days.reduce((a, d) => a + d.upgrades, 0)));
      console.log(`${id.padEnd(16)} : ${f(meanProfit(g)).padStart(5)} kr   (spenderat ${f(bought)} kr)`);
    }
    continue;
  }

  console.log(`\n=== ${r.toUpperCase()} (${DAYS[r]} dagar, ${runs} omgångar per strategi) ===`);
  for (const strat of Object.values(STRATEGIES)) {
    const games = play(r, strat);
    const finals = games.map((g) => g.profit).sort((a, b) => a - b);
    const over = games.filter((g) => g.gameOver).length;
    console.log(
      `\n[${strat.name}] total vinst: snitt ${f(avg(finals))} kr, ` +
        `min ${finals[0]}, median ${finals[Math.floor(finals.length / 2)]}, ` +
        `max ${finals[finals.length - 1]}, game over ${f((100 * over) / runs)} %`,
    );
    const cols: [string, (d: DayResult) => number][] = [
      ["intäkt", (d) => d.income + d.tips],
      ["inköp", (d) => d.purchases],
      ["uppgr", (d) => d.upgrades],
      ["vinst", (d) => d.profit],
      ["serv", (d) => d.served],
      ["dyrt", (d) => d.lostPrice],
    ];
    if (r === "pizza") {
      cols.push(
        ["tålm", (d) => d.lostPatience],
        ["tid", (d) => d.lostTime],
        ["ohunna", (d) => d.unseen],
        ["slut", (d) => d.noStock],
      );
    } else {
      cols.push(["slut", (d) => d.noStock]);
    }
    console.log(["dag", ...cols.map(([n]) => n.padStart(7))].join(" "));
    for (let day = 1; day <= DAYS[r]; day++) {
      const rows = games.map((g) => g.days.find((d) => d.day === day)).filter((d): d is DayResult => !!d);
      if (rows.length === 0) break;
      console.log(
        [String(day).padStart(3), ...cols.map(([, fn]) => f(avg(rows.map(fn)), 1).padStart(7))].join(" "),
      );
    }
  }
}
