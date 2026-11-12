import { gridSize } from "../../../shared/rules";
import { CityScene } from "../scene";
import { msgLine, say, type Ctx } from "./state";

/**
 * Leveransen (cupcake): staden sedd uppifrån. Bilen körs genom att trycka på en gata eller med WASD,
 * och leveransen lämnas automatiskt när bilen stannar på rätt hörn. Gatorna har siffror: blå = x, gula = y.
 */
export function delivery(c: Ctx): () => void {
  const { s, root } = c;
  const list = s.deliveries;
  let idx = 0;
  let dead = false;
  let mounted = false;
  let done = false;
  const timeouts: number[] = [];
  say(s, "");
  root.innerHTML = `<div class="stagewrap"><div id="stage" class="stage"></div><div class="goal" id="goal"></div></div>${msgLine(s)}
    <p class="tip">Tryck på en gata eller styr med WASD/piltangenterna. Bilen lämnar leveransen när den stannar på rätt hörn. Siffrorna på vägarna visar var du är: <b style="color:#3a8fd6">blå = x</b>, <b style="color:#c99a00">gul = y</b>.</p>`;
  const goal = root.querySelector<HTMLElement>("#goal") as HTMLElement;
  const stage = root.querySelector<HTMLElement>("#stage") as HTMLElement;
  const msg = (t: string, kind: "ok" | "err" | ""): void => {
    const m = root.querySelector<HTMLElement>("#msg");
    if (m) {
      m.textContent = t;
      m.className = `msg ${kind}`;
    }
  };
  const scene = new CityScene();

  const show = (): void => {
    const t = list[idx];
    goal.innerHTML = t
      ? `Leverans ${idx + 1} av ${list.length}: kör till <span class="gx">${t.x}</span> , <span class="gy">${t.y}</span>`
      : "Klart!";
  };

  const advance = (): void => {
    idx++;
    show();
    if (idx >= list.length) {
      done = true;
      timeouts.push(window.setTimeout(() => !dead && c.endDay(), 1400));
      return;
    }
    // om nästa leverans är precis där bilen står lämnas den direkt
    const here = scene.carCorner();
    const t = list[idx];
    if (here && t && here.x === t.x && here.y === t.y) {
      scene.flash(t.x, t.y, true);
      timeouts.push(window.setTimeout(() => !dead && advance(), 700));
    }
  };

  const onDrop = (x: number, y: number): void => {
    const t = list[idx];
    if (done || !t) return;
    if (t.x === x && t.y === y) {
      scene.flash(x, y, true);
      msg(`Levererat till (${x},${y})! ❤️`, "ok");
      advance();
    } else {
      scene.flash(x, y, false);
      msg(`Inte här! Det här är (${x},${y}). Leverera till (${t.x},${t.y}).`, "err");
    }
  };

  void scene.mount(stage).then(() => {
    mounted = true;
    if (dead) return scene.destroy();
    scene.setGrid(gridSize(s.day));
    scene.setPedestrians(6);
    scene.onTileTap((x, y) => void scene.driveTo(x, y));
    scene.onDrop(onDrop);
    (window as unknown as Record<string, unknown>).__city = scene;
  });
  show();
  c.hud();

  return () => {
    dead = true;
    for (const t of timeouts) window.clearTimeout(t);
    if (mounted) scene.destroy();
  };
}
