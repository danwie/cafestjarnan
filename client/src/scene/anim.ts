import type { Proj } from "./iso";

/** Liten uppgiftshanterare: varje uppgift körs varje bildruta tills den är klar. */
export class Anim {
  private tasks = new Set<(dt: number) => boolean>();

  run(step: (dt: number) => boolean): Promise<void> {
    return new Promise((resolve) => {
      const task = (dt: number): boolean => {
        if (!step(dt)) return false;
        this.tasks.delete(task);
        resolve();
        return true;
      };
      this.tasks.add(task);
    });
  }

  wait(seconds: number): Promise<void> {
    let left = seconds;
    return this.run((dt) => (left -= dt) <= 0);
  }

  update(dt: number): void {
    for (const task of [...this.tasks]) task(dt);
  }

  clear(): void {
    this.tasks.clear();
  }
}

/** Allt som kan gå längs en rutt: djur och bilar. */
export interface Walkable {
  gx: number;
  gy: number;
  walking: boolean;
  walkToken: number;
  faceDx(dx: number): void;
  /** Valfritt: riktning i bildpunkter (för bilen som ska vrida sig). */
  heading?(dx: number, dy: number): void;
  /** Valfritt: true om något står i vägen just nu (figuren väntar då en bildruta). */
  blocked?(): boolean;
  place(proj: Proj): void;
}

export interface GridPoint {
  gx: number;
  gy: number;
}

/**
 * Låter en figur gå längs en rutt, mätt i rutnätsenheter per sekund. En ny
 * `walk` på samma figur avbryter den förra, så att figurer kan byta mål.
 */
export function walk(
  anim: Anim,
  actor: Walkable,
  proj: Proj,
  points: GridPoint[],
  speed: number,
): Promise<void> {
  const token = ++actor.walkToken;
  let leg = 0;
  let travelled = 0;
  let from: GridPoint = { gx: actor.gx, gy: actor.gy };
  actor.walking = points.length > 0;
  return anim.run((dt) => {
    if (actor.walkToken !== token) return true; // ersatt av en nyare rutt
    const to = points[leg];
    if (!to) {
      actor.walking = false;
      return true;
    }
    const dist = Math.hypot(to.gx - from.gx, to.gy - from.gy);
    if (actor.blocked) {
      const a = proj(from.gx, from.gy);
      const b = proj(to.gx, to.gy);
      actor.heading?.(b.x - a.x, b.y - a.y);
      if (actor.blocked()) return false; // väntar
    }
    travelled += speed * dt;
    const f = dist < 1e-6 ? 1 : Math.min(1, travelled / dist);
    const before = proj(actor.gx, actor.gy);
    actor.gx = from.gx + (to.gx - from.gx) * f;
    actor.gy = from.gy + (to.gy - from.gy) * f;
    const after = proj(actor.gx, actor.gy);
    actor.faceDx(after.x - before.x);
    actor.heading?.(after.x - before.x, after.y - before.y);
    actor.place(proj);
    if (f >= 1) {
      from = { gx: to.gx, gy: to.gy };
      travelled = 0;
      leg++;
      if (leg >= points.length) {
        actor.walking = false;
        return true;
      }
    }
    return false;
  });
}
