/**
 * Provsida för scenerna: knappar som skickar samma händelser som spelet ska
 * skicka. Öppna /cafestjarnan/scene.html med `bun run dev:client`.
 */
import { SPECIES, createScene, type SceneHandle, type SceneKind } from "./scene";

const host = document.getElementById("stage") as HTMLElement;
const controls = document.getElementById("controls") as HTMLElement;
const tabs = document.getElementById("tabs") as HTMLElement;
const logEl = document.getElementById("log") as HTMLElement;

let handle: SceneHandle | null = null;
let kind: SceneKind = "pizzeria";
let counter = 0;
let timers = new Map<string, number>();
const waiting: string[] = [];
let atCounter: string | null = null;
let target: { x: number; y: number } | null = null;
let gridSize = 5;

const log = (t: string): void => {
  logEl.textContent = t;
};
const send = (e: Parameters<SceneHandle["scene"]["handle"]>[0]): void => handle?.scene.handle(e);
const pickSpecies = () => SPECIES[Math.floor(Math.random() * SPECIES.length)] ?? "rav";

function arrive(): void {
  const id = `c${counter++}`;
  waiting.push(id);
  send({ type: "customerArrives", id, species: pickSpecies() });
}

function stopTimer(id: string): void {
  const t = timers.get(id);
  if (t) window.clearInterval(t);
  timers.delete(id);
}

function take(id: string): void {
  const at = waiting.indexOf(id);
  if (at < 0 || atCounter) return;
  waiting.splice(at, 1);
  atCounter = id;
  send({ type: "orderTaken", id });
  const start = performance.now();
  const total = 14000;
  timers.set(
    id,
    window.setInterval(() => {
      const f = 1 - (performance.now() - start) / total;
      send({ type: "patience", id, fraction: Math.max(0, f) });
      if (f <= 0) {
        stopTimer(id);
        atCounter = null;
        send({ type: "customerLeaves", id, reason: "patience" });
        log("Tålamodet tog slut: kunden gäspar och går.");
      }
    }, 100),
  );
  log("Beställning tagen: tålamodsmätaren rinner.");
}

function finish(tip: boolean): void {
  if (!atCounter) return log("Ingen kund vid disken.");
  const id = atCounter;
  stopTimer(id);
  send({ type: "patience", id, fraction: null });
  send({ type: "customerServed", id, tip });
  atCounter = null;
  log(tip ? "Nöjd kund med dricks!" : "Nöjd kund.");
}

function shopControls(): [string, () => void][] {
  return [
    ["Ny kund", arrive],
    ["5 kunder", () => Array.from({ length: 5 }, arrive)],
    ["Ta beställning (första i kön)", () => (waiting[0] ? take(waiting[0]) : log("Kön är tom."))],
    ["Servera", () => finish(false)],
    ["Servera med dricks", () => finish(true)],
    ["Tveksam (hmm)", () => { const id = atCounter ?? waiting[0]; if (id) send({ type: "customerHesitates", id }); }],
    ["Fel summa", () => { if (atCounter) send({ type: "wrongAnswer", id: atCounter }); }],
    ["Går: för dyrt", () => {
      const id = waiting.shift();
      if (id) send({ type: "customerLeaves", id, reason: "price" });
    }],
    ["Går: slut på ingredienser", () => {
      const id = waiting.shift();
      if (id) send({ type: "customerLeaves", id, reason: "noStock" });
    }],
    ["Rensa", () => {
      for (const id of [...timers.keys()]) stopTimer(id);
      waiting.length = 0;
      atCounter = null;
      send({ type: "clear" });
    }],
  ];
}

function newDelivery(): void {
  target = { x: 1 + Math.floor(Math.random() * gridSize), y: 1 + Math.floor(Math.random() * gridSize) };
  log(`Leverera till (${target.x},${target.y}). Tryck på ett hus!`);
}

function cityControls(): [string, () => void][] {
  const size = (n: number): [string, () => void] => [
    `Rutnät ${n}×${n}`,
    () => {
      gridSize = n;
      send({ type: "newDay", gridSize: n });
      newDelivery();
    },
  ];
  return [size(5), size(6), size(7), ["Ny leverans", newDelivery]];
}

async function show(next: SceneKind): Promise<void> {
  kind = next;
  for (const id of [...timers.keys()]) stopTimer(id);
  waiting.length = 0;
  atCounter = null;
  handle?.destroy();
  host.innerHTML = "";
  handle = await createScene(host, kind);
  tabs.innerHTML = "";
  for (const [k, label] of [["pizzeria", "Pizzeria"], ["cafe", "Café"], ["city", "Staden"]] as const) {
    const b = document.createElement("button");
    b.className = `tab${k === kind ? " on" : ""}`;
    b.textContent = label;
    b.onclick = () => void show(k);
    tabs.appendChild(b);
  }
  controls.innerHTML = "";
  for (const [label, fn] of kind === "city" ? cityControls() : shopControls()) {
    const b = document.createElement("button");
    b.textContent = label;
    b.onclick = fn;
    controls.appendChild(b);
  }
  handle.scene.onTap = (id) => {
    log(`Tryckte på kund ${id}`);
    take(id);
  };
  handle.scene.onLotTap = (x, y) => {
    if (!target) newDelivery();
    log(`Bilen kör till (${x},${y})...`);
    send({ type: "carDrive", x, y });
  };
  handle.scene.onCarArrived = (x, y) => {
    if (target && x === target.x && y === target.y) {
      send({ type: "delivered", x, y });
      log(`Levererat till (${x},${y})!`);
      newDelivery();
    } else {
      send({ type: "deliveryWrong", x, y });
      log(`Inte här! Målet är (${target?.x},${target?.y}).`);
    }
  };
  if (kind === "city") newDelivery();
  else {
    log(handle.foundArt.length ? `Hittade ${handle.foundArt.length} bilder.` : "Inga riktiga bilder än: platshållare används.");
    arrive();
    arrive();
    arrive();
  }
  (window as unknown as { __scene: SceneHandle }).__scene = handle;
}

void show("pizzeria");
