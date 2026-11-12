import { CUPCAKE_SPARE_CUSTOMERS, PIZZA_SALES_SECONDS } from "../../../shared/data";
import { pick, randInt } from "../../../shared/rng";
import {
  INITIAL_PACE,
  WRONG_ANSWER_DRAIN,
  consumeStock,
  cupcakeOrdersPerDay,
  formatQuarters,
  generateOrder,
  gridSize,
  makeCustomer,
  needFor,
  orderTotal,
  paceOnCorrect,
  paceOnWrong,
  patienceSeconds,
  queueSize,
  refundStock,
  tipPerHappyCustomer,
  type OrderLine,
} from "../../../shared/rules";
import { PizzeriaScene, SPECIES, type Species } from "../scene";
import { Register } from "../ui/register";
import { portrait } from "./portrait";
import { esc, msgLine, say, type Ctx, type State } from "./state";

interface Active {
  id: string;
  species: Species;
  lines: OrderLine[];
  total: number;
  need: Record<string, number>;
  hesitant: boolean;
  patienceMax: number;
  elapsed: number;
  wrong: number;
  ready: boolean;
}

const orderText = (s: State, lines: readonly OrderLine[]): string =>
  lines.map((l) => `${formatQuarters(l.qty)} ${s.menu.find((m) => m.id === l.variantId)?.name ?? "?"}`).join(" och ");

/** En ask per pizza (halva och fjärdedelar räknas som en ask). */
const boxesFor = (lines: readonly OrderLine[]): number => lines.reduce((n, l) => n + Math.ceil(l.qty / 4), 0);

const orderCtx = (s: State) => ({ r: s.r, day: s.day, rng: s.rng, customer: makeCustomer(s.r, s.rng, s.day), menu: s.menu, stock: s.stock, upgrades: s.upgrades });

/** Dras ur lagret när kunden beställer, och återlämnas om kunden går utan att få något. */
function takeOrder(s: State, id: string, species: Species, res: { lines: OrderLine[]; hesitant: boolean }): Active {
  const need = needFor(res.lines, s.menu);
  s.stock = consumeStock(s.stock, need);
  return {
    id,
    species,
    lines: res.lines,
    total: orderTotal(res.lines, s.menu),
    need,
    hesitant: res.hesitant,
    patienceMax: s.r === "pizza" ? patienceSeconds(s.day, res.lines.length, s.upgrades) * s.pace.factor : 0,
    elapsed: 0,
    wrong: 0,
    ready: false,
  };
}

/** Menyn med priser, så att spelaren vet vad allt kostar. */
function menuPanel(s: State, cls = "menu-panel"): string {
  const rows = s.menu.map((v) => `<div><span>${esc(v.name)}</span><b>${v.price} kr</b></div>`).join("");
  return `<div class="${cls}"><h4>Meny</h4>${rows}</div>`;
}

const setMsg = (root: HTMLElement, text: string, kind: "ok" | "err" | "" = ""): void => {
  const m = root.querySelector<HTMLElement>("#msg");
  if (m) {
    m.textContent = text;
    m.className = `msg ${kind}`;
  }
};

// ---------------------------------------------------------------------------
// Pizza: 60 sekunder, kö, tålamodsmätare, kassa
// ---------------------------------------------------------------------------

export function pizzaSales(c: Ctx): () => void {
  const { s, root } = c;
  s.income = 0;
  s.tips = 0;
  s.pace = INITIAL_PACE;
  say(s, "");
  root.innerHTML = `<div class="stagewrap"><div id="stage" class="stage"></div>${menuPanel(s)}<div class="clock" id="clock">${PIZZA_SALES_SECONDS}</div><div id="regbox" class="over"></div></div>
    ${msgLine(s)}<p class="tip">Tryck på en kund i kön, räkna ut summan och slå in den på kassan.</p>`;
  const stage = root.querySelector<HTMLElement>("#stage") as HTMLElement;
  const regbox = root.querySelector<HTMLElement>("#regbox") as HTMLElement;
  const clock = root.querySelector<HTMLElement>("#clock") as HTMLElement;

  const scene = new PizzeriaScene();
  const register = new Register(regbox, [], { compact: true });
  register.setEnabled(false);
  register.setHint(`Meny: ${s.menu.map((v) => `${v.name} ${v.price} kr`).join(" · ")}`);

  let queue = Array.from({ length: queueSize(s.day, s.upgrades) }, (_, i) => ({ id: `k${i}`, species: pick(s.rng, [...SPECIES]) as Species }));
  let active: Active | null = null;
  let timeLeft = PIZZA_SALES_SECONDS;
  let ending = false;
  let dead = false;
  let mounted = false;
  let timer: number | undefined;
  const timeouts: number[] = [];
  const later = (fn: () => void, ms: number): void => void timeouts.push(window.setTimeout(() => !dead && fn(), ms));

  const finishDay = (afterMs: number): void => {
    ending = true;
    window.clearInterval(timer);
    register.setEnabled(false);
    later(() => c.endDay(), afterMs);
  };

  const leave = (a: Active, reason: "patience" | "price"): void => {
    s.stock = refundStock(s.stock, a.need);
    if (active === a) active = null;
    register.setEnabled(false);
    register.clear();
    scene.setPatience(a.id, null);
    void scene.customerLeaves(a.id, reason);
  };

  const outOfStock = (): void => {
    setMsg(root, "😕 Slut på ingredienser! Inga pizzor går att beställa, kunderna går hem.", "err");
    queue.forEach((q, i) => later(() => void scene.customerLeaves(q.id, "noStock"), i * 250));
    const n = queue.length;
    queue = [];
    finishDay(Math.min(n, 6) * 250 + 2500);
  };

  const timeUp = (): void => {
    if (active) leave(active, "patience");
    queue.forEach((q, i) => later(() => void scene.customerLeaves(q.id, "patience"), i * 250));
    const n = queue.length;
    queue = [];
    finishDay(Math.min(n, 6) * 250 + 2200);
  };

  const tap = (id: string): void => {
    if (active || ending) return;
    const q = queue.find((x) => x.id === id);
    if (!q) return;
    const res = generateOrder(orderCtx(s));
    if (res.kind === "noneAvailable") return outOfStock();
    queue = queue.filter((x) => x !== q);
    if (res.kind === "leftPrice") {
      setMsg(root, "💭🏷️ För dyrt! Kunden lyfter på axlarna och vinkar adjö.", "err");
      void scene.customerLeaves(q.id, "price");
      return;
    }
    const a = takeOrder(s, q.id, q.species, res);
    active = a;
    setMsg(root, "");
    void scene.customerOrders(q.id, orderText(s, a.lines)).then(() => {
      if (dead || active !== a) return;
      a.ready = true;
      register.clear();
      register.setEnabled(true);
      register.setHint(a.hesitant ? "🤔 Kunden tycker att det är dyrt och köper mindre." : `Meny: ${s.menu.map((v) => `${v.name} ${v.price} kr`).join(" · ")}`);
      if (a.hesitant) scene.customerReacts(a.id, "unsure");
    });
  };

  register.onSubmit(({ amount }) => {
    const a = active;
    if (!a || !a.ready) return;
    if (amount !== null && Math.round(amount * 100) === a.total * 100) {
      s.pace = paceOnCorrect(s.pace);
      const tip = !a.hesitant && a.wrong === 0 ? tipPerHappyCustomer(s.upgrades) : 0;
      s.income += a.total;
      s.tips += tip;
      s.money += a.total + tip;
      active = null;
      register.ok();
      register.setEnabled(false);
      scene.setPatience(a.id, null);
      void scene.customerLeaves(a.id, "paid", boxesFor(a.lines));
      setMsg(root, `Pling! +${a.total + tip} kr`, "ok");
      c.hud();
    } else {
      a.wrong++;
      s.pace = paceOnWrong(s.pace);
      register.wrong();
      if (a.wrong >= 2) {
        setMsg(root, "Två fel: kunden tröttnade och gick.", "err");
        leave(a, "patience");
      } else setMsg(root, "PIP! Fel summa. Kunden blir otålig.", "err");
    }
  });

  const tick = (): void => {
    if (ending) return;
    timeLeft -= 0.1;
    clock.textContent = String(Math.max(0, Math.ceil(timeLeft)));
    const a = active;
    if (a?.ready) {
      a.elapsed += 0.1 * (a.wrong > 0 ? WRONG_ANSWER_DRAIN : 1);
      scene.setPatience(a.id, Math.max(0, 1 - a.elapsed / a.patienceMax));
      if (a.elapsed >= a.patienceMax) {
        setMsg(root, "🥱 Kunden gäspade och gick.", "err");
        leave(a, "patience");
      }
    }
    if (timeLeft <= 0) return timeUp();
    if (queue.length === 0 && !active) finishDay(1800);
  };

  void scene.mount(stage).then(() => {
    mounted = true;
    if (dead) return scene.destroy();
    scene.onCustomerTap(tap);
    queue.forEach((q, i) => later(() => void scene.customerArrives(q.id, q.species), i * 450));
    timer = window.setInterval(tick, 100);
  });
  c.hud();
  (window as unknown as Record<string, unknown>).__pizza = { tap, ids: () => queue.map((q) => q.id), active: () => (active ? { total: active.total, ready: active.ready } : null) };

  return () => {
    dead = true;
    window.clearInterval(timer);
    for (const t of timeouts) window.clearTimeout(t);
    register.destroy();
    if (mounted) scene.destroy();
  };
}

// ---------------------------------------------------------------------------
// Cupcake: lugnt, en kund i taget, ta emot beställningen och summera
// ---------------------------------------------------------------------------

export function cupcakeSales(c: Ctx): () => void {
  const { s, root } = c;
  s.income = 0;
  s.tips = 0;
  s.deliveries = [];
  say(s, "");
  const target = cupcakeOrdersPerDay(s.upgrades);
  let arrivals = 0;
  let taken = 0;
  let cur: Active | null = null;
  let dead = false;
  let auto: number | undefined;

  root.innerHTML = `<div class="top2"><h2>Försäljning</h2><span id="prog"></span></div>${msgLine(s)}
    <div class="cupgrid"><div class="card cust"><div id="who"></div><div class="speech" id="bubble"></div><div id="skipbox"></div></div>
    <div id="regbox" class="under"></div></div>
    ${menuPanel(s, "card menu-inline")}`;
  const who = root.querySelector<HTMLElement>("#who") as HTMLElement;
  const bubble = root.querySelector<HTMLElement>("#bubble") as HTMLElement;
  const skipbox = root.querySelector<HTMLElement>("#skipbox") as HTMLElement;
  const prog = root.querySelector<HTMLElement>("#prog") as HTMLElement;
  const regbox = root.querySelector<HTMLElement>("#regbox") as HTMLElement;
  const items = s.menu.map((v) => ({ id: v.id, label: v.name, icon: "🧁", price: v.price }));
  const register = new Register(regbox, items);
  register.setEnabled(false);

  const showWho = (species: Species, pose: "pratar" | "glad" | "tveksam" | "gapar" | "vinkar" | "vantar", text: string): void => {
    who.replaceChildren(portrait(species, pose));
    bubble.textContent = text;
  };

  const finishOrders = (): void => {
    if (dead) return;
    if (s.deliveries.length > 0) c.go("delivery");
    else c.endDay();
  };

  const next = (): void => {
    window.clearTimeout(auto);
    skipbox.replaceChildren();
    if (dead) return;
    const enough = taken >= target || arrivals >= target + CUPCAKE_SPARE_CUSTOMERS;
    prog.textContent = `Beställning ${Math.min(taken + 1, target)} av ${target}`;
    if (enough) return finishOrders();
    arrivals++;
    const species = pick(s.rng, [...SPECIES]) as Species;
    const res = generateOrder(orderCtx(s));
    register.setEnabled(false);
    register.clear();
    if (res.kind === "noneAvailable") {
      arrivals = Number.MAX_SAFE_INTEGER;
      showWho(species, "tveksam", "😕 Slut på ingredienser! Kunderna går hem.");
      return pause(2200);
    }
    if (res.kind === "leftPrice") {
      showWho(species, "tveksam", "💭🏷️ För dyrt … *lyfter på axlarna och vinkar*");
      return pause(1800);
    }
    const a = takeOrder(s, `c${arrivals}`, species, res);
    cur = a;
    showWho(species, "pratar", `Jag vill ha ${orderText(s, a.lines)}!${a.hesitant ? " 🤔 (Det var dyrt, så bara hälften.)" : ""}`);
    register.setEnabled(true);
    register.setHint("Tryck på varje cupcake kunden vill ha, slå in summan och tryck ✓.");
  };

  /** Visar kundens reaktion en stund, men man kan gå vidare direkt. */
  const pause = (ms: number): void => {
    const b = document.createElement("button");
    b.textContent = "Nästa kund ▶";
    b.className = "alt";
    b.addEventListener("click", next);
    skipbox.replaceChildren(b);
    auto = window.setTimeout(next, ms);
  };

  register.onSubmit(({ counts, amount }) => {
    const a = cur;
    if (!a) return;
    const rightCounts = s.menu.every((v) => (counts[v.id] ?? 0) * 4 === (a.lines.find((l) => l.variantId === v.id)?.qty ?? 0));
    const rightSum = amount !== null && Math.round(amount * 100) === a.total * 100;
    if (!rightCounts || !rightSum) {
      register.wrong();
      setMsg(root, !rightCounts ? "PIP! Beställningen stämmer inte med vad kunden bad om." : "PIP! Fel summa, försök igen.", "err");
      return;
    }
    cur = null;
    const tip = a.hesitant ? 0 : tipPerHappyCustomer(s.upgrades);
    s.income += a.total;
    s.tips += tip;
    s.money += a.total + tip;
    taken++;
    const n = gridSize(s.day);
    const d = { x: randInt(s.rng, 1, n), y: randInt(s.rng, 1, n) };
    s.deliveries.push(d);
    register.ok();
    register.setEnabled(false);
    showWho(a.species, "glad", "Tack! ❤️");
    setMsg(root, `Pling! +${a.total + tip} kr. Leverans till (${d.x},${d.y}) väntar.`, "ok");
    c.hud();
    // nästa kund kommer direkt, man behöver inte vänta på att den förra går
    window.clearTimeout(auto);
    auto = window.setTimeout(next, 900);
    skipbox.replaceChildren();
  });

  c.hud();
  next();
  (window as unknown as Record<string, unknown>).__cupcake = { current: () => (cur ? { total: cur.total, lines: cur.lines } : null) };

  return () => {
    dead = true;
    window.clearTimeout(auto);
    register.destroy();
  };
}
