import { describe, expect, test } from "bun:test";
import { DAYS, INGREDIENTS, PIZZA_SELLERS, getIngredient, unlockedIngredients } from "./data";
import { mulberry32 } from "./rng";
import {
  INITIAL_PACE,
  allowedFractions,
  consumeStock,
  formatQuarters,
  generateOrder,
  gridSize,
  halfQty,
  makeCustomer,
  maxMakeable,
  maxPriceFor,
  menuSlots,
  minPrice,
  needFor,
  nextUpgradeCost,
  offersFor,
  orderTotal,
  packagePrice,
  paceOnCorrect,
  paceOnWrong,
  patienceSeconds,
  priceReaction,
  priceStep,
  purchaseFeedback,
  qtyStep,
  queueSize,
  refundStock,
  validatePrice,
  validateVariant,
  variantCost,
  type Stock,
  type Variant,
} from "./rules";

const fullStock = (r: "cupcake" | "pizza", portions = 50): Stock =>
  Object.fromEntries(INGREDIENTS[r].map((i) => [i.id, portions * 4]));

describe("data", () => {
  test("nya sorter dyker upp enligt planen", () => {
    expect(unlockedIngredients("cupcake", 1).filter((i) => i.kind === "topping")).toHaveLength(3);
    expect(unlockedIngredients("cupcake", 5).filter((i) => i.kind === "topping")).toHaveLength(6);
    expect(unlockedIngredients("pizza", 1)).toHaveLength(4);
    expect(unlockedIngredients("pizza", 10)).toHaveLength(8);
  });

  test("Ost-paketen är exakt de i regelverket", () => {
    const ost = (day: number) =>
      offersFor("pizza", day, "ost").map((o) => `${o.sellerId}:${o.qty}:${o.price}`);
    expect(ost(10)).toEqual([
      "1:1:5", "1:5:20", "1:10:35",
      "2:3:12", "2:6:21", "2:12:40",
      "3:2:9", "3:8:28", "3:20:55",
    ]);
  });

  test("säljare 2 kommer dag 3 och säljare 3 dag 6", () => {
    const sellers = (day: number) => [...new Set(offersFor("pizza", day, "ost").map((o) => o.sellerId))];
    expect(sellers(2)).toEqual([1]);
    expect(sellers(3)).toEqual([1, 2]);
    expect(sellers(6)).toEqual([1, 2, 3]);
    expect(PIZZA_SELLERS).toHaveLength(3);
  });

  test("säljare 1 styckpris är ingrediensens pris (referenskostnaden)", () => {
    for (const i of INGREDIENTS.pizza) {
      const single = offersFor("pizza", 10, i.id).find((o) => o.sellerId === 1 && o.qty === 1);
      expect(single?.price).toBe(i.price);
    }
    expect(packagePrice(20, 3)).toBe(12);
  });

  test("cupcake har en säljare utan mängdrabatt", () => {
    for (const i of INGREDIENTS.cupcake) {
      const offers = offersFor("cupcake", 5, i.id);
      expect(offers).toHaveLength(1);
      expect(offers[0]?.price).toBe(i.price);
    }
  });
});

describe("meny och priser", () => {
  test("cupcake måste ha exakt en frosting", () => {
    expect(validateVariant("cupcake", ["strossel"])).not.toBeNull();
    expect(validateVariant("cupcake", ["vanilj", "choklad"])).not.toBeNull();
    expect(validateVariant("cupcake", ["strossel", "vanilj"])).toBeNull();
    expect(validateVariant("cupcake", ["vanilj"])).toBeNull();
  });

  test("pizza har ingen frosting, och okända ingredienser avvisas", () => {
    expect(validateVariant("pizza", ["tomat", "ost"])).toBeNull();
    expect(validateVariant("pizza", ["finnsinte"])).not.toBeNull();
    expect(validateVariant("pizza", ["vanilj"])).not.toBeNull();
  });

  test("flera av samma ingrediens är tillåtet, upp till gränserna", () => {
    expect(validateVariant("pizza", ["ost", "ost", "ost", "ost"])).toBeNull();
    expect(validateVariant("pizza", ["ost", "ost", "ost", "ost", "ost"])).not.toBeNull(); // högst 4 av samma
    const eleven = ["tomat", "tomat", "tomat", "ost", "ost", "ost", "skinka", "skinka", "skinka", "svamp", "svamp"];
    expect(validateVariant("pizza", eleven)).not.toBeNull(); // högst 10 totalt
    expect(validateVariant("cupcake", ["strossel", "strossel", "vanilj"])).toBeNull();
    expect(validateVariant("cupcake", ["strossel", "vanilj", "choklad"])).not.toBeNull(); // exakt en frosting
    expect(variantCost("pizza", ["ost", "ost", "tomat"])).toBe(13);
  });

  test("lagret räknar flera av samma ingrediens", () => {
    const v: Variant = { id: "a", name: "a", ingredients: ["ost", "ost", "tomat"], price: 30 };
    expect(maxMakeable(v, { ost: 8, tomat: 100 })).toBe(4);
    expect(needFor([{ variantId: "a", qty: 4 }], [v])).toEqual({ ost: 8, tomat: 4 });
  });

  test("kostnad är summan av ingrediensernas pris", () => {
    expect(variantCost("pizza", ["tomat", "ost", "skinka"])).toBe(14);
    expect(variantCost("cupcake", ["jordgubbe", "choklad"])).toBe(4);
  });

  test("priset måste vara högre än kostnaden", () => {
    expect(validatePrice("pizza", ["tomat", "ost"], 8, 1)).not.toBeNull();
    expect(validatePrice("pizza", ["tomat", "ost"], 9, 1)).toBeNull();
    expect(validatePrice("pizza", ["tomat", "ost"], 8.5, 1)).not.toBeNull();
  });

  test("pris-steg följer bråken: 1, sedan 2 (halvor), sedan 4 (fjärdedelar)", () => {
    expect([1, 3, 4, 6, 7, 10].map((d) => priceStep("pizza", d))).toEqual([1, 1, 2, 2, 4, 4]);
    expect(priceStep("cupcake", 5)).toBe(1);
    expect(minPrice("pizza", ["tomat", "ost"], 7)).toBe(12); // 8 + 1 = 9 -> 12
    expect(validatePrice("pizza", ["tomat", "ost"], 10, 7)).not.toBeNull();
    expect(validatePrice("pizza", ["tomat", "ost"], 12, 7)).toBeNull();
  });

  test("menyplatser och uppgraderingar", () => {
    expect(menuSlots("cupcake", {})).toBe(3);
    expect(menuSlots("cupcake", { ugn: 2 })).toBe(5);
    expect(menuSlots("pizza", {})).toBe(5);
    expect(menuSlots("pizza", { menyplatser: 2 })).toBe(7);
    expect(nextUpgradeCost("pizza", "skylt", {})).toBe(100);
    expect(nextUpgradeCost("pizza", "skylt", { skylt: 3 })).toBeNull();
    expect(nextUpgradeCost("cupcake", "bil", { bil: 1 })).toBe(80);
  });

  test("bråk skrivs ut som i spelet", () => {
    expect(["0", 1, 2, 3, 4, 6, 9, 10].map((q) => formatQuarters(Number(q)))).toEqual([
      "0", "1/4", "1/2", "3/4", "1", "1 1/2", "2 1/4", "2 1/2",
    ]);
  });
});

describe("kunder", () => {
  test("maxpris är 1,5-3 gånger kostnaden, och 25 % högre för favoriter", () => {
    const ids = ["tomat", "ost"]; // kostnad 8
    const noFav = { favorites: ["svamp"], factor: 2 };
    const fav = { favorites: ["ost"], factor: 2 };
    expect(maxPriceFor("pizza", noFav, ids, {})).toBe(16);
    expect(maxPriceFor("pizza", fav, ids, {})).toBe(20);
  });

  test("skylten höjer maxpriset i cupcake men inte i pizza", () => {
    const c = { favorites: ["strossel"], factor: 2 };
    const ids = ["jordgubbe", "vanilj"]; // 3 kr, ingen favorit
    expect(maxPriceFor("cupcake", c, ids, {})).toBe(6);
    expect(maxPriceFor("cupcake", c, ids, { skylt: 2 })).toBe(7); // 6 * 1,2 = 7,2
    expect(maxPriceFor("pizza", c, ["tomat"], { skylt: 2 })).toBe(6);
  });

  test("för högt pris: 70 % går, 30 % stannar", () => {
    const rng = mulberry32(1);
    let leave = 0;
    let half = 0;
    for (let i = 0; i < 5000; i++) {
      const x = priceReaction(rng, 10, 5);
      if (x === "leave") leave++;
      if (x === "half") half++;
    }
    expect(leave / 5000).toBeGreaterThan(0.67);
    expect(leave / 5000).toBeLessThan(0.73);
    expect(leave + half).toBe(5000);
    expect(priceReaction(rng, 5, 5)).toBe("buy");
  });

  test("hälften rundas ned men blir minst ett steg", () => {
    expect(halfQty(16, 4)).toBe(8); // 4 hela -> 2
    expect(halfQty(12, 4)).toBe(4); // 3 hela -> 1,5 -> 1
    expect(halfQty(4, 4)).toBe(4); // 1 hel -> 1
    expect(halfQty(5, 1)).toBe(2); // 1 1/4 -> 1/2
    expect(halfQty(1, 1)).toBe(1);
  });

  test("favoriter finns bland upplåsta ingredienser", () => {
    const rng = mulberry32(5);
    for (let i = 0; i < 200; i++) {
      const c = makeCustomer("cupcake", rng, 1);
      expect(c.favorites.length).toBeGreaterThanOrEqual(1);
      expect(c.favorites.length).toBeLessThanOrEqual(2);
      for (const f of c.favorites) expect(getIngredient("cupcake", f).unlockDay).toBe(1);
      expect(c.factor).toBeGreaterThanOrEqual(1.5);
      expect(c.factor).toBeLessThan(3);
    }
  });
});

describe("beställningar", () => {
  const menuFor = (r: "cupcake" | "pizza", day: number): Variant[] => {
    const step = priceStep(r, day);
    const mk = (id: string, ingredients: string[]): Variant => ({
      id,
      name: id,
      ingredients,
      price: Math.ceil((variantCost(r, ingredients) * 2) / step) * step,
    });
    return r === "pizza"
      ? [mk("a", ["tomat", "ost"]), mk("b", ["tomat", "ost", "skinka"]), mk("c", ["tomat", "svamp"]), mk("d", ["tomat", "ost", "ost"])]
      : [mk("a", ["strossel", "vanilj"]), mk("b", ["jordgubbe", "choklad"]), mk("c", ["blabar", "vanilj"]), mk("d", ["strossel", "strossel", "vanilj"])];
  };

  test("summan är alltid hela kronor och lagret räcker alltid, alla dagar", () => {
    for (const r of ["cupcake", "pizza"] as const) {
      for (let day = 1; day <= DAYS[r]; day++) {
        const menu = menuFor(r, day);
        const rng = mulberry32(day * 31);
        const stock = fullStock(r, 3); // lite lager så att begränsningen slår in
        for (let n = 0; n < 300; n++) {
          const customer = makeCustomer(r, rng, day);
          const res = generateOrder({ r, day, rng, customer, menu, stock, upgrades: {} });
          if (res.kind !== "order") continue;
          expect(Number.isInteger(orderTotal(res.lines, menu))).toBe(true);
          expect(() => consumeStock(stock, needFor(res.lines, menu))).not.toThrow();
          for (const line of res.lines) {
            expect(line.qty % qtyStep(r, day)).toBe(0);
            expect(line.qty).toBeGreaterThan(0);
          }
        }
      }
    }
  });

  test("fjärdedelar förekommer först dag 7, halvor först dag 4", () => {
    expect(allowedFractions("pizza", 3)).toEqual([]);
    expect(allowedFractions("pizza", 4)).toEqual([2]);
    expect(allowedFractions("pizza", 7)).toEqual([1, 2, 3]);
    expect(allowedFractions("cupcake", 5)).toEqual([]);

    const seen = new Set<number>();
    const menu = menuFor("pizza", 10);
    const rng = mulberry32(99);
    for (let n = 0; n < 2000; n++) {
      const customer = makeCustomer("pizza", rng, 10);
      const res = generateOrder({ r: "pizza", day: 10, rng, customer, menu, stock: fullStock("pizza"), upgrades: {} });
      if (res.kind === "order") for (const l of res.lines) seen.add(l.qty % 4);
    }
    expect([...seen].sort()).toEqual([0, 1, 2, 3]);
  });

  test("beställningarna växer med dagarna", () => {
    const maxLines = (r: "cupcake" | "pizza", day: number) => {
      const menu = menuFor(r, day);
      const rng = mulberry32(7);
      let m = 0;
      for (let n = 0; n < 500; n++) {
        const customer = makeCustomer(r, rng, day);
        // dyrt maxpris-skydd: låt alla köpa
        const res = generateOrder({ r, day, rng, customer: { ...customer, factor: 3 }, menu, stock: fullStock(r), upgrades: {} });
        if (res.kind === "order") m = Math.max(m, res.lines.length);
      }
      return m;
    };
    expect(maxLines("cupcake", 1)).toBe(1);
    expect(maxLines("cupcake", 5)).toBe(3);
    expect(maxLines("pizza", 1)).toBe(1);
    expect(maxLines("pizza", 4)).toBe(2);
    expect(maxLines("pizza", 7)).toBe(3);
  });

  test("slut på en ingrediens gör att varianten inte kan beställas", () => {
    const menu = menuFor("pizza", 1);
    const stock = { ...fullStock("pizza"), skinka: 0 };
    const rng = mulberry32(3);
    for (let n = 0; n < 300; n++) {
      const customer = { ...makeCustomer("pizza", rng, 1), factor: 3 };
      const res = generateOrder({ r: "pizza", day: 1, rng, customer, menu, stock, upgrades: {} });
      expect(res.kind).toBe("order");
      if (res.kind === "order") expect(res.lines.some((l) => l.variantId === "b")).toBe(false);
    }
  });

  test("tomt lager: ingen kan beställa något", () => {
    const rng = mulberry32(3);
    const res = generateOrder({
      r: "pizza", day: 1, rng, customer: makeCustomer("pizza", rng, 1),
      menu: menuFor("pizza", 1), stock: {}, upgrades: {},
    });
    expect(res.kind).toBe("noneAvailable");
  });

  test("kund som går får ingredienserna tillbaka", () => {
    const menu = menuFor("pizza", 1);
    const stock = fullStock("pizza", 5);
    const need = needFor([{ variantId: "b", qty: 8 }], menu);
    expect(need).toEqual({ tomat: 8, ost: 8, skinka: 8 });
    expect(refundStock(consumeStock(stock, need), need)).toEqual(stock);
    expect(() => consumeStock({ ost: 3 }, { ost: 4 })).toThrow();
  });
});

describe("pizza: kö, tålamod och fart", () => {
  test("kön växer från 8 till 14, och skylten ger +2 per nivå", () => {
    expect(queueSize(1, {})).toBe(8);
    expect(queueSize(10, {})).toBe(14);
    expect(queueSize(1, { skylt: 3 })).toBe(14);
  });

  test("tålamod: 20 s dag 1 till 11 s dag 10, +3 s per extra sort, +15 % per ugn", () => {
    expect(patienceSeconds(1, 1, {})).toBe(20);
    expect(patienceSeconds(10, 1, {})).toBe(11);
    expect(patienceSeconds(1, 3, {})).toBe(26);
    expect(patienceSeconds(1, 1, { ugn: 2 })).toBeCloseTo(26);
  });

  test("fart: var tredje rätt minskar med 5 % (lägst 70 %), fel ger tillbaka 10 %", () => {
    let p = INITIAL_PACE;
    for (let i = 0; i < 3; i++) p = paceOnCorrect(p);
    expect(p.factor).toBeCloseTo(0.95);
    for (let i = 0; i < 3; i++) p = paceOnCorrect(p);
    expect(p.factor).toBeCloseTo(0.9);
    p = paceOnWrong(p);
    expect(p).toEqual({ streak: 0, factor: expect.closeTo(1, 5) });
    for (let i = 0; i < 300; i++) p = paceOnCorrect(p);
    expect(p.factor).toBeCloseTo(0.7);
  });
});

describe("marknad och leverans", () => {
  test("feedback efter inköp jämför styckpris", () => {
    // Dag 6, Ost: lägsta styckpris är säljare 3, 20 st för 55 kr (2,75 kr).
    const best = purchaseFeedback("pizza", 6, "ost", { sellerId: 3, qty: 20 });
    expect(best.best).toBe(true);
    expect(best.bestOffer).toMatchObject({ sellerId: 3, qty: 20 });
    // Enstycks-paketet hos säljare 1 är dyrast (5 kr styck).
    const worst = purchaseFeedback("pizza", 6, "ost", { sellerId: 1, qty: 1 });
    expect(worst.best).toBe(false);
    expect(worst.amount).toBe(Math.round((5 - 2.75) * 1));
    expect(() => purchaseFeedback("pizza", 6, "ost", { sellerId: 1, qty: 7 })).toThrow();
  });

  test("dag 1 med en säljare: lägsta styckpris är 10-paketet", () => {
    const f = purchaseFeedback("pizza", 1, "ost", { sellerId: 1, qty: 10 });
    expect(f.best).toBe(true);
    expect(f.amount).toBe(15); // 10 * (5 - 3,5)
  });

  test("rutnätet växer", () => {
    expect([1, 2, 3, 4, 5].map(gridSize)).toEqual([5, 5, 6, 6, 7]);
  });
});
