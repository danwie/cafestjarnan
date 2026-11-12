import { UPGRADES, unlockedIngredients, SELLERS } from "../../../shared/data";
import { formatQuarters, nextUpgradeCost, offersFor, purchaseFeedback, qtyStep, isAvailable, menuSlots } from "../../../shared/rules";
import { ICON, esc, msgLine, say, type Ctx } from "./state";

const STALL = ["", "🔴", "🟡", "🟢"];
const UPGRADE_NAMES: Record<string, string> = {
  bil: "🚗 Bil (fler beställningar)", skylt: "🪧 Skylt", ugn: "🔥 Ugn", dricksburk: "🫙 Dricksburk", menyplatser: "📋 Menyplatser",
};

/** Marknaden: lager, inköp från stånden och uppgraderingar. Sedan vidare till dekorering eller direkt till försäljning. */
export function market(c: Ctx): () => void {
  const { s, root } = c;
  const render = (): void => {
    const unlocked = unlockedIngredients(s.r, s.day);
    const sellers = SELLERS[s.r].filter((x) => x.unlockDay <= s.day);
    const showUnit = s.r === "pizza" && (s.day === 3 || s.day === 6);
    const stock = unlocked
      .map((i) => `<span class="chip">${ICON[i.id] ?? ""} ${i.name}: <b>${formatQuarters(s.stock[i.id] ?? 0)}</b></span>`)
      .join("");
    const stalls = sellers
      .map((x) => {
        const rows = unlocked
          .map((i) => {
            const buttons = offersFor(s.r, s.day, i.id)
              .filter((o) => o.sellerId === x.id)
              .map((o) => {
                const unit = showUnit ? ` <small>(${o.unit.toFixed(2)}/st)</small>` : "";
                return `<button class="alt" ${o.price > s.money ? "disabled" : ""} data-act="buy" data-i="${i.id}" data-s="${o.sellerId}" data-q="${o.qty}">${o.qty} st för ${o.price} kr${unit}</button>`;
              })
              .join("");
            return `<tr><td><b>${ICON[i.id] ?? ""} ${i.name}</b></td><td>${buttons}</td></tr>`;
          })
          .join("");
        const title = s.r === "pizza" ? `${STALL[x.id] ?? ""} Stånd ${x.id}` : "🧺 Marknadsstånd";
        return `<div class="stall"><h3>${title}</h3><table>${rows}</table></div>`;
      })
      .join("");
    const upgRows = Object.keys(UPGRADES[s.r])
      .map((id) => {
        const cost = nextUpgradeCost(s.r, id, s.upgrades);
        const lvl = s.upgrades[id] ?? 0;
        const btn =
          cost === null
            ? "<small>högsta nivån</small>"
            : `<button ${cost > s.money ? "disabled" : ""} data-act="upg" data-id="${id}">Köp nivå ${lvl + 1} för ${cost} kr</button>`;
        return `<tr><td><b>${UPGRADE_NAMES[id] ?? id}</b></td><td>nivå ${lvl}</td><td>${btn}</td></tr>`;
      })
      .join("");
    const menu = s.menu
      .map((v) => `<span class="chip">${esc(v.name)} ${isAvailable(v, s.stock, qtyStep(s.r, s.day)) ? "" : '<span class="soldout">slut</span>'}</span>`)
      .join("");
    root.innerHTML = `<h2>Marknaden</h2>${s.day === 1 ? `<div class="card hint">💰 Du har ${s.money} kr att handla för. Köp ingredienser av säljaren, sedan bygger du din första ${s.r === "pizza" ? "pizza" : "cupcake"}.</div>` : ""}
      ${msgLine(s)}
      <div class="card"><h3>Lager</h3>${stock || "<small>Tomt. Handla nedan.</small>"}</div>
      <div class="card"><h3>${sellers.length > 1 ? "Stånden" : "Säljaren"}</h3>
        ${s.r === "pizza" && sellers.length > 1 ? "<p><small>Jämför ståndens priser. Du kan köpa olika ingredienser från olika stånd.</small></p>" : ""}
        <div class="stalls">${stalls}</div>
        <div class="msg ok" id="fb">${esc(s.feedback)}</div></div>
      <div class="card"><h3>Uppgraderingar</h3><table>${upgRows}</table></div>
      <div class="card"><h3>Meny (${s.menu.length}/${menuSlots(s.r, s.upgrades)} platser)</h3>${menu || "<small>Menyn är tom.</small>"}</div>
      <button class="big" data-act="decorate">🎨 Dekorera ▶</button>
      ${s.menu.length > 0 ? '<button class="big alt" data-act="skip">⏩ Hoppa över dekorering, börja sälja</button>' : ""}`;
  };
  const onClick = (e: Event): void => {
    const el = (e.target as HTMLElement).closest<HTMLElement>("[data-act]");
    if (!el) return;
    const d = el.dataset;
    if (d.act === "buy") {
      const offer = offersFor(s.r, s.day, d.i as string).find((o) => o.sellerId === Number(d.s) && o.qty === Number(d.q));
      if (!offer || offer.price > s.money) return;
      s.money -= offer.price;
      s.purchases += offer.price;
      s.stock = { ...s.stock, [d.i as string]: (s.stock[d.i as string] ?? 0) + offer.qty * 4 };
      if (s.r === "pizza") {
        const f = purchaseFeedback(s.r, s.day, d.i as string, { sellerId: offer.sellerId, qty: offer.qty });
        s.feedback = f.best
          ? `Bra val! Du sparade ${f.amount} kr på att välja den här säljaren.`
          : `Säljare ${f.bestOffer.sellerId} (${f.bestOffer.qty} st) hade varit billigare: du kunde ha sparat ${f.amount} kr.`;
      }
      c.hud();
      render();
    } else if (d.act === "upg") {
      const cost = nextUpgradeCost(s.r, d.id as string, s.upgrades);
      if (cost === null || cost > s.money) return;
      s.money -= cost;
      s.upgradeSpend += cost;
      s.upgrades = { ...s.upgrades, [d.id as string]: (s.upgrades[d.id as string] ?? 0) + 1 };
      c.hud();
      render();
    } else if (d.act === "decorate") {
      say(s, "");
      c.go("decorate");
    } else if (d.act === "skip") {
      c.go("sales");
    }
  };
  root.addEventListener("click", onClick);
  render();
  return () => root.removeEventListener("click", onClick);
}
