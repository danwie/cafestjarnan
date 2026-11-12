import { describe, expect, test } from "bun:test";
import { DAYS, START_CASH, type Restaurant } from "./data";
import { menuSlots, validatePrice, validateVariant } from "./rules";
import { STRATEGIES, buildMenu, simulateGame } from "./sim";

describe("simulator", () => {
  test("samma frö ger samma resultat", () => {
    for (const r of ["cupcake", "pizza"] as const) {
      expect(simulateGame(r, 42, STRATEGIES.snabb!)).toEqual(simulateGame(r, 42, STRATEGIES.snabb!));
    }
  });

  test("kassan i slutet är startkapitalet plus summan av alla dagars vinst", () => {
    for (const r of ["cupcake", "pizza"] as const) {
      for (let seed = 1; seed <= 20; seed++) {
        const g = simulateGame(r, seed, STRATEGIES.snabb!);
        const sum = g.days.reduce((a, d) => a + d.profit, 0);
        expect(g.finalMoney).toBe(START_CASH[r] + sum);
        expect(g.profit).toBe(sum);
        expect(g.finalMoney).toBeGreaterThanOrEqual(0);
      }
    }
  });

  test("antal dagar stämmer och dag 1 går att spela med startkapitalet (tomt lager, man handlar själv)", () => {
    for (const r of ["cupcake", "pizza"] as const) {
      const g = simulateGame(r, 1, STRATEGIES.snabb!);
      expect(g.gameOver).toBe(false);
      expect(g.days).toHaveLength(DAYS[r]);
      expect(g.days[0]?.purchases).toBeGreaterThan(0);
      expect(g.days[0]?.purchases).toBeLessThanOrEqual(START_CASH[r]);
      expect(g.days[0]?.income).toBeGreaterThan(0);
    }
  });

  test("för högt pris straffas: vinsten faller när priset passerar toppen", () => {
    const avgProfit = (r: Restaurant, markup: number): number => {
      let sum = 0;
      for (let seed = 1; seed <= 80; seed++) {
        sum += simulateGame(r, seed, { ...STRATEGIES.snabb!, markup, restockPortions: r === "pizza" ? 16 : 8 }).profit;
      }
      return sum / 80;
    };
    for (const r of ["cupcake", "pizza"] as const) {
      expect(avgProfit(r, 2.6)).toBeGreaterThan(avgProfit(r, 1.4)); // för lågt pris tjänar dåligt
      expect(avgProfit(r, 2.6)).toBeGreaterThan(avgProfit(r, 3.6)); // för högt pris också
    }
  });

  test("botens meny följer spelreglerna varje dag", () => {
    for (const r of ["cupcake", "pizza"] as Restaurant[]) {
      for (let day = 1; day <= DAYS[r]; day++) {
        const menu = buildMenu(r, day, menuSlots(r, {}), 2);
        expect(menu.length).toBeGreaterThan(0);
        for (const v of menu) {
          expect(validateVariant(r, v.ingredients)).toBeNull();
          expect(validatePrice(r, v.ingredients, v.price, day)).toBeNull();
        }
      }
    }
  });
});
