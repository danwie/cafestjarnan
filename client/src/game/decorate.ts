import { MAX_SAME_TOPPING, MAX_TOPPINGS_TOTAL, getIngredient, unlockedIngredients } from "../../../shared/data";
import {
  isAvailable, menuSlots, minPrice, priceStep, qtyStep, validatePrice, validateVariant, variantCost, countIngredients, type Variant,
} from "../../../shared/rules";
import { ICON, describe, esc, msgLine, say, type Ctx } from "./state";

/** Dekorering: bygg en cupcake/pizza och lägg den på menyn. Går att hoppa över om menyn redan har något. */
export function decorate(c: Ctx): () => void {
  const { s, root } = c;
  const draft = { ids: [] as string[], name: "", price: "" };
  const isFrosting = (id: string): boolean => getIngredient(s.r, id).kind === "frosting";
  const step = (): number => qtyStep(s.r, s.day);

  const missing = (ids: readonly string[]): string[] => {
    const out: string[] = [];
    for (const [id, n] of countIngredients(ids)) if ((s.stock[id] ?? 0) < n * step()) out.push(getIngredient(s.r, id).name);
    return out;
  };

  const add = (id: string): void => {
    if (isFrosting(id)) {
      draft.ids = [...draft.ids.filter((x) => !isFrosting(x)), id];
      return;
    }
    const same = draft.ids.filter((x) => x === id).length;
    const total = draft.ids.filter((x) => !isFrosting(x)).length;
    if (same >= MAX_SAME_TOPPING[s.r]) return say(s, `Högst ${MAX_SAME_TOPPING[s.r]} av samma ingrediens.`, "err");
    if (total >= MAX_TOPPINGS_TOTAL[s.r]) return say(s, `Högst ${MAX_TOPPINGS_TOTAL[s.r]} toppings totalt.`, "err");
    draft.ids = [...draft.ids, id];
    say(s, "");
  };

  const render = (): void => {
    const unlocked = unlockedIngredients(s.r, s.day);
    const slots = menuSlots(s.r, s.upgrades);
    const counts = new Map<string, number>();
    for (const id of draft.ids) counts.set(id, (counts.get(id) ?? 0) + 1);
    const chips = unlocked
      .map((i) => {
        const n = counts.get(i.id) ?? 0;
        const have = s.stock[i.id] ?? 0;
        const out = have <= 0 ? ' <span class="soldout">slut</span>' : "";
        const label = `${ICON[i.id] ?? ""} ${i.name} <small>(${i.price} kr)</small>${out}`;
        if (i.kind === "frosting") {
          return `<span class="chip" draggable="true" data-drag="${i.id}"><button class="${n ? "" : "alt"}" data-act="frost" data-id="${i.id}">${label}</button></span>`;
        }
        return `<span class="chip" draggable="true" data-drag="${i.id}">${label} <button class="alt" data-act="dec" data-id="${i.id}" ${n ? "" : "disabled"}>−</button> <b>${n}</b> <button data-act="inc" data-id="${i.id}">+</button></span>`;
      })
      .join("");
    const miss = missing(draft.ids);
    const cost = variantCost(s.r, draft.ids);
    const min = minPrice(s.r, draft.ids, s.day);
    const rows = s.menu
      .map((v) => {
        const sold = isAvailable(v, s.stock, step());
        return `<tr><td><b>${esc(v.name)}</b> ${sold ? "" : '<span class="soldout">slut: kan inte säljas just nu</span>'}</td><td>${describe(s, v.ingredients)}</td>
          <td><small>kostar ${variantCost(s.r, v.ingredients)} kr</small></td>
          <td><input type="number" min="1" step="${priceStep(s.r, s.day)}" value="${v.price}" data-vprice="${v.id}" /> kr</td>
          <td><button class="warn" data-act="del" data-id="${v.id}">Ta bort</button></td></tr>`;
      })
      .join("");
    root.innerHTML = `<h2>Dekorera</h2>${msgLine(s)}
      <div class="card"><h3>Din meny (${s.menu.length}/${slots} platser)</h3>
        ${rows ? `<table>${rows}</table>` : "<small>Menyn är tom. Bygg din första sort nedan.</small>"}
        <p><small>Pris måste vara minst kostnad + 1 kr och delbart med ${priceStep(s.r, s.day)}.</small></p></div>
      <div class="card"><h3>Ny ${s.r === "pizza" ? "pizza" : "cupcake"}</h3>
        <p><small>Dra ingredienser till ${s.r === "cupcake" ? "cupcaken" : "pizzan"} eller tryck +. Samma ingrediens får läggas flera gånger (högst ${MAX_SAME_TOPPING[s.r]} av samma, ${MAX_TOPPINGS_TOTAL[s.r]} totalt${s.r === "cupcake" ? ", exakt en frosting" : ""}). Bara sådant som går att köpa visas.</small></p>
        <div class="base" data-drop>${s.r === "cupcake" ? "🧁" : "🍕"} ${draft.ids.map((id) => ICON[id] ?? "•").join(" ")}</div>
        ${chips}<br/>
        ${miss.length ? `<div class="msg err">⚠️ Slut på ${miss.join(", ")}: den här kan inte säljas just nu. Du kan lägga den på menyn ändå och köpa mer på marknaden.</div>` : ""}
        Namn: <input type="text" maxlength="14" data-dname value="${esc(draft.name)}" placeholder="Sort ${s.menu.length + 1}" />
        Pris: <input type="number" data-dprice value="${esc(draft.price)}" placeholder="${min}" /> kr
        <small>(kostnad ${cost}, minst ${min})</small>
        <button data-act="add" ${s.menu.length >= slots ? "disabled" : ""}>Lägg på menyn</button></div>
      <button class="alt" data-act="back">◀ Marknaden</button>
      <button class="big" data-act="open">${s.menu.length > 0 ? "▶ Börja sälja" : "▶ Börja sälja (bygg en sort först)"}</button>`;
  };

  const open = (): void => {
    const slots = menuSlots(s.r, s.upgrades);
    if (s.menu.length === 0) return (say(s, "Lägg till minst en sort på menyn.", "err"), render());
    if (s.menu.length > slots) return (say(s, `Menyn får högst ha ${slots} sorter.`, "err"), render());
    for (const v of s.menu) {
      const err = validatePrice(s.r, v.ingredients, v.price, s.day);
      if (err) return (say(s, `${v.name}: ${err}`, "err"), render());
    }
    if (s.menu.every((v) => !isAvailable(v, s.stock, step()))) {
      if (s.money < 1) {
        s.gameOver = true;
        return c.go("end");
      }
      say(s, "Inget på menyn går att sälja just nu: det är slut på ingredienser. Gå tillbaka till marknaden och handla.", "err");
      return render();
    }
    say(s, "");
    c.go("sales");
  };

  const onClick = (e: Event): void => {
    const el = (e.target as HTMLElement).closest<HTMLElement>("[data-act]");
    if (!el) return;
    const d = el.dataset;
    switch (d.act) {
      case "inc":
      case "frost":
        add(d.id as string);
        return render();
      case "dec": {
        const at = draft.ids.lastIndexOf(d.id as string);
        if (at >= 0) draft.ids = draft.ids.filter((_, k) => k !== at);
        return render();
      }
      case "del":
        s.menu = s.menu.filter((v) => v.id !== d.id);
        return render();
      case "add": {
        const err = validateVariant(s.r, draft.ids);
        if (err) return (say(s, err, "err"), render());
        const price = draft.price === "" ? minPrice(s.r, draft.ids, s.day) : Number(draft.price);
        const perr = validatePrice(s.r, draft.ids, price, s.day);
        if (perr) return (say(s, perr, "err"), render());
        const v: Variant = { id: `v${Date.now()}${s.menu.length}`, name: draft.name.trim() || `Sort ${s.menu.length + 1}`, ingredients: [...draft.ids], price };
        s.menu = [...s.menu, v];
        draft.ids = [];
        draft.name = "";
        draft.price = "";
        say(s, "");
        return render();
      }
      case "back":
        return c.go("market");
      case "open":
        return open();
    }
  };
  const onInput = (e: Event): void => {
    const el = e.target as HTMLInputElement;
    if (el.dataset.dname !== undefined) draft.name = el.value;
    if (el.dataset.dprice !== undefined) draft.price = el.value;
  };
  const onChange = (e: Event): void => {
    const el = e.target as HTMLInputElement;
    if (el.dataset.vprice) {
      const v = s.menu.find((m) => m.id === el.dataset.vprice);
      if (v) v.price = Math.round(Number(el.value));
    }
  };
  const onDragStart = (e: DragEvent): void => {
    const el = (e.target as HTMLElement).closest<HTMLElement>("[data-drag]");
    if (el?.dataset.drag) e.dataTransfer?.setData("text/plain", el.dataset.drag);
  };
  const onDragOver = (e: DragEvent): void => {
    const zone = (e.target as HTMLElement).closest<HTMLElement>("[data-drop]");
    if (zone) {
      e.preventDefault();
      zone.classList.add("over");
    }
  };
  const onDragLeave = (e: DragEvent): void => void (e.target as HTMLElement).closest<HTMLElement>("[data-drop]")?.classList.remove("over");
  const onDrop = (e: DragEvent): void => {
    if (!(e.target as HTMLElement).closest<HTMLElement>("[data-drop]")) return;
    e.preventDefault();
    const id = e.dataTransfer?.getData("text/plain");
    if (id) {
      add(id);
      render();
    }
  };
  root.addEventListener("click", onClick);
  root.addEventListener("input", onInput);
  root.addEventListener("change", onChange);
  root.addEventListener("dragstart", onDragStart);
  root.addEventListener("dragover", onDragOver);
  root.addEventListener("dragleave", onDragLeave);
  root.addEventListener("drop", onDrop);
  render();
  return () => {
    root.removeEventListener("click", onClick);
    root.removeEventListener("input", onInput);
    root.removeEventListener("change", onChange);
    root.removeEventListener("dragstart", onDragStart);
    root.removeEventListener("dragover", onDragOver);
    root.removeEventListener("dragleave", onDragLeave);
    root.removeEventListener("drop", onDrop);
  };
}
