/**
 * Spelet. Skärmarna (start, intro, marknad, dekorering, försäljning, leverans, sammanfattning, slut)
 * är små moduler som får en Ctx och returnerar en städfunktion. Scenerna (pizzeria, stad) och kassan
 * används av försäljningen och leveransen.
 */
import { DAYS, type Restaurant } from "../../../shared/data";
import { priceStep, roundUpToStep } from "../../../shared/rules";
import { decorate } from "./decorate";
import { delivery } from "./delivery";
import { market } from "./market";
import { cupcakeSales, pizzaSales } from "./sales";
import { fresh, say, type Ctx, type Screen, type State } from "./state";
import { end, intro, start, summary } from "./summary";

const root = document.getElementById("screen") as HTMLElement;
const hudEl = document.getElementById("hud") as HTMLElement;
let cleanup: (() => void) | null = null;
let ctx: Ctx;

function make(s: State): Ctx {
  const c: Ctx = {
    s,
    root,
    go(screen: Screen): void {
      cleanup?.();
      cleanup = null;
      root.replaceChildren();
      s.screen = screen;
      const mount: Record<Screen, (c: Ctx) => () => void> = {
        start,
        intro,
        market,
        decorate,
        sales: (cc) => (cc.s.r === "pizza" ? pizzaSales(cc) : cupcakeSales(cc)),
        delivery,
        summary,
        end,
      };
      cleanup = mount[screen](c);
      c.hud();
      window.scrollTo(0, 0);
    },
    hud(extra = ""): void {
      if (s.screen === "start") return void (hudEl.innerHTML = "");
      hudEl.innerHTML = `<span>Dag ${s.day}/${DAYS[s.r]} · ${s.r === "cupcake" ? "🧁 Cupcake" : "🍕 Pizza"}</span><span>${extra}</span><span>Kassa: <b>${s.money} kr</b></span>`;
    },
    endDay(): void {
      const costs = s.purchases + s.upgradeSpend;
      s.history.push({ day: s.day, income: s.income + s.tips, costs, profit: s.income + s.tips - costs });
      c.go("summary");
    },
    nextDay(): void {
      if (s.day >= DAYS[s.r]) return c.go("end");
      s.day++;
      s.purchases = 0;
      s.upgradeSpend = 0;
      s.feedback = "";
      say(s, "");
      const step = priceStep(s.r, s.day);
      const changed = s.menu.filter((v) => v.price % step !== 0);
      if (changed.length > 0) {
        s.menu = s.menu.map((v) => ({ ...v, price: roundUpToStep(v.price, step) }));
        say(s, `Från i dag måste priserna vara delbara med ${step}, så att ${step === 2 ? "halva" : "fjärdedels"} pizzor blir hela kronor. Dessa priser har rundats upp: ${changed.map((v) => v.name).join(", ")}.`, "ok");
      }
      c.go("market");
    },
    restart(r?: Restaurant): void {
      ctx = make(fresh(r ?? s.r));
      ctx.go("intro");
    },
  };
  return c;
}

ctx = make(fresh("cupcake"));
ctx.go("start");
(window as unknown as { __game: () => Ctx }).__game = () => ctx;
