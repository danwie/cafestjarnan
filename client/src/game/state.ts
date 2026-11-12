import { START_CASH, getIngredient, type Restaurant } from "../../../shared/data";
import { mulberry32, type Rng } from "../../../shared/rng";
import { INITIAL_PACE, startStock, type Pace, type Stock, type Upgrades, type Variant } from "../../../shared/rules";
import type { Species } from "../scene";

export type Screen = "start" | "intro" | "market" | "decorate" | "sales" | "delivery" | "summary" | "end";

export interface DayLog {
  day: number;
  income: number;
  costs: number;
  profit: number;
}

export interface State {
  r: Restaurant;
  day: number;
  money: number;
  startCash: number;
  stock: Stock;
  upgrades: Upgrades;
  menu: Variant[];
  rng: Rng;
  screen: Screen;
  msg: string;
  msgKind: "ok" | "err" | "";
  feedback: string;
  income: number;
  tips: number;
  purchases: number;
  upgradeSpend: number;
  history: DayLog[];
  gameOver: boolean;
  /** Cupcake: leveranser som väntar efter dagens försäljning. */
  deliveries: { x: number; y: number }[];
  pace: Pace;
}

export function fresh(r: Restaurant): State {
  return {
    r,
    day: 1,
    money: START_CASH[r],
    startCash: START_CASH[r],
    stock: startStock(r),
    upgrades: {},
    menu: [],
    rng: mulberry32((Date.now() ^ (Math.random() * 1e9)) >>> 0),
    screen: "intro",
    msg: "",
    msgKind: "",
    feedback: "",
    income: 0,
    tips: 0,
    purchases: 0,
    upgradeSpend: 0,
    history: [],
    gameOver: false,
    deliveries: [],
    pace: INITIAL_PACE,
  };
}

/** Det som skärmarna får av spelet. */
export interface Ctx {
  s: State;
  root: HTMLElement;
  go(screen: Screen): void;
  /** Uppdaterar överraden (dag, kassa, extra text). */
  hud(extra?: string): void;
  /** Räknar ihop dagen och visar dagssammanfattningen. */
  endDay(): void;
  /** Från sammanfattningen till nästa dag (eller slutskärmen efter sista dagen). */
  nextDay(): void;
  /** Ny omgång i samma eller en annan restaurang. */
  restart(r?: Restaurant): void;
}

export const esc = (t: string): string =>
  t.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] as string);

export const ICON: Record<string, string> = {
  tomat: "🍅", ost: "🧀", skinka: "🍖", svamp: "🍄", paprika: "🫑", ananas: "🍍", majs: "🌽", oliver: "🫒",
  strossel: "✨", jordgubbe: "🍓", blabar: "🫐", chokladbitar: "🍫", gradde: "☁️", korsbar: "🍒",
  vanilj: "🤍", choklad: "🤎", hallon: "🩷", citron: "💛",
};

export const ANIMAL_EMOJI: Record<Species, string> = {
  rav: "🦊", groda: "🐸", uggla: "🦉", katt: "🐱", hund: "🐶", kanin: "🐰", bjorn: "🐻", igelkott: "🦔", skoldpadda: "🐢", anka: "🦆",
};

/** "2× Ost, Tomat" */
export function describe(s: State, ids: readonly string[]): string {
  const counts = new Map<string, number>();
  for (const id of ids) counts.set(id, (counts.get(id) ?? 0) + 1);
  return [...counts].map(([id, c]) => `${c > 1 ? `${c}× ` : ""}${getIngredient(s.r, id).name}`).join(", ");
}

export function say(s: State, msg: string, kind: "ok" | "err" | "" = ""): void {
  s.msg = msg;
  s.msgKind = kind;
}

export const msgLine = (s: State): string => `<div class="msg ${s.msgKind}" id="msg">${esc(s.msg)}</div>`;
