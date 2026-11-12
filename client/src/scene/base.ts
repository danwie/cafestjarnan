import { Application, Container } from "pixi.js";
import { Anim } from "./anim";
import { preloadAnimals } from "./assets";

/** Gemensam bas för scenerna: skapar canvasen, skalar till bredden (16:9) och kör bildrutor. */
export abstract class BaseScene {
  static readonly W = 960;
  static readonly H = 540;

  protected app!: Application;
  protected readonly world = new Container();
  protected readonly anim = new Anim();
  private host: HTMLElement | null = null;
  private observer: ResizeObserver | null = null;
  private alive = false;

  async mount(el: HTMLElement): Promise<void> {
    await preloadAnimals();
    const app = new Application();
    await app.init({
      width: BaseScene.W,
      height: BaseScene.H,
      backgroundAlpha: 0,
      antialias: true,
      resolution: Math.min(window.devicePixelRatio || 1, 2),
      autoDensity: true,
    });
    this.app = app;
    this.host = el;
    this.alive = true;
    el.appendChild(app.canvas);
    app.stage.addChild(this.world);
    this.build();
    this.fit();
    this.observer = new ResizeObserver(() => this.fit());
    this.observer.observe(el);
    app.ticker.add((ticker) => {
      const dt = Math.min(ticker.deltaMS / 1000, 0.1);
      this.anim.update(dt);
      this.update(dt);
    });
  }

  private fit(): void {
    const w = Math.max(240, this.host?.clientWidth || BaseScene.W);
    const h = Math.round((w * BaseScene.H) / BaseScene.W);
    this.app.renderer.resize(w, h);
    this.world.scale.set(w / BaseScene.W);
  }

  destroy(): void {
    if (!this.alive) return;
    this.alive = false;
    this.observer?.disconnect();
    this.anim.clear();
    this.app.destroy(true, { children: true });
  }

  protected abstract build(): void;
  protected abstract update(dt: number): void;
}
