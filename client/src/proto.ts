/**
 * Spelbar PROTOTYP utan grafik: text och knappar, bara för att känna på reglerna.
 * Öppna /cafestjarnan/proto.html med `bun run dev:client`. Ingår inte i bygget.
 */
import {
  CUPCAKE_SPARE_CUSTOMERS,
  DAYS,
  MAX_SAME_TOPPING,
  MAX_TOPPINGS_TOTAL,
  PIZZA_SALES_SECONDS,
  SELLERS,
  UPGRADES,
  getIngredient,
  unlockedIngredients,
  type Restaurant,
} from "../../shared/data";
import { mulberry32, pick, randInt, type Rng } from "../../shared/rng";
import {
  INITIAL_PACE,
  WRONG_ANSWER_DRAIN,
  consumeStock,
  cupcakeOrdersPerDay,
  formatQuarters,
  generateOrder,
  gridSize,
  isAvailable,
  makeCustomer,
  menuSlots,
  minPrice,
  needFor,
  nextUpgradeCost,
  offersFor,
  orderTotal,
  paceOnCorrect,
  paceOnWrong,
  patienceSeconds,
  priceStep,
  purchaseFeedback,
  queueSize,
  refundStock,
  roundUpToStep,
  startStock,
  tipPerHappyCustomer,
  validatePrice,
  validateVariant,
  variantCost,
  type OrderLine,
  type Pace,
  type Stock,
  type Upgrades,
  type Variant,
} from "../../shared/rules";

type Phase = "start" | "market" | "sales" | "delivery" | "summary" | "end";

interface Active {
  emoji: string;
  lines: OrderLine[];
  total: number;
  hesitant: boolean;
  need: Record<string, number>;
  patienceMax: number;
  elapsed: number;
  wrong: number;
}

interface DayLog {
  day: number;
  income: number;
  costs: number;
  profit: number;
}

interface State {
  r: Restaurant;
  day: number;
  money: number;
  stock: Stock;
  upgrades: Upgrades;
  menu: Variant[];
  rng: Rng;
  phase: Phase;
  msg: string;
  msgKind: "ok" | "err" | "";
  feedback: string;
  income: number;
  tips: number;
  purchases: number;
  upgradeSpend: number;
  history: DayLog[];
  gameOver: boolean;
  draft: { ids: string[]; name: string; price: string };
  /** Cupcake: en kund som just gått, visas tills spelaren trycker Nästa kund. */
  waiting: string | null;
  // cupcake
  arrivals: number;
  taken: number;
  deliveries: { x: number; y: number }[];
  deliveryIdx: number;
  cur: Active | null;
  // pizza
  queue: string[];
  timeLeft: number;
  pace: Pace;
  active: Active | null;
}

const EMOJIS = ["🦊", "🐸", "🦉", "🐱", "🐶", "🐰", "🐻", "🦔", "🐢", "🦆"];
const app = document.getElementById("app") as HTMLElement;
let s: State;
let timer: number | undefined;

function fresh(r: Restaurant): State {
  return {
    r,
    day: 1,
    money: 0,
    stock: startStock(r),
    upgrades: {},
    menu: [],
    rng: mulberry32((Date.now() ^ (Math.random() * 1e9)) >>> 0),
    phase: "market",
    msg: "",
    msgKind: "",
    feedback: "",
    income: 0,
    tips: 0,
    purchases: 0,
    upgradeSpend: 0,
    history: [],
    gameOver: false,
    draft: { ids: [], name: "", price: "" },
    waiting: null,
    arrivals: 0,
    taken: 0,
    deliveries: [],
    deliveryIdx: 0,
    cur: null,
    queue: [],
    timeLeft: 0,
    pace: INITIAL_PACE,
    active: null,
  };
}

const esc = (t: string): string =>
  t.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] as string);

function say(msg: string, kind: "ok" | "err" | "" = ""): void {
  s.msg = msg;
  s.msgKind = kind;
}

const ICON: Record<string, string> = {
  tomat: "🍅", ost: "🧀", skinka: "🍖", svamp: "🍄", paprika: "🫑", ananas: "🍍", majs: "🌽", oliver: "🫒",
  strossel: "✨", jordgubbe: "🍓", blabar: "🫐", chokladbitar: "🍫", gradde: "☁️", korsbar: "🍒",
  vanilj: "🤍", choklad: "🤎", hallon: "🩷", citron: "💛",
};
const STALL = ["", "🔴", "🟡", "🟢"];

/** "2× Ost, Tomat" */
function describe(ids: readonly string[]): string {
  const counts = new Map<string, number>();
  for (const id of ids) counts.set(id, (counts.get(id) ?? 0) + 1);
  return [...counts].map(([id, c]) => `${c > 1 ? `${c}× ` : ""}${getIngredient(s.r, id).name}`).join(", ");
}

const isFrosting = (id: string): boolean => getIngredient(s.r, id).kind === "frosting";

/** Läggs till på bottnen (dra eller +). Frosting ersätter den som redan ligger där. */
function addIngredient(id: string): void {
  if (isFrosting(id)) {
    s.draft.ids = [...s.draft.ids.filter((x) => !isFrosting(x)), id];
    return;
  }
  const same = s.draft.ids.filter((x) => x === id).length;
  const total = s.draft.ids.filter((x) => !isFrosting(x)).length;
  if (same >= MAX_SAME_TOPPING[s.r]) return say(`Högst ${MAX_SAME_TOPPING[s.r]} av samma ingrediens.`, "err");
  if (total >= MAX_TOPPINGS_TOTAL[s.r]) return say(`Högst ${MAX_TOPPINGS_TOTAL[s.r]} toppings totalt.`, "err");
  s.draft.ids = [...s.draft.ids, id];
  say("");
}

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

function topBar(): string {
  return `<div class="top"><span>Dag ${s.day}/${DAYS[s.r]} · ${s.r === "cupcake" ? "Cupcake" : "Pizza"}</span><span id="money">Kassa: ${s.money} kr</span></div>`;
}

function msgLine(): string {
  return `<div class="msg ${s.msgKind}" id="msg">${esc(s.msg)}</div>`;
}

function orderText(a: Active): string {
  return a.lines
    .map((l) => {
      const v = s.menu.find((m) => m.id === l.variantId) as Variant;
      return `${formatQuarters(l.qty)} ${esc(v.name)}`;
    })
    .join(" och ");
}

function menuTable(withInputs: boolean): string {
  if (s.menu.length === 0) return "<p><small>Menyn är tom.</small></p>";
  const rows = s.menu
    .map((v) => {
      const names = describe(v.ingredients);
      const price = withInputs
        ? `<input type="number" min="1" step="${priceStep(s.r, s.day)}" value="${v.price}" data-vprice="${v.id}" /> kr`
        : `<b>${v.price} kr</b>`;
      const del = withInputs ? `<button class="warn" data-act="del" data-id="${v.id}">Ta bort</button>` : "";
      return `<tr><td><b>${esc(v.name)}</b></td><td>${names}</td><td><small>kostar ${variantCost(s.r, v.ingredients)} kr</small></td><td>${price}</td><td>${del}</td></tr>`;
    })
    .join("");
  return `<table>${rows}</table>`;
}

function renderStart(): void {
  app.innerHTML = `<h1>⭐ Caféstjärnan <small>prototyp</small></h1>
    <div class="card"><p>Välj restaurang. Ingen grafik än, bara regler och siffror.</p>
    <button class="big" data-act="start" data-r="cupcake">🧁 Cupcake (5 dagar, lugn)</button>
    <button class="big" data-act="start" data-r="pizza">🍕 Pizza (10 dagar, snabb)</button></div>`;
}

function renderMarket(): void {
  const unlocked = unlockedIngredients(s.r, s.day);
  const sellers = SELLERS[s.r].filter((x) => x.unlockDay <= s.day);
  const showUnit = s.r === "pizza" && (s.day === 3 || s.day === 6);
  const stock = unlocked
    .map((i) => `<span class="chip">${ICON[i.id] ?? ""} ${i.name}: <b>${formatQuarters(s.stock[i.id] ?? 0)}</b></span>`)
    .join("");
  const stalls = sellers
    .map((x) => {
      const rows = unlocked
        .map((i) => {
          const buttons = offersFor(s.r, s.day, i.id)
            .filter((o) => o.sellerId === x.id)
            .map((o) => {
              const unit = showUnit ? ` <small>(${o.unit.toFixed(2)}/st)</small>` : "";
              return `<button class="alt" ${o.price > s.money ? "disabled" : ""} data-act="buy" data-i="${i.id}" data-s="${o.sellerId}" data-q="${o.qty}">${o.qty} st för ${o.price} kr${unit}</button>`;
            })
            .join("");
          return `<tr><td><b>${ICON[i.id] ?? ""} ${i.name}</b></td><td>${buttons}</td></tr>`;
        })
        .join("");
      const title = s.r === "pizza" ? `${STALL[x.id] ?? ""} Stånd ${x.id}` : "🧺 Marknadsstånd";
      return `<div class="stall"><h3>${title}</h3><table>${rows}</table></div>`;
    })
    .join("");

  const upgRows = Object.keys(UPGRADES[s.r])
    .map((id) => {
      const cost = nextUpgradeCost(s.r, id, s.upgrades);
      const lvl = s.upgrades[id] ?? 0;
      const btn =
        cost === null
          ? "<small>högsta nivån</small>"
          : `<button ${cost > s.money ? "disabled" : ""} data-act="upg" data-id="${id}">Köp nivå ${lvl + 1} för ${cost} kr</button>`;
      return `<tr><td><b>${id}</b></td><td>nivå ${lvl}</td><td>${btn}</td></tr>`;
    })
    .join("");

  const counts = new Map<string, number>();
  for (const id of s.draft.ids) counts.set(id, (counts.get(id) ?? 0) + 1);
  const chips = unlocked
    .map((i) => {
      const c = counts.get(i.id) ?? 0;
      const label = `${ICON[i.id] ?? ""} ${i.name} <small>(${i.price} kr)</small>`;
      if (i.kind === "frosting") {
        return `<span class="chip" draggable="true" data-drag="${i.id}"><button class="${c ? "" : "alt"}" data-act="frost" data-id="${i.id}">${label}</button></span>`;
      }
      return `<span class="chip" draggable="true" data-drag="${i.id}">${label} <button class="alt" data-act="dec" data-id="${i.id}" ${c ? "" : "disabled"}>−</button> <b>${c}</b> <button data-act="inc" data-id="${i.id}">+</button></span>`;
    })
    .join("");
  const draftCost = variantCost(s.r, s.draft.ids);
  const draftMin = minPrice(s.r, s.draft.ids, s.day);
  const slots = menuSlots(s.r, s.upgrades);

  app.innerHTML = `${topBar()}
    <h2>Marknaden</h2>${msgLine()}
    <div class="card"><h3>Lager</h3>${stock}</div>
    <div class="card"><h3>Marknaden</h3>
      ${s.r === "pizza" ? "<p><small>Jämför ståndens priser. Du kan köpa olika ingredienser från olika stånd.</small></p>" : ""}
      <div class="stalls">${stalls}</div>
      <div class="msg ok" id="fb">${esc(s.feedback)}</div></div>
    <div class="card"><h3>Uppgraderingar</h3><table>${upgRows}</table></div>
    <div class="card"><h3>Meny (${s.menu.length}/${slots} platser)</h3>${menuTable(true)}
      <p><small>Pris måste vara minst kostnad + 1 kr och delbart med ${priceStep(s.r, s.day)}.</small></p>
      <h3>Ny variant</h3>
      <p><small>Dra ingredienser till ${s.r === "cupcake" ? "cupcaken" : "pizzan"} eller tryck +. Samma ingrediens får läggas flera gånger (högst ${MAX_SAME_TOPPING[s.r]} av samma, ${MAX_TOPPINGS_TOTAL[s.r]} totalt${s.r === "cupcake" ? ", exakt en frosting" : ""}).</small></p>
      <div class="base" data-drop>${s.r === "cupcake" ? "🧁" : "🍕"} ${s.draft.ids.map((id) => ICON[id] ?? "•").join(" ")}</div>
      ${chips}<br/>
      Namn: <input type="text" maxlength="14" data-dname value="${esc(s.draft.name)}" placeholder="Sort ${s.menu.length + 1}" />
      Pris: <input type="number" data-dprice value="${esc(s.draft.price)}" placeholder="${draftMin}" /> kr
      <small>(kostnad ${draftCost}, minst ${draftMin})</small>
      <button data-act="add" ${s.menu.length >= slots ? "disabled" : ""}>Lägg till</button></div>
    <button class="big" data-act="open">Öppna restaurangen ▶</button>`;
}

function renderCupcakeSales(): void {
  const target = cupcakeOrdersPerDay(s.upgrades);
  const body = s.waiting
    ? `<div class="card"><div class="order">${s.waiting}</div><button class="big" data-act="nextcust">Nästa kund ▶</button></div>`
    : s.cur
      ? `<div class="card"><div class="order">${s.cur.emoji} ${orderText(s.cur)}</div>
         ${s.cur.hesitant ? "<p>🤔 Hmm... kunden tycker att det är dyrt och köper bara hälften.</p>" : ""}
         <p>Vad blir summan? <input class="answer" id="ans" inputmode="numeric" autocomplete="off" autofocus /> kr
         <button data-act="answer">Slå in</button></p></div>`
      : "";
  app.innerHTML = `${topBar()}<h2>Försäljning</h2>
    <p>Beställning ${s.taken + (s.cur ? 1 : 0)} av ${target}</p>${msgLine()}
    <div class="card">${menuTable(false)}</div>${body}`;
  (document.getElementById("ans") as HTMLInputElement | null)?.focus();
}

function renderPizzaSales(): void {
  const queue = s.queue
    .map((e, i) => `<button data-act="tap" data-i="${i}" ${s.active ? "disabled" : ""}>${e}</button>`)
    .join("");
  app.innerHTML = `${topBar()}<h2>Försäljning <span id="clock">${Math.ceil(s.timeLeft)}</span> s</h2>${msgLine()}
    <div class="card">${menuTable(false)}</div>
    ${
      s.active
        ? `<div class="card"><div class="bar"><div id="pbar" style="width:100%"></div></div>
           <div class="order">${s.active.emoji} ${orderText(s.active)}</div>
           ${s.active.hesitant ? "<p>🤔 Kunden tycker att det är dyrt och köper mindre.</p>" : ""}
           <p>Summa? <input class="answer" id="ans" inputmode="numeric" autocomplete="off" /> kr
           <button data-act="answer">Slå in</button></p></div>`
        : `<p>Tryck på en kund i kön:</p>`
    }
    <div class="queue card">${queue || "<small>Kön är tom.</small>"}</div>`;
  (document.getElementById("ans") as HTMLInputElement | null)?.focus();
}

function renderDelivery(): void {
  const n = gridSize(s.day);
  const t = s.deliveries[s.deliveryIdx] as { x: number; y: number };
  let cells = `<div class="lab"></div>`;
  for (let x = 1; x <= n; x++) cells += `<div class="lab">${x}</div>`;
  for (let y = n; y >= 1; y--) {
    cells += `<div class="lab">${y}</div>`;
    for (let x = 1; x <= n; x++) cells += `<button data-act="cell" data-x="${x}" data-y="${y}">🏠</button>`;
  }
  app.innerHTML = `${topBar()}<h2>Leverans ${s.deliveryIdx + 1} av ${s.deliveries.length}</h2>${msgLine()}
    <div class="card"><div class="order">Kör till (${t.x},${t.y})</div>
    <p><small>x vågrätt, y lodrätt (uppåt).</small></p>
    <div class="grid" style="grid-template-columns: repeat(${n + 1}, 44px)">${cells}</div></div>`;
}

function renderSummary(): void {
  const costs = s.purchases + s.upgradeSpend;
  const profit = s.income + s.tips - costs;
  app.innerHTML = `${topBar()}<h2>Dag ${s.day} är slut</h2>
    <div class="card"><table>
      <tr><td>Intäkter</td><td>${s.income} kr</td></tr>
      <tr><td>Dricks</td><td>${s.tips} kr</td></tr>
      <tr><td>Inköp</td><td>${s.purchases} kr</td></tr>
      <tr><td>Uppgraderingar</td><td>${s.upgradeSpend} kr</td></tr>
      <tr><td><b>Vinst idag</b></td><td><b>${profit} kr</b></td></tr></table></div>
    <button class="big" data-act="next">${s.day >= DAYS[s.r] ? "Visa resultat" : "Nästa dag ▶"}</button>`;
}

function renderEnd(): void {
  const rows = s.history
    .map((d) => `<tr><td>${d.day}</td><td>${d.income}</td><td>${d.costs}</td><td>${d.profit}</td></tr>`)
    .join("");
  app.innerHTML = `<h2>${s.gameOver ? "Slut på pengar och ingredienser" : "Omgången är slut"}</h2>
    <div class="card"><table><tr><th>Dag</th><th>Intäkter</th><th>Kostnader</th><th>Vinst</th></tr>${rows}</table>
    <h2>Total vinst: ${s.money} kr</h2></div>
    <button class="big" data-act="again">Spela igen</button>`;
}

function render(): void {
  switch (s.phase) {
    case "start":
      return renderStart();
    case "market":
      return renderMarket();
    case "sales":
      return s.r === "cupcake" ? renderCupcakeSales() : renderPizzaSales();
    case "delivery":
      return renderDelivery();
    case "summary":
      return renderSummary();
    case "end":
      return renderEnd();
  }
}

function setMoneyLabel(): void {
  const el = document.getElementById("money");
  if (el) el.textContent = `Kassa: ${s.money} kr`;
}

// ---------------------------------------------------------------------------
// Flöde
// ---------------------------------------------------------------------------

function openRestaurant(): void {
  const slots = menuSlots(s.r, s.upgrades);
  if (s.menu.length === 0) return (say("Lägg till minst en variant på menyn.", "err"), render());
  if (s.menu.length > slots) return (say(`Menyn får högst ha ${slots} varianter.`, "err"), render());
  for (const v of s.menu) {
    const err = validatePrice(s.r, v.ingredients, v.price, s.day);
    if (err) return (say(`${v.name}: ${err}`, "err"), render());
  }
  if (s.menu.every((v) => !isAvailable(v, s.stock, 1)) && s.money < 1) {
    s.gameOver = true;
    s.phase = "end";
    return render();
  }
  s.income = 0;
  s.tips = 0;
  say("");
  s.phase = "sales";
  if (s.r === "cupcake") {
    s.arrivals = 0;
    s.taken = 0;
    s.deliveries = [];
    s.deliveryIdx = 0;
    nextCupcakeCustomer();
  } else {
    s.timeLeft = PIZZA_SALES_SECONDS;
    s.queue = Array.from({ length: queueSize(s.day, s.upgrades) }, () => pick(s.rng, EMOJIS));
    s.pace = INITIAL_PACE;
    s.active = null;
    render();
    window.clearInterval(timer);
    timer = window.setInterval(tick, 100);
  }
}

function makeActive(res: { lines: OrderLine[]; hesitant: boolean }, emoji: string): Active {
  const need = needFor(res.lines, s.menu);
  s.stock = consumeStock(s.stock, need);
  return {
    emoji,
    lines: res.lines,
    total: orderTotal(res.lines, s.menu),
    hesitant: res.hesitant,
    need,
    patienceMax: s.r === "pizza" ? patienceSeconds(s.day, res.lines.length, s.upgrades) * s.pace.factor : 0,
    elapsed: 0,
    wrong: 0,
  };
}

function ctx() {
  return { r: s.r, day: s.day, rng: s.rng, customer: makeCustomer(s.r, s.rng, s.day), menu: s.menu, stock: s.stock, upgrades: s.upgrades };
}

function nextCupcakeCustomer(): void {
  s.waiting = null;
  const target = cupcakeOrdersPerDay(s.upgrades);
  if (s.taken < target && s.arrivals < target + CUPCAKE_SPARE_CUSTOMERS) {
    s.arrivals++;
    const emoji = pick(s.rng, EMOJIS);
    const res = generateOrder(ctx());
    s.cur = null;
    if (res.kind === "noneAvailable") {
      s.arrivals = Number.MAX_SAFE_INTEGER; // ingen kan beställa något mer i dag
      s.waiting = `${emoji} 😕 Slut på ingredienser! Kunderna går hem.`;
      return render();
    }
    if (res.kind === "leftPrice") {
      s.waiting = `${emoji} 💭🏷️❌ För dyrt! Kunden lyfter på axlarna och vinkar adjö 👋`;
      return render();
    }
    s.cur = makeActive(res, emoji);
    return render();
  }
  s.cur = null;
  if (s.deliveries.length > 0) {
    s.phase = "delivery";
    say("");
    render();
  } else {
    endDay();
  }
}

function answer(): void {
  const input = document.getElementById("ans") as HTMLInputElement | null;
  const a = s.r === "cupcake" ? s.cur : s.active;
  if (!input || !a) return;
  const value = Number(input.value.trim());
  const ok = input.value.trim() !== "" && Number.isInteger(value) && value === a.total;
  if (s.r === "cupcake") {
    if (!ok) {
      say("PIP! Fel summa, försök igen.", "err");
      input.value = "";
      const m = document.getElementById("msg") as HTMLElement;
      m.textContent = s.msg;
      m.className = "msg err";
      input.focus();
      return;
    }
    s.income += a.total;
    if (!a.hesitant) s.tips += tipPerHappyCustomer(s.upgrades);
    s.money += a.total + (a.hesitant ? 0 : tipPerHappyCustomer(s.upgrades));
    s.taken++;
    const n = gridSize(s.day);
    s.deliveries.push({ x: randInt(s.rng, 1, n), y: randInt(s.rng, 1, n) });
    say(`Pling! Leverans till (${s.deliveries[s.deliveries.length - 1]!.x},${s.deliveries[s.deliveries.length - 1]!.y}) väntar.`, "ok");
    s.cur = null;
    return nextCupcakeCustomer();
  }
  // pizza
  if (!ok) {
    a.wrong++;
    s.pace = paceOnWrong(s.pace);
    if (a.wrong >= 2) return customerLeaves("😕 Två fel: kunden gick.");
    say("PIP! Fel summa. Kunden blir otålig (mätaren går dubbelt så fort).", "err");
    input.value = "";
    document.getElementById("msg")!.textContent = s.msg;
    document.getElementById("msg")!.className = "msg err";
    return input.focus();
  }
  s.pace = paceOnCorrect(s.pace);
  const tip = !a.hesitant && a.wrong === 0 ? tipPerHappyCustomer(s.upgrades) : 0;
  s.income += a.total;
  s.tips += tip;
  s.money += a.total + tip;
  s.active = null;
  say(`Pling! +${a.total + tip} kr`, "ok");
  render();
}

function customerLeaves(text: string): void {
  const emoji = s.active?.emoji ?? "";
  if (s.active) s.stock = refundStock(s.stock, s.active.need);
  s.active = null;
  say(`${emoji} ${text}`, "err");
  render();
}

function tick(): void {
  if (s.phase !== "sales" || s.r !== "pizza") return;
  s.timeLeft -= 0.1;
  if (s.active) {
    s.active.elapsed += 0.1 * (s.active.wrong > 0 ? WRONG_ANSWER_DRAIN : 1);
    if (s.active.elapsed >= s.active.patienceMax) customerLeaves("🥱 Kunden gäspade och gick.");
  }
  const clock = document.getElementById("clock");
  if (clock) clock.textContent = String(Math.max(0, Math.ceil(s.timeLeft)));
  const bar = document.getElementById("pbar");
  if (bar && s.active) bar.style.width = `${Math.max(0, 100 * (1 - s.active.elapsed / s.active.patienceMax))}%`;
  setMoneyLabel();
  if (s.timeLeft <= 0) {
    if (s.active) s.stock = refundStock(s.stock, s.active.need);
    s.active = null;
    window.clearInterval(timer);
    endDay();
  }
}

function tapCustomer(i: number): void {
  if (s.active) return;
  const emoji = s.queue[i] ?? "🐾";
  const res = generateOrder(ctx());
  if (res.kind === "noneAvailable") {
    say("😕 Slut på ingredienser! Inga pizzor går att beställa, kunderna går.", "err");
    window.clearInterval(timer);
    return endDay();
  }
  s.queue.splice(i, 1);
  if (res.kind === "leftPrice") {
    say(`${emoji} 💭🏷️❌ För dyrt! Kunden lyfter på axlarna och vinkar adjö 👋`, "err");
    return render();
  }
  s.active = makeActive(res, emoji);
  say("");
  render();
}

function endDay(): void {
  window.clearInterval(timer);
  const costs = s.purchases + s.upgradeSpend;
  s.history.push({ day: s.day, income: s.income + s.tips, costs, profit: s.income + s.tips - costs });
  s.phase = "summary";
  render();
}

function nextDay(): void {
  if (s.day >= DAYS[s.r]) {
    s.phase = "end";
    return render();
  }
  s.day++;
  s.purchases = 0;
  s.upgradeSpend = 0;
  s.feedback = "";
  say("");
  s.phase = "market";
  const step = priceStep(s.r, s.day);
  const changed = s.menu.filter((v) => v.price % step !== 0);
  if (changed.length > 0) {
    s.menu = s.menu.map((v) => ({ ...v, price: roundUpToStep(v.price, step) }));
    say(
      `Från i dag måste priserna vara delbara med ${step}, så att ${step === 2 ? "halva" : "fjärdedels"} pizzor blir hela kronor. Dessa priser har rundats upp: ${changed.map((v) => v.name).join(", ")}.`,
      "ok",
    );
  }
  render();
}

// ---------------------------------------------------------------------------
// Händelser
// ---------------------------------------------------------------------------

app.addEventListener("click", (e) => {
  const el = (e.target as HTMLElement).closest<HTMLElement>("[data-act]");
  if (!el) return;
  const d = el.dataset;
  switch (d.act) {
    case "start":
      s = fresh(d.r as Restaurant);
      return render();
    case "buy": {
      const offer = offersFor(s.r, s.day, d.i as string).find(
        (o) => o.sellerId === Number(d.s) && o.qty === Number(d.q),
      );
      if (!offer || offer.price > s.money) return;
      s.money -= offer.price;
      s.purchases += offer.price;
      s.stock = { ...s.stock, [d.i as string]: (s.stock[d.i as string] ?? 0) + offer.qty * 4 };
      if (s.r === "pizza") {
        const f = purchaseFeedback(s.r, s.day, d.i as string, { sellerId: offer.sellerId, qty: offer.qty });
        s.feedback = f.best
          ? `Bra val! Du sparade ${f.amount} kr på att välja den här säljaren.`
          : `Säljare ${f.bestOffer.sellerId} (${f.bestOffer.qty} st) hade varit billigare: du kunde ha sparat ${f.amount} kr.`;
      }
      return render();
    }
    case "upg": {
      const cost = nextUpgradeCost(s.r, d.id as string, s.upgrades);
      if (cost === null || cost > s.money) return;
      s.money -= cost;
      s.upgradeSpend += cost;
      s.upgrades = { ...s.upgrades, [d.id as string]: (s.upgrades[d.id as string] ?? 0) + 1 };
      return render();
    }
    case "del":
      s.menu = s.menu.filter((v) => v.id !== d.id);
      return render();
    case "add": {
      const ids = s.draft.ids;
      const err = validateVariant(s.r, ids);
      if (err) return (say(err, "err"), render());
      const price = s.draft.price === "" ? minPrice(s.r, ids, s.day) : Number(s.draft.price);
      const perr = validatePrice(s.r, ids, price, s.day);
      if (perr) return (say(perr, "err"), render());
      const name = s.draft.name.trim() || `Sort ${s.menu.length + 1}`;
      s.menu = [...s.menu, { id: `v${Date.now()}${s.menu.length}`, name, ingredients: [...ids], price }];
      s.draft = { ids: [], name: "", price: "" };
      say("");
      return render();
    }
    case "inc":
      addIngredient(d.id as string);
      return render();
    case "dec": {
      const at = s.draft.ids.lastIndexOf(d.id as string);
      if (at >= 0) s.draft.ids = s.draft.ids.filter((_, k) => k !== at);
      return render();
    }
    case "frost":
      addIngredient(d.id as string);
      return render();
    case "nextcust":
      return nextCupcakeCustomer();
    case "open":
      return openRestaurant();
    case "answer":
      return answer();
    case "tap":
      return tapCustomer(Number(d.i));
    case "cell": {
      const t = s.deliveries[s.deliveryIdx] as { x: number; y: number };
      if (Number(d.x) !== t.x || Number(d.y) !== t.y) {
        say("Inte här!", "err");
        return render();
      }
      s.deliveryIdx++;
      say("Levererat!", "ok");
      if (s.deliveryIdx >= s.deliveries.length) return endDay();
      return render();
    }
    case "next":
      return nextDay();
    case "again":
      s = fresh(s.r);
      return render();
  }
});

app.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && (e.target as HTMLElement).id === "ans") answer();
});

// Dra ingredienser till bottnen (mus). På mobil används +-knapparna.
app.addEventListener("dragstart", (e) => {
  const el = (e.target as HTMLElement).closest<HTMLElement>("[data-drag]");
  if (el?.dataset.drag) e.dataTransfer?.setData("text/plain", el.dataset.drag);
});
app.addEventListener("dragover", (e) => {
  const zone = (e.target as HTMLElement).closest<HTMLElement>("[data-drop]");
  if (zone) {
    e.preventDefault();
    zone.classList.add("over");
  }
});
app.addEventListener("dragleave", (e) => {
  (e.target as HTMLElement).closest<HTMLElement>("[data-drop]")?.classList.remove("over");
});
app.addEventListener("drop", (e) => {
  const zone = (e.target as HTMLElement).closest<HTMLElement>("[data-drop]");
  if (!zone) return;
  e.preventDefault();
  const id = e.dataTransfer?.getData("text/plain");
  if (id) {
    addIngredient(id);
    render();
  }
});

app.addEventListener("input", (e) => {
  const el = e.target as HTMLInputElement;
  if (el.dataset.dname !== undefined) s.draft.name = el.value;
  if (el.dataset.dprice !== undefined) s.draft.price = el.value;
});

app.addEventListener("change", (e) => {
  const el = e.target as HTMLInputElement;
  if (el.dataset.vprice) {
    const v = s.menu.find((m) => m.id === el.dataset.vprice);
    if (v) v.price = Math.round(Number(el.value));
  }
});

s = fresh("cupcake");
s.phase = "start";
(window as unknown as { __state: () => State }).__state = () => s;
render();
