/**
 * Provsida för scenerna (platshållargrafik). Visar hur spelet ska styra dem:
 * spelet anropar scenens metoder, och scenen animerar. Ingår inte i bygget.
 * Öppna /cafestjarnan/scene.html med `bun run dev:client`.
 */
import { CityScene, PizzeriaScene, SPECIES, type LeaveReason } from "./scene";
import { Register } from "./ui/register";

const stage = document.getElementById("stage") as HTMLElement;
const controls = document.getElementById("controls") as HTMLElement;
const logEl = document.getElementById("log") as HTMLElement;
const regbox = document.getElementById("regbox") as HTMLElement;
const tabs = [...document.querySelectorAll<HTMLButtonElement>("[data-tab]")];

let register: Register | null = null;
let pizza: PizzeriaScene | null = null;
let city: CityScene | null = null;
let mode = "";

const log = (t: string): void => void (logEl.textContent = t);
const btn = (label: string, fn: () => void, cls = ""): HTMLButtonElement => {
  const b = document.createElement("button");
  b.textContent = label;
  if (cls) b.className = cls;
  b.addEventListener("click", fn);
  return b;
};

// ---------------------------------------------------------------------------
// Pizzeria
// ---------------------------------------------------------------------------

const PIZZAS = [
  { name: "Margherita", price: 20 },
  { name: "Skinka", price: 25 },
  { name: "Svamp", price: 22 },
  { name: "Special", price: 35 },
];
interface PizzaOrder {
  text: string;
  total: number;
  boxes: number;
}
function makeOrder(): PizzaOrder {
  const picks = [...PIZZAS].sort(() => Math.random() - 0.5).slice(0, 1 + Math.floor(Math.random() * 2));
  const lines = picks.map((p) => ({ p, qty: 1 + Math.floor(Math.random() * 4) }));
  return {
    text: lines.map((l) => `${l.qty} ${l.p.name}`).join(" och "),
    total: lines.reduce((s, l) => s + l.qty * l.p.price, 0),
    boxes: lines.reduce((s, l) => s + l.qty, 0),
  };
}
let order: PizzaOrder | null = null;
let nextId = 0;
let waiting: string[] = [];
let serving: { id: string; left: number; total: number } | null = null;
let drain: number | undefined;

function addCustomer(): string | null {
  if (!pizza) return null;
  const id = `k${nextId}`;
  const species = SPECIES[nextId % SPECIES.length] as (typeof SPECIES)[number];
  nextId++;
  waiting.push(id);
  void pizza.customerArrives(id, species);
  return id;
}

async function takeOrder(id?: string): Promise<void> {
  if (!pizza) return;
  if (serving) return log("Slutför kunden vid kassan först.");
  const who = id ?? waiting[0];
  if (!who || !waiting.includes(who)) return log("Ingen väntar i kön.");
  waiting = waiting.filter((w) => w !== who);
  serving = { id: who, left: 12, total: 12 };
  log(`Tog beställning från ${who}. Tålamodet rinner.`);
  order = makeOrder();
  await pizza.customerOrders(who, order.text);
  register?.setEnabled(true);
  register?.clear();
  register?.setHint(`Pris: ${PIZZAS.map((p) => `${p.name} ${p.price} kr`).join(" · ")}`);
  window.clearInterval(drain);
  drain = window.setInterval(() => {
    if (!serving || !pizza) return;
    serving.left -= 0.1;
    pizza.setPatience(serving.id, serving.left / serving.total);
    if (serving.left <= 0) finish("patience");
  }, 100);
}

function finish(reason: LeaveReason, boxes = 0): void {
  if (!pizza || !serving) return log("Ingen kund vid kassan.");
  register?.setEnabled(false);
  order = null;
  window.clearInterval(drain);
  const id = serving.id;
  serving = null;
  pizza.setPatience(id, null);
  void pizza.customerLeaves(id, reason, boxes);
  log(`Kunden lämnar: ${reason}`);
}

function pizzaControls(): void {
  regbox.className = "over";
  register = new Register(regbox, [], { compact: true });
  register.setEnabled(false);
  register.setHint("Ta en beställning först.");
  register.onSubmit(({ amount }) => {
    if (!order || !serving) return;
    if (amount !== null && Math.round(amount * 100) === order.total * 100) {
      register?.ok();
      finish("paid", order.boxes);
    } else {
      register?.wrong();
      log(`Fel summa (${amount ?? "inget"}). Räkna igen!`);
    }
  });
  controls.replaceChildren(
    btn("Kund kommer", addCustomer),
    btn("5 kunder", () => {
      for (let i = 0; i < 5; i++) window.setTimeout(addCustomer, i * 700);
    }),
    btn("Ta beställning", () => void takeOrder(), "alt"),
    btn("Betald 💰", () => finish("paid", order?.boxes ?? 0)),
    btn("För dyrt 🏷️", () => finish("price")),
    btn("Tålamod slut 🥱", () => finish("patience")),
    btn("Slut på ingredienser 😕", () => finish("noStock")),
    btn("Rensa", () => {
      pizza?.clear();
      waiting = [];
      serving = null;
      window.clearInterval(drain);
    }, "warn"),
  );
  log("Tryck på en kund i kön för att ta beställningen, eller använd knapparna.");
}

// ---------------------------------------------------------------------------
// Stad
// ---------------------------------------------------------------------------

let target: { x: number; y: number } | null = null;

function check(x: number, y: number): void {
  if (!city) return;
  if (!target) return log(`Stannade vid (${x},${y}). Tryck på "Ny leverans" för att få ett mål.`);
  if (target && target.x === x && target.y === y) {
    city.flash(x, y, true);
    log(`Levererat till (${x},${y})!`);
    target = null;
    city.highlight(null);
  } else {
    city.flash(x, y, false);
    log(`Inte här! (${x},${y}) är fel hörn.${target ? ` Leverera till (${target.x},${target.y}).` : ""}`);
  }
}

async function driveAndCheck(x: number, y: number): Promise<void> {
  if (!city) return;
  await city.driveTo(x, y); // bilen lämnar leveransen själv när den stannar på ett hörn (onDrop)
}

function cityControls(): void {
  const n = document.createElement("select");
  for (const v of [5, 6, 7]) n.add(new Option(`${v}×${v}`, String(v)));
  n.addEventListener("change", () => {
    city?.setGrid(Number(n.value));
    target = null;
  });
  const walkers = document.createElement("input");
  walkers.type = "number";
  walkers.value = "6";
  walkers.min = "0";
  walkers.addEventListener("change", () => city?.setPedestrians(Number(walkers.value)));
  const x = document.createElement("input");
  const y = document.createElement("input");
  x.type = y.type = "number";
  x.value = y.value = "3";
  controls.replaceChildren(
    "Rutnät: ", n, " Fotgängare: ", walkers, document.createElement("br"),
    btn("Ny leverans", () => {
      if (!city) return;
      const size = city.gridSize();
      target = { x: 1 + Math.floor(Math.random() * size), y: 1 + Math.floor(Math.random() * size) };
      city.highlight(null);
      log(`Leverera till (${target.x},${target.y}): där gata x=${target.x} (blå) möter gata y=${target.y} (gul). Tryck på ett kvarter.`);
    }, "alt"),
    btn("Visa var", () => target && city?.highlight(target.x, target.y)),
    " Kör till x ", x, " y ", y,
    btn("Kör", () => void driveAndCheck(Number(x.value), Number(y.value))),
  );
  log("Tryck på en gata eller ett kvarter, eller styr med WASD/piltangenter. Leveransen lämnas automatiskt när bilen stannar på ett hörn.");
}

// ---------------------------------------------------------------------------

// Cupcake-kassan: en färdig knapp per cupcake på menyn, tryck x gånger för x st.
const CUPCAKES = [
  { id: "vanilj", label: "Vanilj", icon: "🧁", price: 12 },
  { id: "choklad", label: "Choklad", icon: "🍫", price: 15 },
  { id: "bar", label: "Bär", icon: "🍓", price: 18 },
];

function orderDemo(): void {
  controls.replaceChildren();
  regbox.className = "under";
  const want: Record<string, number> = {};
  for (const c of [...CUPCAKES].sort(() => Math.random() - 0.5).slice(0, 2)) want[c.id] = 1 + Math.floor(Math.random() * 5);
  const text = CUPCAKES.filter((c) => want[c.id]).map((c) => `${want[c.id]} ${c.label}`).join(" och ");
  stage.replaceChildren();
  const p = document.createElement("div");
  p.className = "prompt";
  p.style.padding = "18px";
  p.style.fontSize = "26px";
  p.textContent = `🦊 “Jag vill ha ${text}!”`;
  stage.append(p);
  register = new Register(regbox, CUPCAKES);
  const total = CUPCAKES.reduce((s, c) => s + (want[c.id] ?? 0) * c.price, 0);
  register.setHint("Tryck på en cupcake för varje st, slå in summan och tryck ✓.");
  register.onSubmit(({ counts, amount }) => {
    const rightCounts = CUPCAKES.every((c) => (counts[c.id] ?? 0) === (want[c.id] ?? 0));
    const rightSum = amount !== null && Math.round(amount * 100) === total * 100;
    if (rightCounts && rightSum) {
      register?.ok();
      log("Rätt beställning och rätt summa!");
      window.setTimeout(orderDemo2, 900);
    } else {
      register?.wrong();
      log(!rightCounts ? "Beställningen stämmer inte med vad kunden bad om." : "Fel summa. Räkna igen!");
    }
  });
  log("Cupcake-kassa: lägg beställningen med knapparna.");
}
function orderDemo2(): void {
  register?.destroy();
  orderDemo();
}

async function show(next: "pizza" | "city" | "order"): Promise<void> {
  if (mode === next) return;
  mode = next;
  register?.destroy();
  register = null;
  regbox.className = "";
  window.clearInterval(drain);
  pizza?.destroy();
  city?.destroy();
  pizza = city = null;
  waiting = [];
  serving = null;
  stage.replaceChildren();
  tabs.forEach((t) => t.classList.toggle("on", t.dataset.tab === next));
  if (next === "order") return orderDemo();
  if (next === "pizza") {
    const s = new PizzeriaScene();
    s.onCustomerTap((id) => void takeOrder(id));
    await s.mount(stage);
    pizza = s;
    pizzaControls();
  } else {
    const s = new CityScene();
    s.onTileTap((x, y) => void driveAndCheck(x, y));
    s.onDrop((x, y) => check(x, y));
    await s.mount(stage);
    s.setGrid(5);
    s.setPedestrians(6);
    city = s;
    cityControls();
  }
}

for (const t of tabs) t.addEventListener("click", () => void show(t.dataset.tab as "pizza" | "city" | "order"));

(window as unknown as Record<string, unknown>).__sandbox = {
  show,
  addCustomer,
  takeOrder,
  finish,
  order: () => order,
  pizza: () => pizza,
  city: () => city,
};
void show("pizza");
