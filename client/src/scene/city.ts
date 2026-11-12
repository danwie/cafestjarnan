import { Container, Graphics, Rectangle, Text } from "pixi.js";
import { AnimalActor } from "./actors";
import { walk, type Walkable } from "./anim";
import { BaseScene } from "./base";
import type { Proj } from "./iso";
import { FONT, INK, SPECIES } from "./manifest";

/** Måtten i bildpunkter. Vägarna ligger på heltalslinjer; husen i rutorna mellan dem. */
const PITCH = 260; // avstånd mellan två vägar
const ROAD = 92; // vägbredd
const WALK = 60; // fotgängarnas led: avstånd från vägmitten (trottoaren, övergångsställena ligger här)
const CAR_SPEED = 2.2; // rutor per sekund (en ruta = en kvarterslängd)

const HOUSE_COLORS = [0xff6fa5, 0xffc730, 0x3fa7f5, 0xff8a2b, 0x3fc9a0, 0xf3e9dc];
const ROOF_COLORS = [0xef4d3c, 0xa8683a, 0x6b5bd6, 0x2f8f83];
const X_COLOR = 0x9ad7ff; // x-siffror (lodräta gator)
const Y_COLOR = 0xffe08a; // y-siffror (vågräta gator)

/** Rutnätskoordinater (gx, gy) till världskoordinater. */
const proj: Proj = (gx, gy, z = 0) => ({ x: gx * PITCH, y: gy * PITCH - z });

/** Hörn på en trottoar: korsning (cx, cy) och vilket av de fyra kvarteren runt den (sx, sy = ±1). */
interface Node {
  cx: number;
  cy: number;
  sx: number;
  sy: number;
}

interface Walker {
  actor: AnimalActor;
  from: Node;
  to: Node;
  t: number;
  speed: number; // bildpunkter per sekund
  crossing: boolean; // går över en väg (övergångsställe)
}

const nodePos = (n: Node): { x: number; y: number } => ({ x: n.cx * PITCH + n.sx * WALK, y: n.cy * PITCH + n.sy * WALK });

/** Leveransbilen sedd uppifrån (platshållare). Vrider sig åt det håll den kör. */
class Car extends Container implements Walkable {
  gx = 0;
  gy = 0;
  walking = false;
  walkToken = 0;
  /** Sätts av staden: true om en fotgängare går över vägen precis framför bilen. */
  blockedCheck: ((x: number, y: number, dirX: number, dirY: number) => boolean) | null = null;
  private readonly art = new Container();

  constructor() {
    super();
    const g = new Graphics();
    g.roundRect(-30, -17, 60, 34, 9).fill(0xef4d3c).stroke({ width: 3, color: INK, join: "round" });
    g.roundRect(-2, -13, 16, 26, 5).fill(0x8ad4ff).stroke({ width: 2.5, color: INK, join: "round" });
    g.roundRect(-26, -12, 14, 24, 4).fill(0xffffff).stroke({ width: 2.5, color: INK, join: "round" });
    g.circle(28, -9, 3.5).fill(0xfff2a8);
    g.circle(28, 9, 3.5).fill(0xfff2a8);
    this.art.addChild(g);
    this.addChild(this.art);
  }

  faceDx(): void {}

  heading(dx: number, dy: number): void {
    if (Math.hypot(dx, dy) > 0.01) this.art.rotation = Math.atan2(dy, dx);
  }

  blocked(): boolean {
    const r = this.art.rotation;
    return this.blockedCheck?.(this.x, this.y, Math.cos(r), Math.sin(r)) ?? false;
  }

  place(p: Proj): void {
    const q = p(this.gx, this.gy);
    this.position.set(q.x, q.y);
    this.zIndex = q.y + 1000;
  }
}

/**
 * Staden för cupcake-leveranserna, sedd uppifrån. Kameran följer bilen, så man ser
 * bara några kvarter i taget och navigerar med hjälp av siffrorna på vägarna:
 * blå siffror på de lodräta gatorna (x), gula på de vågräta (y). En leverans till (x, y)
 * är hörnet där gata x och gata y möts.
 */
export class CityScene extends BaseScene {
  private n = 5;
  private readonly cam = new Container();
  private readonly ground = new Container();
  private readonly marker = new Graphics();
  private readonly sorted = new Container();
  private readonly car = new Car();
  private carC = { cx: 0, cy: 0 };
  private camPos = { x: 0, y: 0 };
  private walkers: Walker[] = [];
  private pedestrianCount = 6;
  private tapCb: ((x: number, y: number) => void) | null = null;
  private target: { x: number; y: number } | null = null;
  private readonly keys: string[] = []; // nedtryckta riktningar, senaste sist
  private carDir = { dx: 0, dy: 0 };
  private dropped = true; // true tills bilen har rört sig
  private steered = false;
  private dropCb: ((x: number, y: number) => void) | null = null;
  private readonly onKeyDown = (e: KeyboardEvent): void => this.key(e, true);
  private readonly onKeyUp = (e: KeyboardEvent): void => this.key(e, false);

  /** Anropas när spelaren trycker på ett kvarter eller en gata. Bilen kör då till kvarterets nedre högra hörn. */
  onTileTap(cb: (x: number, y: number) => void): void {
    this.tapCb = cb;
  }

  gridSize(): number {
    return this.n;
  }

  carPosition(): { cx: number; cy: number } {
    return { ...this.carC };
  }

  pedestrians(): number {
    return this.walkers.length;
  }

  /** Bygger om staden med n x n kvarter (5-7). */
  setGrid(n: number): void {
    this.n = Math.max(2, Math.min(9, Math.round(n)));
    this.rebuild();
  }

  setPedestrians(count: number): void {
    this.pedestrianCount = Math.max(0, Math.min(30, Math.round(count)));
    this.spawnWalkers();
  }

  /** Visar var (x, y) ligger (för handledning). null döljer. Spelet behöver inte använda den. */
  highlight(x: number | null, y?: number): void {
    this.target = x === null ? null : { x, y: y ?? 1 };
    this.drawMarker();
  }

  /** Bilen kör längs gatorna till hörnet (x, y). */
  async driveTo(x: number, y: number): Promise<boolean> {
    const tx = Math.max(0, Math.min(this.n, x));
    const ty = Math.max(0, Math.min(this.n, this.n - y + 1));
    this.carDir = { dx: 0, dy: 0 };
    const onH = Math.abs(this.car.gy - Math.round(this.car.gy)) < 1e-3;
    const pts = onH
      ? [
          { gx: tx, gy: this.car.gy },
          { gx: tx, gy: ty },
        ]
      : [
          { gx: this.car.gx, gy: ty },
          { gx: tx, gy: ty },
        ];
    this.dropped = false;
    const token = this.car.walkToken + 1;
    await walk(this.anim, this.car, proj, pts, CAR_SPEED);
    this.carC = { cx: this.car.gx, cy: this.car.gy };
    if (this.car.walkToken !== token) return false; // en ny körning eller tangenterna tog över
    this.autoDrop();
    return true;
  }

  /** Bilen har stannat på ett hörn: leveransen lämnas automatiskt (en gång per stopp). */
  private autoDrop(): void {
    const c = this.carCorner(0.12);
    if (!c || this.dropped) return;
    this.dropped = true;
    this.car.gx = Math.round(this.car.gx);
    this.car.gy = Math.round(this.car.gy);
    this.car.place(proj);
    this.dropCb?.(c.x, c.y);
  }

  /** Hörnet (x, y) som bilen står på, eller null om den är mitt på en väg. */
  carCorner(tol = 1e-3): { x: number; y: number } | null {
    const { gx, gy } = this.car;
    if (Math.abs(gx - Math.round(gx)) > tol || Math.abs(gy - Math.round(gy)) > tol) return null;
    return { x: Math.round(gx), y: this.n - Math.round(gy) + 1 };
  }

  /** Anropas automatiskt när bilen har stannat på ett hörn (efter tryck eller när tangenterna släpps). */
  onDrop(cb: (x: number, y: number) => void): void {
    this.dropCb = cb;
  }

  private key(e: KeyboardEvent, down: boolean): void {
    const t = e.target as HTMLElement | null;
    if (t && /^(INPUT|SELECT|TEXTAREA)$/.test(t.tagName)) return;
    const map: Record<string, string> = { w: "u", a: "l", s: "d", d: "r", arrowup: "u", arrowleft: "l", arrowdown: "d", arrowright: "r" };
    const dir = map[e.key.toLowerCase()];
    if (dir) {
      e.preventDefault();
      const i = this.keys.indexOf(dir);
      if (i >= 0) this.keys.splice(i, 1);
      if (down) this.keys.push(dir);
    }
  }

  /** Styrning med tangenter: bilen följer gatorna och kan svänga i korsningarna. */
  private steer(dt: number): void {
    const car = this.car;
    const last = this.keys[this.keys.length - 1];
    if (!last) {
      this.carDir = { dx: 0, dy: 0 };
      if (this.steered) {
        this.steered = false;
        car.walking = false;
        this.autoDrop();
      }
      return;
    }
    if (!this.steered) this.dropped = false;
    this.steered = true;
    car.walkToken++; // avbryter en körning som pågår
    const want = { u: [0, -1], d: [0, 1], l: [-1, 0], r: [1, 0] }[last] as [number, number];
    const near = (v: number): boolean => Math.abs(v - Math.round(v)) < 0.2;
    const onH = Math.abs(car.gy - Math.round(car.gy)) < 1e-3;
    const onV = Math.abs(car.gx - Math.round(car.gx)) < 1e-3;
    let [dx, dy] = want;
    if (dx !== 0 && !onH) {
      if (near(car.gy)) car.gy = Math.round(car.gy);
      else [dx, dy] = [this.carDir.dx, this.carDir.dy]; // fortsätt tills nästa korsning
    } else if (dy !== 0 && !onV) {
      if (near(car.gx)) car.gx = Math.round(car.gx);
      else [dx, dy] = [this.carDir.dx, this.carDir.dy];
    }
    if (dx === 0 && dy === 0) return;
    car.heading(dx, dy);
    if (car.blocked()) {
      car.walking = false; // väntar på fotgängare
      return;
    }
    const step = CAR_SPEED * dt;
    const nx = Math.max(0, Math.min(this.n, car.gx + dx * step));
    const ny = Math.max(0, Math.min(this.n, car.gy + dy * step));
    const moved = nx !== car.gx || ny !== car.gy;
    car.gx = nx;
    car.gy = ny;
    this.carDir = { dx, dy };
    car.walking = moved;
    if (moved) car.heading(dx, dy);
    car.place(proj);
    this.carC = { cx: car.gx, cy: car.gy };
  }

  /** Visar att leveransen lyckades (hjärta) eller inte (fråga) vid hörnet (x, y). */
  flash(x: number, y: number, ok: boolean): void {
    const p = proj(x, this.n - y + 1, 40);
    const node = new Text({ text: ok ? "❤️" : "❓", style: { fontFamily: FONT, fontSize: 48 } });
    node.anchor.set(0.5);
    node.position.set(p.x, p.y);
    node.zIndex = 99999;
    this.sorted.addChild(node);
    let life = 1.3;
    void this.anim.run((dt) => {
      life -= dt;
      node.y -= dt * 40;
      node.alpha = Math.max(0, life / 1.3);
      if (life <= 0) {
        node.destroy();
        return true;
      }
      return false;
    });
  }

  protected build(): void {
    this.sorted.sortableChildren = true;
    this.ground.eventMode = "static";
    this.ground.on("pointertap", (e) => {
      // tryck på en gata: bilen kör till närmaste korsning
      const p = this.cam.toLocal(e.global);
      const gx = Math.max(1, Math.min(this.n, Math.round(p.x / PITCH)));
      const gy = Math.max(1, Math.min(this.n, Math.round(p.y / PITCH)));
      this.tapCb?.(gx, this.n - gy + 1);
    });
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    this.car.blockedCheck = (x, y, dx, dy) => this.crosserAhead(x + dx * 50, y + dy * 50);
    this.cam.addChild(this.ground, this.marker, this.sorted);
    this.world.addChild(this.cam);
    this.sorted.addChild(this.car);
    this.rebuild();
  }

  private rebuild(): void {
    const n = this.n;
    for (const c of this.ground.removeChildren()) c.destroy({ children: true });
    for (const c of [...this.sorted.children]) if (c !== this.car) c.destroy({ children: true });
    const g = new Graphics();
    const lo = -PITCH * 0.9;
    const hi = n * PITCH + PITCH * 0.9;
    // gräs runt hela staden
    g.rect(lo - 400, lo - 400, hi - lo + 800, hi - lo + 800).fill(0xbfe8b0);
    // kvarter: trottoar, gräsmatta
    const half = ROAD / 2;
    for (let gx = 0; gx < n; gx++) {
      for (let gy = 0; gy < n; gy++) {
        const x0 = gx * PITCH + half;
        const y0 = gy * PITCH + half;
        const s = PITCH - ROAD;
        g.roundRect(x0, y0, s, s, 14).fill(0xe9dcc6);
        g.roundRect(x0 + 26, y0 + 26, s - 52, s - 52, 10).fill(0x8fd694);
      }
    }
    // vägar
    for (let k = 0; k <= n; k++) {
      g.rect(k * PITCH - half, -half - PITCH * 0.5, ROAD, n * PITCH + ROAD + PITCH).fill(0x8c8c99);
      g.rect(-half - PITCH * 0.5, k * PITCH - half, n * PITCH + ROAD + PITCH, ROAD).fill(0x8c8c99);
    }
    // mittlinjer (streckade) mellan korsningarna, och övergångsställen
    for (let k = 0; k <= n; k++) {
      for (let m = -1; m <= n; m++) {
        const a = m * PITCH + half + 40;
        const b = (m + 1) * PITCH - half - 40;
        const mid = (m + 0.5) * PITCH;
        for (let d = a; d < b - 18; d += 44) {
          if (Math.abs(d + 12 - mid) < 44) continue; // lämna plats åt siffran
          g.rect(k * PITCH - 2.5, d, 5, 24).fill(0xffe08a);
          g.rect(d, k * PITCH - 2.5, 24, 5).fill(0xffe08a);
        }
      }
    }
    for (let cx = 0; cx <= n; cx++) {
      for (let cy = 0; cy <= n; cy++) {
        for (let i = 0; i < 5; i++) {
          const o = -half + 12 + i * 15;
          const px = cx * PITCH;
          const py = cy * PITCH;
          if (cx < n) g.rect(px + half + 8, py + o, 16, 9).fill(0xffffff); // höger
          if (cx > 0) g.rect(px - half - 24, py + o, 16, 9).fill(0xffffff); // vänster
          if (cy < n) g.rect(px + o, py + half + 8, 9, 16).fill(0xffffff); // ned
          if (cy > 0) g.rect(px + o, py - half - 24, 9, 16).fill(0xffffff); // upp
        }
      }
    }
    this.ground.addChild(g);

    // gatusiffror: x på de lodräta, y på de vågräta, mitt på varje vägstycke
    const num = (text: string, x: number, y: number, color: number): void => {
      const t = new Text({ text, style: { fontFamily: FONT, fontSize: 52, fontWeight: "900", fill: color, stroke: { color: 0x3a2a33, width: 6, join: "round" } } });
      t.anchor.set(0.5);
      t.alpha = 0.92;
      t.position.set(x, y);
      this.ground.addChild(t);
    };
    for (let k = 1; k <= n; k++) {
      for (let m = 0; m < n; m++) {
        num(String(k), k * PITCH, (m + 0.5) * PITCH, X_COLOR); // vägen x = k
        const y = n - k + 1; // vågrät väg på rad gy = k har y = n - k + 1
        num(String(y), (m + 0.5) * PITCH, k * PITCH, Y_COLOR);
      }
    }

    // hus, ett per kvarter, tryckbara
    for (let gx = 0; gx < n; gx++) {
      for (let gy = 0; gy < n; gy++) {
        const color = HOUSE_COLORS[(gx * 3 + gy * 5) % HOUSE_COLORS.length] as number;
        const roof = ROOF_COLORS[(gx + gy * 2) % ROOF_COLORS.length] as number;
        const house = new Container();
        const h = new Graphics();
        const x0 = gx * PITCH + half + 44;
        const y0 = gy * PITCH + half + 44;
        const s = PITCH - ROAD - 88;
        h.roundRect(x0 + 8, y0 + 12, s, s, 10).fill({ color: INK, alpha: 0.18 }); // skugga
        h.roundRect(x0, y0, s, s, 10).fill(color).stroke({ width: 3, color: INK });
        h.roundRect(x0 + 10, y0 + 10, s - 20, s - 20, 8).fill(roof).stroke({ width: 3, color: INK });
        h.rect(x0 + s / 2 - 3, y0 + 10, 6, s - 20).fill({ color: INK, alpha: 0.2 });
        house.addChild(h);
        house.zIndex = y0;
        this.sorted.addChild(house);
        // tryckyta över hela kvarteret
        const x = gx + 1;
        const y = n - gy;
        const hit = new Container();
        hit.hitArea = new Rectangle(gx * PITCH + half, gy * PITCH + half, PITCH - ROAD, PITCH - ROAD);
        hit.eventMode = "static";
        hit.cursor = "pointer";
        hit.zIndex = 100000;
        hit.on("pointertap", () => this.tapCb?.(x, y));
        this.sorted.addChild(hit);
      }
    }

    // bilen parkerar nere till vänster (vid x = 0, y = 1)
    const car = this.car;
    car.walkToken++;
    car.walking = false;
    car.gx = 0;
    car.gy = n;
    car.place(proj);
    this.carC = { cx: 0, cy: n };
    this.dropped = true;
    this.steered = false;
    const c = proj(0, n);
    this.camPos = { x: c.x, y: c.y };
    this.target = null;
    this.drawMarker();
    this.spawnWalkers();
    this.applyCamera();
  }

  private drawMarker(): void {
    this.marker.clear();
    if (!this.target) return;
    const p = proj(this.target.x, this.n - this.target.y + 1);
    this.marker.circle(p.x, p.y, 56).fill({ color: 0xffc730, alpha: 0.55 }).stroke({ width: 4, color: INK });
  }

  /** Kameran glider mot bilen och stannar så att stadens kant inte syns för långt. */
  private applyCamera(): void {
    const m = PITCH * 0.55;
    const lo = -m;
    const hi = this.n * PITCH + m;
    const clamp = (v: number, size: number, min: number, max: number): number =>
      max - min <= size ? (min + max) / 2 : Math.max(min + size / 2, Math.min(max - size / 2, v));
    const cx = clamp(this.camPos.x, BaseScene.W, lo, hi);
    const cy = clamp(this.camPos.y, BaseScene.H, lo, hi);
    this.cam.position.set(BaseScene.W / 2 - cx, BaseScene.H / 2 - cy);
  }

  /** True om en fotgängare på ett övergångsställe står nära punkten (x, y). */
  private crosserAhead(x: number, y: number): boolean {
    return this.walkers.some((w) => w.crossing && Math.hypot(w.actor.x - x, w.actor.y - y) < 44);
  }

  private isValid(p: Node): boolean {
    const bx = p.sx > 0 ? p.cx : p.cx - 1;
    const by = p.sy > 0 ? p.cy : p.cy - 1;
    return bx >= 0 && bx < this.n && by >= 0 && by < this.n;
  }

  /** Grannar på trottoarnätet: längs ett kvarter, eller över en väg vid övergångsstället. */
  private neighbours(a: Node): { node: Node; crossing: boolean }[] {
    const n = this.n;
    const out: { node: Node; crossing: boolean }[] = [];
    const valid = (p: Node): boolean => {
      const bx = p.sx > 0 ? p.cx : p.cx - 1;
      const by = p.sy > 0 ? p.cy : p.cy - 1;
      return bx >= 0 && bx < n && by >= 0 && by < n;
    };
    if (valid(a)) {
      out.push({ node: { cx: a.cx + a.sx, cy: a.cy, sx: -a.sx, sy: a.sy }, crossing: false });
      out.push({ node: { cx: a.cx, cy: a.cy + a.sy, sx: a.sx, sy: -a.sy }, crossing: false });
    }
    const armY = a.cy + a.sy;
    if (armY >= 0 && armY <= n && valid({ ...a, sx: -a.sx })) out.push({ node: { ...a, sx: -a.sx }, crossing: true }); // över den lodräta vägen
    const armX = a.cx + a.sx;
    if (armX >= 0 && armX <= n && valid({ ...a, sy: -a.sy })) out.push({ node: { ...a, sy: -a.sy }, crossing: true }); // över den vågräta vägen
    return out;
  }

  private spawnWalkers(): void {
    for (const w of this.walkers) w.actor.destroy({ children: true });
    this.walkers = [];
    const n = this.n;
    for (let i = 0; i < this.pedestrianCount; i++) {
      let start: Node;
      do {
        start = { cx: Math.floor(Math.random() * (n + 1)), cy: Math.floor(Math.random() * (n + 1)), sx: Math.random() < 0.5 ? -1 : 1, sy: Math.random() < 0.5 ? -1 : 1 };
      } while (this.neighbours(start).length === 0 || !this.isValid(start));
      const actor = new AnimalActor(`gast${i}`, SPECIES[i % SPECIES.length] as (typeof SPECIES)[number]);
      actor.scale.set(0.5);
      actor.eventMode = "none";
      actor.walking = true;
      this.sorted.addChild(actor);
      const w: Walker = { actor, from: start, to: start, t: 1, speed: 38 + Math.random() * 22, crossing: false };
      this.pickNext(w);
      this.walkers.push(w);
    }
  }

  private pickNext(w: Walker): void {
    const opts = this.neighbours(w.to);
    const forward = opts.filter((o) => !(o.node.cx === w.from.cx && o.node.cy === w.from.cy && o.node.sx === w.from.sx && o.node.sy === w.from.sy));
    const pool = forward.length > 0 ? forward : opts;
    const next = pool[Math.floor(Math.random() * pool.length)];
    if (!next) return;
    w.from = w.to;
    w.to = next.node;
    w.crossing = next.crossing;
    w.t = 0;
  }

  override destroy(): void {
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    super.destroy();
  }

  protected update(dt: number): void {
    this.steer(dt);
    // kameran följer bilen mjukt
    const c = proj(this.car.gx, this.car.gy);
    const k = 1 - Math.exp(-dt * 4);
    this.camPos.x += (c.x - this.camPos.x) * k;
    this.camPos.y += (c.y - this.camPos.y) * k;
    this.applyCamera();

    for (const w of this.walkers) {
      const p0 = nodePos(w.from);
      const p1 = nodePos(w.to);
      const len = Math.hypot(p1.x - p0.x, p1.y - p0.y) || 1;
      w.t += (w.speed * dt) / len;
      if (w.t >= 1) this.pickNext(w);
      const q0 = nodePos(w.from);
      const q1 = nodePos(w.to);
      const before = w.actor.x;
      w.actor.position.set(q0.x + (q1.x - q0.x) * w.t, q0.y + (q1.y - q0.y) * w.t);
      w.actor.zIndex = w.actor.y;
      w.actor.faceDx(w.actor.x - before);
      w.actor.update(dt);
    }
  }
}
