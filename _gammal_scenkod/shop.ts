/**
 * Pizzeria och café: kunderna kommer in utifrån genom dörren, ställer sig i kö,
 * kliver fram till disken när spelaren trycker på dem, och går ut igen.
 */
import { Container, Graphics, Sprite, Text } from "pixi.js";
import { H, W, shopLayout, type Pt, type ShopKind, type ShopLayout } from "../../../shared/sceneLayout";
import { INK, type ArtLibrary } from "./art";
import type { LeaveReason, Scene, SceneEvent, Species } from "./events";
import { Figure } from "./figure";

/** Isometrisk låda med basmitt (cx,cy). */
export function isoBox(
  g: Graphics,
  cx: number,
  cy: number,
  halfW: number,
  halfH: number,
  height: number,
  top: number,
  left: number,
  right: number,
): void {
  const stroke = { width: 3, color: INK, join: "round" as const };
  const ty = cy - height;
  g.poly([cx - halfW, cy, cx, cy + halfH, cx, ty + halfH, cx - halfW, ty]).fill(left).stroke(stroke);
  g.poly([cx + halfW, cy, cx, cy + halfH, cx, ty + halfH, cx + halfW, ty]).fill(right).stroke(stroke);
  g.poly([cx, ty - halfH, cx + halfW, ty, cx, ty + halfH, cx - halfW, ty]).fill(top).stroke(stroke);
}

function drawPlaceholderRoom(kind: ShopKind, layout: ShopLayout): Container {
  const room = new Container();
  const g = new Graphics();
  const pizza = kind === "pizzeria";
  const floor = pizza ? 0xffd9a0 : 0xffd6e8;
  const wallL = pizza ? 0xfff0c9 : 0xfff3fa;
  const wallR = pizza ? 0xffe3a6 : 0xffe1f0;
  const stroke = { width: 3, color: INK, join: "round" as const };

  g.rect(0, 0, W, H).fill(0xcfe8ff); // utanför
  g.poly([-60, 470, 640, 140, 640, -120, -60, 220]).fill(wallL).stroke(stroke); // vänster vägg
  g.poly([640, 140, 1340, 470, 1340, 220, 640, -120]).fill(wallR).stroke(stroke); // höger vägg
  g.poly([640, 140, 1340, 470, 640, 800, -60, 470]).fill(floor).stroke(stroke); // golv
  // dörren: öppning i golvkanten längst ner till vänster
  g.poly([layout.door.x - 46, layout.door.y - 20, layout.door.x + 10, layout.door.y + 8, layout.door.x - 8, layout.door.y + 40, layout.door.x - 64, layout.door.y + 12])
    .fill(0xcfe8ff)
    .stroke(stroke);
  // kölinje på golvet
  for (const p of layout.queue) g.ellipse(p.x, p.y, 26, 10).fill({ color: 0xffffff, alpha: 0.5 });
  // disk med kassa
  isoBox(g, 985, 400, 120, 60, 62, 0xffffff, pizza ? 0xef4d3c : 0x3fa7f5, pizza ? 0xff7a66 : 0x7cc4ff);
  isoBox(g, 1010, 340, 26, 13, 22, 0xffc730, 0xd9a312, 0xffd95e);
  // bakom: ugn (pizza) eller monter (café)
  if (pizza) isoBox(g, 520, 285, 70, 35, 90, 0xb04a32, 0x8a3724, 0xcc5a3e);
  else isoBox(g, 480, 290, 90, 45, 70, 0xe9f6ff, 0x9fd0f0, 0xc9e8fb);
  room.addChild(g);
  const sign = new Text({ text: "⭐", style: { fontSize: 78 } });
  sign.anchor.set(0.5);
  sign.position.set(640, 70);
  const door = new Text({ text: "🚪", style: { fontSize: 38 } });
  door.anchor.set(0.5);
  door.position.set(layout.door.x - 28, layout.door.y + 14);
  room.addChild(sign, door);
  return room;
}

type Slot = "queue" | "counter" | "leaving";

export class ShopScene implements Scene {
  readonly view = new Container();
  onTap?: (id: string) => void;

  private layout: ShopLayout;
  private figures = new Map<string, Figure>();
  private slot = new Map<string, Slot>();
  private queue: string[] = [];
  private atCounter: string | null = null;
  private pending: { id: string; species: Species }[] = [];
  private spawnIn = 0;
  private world = new Container();

  constructor(
    private kind: ShopKind,
    private art: ArtLibrary,
  ) {
    this.layout = shopLayout(kind);
    this.world.sortableChildren = true;
    const bgTex = art.background(kind === "pizzeria" ? "pizzeria" : "cupcake_cafe");
    if (bgTex) {
      const bg = new Sprite(bgTex);
      bg.width = W;
      bg.height = H;
      this.world.addChild(bg);
    } else {
      this.world.addChild(drawPlaceholderRoom(kind, this.layout));
    }
    this.view.addChild(this.world);
  }

  handle(e: SceneEvent): void {
    switch (e.type) {
      case "customerArrives":
        this.pending.push({ id: e.id, species: e.species });
        return;
      case "orderTaken":
        return this.takeOrder(e.id);
      case "customerHesitates":
        this.figures.get(e.id)?.say("🤔");
        this.figures.get(e.id)?.squash();
        return;
      case "wrongAnswer":
        this.figures.get(e.id)?.say("❓");
        this.figures.get(e.id)?.wobble();
        return;
      case "patience":
        this.figures.get(e.id)?.setPatience(e.fraction);
        return;
      case "customerServed":
        return this.served(e.id, e.tip ?? false);
      case "customerLeaves":
        return this.leaves(e.id, e.reason);
      case "clear":
        return this.clear();
      default:
        return;
    }
  }

  private spawn(id: string, species: Species): void {
    const slotIndex = this.queue.length;
    const f = new Figure(id, this.art.body(species), { scale: 0.62 });
    f.place(this.layout.outside);
    f.onTap = (tapped) => this.onTap?.(tapped);
    this.figures.set(id, f);
    this.slot.set(id, "queue");
    this.queue.push(id);
    const spot = this.layout.queue[slotIndex] as Pt;
    f.target = spot;
    this.world.addChild(f.view);
    void f.walkTo([this.layout.door, spot]);
  }

  private reposition(): void {
    this.queue.forEach((id, i) => {
      const f = this.figures.get(id);
      const spot = this.layout.queue[i];
      if (!f || !spot) return;
      if (f.target?.x !== spot.x || f.target?.y !== spot.y) {
        f.target = spot;
        void f.walkTo([spot]);
      }
    });
  }

  private takeOrder(id: string): void {
    const f = this.figures.get(id);
    if (!f || this.slot.get(id) !== "queue") return;
    this.queue = this.queue.filter((q) => q !== id);
    this.slot.set(id, "counter");
    this.atCounter = id;
    f.target = this.layout.counter;
    void f.walkTo([this.layout.counter]).then(() => f.say("💬", 1.2));
    this.reposition();
  }

  private exit(id: string): void {
    const f = this.figures.get(id);
    if (!f) return;
    this.queue = this.queue.filter((q) => q !== id);
    if (this.atCounter === id) this.atCounter = null;
    this.slot.set(id, "leaving");
    f.setPatience(null);
    f.onTap = undefined;
    f.target = null;
    void f.walkTo([this.layout.door, this.layout.outside], 190).then(() => {
      f.destroy();
      this.figures.delete(id);
      this.slot.delete(id);
    });
    this.reposition();
  }

  private served(id: string, tip: boolean): void {
    const f = this.figures.get(id);
    if (!f) return;
    f.say(tip ? "💖" : "❤️", 1.6);
    f.hop();
    setTimeout(() => this.exit(id), 900);
  }

  private leaves(id: string, reason: LeaveReason): void {
    const f = this.figures.get(id);
    if (!f) return;
    const bubble: Record<LeaveReason, string> = { price: "💭🏷️❌", patience: "🥱", noStock: "😕", wrong: "😕" };
    f.say(bubble[reason], 1.6);
    if (reason === "price") f.squash(); // axelryckning
    else f.wobble();
    setTimeout(() => this.exit(id), reason === "price" ? 1100 : 800);
  }

  private clear(): void {
    for (const f of this.figures.values()) f.destroy();
    this.figures.clear();
    this.slot.clear();
    this.queue = [];
    this.pending = [];
    this.atCounter = null;
  }

  update(dt: number): void {
    this.spawnIn -= dt;
    const room = this.queue.length < this.layout.queue.length;
    const next = this.pending[0];
    if (next && room && this.spawnIn <= 0) {
      this.pending.shift();
      this.spawn(next.id, next.species);
      this.spawnIn = 0.5 + Math.random() * 0.5;
    }
    for (const f of this.figures.values()) f.update(dt);
  }

  destroy(): void {
    this.clear();
    this.view.destroy({ children: true });
  }
}
