/**
 * Alla startvärden för spelet. Siffrorna är utgångspunkter som ska balanseras
 * med simulatorn (se simulate.ts), så ändra här och kör om.
 */

export type Restaurant = "cupcake" | "pizza";
export const RESTAURANTS: readonly Restaurant[] = ["cupcake", "pizza"];

export type IngredientKind = "topping" | "frosting";

export interface Ingredient {
  id: string; // ASCII, används som nyckel och i filnamn (topping_{id}.png)
  name: string; // visningsnamn
  kind: IngredientKind;
  price: number; // kr per portion hos första säljaren (referenspris)
  unlockDay: number;
}

/** Antal dagar i en omgång. */
export const DAYS: Record<Restaurant, number> = { cupcake: 5, pizza: 10 };

/** Antal menyplatser från början (uppgraderingar ger fler). */
export const BASE_MENU_SLOTS: Record<Restaurant, number> = { cupcake: 3, pizza: 5 };

/** Startkapital: pengar att handla för på första marknaden. Lagret börjar tomt. */
export const START_CASH: Record<Restaurant, number> = { cupcake: 60, pizza: 150 };

/** Startlager: så många portioner av varje ingrediens som finns dag 1 (0 = tomt lager, man handlar själv). */
export const STARTER_PORTIONS = 0;

/**
 * Gränser för hur en variant får dekoreras. Samma topping får läggas flera
 * gånger, men högst så här många av samma och så här många toppings totalt.
 * Cupcake har dessutom alltid exakt en frosting.
 */
export const MAX_SAME_TOPPING: Record<Restaurant, number> = { cupcake: 3, pizza: 4 };
export const MAX_TOPPINGS_TOTAL: Record<Restaurant, number> = { cupcake: 6, pizza: 10 };

/** Pizza: hur länge försäljningen pågår. */
export const PIZZA_SALES_SECONDS = 60;

/** Cupcake: antal mottagna beställningar innan leveranserna startar (utan bil). */
export const CUPCAKE_BASE_ORDERS = 5;

/**
 * Cupcake: extra kunder utöver målet som kan komma en dag. En kund som går på
 * grund av priset ersätts av en ny, men bara så länge reservkunder finns.
 * Utan en gräns kostar för högt pris ingenting, och då är det alltid bäst
 * att ta så mycket som möjligt. Sätt till Infinity för "alltid ersätts".
 */
export const CUPCAKE_SPARE_CUSTOMERS = 2;

const ing = (
  id: string,
  name: string,
  kind: IngredientKind,
  price: number,
  unlockDay: number,
): Ingredient => ({ id, name, kind, price, unlockDay });

export const INGREDIENTS: Record<Restaurant, readonly Ingredient[]> = {
  cupcake: [
    ing("strossel", "Strössel", "topping", 1, 1),
    ing("jordgubbe", "Jordgubbe", "topping", 2, 1),
    ing("blabar", "Blåbär", "topping", 2, 1),
    ing("chokladbitar", "Chokladbitar", "topping", 2, 2),
    ing("gradde", "Grädde", "topping", 1, 3),
    ing("korsbar", "Körsbär", "topping", 3, 4),
    ing("vanilj", "Vanilj", "frosting", 1, 1),
    ing("choklad", "Choklad", "frosting", 2, 1),
    ing("hallon", "Hallon", "frosting", 2, 3),
    ing("citron", "Citron", "frosting", 3, 5),
  ],
  pizza: [
    ing("tomat", "Tomat", "topping", 3, 1),
    ing("ost", "Ost", "topping", 5, 1),
    ing("skinka", "Skinka", "topping", 6, 1),
    ing("svamp", "Svamp", "topping", 5, 1),
    ing("paprika", "Paprika", "topping", 4, 3),
    ing("ananas", "Ananas", "topping", 6, 5),
    ing("majs", "Majs", "topping", 4, 7),
    ing("oliver", "Oliver", "topping", 5, 9),
  ],
};

const MAPS: Record<Restaurant, ReadonlyMap<string, Ingredient>> = {
  cupcake: new Map(INGREDIENTS.cupcake.map((i) => [i.id, i])),
  pizza: new Map(INGREDIENTS.pizza.map((i) => [i.id, i])),
};

export function getIngredient(r: Restaurant, id: string): Ingredient {
  const found = MAPS[r].get(id);
  if (!found) throw new Error(`Okänd ingrediens "${id}" i ${r}`);
  return found;
}

export function unlockedIngredients(r: Restaurant, day: number): Ingredient[] {
  return INGREDIENTS[r].filter((i) => i.unlockDay <= day);
}

/**
 * Pizza-säljare. Paketen är angivna för Ost (referenspris 5 kr) och skalas
 * till övriga ingredienser med ingrediensens pris / 5, avrundat till hela kronor.
 * Säljare 1 har styckpris = ingrediensens pris, så referenskostnaden är alltid
 * priset hos säljare 1.
 */
export interface SellerPackage {
  qty: number;
  /** Pris för just detta paket om ingrediensen kostar 5 kr styck (Ost). */
  refPrice: number;
}
export interface Seller {
  id: number;
  unlockDay: number;
  packages: readonly SellerPackage[];
}

export const PIZZA_SELLERS: readonly Seller[] = [
  {
    id: 1,
    unlockDay: 1,
    packages: [
      { qty: 1, refPrice: 5 },
      { qty: 5, refPrice: 20 },
      { qty: 10, refPrice: 35 },
    ],
  },
  {
    id: 2,
    unlockDay: 3,
    packages: [
      { qty: 3, refPrice: 12 },
      { qty: 6, refPrice: 21 },
      { qty: 12, refPrice: 40 },
    ],
  },
  {
    id: 3,
    unlockDay: 6,
    packages: [
      { qty: 2, refPrice: 9 },
      { qty: 8, refPrice: 28 },
      { qty: 20, refPrice: 55 },
    ],
  },
];

/** Cupcake har en säljare utan mängdrabatt: bara stycken, pris = ingrediensens pris. */
export const CUPCAKE_SELLERS: readonly Seller[] = [
  { id: 1, unlockDay: 1, packages: [{ qty: 1, refPrice: 5 }] },
];

export const SELLERS: Record<Restaurant, readonly Seller[]> = {
  cupcake: CUPCAKE_SELLERS,
  pizza: PIZZA_SELLERS,
};

/** Uppgraderingar: pris per nivå. Antal priser = antal nivåer. */
export const UPGRADES: Record<Restaurant, Record<string, readonly number[]>> = {
  cupcake: {
    bil: [40, 80], // fler beställningar per dag (5 -> 6 -> 7)
    skylt: [40, 80], // kundernas maxpris +10 % / +20 %
    ugn: [30, 60], // fler menyplatser (4, 5)
    dricksburk: [40, 80], // +1 / +2 kr dricks per nöjd kund
  },
  pizza: {
    skylt: [100, 200, 300], // +2 platser i kön per nivå
    ugn: [100, 200, 300], // kundernas tålamod +15 % per nivå
    menyplatser: [80, 160], // 6 och 7 menyplatser
  },
};
