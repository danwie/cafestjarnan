/**
 * En figur i en scen (djur, bil). Allt liv kommer från rörelse: gungande gång,
 * hopp, axelryckning, vinkning och bubblor. Det räcker med en enda stillbild
 * per figur, som i klassiska flash-spel.
 */
import { Container, Graphics, Sprite, Text, type Texture } from "pixi.js";
import type { Pt } from "../../../shared/sceneLayout";
import { INK } from "./art";

export interface FigureOptions {
  scale?: number;
  /** Gungar när den går (djur: ja, bil: nej). */
  bob?: boolean;
  speed?: number;
}

export class Figure {
  readonly view = new Container();
  readonly body: Sprite;
  /** Skickas när spelaren trycker på figuren. */
  onTap?: (id: string) => void;
  /** Anropas när riktningen ändras, så att en bil kan byta bild. */
  onMove?: (dx: number, dy: number) => void;
  /** Den plats figuren är på väg till (eller står på). */
  target: Pt | null = null;
  speed: number;

  private bar = new Graphics();
  private bubble: Text | null = null;
  private bubbleLife = 0;
  private route: Pt[] = [];
  private done: (() => void) | null = null;
  private time = Math.random() * 6;
  private facing = 1;
  private hopT = -1;
  private squashT = -1;
  private wobbleT = -1;
  private readonly bob: boolean;

  constructor(
    readonly id: string,
    texture: Texture,
    opts: FigureOptions = {},
  ) {
    this.bob = opts.bob ?? true;
    this.speed = opts.speed ?? 170;
    this.body = new Sprite(texture);
    this.body.anchor.set(0.5, 1);
    this.view.addChild(this.body, this.bar);
    this.view.scale.set(opts.scale ?? 1);
    this.view.eventMode = "static";
    this.view.cursor = "pointer";
    this.view.on("pointertap", () => this.onTap?.(this.id));
  }

  get pos(): Pt {
    return { x: this.view.x, y: this.view.y };
  }

  get walking(): boolean {
    return this.route.length > 0;
  }

  setTexture(t: Texture): void {
    this.body.texture = t;
  }

  place(p: Pt): void {
    this.view.position.set(p.x, p.y);
  }

  /** Går (eller kör) längs punkterna. Löftet uppfylls när sista punkten är nådd. */
  walkTo(points: Pt[], speed?: number): Promise<void> {
    this.route = points.map((p) => ({ ...p }));
    if (speed) this.speed = speed;
    return new Promise((resolve) => {
      this.done = resolve;
      if (this.route.length === 0) resolve();
    });
  }

  hop(): void {
    this.hopT = 0;
  }
  squash(): void {
    this.squashT = 0;
  }
  wobble(): void {
    this.wobbleT = 0;
  }

  /** Visar en bubbla ovanför huvudet en stund. */
  say(text: string, seconds = 1.8): void {
    this.bubble?.destroy();
    this.bubble = new Text({
      text,
      style: { fontSize: 34, fontFamily: "system-ui, sans-serif", fill: INK, stroke: { color: 0xffffff, width: 5 } },
    });
    this.bubble.anchor.set(0.5, 1);
    this.bubbleLife = seconds;
    this.view.addChild(this.bubble);
  }

  /** Tålamodsmätare. 1 = full, 0 = tom, null = dölj. */
  setPatience(fraction: number | null): void {
    this.bar.clear();
    if (fraction === null) return;
    const f = Math.max(0, Math.min(1, fraction));
    const w = 64;
    const y = -this.body.height - 14;
    this.bar.roundRect(-w / 2, y, w, 11, 5).fill(0xffffff).stroke({ width: 2.5, color: INK });
    const color = f > 0.5 ? 0x3fc9a0 : f > 0.25 ? 0xffc730 : 0xef4d3c;
    if (f > 0) this.bar.roundRect(-w / 2 + 2, y + 2, (w - 4) * f, 7, 3).fill(color);
  }

  update(dt: number): void {
    this.time += dt;
    let moving = false;
    const next = this.route[0];
    if (next) {
      const dx = next.x - this.view.x;
      const dy = next.y - this.view.y;
      const dist = Math.hypot(dx, dy);
      const step = this.speed * dt;
      if (dist <= step) {
        this.view.position.set(next.x, next.y);
        this.route.shift();
        if (this.route.length === 0) {
          const finished = this.done;
          this.done = null;
          finished?.();
        }
      } else {
        this.view.x += (dx / dist) * step;
        this.view.y += (dy / dist) * step;
        if (Math.abs(dx) > 1) this.facing = Math.sign(dx);
        this.onMove?.(dx, dy);
      }
      moving = true;
    }

    const walkBob = moving && this.bob;
    let lift = walkBob ? Math.abs(Math.sin(this.time * 11)) * 7 : 0;
    let rotation = walkBob ? Math.sin(this.time * 11) * 0.07 : this.bob ? Math.sin(this.time * 1.7) * 0.012 : 0;
    let scaleY = walkBob || !this.bob ? 1 : 1 + Math.sin(this.time * 2.2) * 0.012;
    let scaleX = 1;

    if (this.hopT >= 0) {
      this.hopT += dt / 0.55;
      if (this.hopT >= 1) this.hopT = -1;
      else lift += Math.sin(Math.PI * this.hopT) * 46;
    }
    if (this.squashT >= 0) {
      this.squashT += dt / 0.5;
      if (this.squashT >= 1) this.squashT = -1;
      else {
        const k = Math.sin(Math.PI * this.squashT);
        scaleY *= 1 - 0.16 * k;
        scaleX *= 1 + 0.1 * k;
      }
    }
    if (this.wobbleT >= 0) {
      this.wobbleT += dt / 0.8;
      if (this.wobbleT >= 1) this.wobbleT = -1;
      else rotation += Math.sin(this.wobbleT * 28) * 0.22 * (1 - this.wobbleT);
    }

    this.body.y = -lift;
    this.body.rotation = rotation;
    this.body.scale.set(this.facing * scaleX, scaleY);

    if (this.bubble) {
      this.bubbleLife -= dt;
      if (this.bubbleLife <= 0) {
        this.bubble.destroy();
        this.bubble = null;
      } else {
        this.bubble.alpha = Math.min(1, this.bubbleLife / 0.4);
        this.bubble.position.set(0, -this.body.height - 22 - lift * 0.3);
      }
    }
    this.view.zIndex = this.view.y;
  }

  destroy(): void {
    this.view.destroy({ children: true });
  }
}
