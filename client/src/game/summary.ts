import { DAYS } from "../../../shared/data";
import { esc, type Ctx } from "./state";

export function start(c: Ctx): () => void {
  const { root } = c;
  root.innerHTML = `<h1>⭐ Caféstjärnan</h1>
    <div class="card"><p>Välj restaurang.</p>
    <button class="big" data-act="start" data-r="cupcake">🧁 Cupcake <small>(5 dagar, lugnt)</small></button>
    <button class="big" data-act="start" data-r="pizza">🍕 Pizza <small>(10 dagar, snabbt)</small></button></div>`;
  const on = (e: Event): void => {
    const el = (e.target as HTMLElement).closest<HTMLElement>("[data-act=start]");
    if (el) c.restart(el.dataset.r as "cupcake" | "pizza");
  };
  root.addEventListener("click", on);
  return () => root.removeEventListener("click", on);
}

/** Första skärmen i en omgång: man får startkapital att handla för. */
export function intro(c: Ctx): () => void {
  const { s, root } = c;
  const what = s.r === "pizza" ? "pizzor" : "cupcakes";
  root.innerHTML = `<h2>Välkommen!</h2>
    <div class="card big-money"><div class="coins">💰</div>
      <p>Du får <b>${s.startCash} kr</b> att handla för.</p>
      <p>Gå till marknaden och köp ingredienser. Sedan bygger du dina ${what} och börjar sälja.</p>
      <p><small>Omgången pågår i ${DAYS[s.r]} dagar. Vinsten är det du har i kassan efter sista dagen minus startkapitalet.</small></p></div>
    <button class="big" data-act="go">Till marknaden ▶</button>`;
  const on = (e: Event): void => {
    if ((e.target as HTMLElement).closest("[data-act=go]")) c.go("market");
  };
  root.addEventListener("click", on);
  return () => root.removeEventListener("click", on);
}

export function summary(c: Ctx): () => void {
  const { s, root } = c;
  const costs = s.purchases + s.upgradeSpend;
  const profit = s.income + s.tips - costs;
  root.innerHTML = `<h2>Dag ${s.day} är slut</h2>
    <div class="card"><table>
      <tr><td>Intäkter</td><td>${s.income} kr</td></tr>
      <tr><td>Dricks</td><td>${s.tips} kr</td></tr>
      <tr><td>Inköp</td><td>${s.purchases} kr</td></tr>
      <tr><td>Uppgraderingar</td><td>${s.upgradeSpend} kr</td></tr>
      <tr><td><b>Vinst idag</b></td><td><b>${profit} kr</b></td></tr>
      <tr><td>Kassa nu</td><td>${s.money} kr</td></tr></table></div>
    <button class="big" data-act="next">${s.day >= DAYS[s.r] ? "Visa resultat" : "Nästa dag ▶"}</button>`;
  const on = (e: Event): void => {
    if ((e.target as HTMLElement).closest("[data-act=next]")) c.nextDay();
  };
  root.addEventListener("click", on);
  return () => root.removeEventListener("click", on);
}

export function end(c: Ctx): () => void {
  const { s, root } = c;
  const rows = s.history.map((d) => `<tr><td>${d.day}</td><td>${d.income}</td><td>${d.costs}</td><td>${d.profit}</td></tr>`).join("");
  const profit = s.money - s.startCash;
  root.innerHTML = `<h2>${s.gameOver ? "Slut på pengar och ingredienser" : "Omgången är slut"}</h2>
    <div class="card"><table><tr><th>Dag</th><th>Intäkter</th><th>Kostnader</th><th>Vinst</th></tr>${rows}</table>
    <h2>Total vinst: ${esc(String(profit))} kr</h2><p><small>Kassa ${s.money} kr minus startkapital ${s.startCash} kr.</small></p></div>
    <button class="big" data-act="again">Spela igen</button>
    <button class="big alt" data-act="other">${s.r === "pizza" ? "🧁 Prova cupcake" : "🍕 Prova pizza"}</button>`;
  const on = (e: Event): void => {
    const el = (e.target as HTMLElement).closest<HTMLElement>("[data-act]");
    if (el?.dataset.act === "again") c.restart();
    else if (el?.dataset.act === "other") c.restart(s.r === "pizza" ? "cupcake" : "pizza");
  };
  root.addEventListener("click", on);
  return () => root.removeEventListener("click", on);
}
