import { Container, Graphics, Text } from "pixi.js";
import { AnimalActor } from "./actors";
import { walk, type GridPoint } from "./anim";
import { BaseScene } from "./base";
import { isoBox, makeProj, poly, tile } from "./iso";
import { FONT, INK, type Species } from "./manifest";

/** Varför en kund lämnar pizzerian. */
export type LeaveReason = "paid" | "price" | "patience" | "noStock" | "wrong";

const P = makeProj(460, 150, 40, 20);

// Rummet är 9 x 8 rutor. Spelaren står bakom disken längst fram (gy = 7-8) och ser kunderna
// komma in genom dörren i bakre väggen (gy = 0), gå fram längs kön och ställa sig vid kassan.
const LANE_X = 6.4; // kön och kassaplatsen
const SERVICE: GridPoint = { gx: LANE_X, gy: 6.0 };
const EXIT_X = 4.2; // kunder som går ut går åt sidan och ut genom samma dörr
const OUTSIDE_Y = -6.5; // utanför bild
const SPEED = 3.2;
const SLOTS_INSIDE = 4;

/** Plats i kön. Plats 0 är närmast kassan. Fler än fyra får vänta på trottoaren utanför. */
function slotPos(i: number): GridPoint {
  if (i < SLOTS_INSIDE) return { gx: LANE_X, gy: 4.7 - 1.3 * i };
  return { gx: LANE_X, gy: -1.0 - 1.2 * (i - SLOTS_INSIDE) };
}

/**
 * Pizzerian: kunderna kommer in utifrån, ställer sig i kö, går till kassan när de
 * trycks på, och lämnar med en reaktion. Spelet styr scenen med metoderna nedan.
 */
export class PizzeriaScene extends BaseScene {
  private readonly actors = new Map<string, AnimalActor>();
  private queue: string[] = [];
  private serving: string | null = null;
  private tapCb: ((id: string) => void) | null = null;
  private readonly sorted = new Container();

  /** Anropas när spelaren trycker på en kund. */
  onCustomerTap(cb: (id: string) => void): void {
    this.tapCb = cb;
  }

  ids(): string[] {
    return [...this.actors.keys()];
  }

  /** Kunden går in genom dörren och ställer sig sist i kön. Löser sig när hen är på plats. */
  customerArrives(id: string, species: Species): Promise<void> {
    if (this.actors.has(id)) throw new Error(`Kund ${id} finns redan`);
    const a = new AnimalActor(id, species);
    a.gx = LANE_X;
    a.gy = OUTSIDE_Y;
    a.scale.set(0.82);
    a.place(P);
    a.onTap = () => this.tapCb?.(id);
    this.sorted.addChild(a);
    this.actors.set(id, a);
    this.queue.push(id);
    return this.goToSlot(a, this.queue.length - 1);
  }

  /** Kunden går fram till kassan och säger sin beställning. */
  async customerOrders(id: string, text: string): Promise<void> {
    const a = this.get(id);
    this.queue = this.queue.filter((q) => q !== id);
    this.serving = id;
    this.relayout();
    a.setPose("vantar");
    await walk(this.anim, a, P, this.route(a, SERVICE), SPEED);
    a.setPose("pratar");
    a.say(text, "speech");
  }

  setPatience(id: string, fraction: number | null): void {
    this.actors.get(id)?.setPatience(fraction);
  }

  customerReacts(id: string, r: "happy" | "unsure" | "yawn" | "wave"): void {
    this.actors.get(id)?.react(r);
  }

  /** Kunden gör sin reaktion, vinkar och går ut genom dörren. Löser sig när hen är borta. */
  async customerLeaves(id: string, reason: LeaveReason, boxes = 0): Promise<void> {
    const a = this.get(id);
    this.queue = this.queue.filter((q) => q !== id);
    if (this.serving === id) this.serving = null;
    this.relayout();
    a.setPatience(null);
    a.clearBubble();
    // Reaktionen visas medan kunden redan går mot dörren, så att kassan blir ledig direkt.
    switch (reason) {
      case "paid":
        a.carryBoxes(boxes);
        a.react("happy");
        break;
      case "price":
      case "wrong":
        a.react("unsure");
        break;
      case "patience":
        a.react("yawn");
        break;
      case "noStock":
        a.setPose("tveksam");
        a.say("😕", "thought", 1.2);
        break;
    }
    void this.anim.wait(1.0).then(() => {
      if (!a.destroyed) a.react("wave");
    });
    await walk(this.anim, a, P, this.exitRoute(a), SPEED * 0.85);
    a.destroy({ children: true });
    this.actors.delete(id);
  }

  clear(): void {
    this.anim.clear();
    for (const a of this.actors.values()) a.destroy({ children: true });
    this.actors.clear();
    this.queue = [];
    this.serving = null;
  }

  private get(id: string): AnimalActor {
    const a = this.actors.get(id);
    if (!a) throw new Error(`Okänd kund ${id}`);
    return a;
  }

  private route(_a: AnimalActor, target: GridPoint): GridPoint[] {
    return [target];
  }

  private exitRoute(a: AnimalActor): GridPoint[] {
    if (a.gy < 0) return [{ gx: a.gx, gy: OUTSIDE_Y }];
    return [
      { gx: EXIT_X, gy: a.gy },
      { gx: EXIT_X, gy: OUTSIDE_Y },
    ];
  }

  private goToSlot(a: AnimalActor, i: number): Promise<void> {
    return walk(this.anim, a, P, this.route(a, slotPos(i)), SPEED);
  }

  /** Kön rycker ihop när någon går. */
  private relayout(): void {
    this.queue.forEach((id, i) => {
      const a = this.actors.get(id);
      const s = slotPos(i);
      if (a && Math.hypot(a.gx - s.gx, a.gy - s.gy) > 0.05) void this.goToSlot(a, i);
    });
  }

  protected update(dt: number): void {
    for (const a of this.actors.values()) a.update(dt);
  }

  protected build(): void {
    const bg = new Graphics();
    bg.rect(0, 0, 960, 540).fill(0xbfe8b0); // gräs utanför
    // trottoar och gata utanför bakre väggen, där kunderna kommer gående
    poly(bg, [P(-3, -3.2), P(12, -3.2), P(12, 0), P(-3, 0)], 0xe9dcc6, false);
    poly(bg, [P(-3, -7.5), P(12, -7.5), P(12, -3.2), P(-3, -3.2)], 0x8c8c99, false);
    for (let x = -2; x < 12; x += 2) poly(bg, [P(x, -5.45), P(x + 1, -5.45), P(x + 1, -5.3), P(x, -5.3)], 0xfff4df, false);
    // golv (rutigt)
    for (let gx = 0; gx < 9; gx++) for (let gy = 0; gy < 8; gy++) tile(bg, P, gx, gy, 1, 1, (gx + gy) % 2 ? 0xfff1d6 : 0xffe2b0);
    poly(bg, [P(0, 0), P(9, 0), P(9, 8), P(0, 8)], 0, true, 0);
    // väggar: vänster (gx = 0) och bakre (gy = 0) med en bred dörr
    const H = 130;
    poly(bg, [P(0, 0), P(0, 8), P(0, 8, H), P(0, 0, H)], 0xffd86b);
    poly(bg, [P(0, 0), P(4.0, 0), P(4.0, 0, H), P(0, 0, H)], 0x9be3cf);
    poly(bg, [P(7.4, 0), P(9, 0), P(9, 0, H), P(7.4, 0, H)], 0x9be3cf);
    poly(bg, [P(4.0, 0, 96), P(7.4, 0, 96), P(7.4, 0, H), P(4.0, 0, H)], 0xef4d3c);
    // ugn vid vänstra väggen och stjärnan på bakre väggen
    isoBox(bg, P, 0.12, 1.2, 0.8, 1.8, 84, 0xef4d3c);
    poly(bg, [P(0.92, 1.55, 12), P(0.92, 2.65, 12), P(0.92, 2.65, 46), P(0.92, 1.55, 46)], INK);
    bg.circle(P(0.92, 2.1, 26).x, P(0.92, 2.1, 26).y, 9).fill(0xffc730);
    const star = new Text({ text: "⭐", style: { fontFamily: FONT, fontSize: 60 } });
    star.anchor.set(0.5);
    const sp = P(2.2, 0, 70);
    star.position.set(sp.x, sp.y);
    this.world.addChild(bg, star);

    this.sorted.sortableChildren = true;
    this.world.addChild(this.sorted);

    // disken längst fram (ritas efter kunderna så att den täcker dem). Kassaapparaten står på disken.
    const front = new Graphics();
    isoBox(front, P, 0.6, 7.0, 8.4, 0.8, 46, 0xa8683a);
    isoBox(front, P, 6.9, 7.12, 1.5, 0.56, 22, 0x3fc9a0, 46);
    poly(front, [P(6.9, 7.12, 62), P(8.4, 7.12, 62), P(8.4, 7.12, 80), P(6.9, 7.12, 80)], INK, false);
    this.world.addChild(front);
  }
}
