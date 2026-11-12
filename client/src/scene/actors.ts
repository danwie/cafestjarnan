import { Container, Graphics, Rectangle, Sprite, Text } from "pixi.js";
import { getTexture } from "./assets";
import type { Proj } from "./iso";
import { FONT, INK, animalKey, type Pose, type Species } from "./manifest";

type Feature = "point" | "round" | "long" | "tufts" | "froggy" | "beak" | "spikes" | "shell" | "floppy";
const LOOK: Record<Species, { color: number; belly: number; feature: Feature }> = {
  rav: { color: 0xff8a2b, belly: 0xfff4df, feature: "point" },
  groda: { color: 0x3fc9a0, belly: 0xd9f7ea, feature: "froggy" },
  uggla: { color: 0xa8683a, belly: 0xf0d9b5, feature: "tufts" },
  katt: { color: 0x9aa5b1, belly: 0xffffff, feature: "point" },
  hund: { color: 0xd9a066, belly: 0xfff0d6, feature: "floppy" },
  kanin: { color: 0xf3e9dc, belly: 0xffffff, feature: "long" },
  bjorn: { color: 0x8a5a3c, belly: 0xd9b48f, feature: "round" },
  igelkott: { color: 0xb08968, belly: 0xf3d9b1, feature: "spikes" },
  skoldpadda: { color: 0x7bc86c, belly: 0xe6f5c9, feature: "shell" },
  anka: { color: 0xffd23f, belly: 0xfff3b0, feature: "beak" },
};

/** Höjd på figuren i pixlar (fötterna i 0,0, huvudet längst upp). */
const HEAD_Y = -62;
const TOP = -96;
const stroke = { width: 3, color: INK, join: "round" as const, cap: "round" as const };

function arcLine(g: Graphics, cx: number, cy: number, r: number, a0: number, a1: number): void {
  g.moveTo(cx + r * Math.cos(a0), cy + r * Math.sin(a0)).arc(cx, cy, r, a0, a1).stroke(stroke);
}

function drawPlaceholder(species: Species, pose: Pose): Graphics {
  const look = LOOK[species];
  const g = new Graphics();
  const y = HEAD_Y;
  // kropp
  g.ellipse(0, -22, 21, 22).fill(look.color).stroke(stroke);
  g.ellipse(0, -18, 12, 15).fill(look.belly);
  // detaljer bakom huvudet
  switch (look.feature) {
    case "point":
      g.poly([-26, y - 10, -20, y - 44, -4, y - 24]).fill(look.color).stroke(stroke);
      g.poly([26, y - 10, 20, y - 44, 4, y - 24]).fill(look.color).stroke(stroke);
      break;
    case "long":
      g.ellipse(-12, y - 40, 7, 22).fill(look.color).stroke(stroke);
      g.ellipse(12, y - 40, 7, 22).fill(look.color).stroke(stroke);
      break;
    case "round":
      g.circle(-22, y - 18, 10).fill(look.color).stroke(stroke);
      g.circle(22, y - 18, 10).fill(look.color).stroke(stroke);
      break;
    case "tufts":
      g.poly([-24, y - 14, -26, y - 40, -8, y - 26]).fill(look.color).stroke(stroke);
      g.poly([24, y - 14, 26, y - 40, 8, y - 26]).fill(look.color).stroke(stroke);
      break;
    case "floppy":
      g.ellipse(-28, y + 2, 9, 18).fill(shadeBrown(look.color)).stroke(stroke);
      g.ellipse(28, y + 2, 9, 18).fill(shadeBrown(look.color)).stroke(stroke);
      break;
    case "spikes":
      for (let i = -3; i <= 3; i++) g.poly([i * 8 - 5, y - 18, i * 8, y - 42 + Math.abs(i) * 3, i * 8 + 5, y - 18]).fill(0x6b4a34).stroke(stroke);
      break;
    case "shell":
      g.ellipse(0, -26, 30, 24).fill(0x4a9a52).stroke(stroke);
      break;
    default:
      break;
  }
  // huvud
  g.circle(0, y, 29).fill(look.color).stroke(stroke);
  g.ellipse(0, y + 9, 17, 12).fill(look.belly);
  if (look.feature === "froggy") {
    g.circle(-14, y - 26, 9).fill(look.color).stroke(stroke);
    g.circle(14, y - 26, 9).fill(look.color).stroke(stroke);
  }
  // ansikte efter pose
  const dot = (x: number, yy: number): void => void g.circle(x, yy, 4.5).fill(INK);
  switch (pose) {
    case "glad":
      arcLine(g, -11, y - 2, 6, Math.PI + 0.4, 2 * Math.PI - 0.4);
      arcLine(g, 11, y - 2, 6, Math.PI + 0.4, 2 * Math.PI - 0.4);
      g.ellipse(0, y + 11, 9, 7).fill(0x7a2a2a).stroke(stroke);
      break;
    case "pratar":
      dot(-11, y - 4);
      dot(11, y - 4);
      g.ellipse(0, y + 11, 6, 8).fill(0x7a2a2a).stroke(stroke);
      break;
    case "tveksam":
      dot(-11, y - 4);
      dot(11, y - 4);
      g.moveTo(3, y - 15).lineTo(18, y - 19).stroke(stroke);
      g.moveTo(-9, y + 12).lineTo(-3, y + 8).lineTo(3, y + 13).lineTo(9, y + 9).stroke(stroke);
      break;
    case "gapar":
      g.moveTo(-16, y - 4).lineTo(-6, y - 4).stroke(stroke);
      g.moveTo(6, y - 4).lineTo(16, y - 4).stroke(stroke);
      g.ellipse(0, y + 12, 9, 10).fill(0x7a2a2a).stroke(stroke);
      break;
    case "vinkar":
      dot(-11, y - 4);
      dot(11, y - 4);
      arcLine(g, 0, y + 4, 11, 0.3, Math.PI - 0.3);
      g.moveTo(18, -34).lineTo(34, -66).stroke(stroke);
      g.circle(35, -70, 7).fill(look.color).stroke(stroke);
      break;
    default:
      dot(-11, y - 4);
      dot(11, y - 4);
      arcLine(g, 0, y + 4, 10, 0.3, Math.PI - 0.3);
  }
  if (look.feature === "beak") g.ellipse(0, y + 6, 12, 6).fill(0xff8a2b).stroke(stroke);
  return g;
}

const shadeBrown = (c: number): number => (c & 0xfefefe) >> 1;

interface Floater {
  node: Text;
  life: number;
  max: number;
  rise: number;
}

/** En djurfigur: stora huvudet, poser, gång, hopp, pratbubblor och tålamodsmätare. */
export class AnimalActor extends Container {
  gx = 0;
  gy = 0;
  walking = false;
  walkToken = 0;
  pose: Pose = "vantar";
  onTap: (() => void) | null = null;

  private readonly body = new Container(); // hela figuren: ben, kropp, armar
  private readonly art = new Container(); // själva bilden (ersätts vid poseändring)
  private readonly legs: Graphics[] = [];
  private readonly arms: Graphics[] = [];
  private placeholder = true;
  private readonly carry = new Container();
  private readonly fx = new Container();
  private readonly bubble = new Container();
  private readonly meter = new Graphics();
  private floaters: Floater[] = [];
  private t = Math.random() * 10;
  private hopT = -1;
  private bubbleLeft = 0;
  private flip = 1;

  constructor(
    readonly id: string,
    readonly species: Species,
  ) {
    super();
    const limb = (x: number, y: number, len: number, w: number): Graphics => {
      const l = new Graphics();
      l.roundRect(-w / 2, 0, w, len, w / 2).fill(LOOK[species].color).stroke(stroke);
      l.position.set(x, y);
      return l;
    };
    this.legs.push(limb(-9, -8, 16, 9), limb(9, -8, 16, 9));
    this.arms.push(limb(-22, -34, 20, 8), limb(22, -34, 20, 8));
    this.body.addChild(this.legs[0] as Graphics, this.legs[1] as Graphics, this.art, this.arms[0] as Graphics, this.arms[1] as Graphics, this.carry);
    this.addChild(this.body, this.meter, this.fx, this.bubble);
    this.eventMode = "static";
    this.cursor = "pointer";
    this.hitArea = new Rectangle(-34, -118, 68, 118);
    this.on("pointertap", () => this.onTap?.());
    this.redraw();
  }

  /** Bär en stapel askar (en ask per pizza). 0 tar bort staplen. */
  carryBoxes(count: number): void {
    for (const c of this.carry.removeChildren()) c.destroy({ children: true });
    if (count <= 0) return;
    const shown = Math.min(count, 16);
    const h = Math.min(14, 90 / shown); // staplen blir aldrig högre än ca 90 px
    const g = new Graphics();
    for (let i = 0; i < shown; i++) {
      const y = -20 - i * h;
      g.roundRect(-30, y - h, 60, h, 3).fill(i % 2 ? 0xf6e7c8 : 0xfff4df).stroke({ width: 2, color: INK, join: "round" });
      g.rect(-5, y - h, 10, h).fill(0xef4d3c);
    }
    this.carry.addChild(g);
    if (count > shown) {
      const t = new Text({ text: String(count), style: { fontFamily: FONT, fontSize: 18, fontWeight: "800", fill: INK } });
      t.anchor.set(0.5);
      t.position.set(0, -20 - shown * h - 12);
      this.carry.addChild(t);
    }
  }

  setPose(pose: Pose): void {
    if (this.pose === pose) return;
    this.pose = pose;
    this.redraw();
  }

  private redraw(): void {
    for (const c of this.art.removeChildren()) c.destroy({ children: true });
    const tex = getTexture(animalKey(this.species, this.pose));
    this.placeholder = !tex;
    for (const l of [...this.legs, ...this.arms]) l.visible = !tex;
    if (tex) {
      const sprite = new Sprite(tex);
      sprite.anchor.set(0.5, 1);
      sprite.scale.set(112 / tex.height);
      this.art.addChild(sprite);
    } else {
      this.art.addChild(drawPlaceholder(this.species, this.pose));
    }
  }

  faceDx(dx: number): void {
    if (Math.abs(dx) < 0.01) return;
    this.flip = dx < 0 ? -1 : 1;
  }

  place(proj: Proj): void {
    const p = proj(this.gx, this.gy);
    this.position.set(p.x, p.y);
    this.zIndex = p.y;
  }

  hop(): void {
    this.hopT = 0;
  }

  /** Digital mätare ovanför huvudet. null döljer den. 1 = full, 0 = tom. */
  setPatience(fraction: number | null): void {
    this.meter.clear();
    if (fraction === null) return;
    const f = Math.max(0, Math.min(1, fraction));
    const color = f > 0.5 ? 0x3fc9a0 : f > 0.25 ? 0xffc730 : 0xef4d3c;
    this.meter.position.set(0, TOP - 8);
    this.meter.roundRect(-30, 0, 60, 11, 5).fill(0xffffff).stroke({ width: 2.5, color: INK });
    if (f > 0.02) this.meter.roundRect(-28, 2, 56 * f, 7, 3).fill(color);
  }

  /** Pratbubbla (speech) eller tankebubbla (thought). seconds = 0 betyder att den ligger kvar. */
  say(text: string, kind: "speech" | "thought" = "speech", seconds = 0): void {
    this.clearBubble();
    const label = new Text({
      text,
      style: { fontFamily: FONT, fontSize: 20, fontWeight: "700", fill: INK, wordWrap: true, wordWrapWidth: 210, align: "center" },
    });
    label.anchor.set(0.5);
    const w = Math.max(40, label.width + 24);
    const h = label.height + 14;
    const g = new Graphics();
    g.roundRect(-w / 2, -h / 2, w, h, 14).fill(0xffffff).stroke({ width: 3, color: INK });
    if (kind === "speech") {
      g.poly([-9, h / 2 - 1, 9, h / 2 - 1, 0, h / 2 + 13]).fill(0xffffff);
      g.moveTo(-9, h / 2 - 1).lineTo(0, h / 2 + 13).lineTo(9, h / 2 - 1).stroke({ width: 3, color: INK, join: "round" });
    } else {
      g.circle(-2, h / 2 + 9, 5).fill(0xffffff).stroke({ width: 2.5, color: INK });
      g.circle(-9, h / 2 + 19, 3).fill(0xffffff).stroke({ width: 2, color: INK });
    }
    this.bubble.addChild(g, label);
    this.bubble.position.set(0, TOP - 34 - h / 2);
    this.bubbleLeft = seconds;
  }

  clearBubble(): void {
    for (const c of this.bubble.removeChildren()) c.destroy({ children: true });
    this.bubbleLeft = 0;
  }

  private float(symbol: string, size: number, rise: number, life: number, dx = 0): void {
    const node = new Text({ text: symbol, style: { fontFamily: FONT, fontSize: size, fontWeight: "800", fill: 0xef4d3c } });
    node.anchor.set(0.5);
    node.position.set(dx, TOP + 6);
    this.fx.addChild(node);
    this.floaters.push({ node, life, max: life, rise });
  }

  heart(): void {
    this.float("❤️", 26, 46, 1.1);
  }

  zzz(): void {
    this.float("Zzz", 22, 34, 1.4, 18);
  }

  react(kind: "happy" | "unsure" | "yawn" | "wave"): void {
    switch (kind) {
      case "happy":
        this.setPose("glad");
        this.hop();
        this.heart();
        break;
      case "unsure":
        this.setPose("tveksam");
        this.say("🏷️❌", "thought", 1.4);
        break;
      case "yawn":
        this.setPose("gapar");
        this.zzz();
        break;
      case "wave":
        this.setPose("vinkar");
        break;
    }
  }

  update(dt: number): void {
    this.t += dt;
    let y = 0;
    let rot = 0;
    if (this.walking) {
      y = -Math.abs(Math.sin(this.t * 11)) * 5;
      rot = Math.sin(this.t * 11) * 0.06;
    } else {
      y = Math.sin(this.t * 2.2) * 1.2; // andas
    }
    if (this.hopT >= 0) {
      this.hopT += dt;
      const f = this.hopT / 0.55;
      if (f >= 1) this.hopT = -1;
      else y -= Math.sin(f * Math.PI) * 26;
    }
    // armar och ben: gångcykel, annars hänger de still (med lite andning)
    const swing = this.walking ? Math.sin(this.t * 11) * 0.75 : 0;
    const idle = this.walking ? 0 : Math.sin(this.t * 2.2) * 0.04;
    (this.legs[0] as Graphics).rotation = swing;
    (this.legs[1] as Graphics).rotation = -swing;
    (this.arms[0] as Graphics).rotation = -swing * 0.9 + 0.12 + idle;
    (this.arms[1] as Graphics).rotation = swing * 0.9 - 0.12 - idle;
    (this.arms[1] as Graphics).visible = this.placeholder && this.pose !== "vinkar";
    this.body.y = y;
    this.body.rotation = rot;
    this.body.scale.x = this.flip;
    if (this.bubbleLeft > 0) {
      this.bubbleLeft -= dt;
      if (this.bubbleLeft <= 0) this.clearBubble();
    }
    for (const f of this.floaters) {
      f.life -= dt;
      const k = 1 - Math.max(0, f.life) / f.max;
      f.node.y = TOP + 6 - f.rise * k;
      f.node.alpha = 1 - k * k;
    }
    if (this.floaters.some((f) => f.life <= 0)) {
      for (const f of this.floaters.filter((x) => x.life <= 0)) f.node.destroy();
      this.floaters = this.floaters.filter((f) => f.life > 0);
    }
  }
}
