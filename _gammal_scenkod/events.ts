/**
 * Kontraktet mellan spelet och scenerna. Spelreglerna skickar händelser, scenen
 * reagerar (kunder går in, hoppar, vinkar, bilen kör). Scenen vet inget om
 * priser eller lager, och spelet vet inget om bilder eller animationer.
 */
import type { Container } from "pixi.js";

export const SPECIES = [
  "rav",
  "groda",
  "uggla",
  "katt",
  "hund",
  "kanin",
  "bjorn",
  "igelkott",
  "skoldpadda",
  "anka",
] as const;
export type Species = (typeof SPECIES)[number];

export type LeaveReason =
  /** Tyckte det var för dyrt: tänkebubbla med prislapp, axelryckning, vinkar adjö. */
  | "price"
  /** Tålamodet tog slut: gäspar och går. */
  | "patience"
  /** Inget gick att beställa. */
  | "noStock"
  /** Två fel summor i pizza. */
  | "wrong";

export type SceneEvent =
  // Butik (pizzeria och café)
  /** Kunden dyker upp utanför, går in genom dörren och ställer sig sist i kön. */
  | { type: "customerArrives"; id: string; species: Species }
  /** Spelaren trycker på kunden: kunden kliver fram till disken och beställer. */
  | { type: "orderTaken"; id: string }
  /** Kunden tycker att det är dyrt men stannar och köper mindre ("hmm"). */
  | { type: "customerHesitates"; id: string }
  /** Fel summa inslagen: kassan pipar och kunden blir lite orolig. */
  | { type: "wrongAnswer"; id: string }
  /** Tålamodsmätare ovanför huvudet. 1 = full, 0 = tom, null = dölj. */
  | { type: "patience"; id: string; fraction: number | null }
  /** Nöjd kund: glad hoppning och hjärta, sedan ut genom dörren. */
  | { type: "customerServed"; id: string; tip?: boolean }
  | { type: "customerLeaves"; id: string; reason: LeaveReason }
  // Staden (cupcake-leverans)
  /** Ny dag: bygg om staden med rutnät av den här storleken (5, 6 eller 7). */
  | { type: "newDay"; gridSize: number }
  /** Bilen kör till ruta (x,y) längs gatorna. Scenen anropar onCarArrived när den är framme. */
  | { type: "carDrive"; x: number; y: number }
  | { type: "delivered"; x: number; y: number }
  /** Fel hus: "Inte här!" Ingenting annat händer. */
  | { type: "deliveryWrong"; x: number; y: number }
  | { type: "clear" };

export interface Scene {
  readonly view: Container;
  handle(event: SceneEvent): void;
  update(dt: number): void;
  destroy(): void;
  /** Spelaren tryckte på en kund. */
  onTap?: (id: string) => void;
  /** Spelaren tryckte på en tomt i staden. */
  onLotTap?: (x: number, y: number) => void;
  /** Bilen har kommit fram. */
  onCarArrived?: (x: number, y: number) => void;
}

export type SceneKind = "pizzeria" | "cafe" | "city";
