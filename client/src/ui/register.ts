/**
 * Kassaapparaten: stor display, knappsats 0-9 och komma, röd rensa-knapp och grön summera-knapp.
 * I cupcake finns dessutom en färdig knapp per cupcake på menyn: tryck x gånger för att lägga till x st.
 * Komponenten är ren DOM/CSS och vet inget om spelets regler: spelet får värdet via `onSubmit`
 * och svarar med `ok()` eller `wrong()`.
 */

export interface RegisterItem {
  id: string;
  label: string;
  /** Emoji eller kort symbol på knappen. */
  icon?: string;
  /** Pris i kronor, visas på knappen. */
  price?: number;
}

export interface RegisterResult {
  /** Det som tryckts in på knappsatsen (null om inget). Komma tolkas som decimaltecken. */
  amount: number | null;
  /** Antal per menyknapp (bara id:n som tryckts på). */
  counts: Record<string, number>;
}

const STYLE = `
.reg{--ink:#3a2a33;--body:#6fd0d6;--body2:#4fb5bf;--key:#fff1c9;--green:#3fc9a0;--red:#ef4d3c;
  box-sizing:border-box;width:100%;max-width:460px;padding:14px;border:4px solid var(--ink);border-radius:22px;
  background:var(--body);color:var(--ink);font:700 20px/1.2 system-ui,sans-serif;user-select:none;touch-action:manipulation}
.reg *{box-sizing:border-box}
.reg-disp{display:flex;align-items:center;justify-content:space-between;gap:8px;min-height:64px;padding:8px 14px;border:4px solid var(--ink);
  border-radius:12px;background:#151515;color:#8ff3ff;font:800 34px/1 ui-monospace,Menlo,monospace}
.reg-disp small{font:700 14px system-ui,sans-serif;color:#b9c;text-align:right}
.reg-disp.wrong{animation:reg-shake .4s;color:#ff8a7a}
.reg-disp.ok{color:#9dffb8}
.reg-hint{min-height:1.3em;margin:8px 2px 0;font-size:15px;color:#164a50}
.reg-body{display:flex;gap:12px;margin-top:8px}
.reg-pad{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;flex:1 1 60%}
.reg-items{display:flex;flex-direction:column;gap:8px;flex:1 1 40%}
.reg button{font:inherit;color:var(--ink);cursor:pointer;border:3px solid var(--ink);border-radius:14px;background:var(--key);
  box-shadow:0 5px 0 var(--ink);min-height:58px;padding:6px 8px;position:relative}
.reg button:active{transform:translateY(4px);box-shadow:0 1px 0 var(--ink)}
.reg button:disabled{opacity:.45;cursor:default}
.reg .k-clear{background:var(--red);color:#fff}
.reg .k-go{background:var(--green);font-size:30px;min-height:64px;margin-top:10px;width:100%}
.reg .it{text-align:left;display:flex;align-items:center;gap:8px;font-size:18px}
.reg .it small{font:600 14px system-ui,sans-serif;opacity:.8}
.reg .it b{position:absolute;top:-10px;right:-8px;min-width:28px;height:28px;border-radius:14px;background:var(--red);color:#fff;
  border:3px solid var(--ink);display:none;align-items:center;justify-content:center;font-size:15px;padding:0 4px}
.reg .it.has b{display:flex}
.reg.compact{padding:10px;font-size:17px;border-radius:18px}
.reg.compact .reg-disp{min-height:46px;padding:4px 12px;font-size:26px}
.reg.compact .reg-hint{margin:4px 2px 0;font-size:13px;min-height:2.4em}
.reg.compact .reg-body{margin-top:4px}
.reg.compact .reg-pad{gap:6px}
.reg.compact button{min-height:42px;box-shadow:0 4px 0 var(--ink);padding:2px 6px}
.reg.compact .k-go{min-height:46px;margin-top:8px;font-size:26px}
@keyframes reg-shake{25%{transform:translateX(-8px)}75%{transform:translateX(8px)}}
@media (max-width:520px){.reg-body{flex-direction:column}}
`;

let styled = false;

export class Register {
  private readonly root = document.createElement("div");
  private readonly display = document.createElement("div");
  private readonly main = document.createElement("span");
  private readonly side = document.createElement("small");
  private readonly hint = document.createElement("div");
  private readonly pad = document.createElement("div");
  private readonly itemsBox = document.createElement("div");
  private readonly itemButtons = new Map<string, { btn: HTMLButtonElement; badge: HTMLElement }>();
  private readonly counts: Record<string, number> = {};
  private text = "";
  private submitCb: ((r: RegisterResult) => void) | null = null;
  private keyboard = true;
  private enabled = true;
  private readonly onKey = (e: KeyboardEvent): void => this.handleKey(e);

  constructor(
    parent: HTMLElement,
    private readonly items: RegisterItem[] = [],
    opts: { compact?: boolean } = {},
  ) {
    if (!styled) {
      const st = document.createElement("style");
      st.textContent = STYLE;
      document.head.appendChild(st);
      styled = true;
    }
    this.root.className = opts.compact ? "reg compact" : "reg";
    this.display.className = "reg-disp";
    this.display.append(this.main, this.side);
    this.hint.className = "reg-hint";
    const body = document.createElement("div");
    body.className = "reg-body";
    this.pad.className = "reg-pad";
    const key = (label: string, cls: string, fn: () => void): HTMLButtonElement => {
      const b = document.createElement("button");
      b.type = "button";
      b.textContent = label;
      if (cls) b.className = cls;
      b.addEventListener("click", fn);
      return b;
    };
    for (const d of ["1", "2", "3", "4", "5", "6", "7", "8", "9"]) this.pad.append(key(d, "", () => this.press(d)));
    this.pad.append(key("C", "k-clear", () => this.clear()), key("0", "", () => this.press("0")), key(",", "", () => this.press(",")));
    body.append(this.pad);
    if (items.length > 0) {
      this.itemsBox.className = "reg-items";
      for (const it of items) {
        const btn = key("", "it", () => this.addItem(it.id));
        const badge = document.createElement("b");
        const name = document.createElement("span");
        name.innerHTML = `${it.icon ?? ""} ${it.label}${it.price !== undefined ? `<br><small>${it.price} kr</small>` : ""}`;
        btn.append(name, badge);
        this.itemButtons.set(it.id, { btn, badge });
        this.itemsBox.append(btn);
      }
      body.append(this.itemsBox);
    }
    const go = key("✓", "k-go", () => this.submit());
    go.setAttribute("aria-label", "Summera");
    this.root.append(this.display, this.hint, body, go);
    parent.append(this.root);
    window.addEventListener("keydown", this.onKey);
    this.render();
  }

  onSubmit(cb: (r: RegisterResult) => void): void {
    this.submitCb = cb;
  }

  /** Liten hjälptext under displayen. */
  setHint(text: string): void {
    this.hint.textContent = text;
  }

  /** Sätter om knappsatsen: av när spelet inte väntar på inmatning. */
  setEnabled(on: boolean): void {
    this.enabled = on;
    for (const b of this.root.querySelectorAll("button")) b.disabled = !on;
  }

  /** Visa/göm menyknapparna eller knappsatsen beroende på vad kunden ska göra. */
  setLayout(layout: "price" | "order"): void {
    this.pad.style.display = layout === "order" && this.items.length > 0 ? "none" : "";
    this.itemsBox.style.display = layout === "price" ? "none" : "";
  }

  clear(): void {
    this.text = "";
    for (const k of Object.keys(this.counts)) delete this.counts[k];
    this.display.classList.remove("wrong", "ok");
    this.render();
  }

  wrong(): void {
    this.display.classList.remove("ok", "wrong");
    void this.display.offsetWidth; // startar om animationen
    this.display.classList.add("wrong");
    window.setTimeout(() => {
      this.display.classList.remove("wrong");
      this.clear();
    }, 700);
  }

  ok(): void {
    this.display.classList.add("ok");
    window.setTimeout(() => this.clear(), 700);
  }

  destroy(): void {
    window.removeEventListener("keydown", this.onKey);
    this.root.remove();
  }

  private press(ch: string): void {
    if (!this.enabled) return;
    if (this.text.length >= 8) return;
    if (ch === ",") {
      if (this.text.includes(",")) return;
      if (this.text === "") this.text = "0";
    }
    if (ch === "0" && this.text === "0") return;
    this.text = this.text === "0" && ch !== "," ? ch : this.text + ch;
    this.display.classList.remove("wrong", "ok");
    this.render();
  }

  private addItem(id: string): void {
    if (!this.enabled) return;
    this.counts[id] = (this.counts[id] ?? 0) + 1;
    this.render();
  }

  private submit(): void {
    if (!this.enabled) return;
    const amount = this.text === "" ? null : Number(this.text.replace(",", "."));
    this.submitCb?.({ amount, counts: { ...this.counts } });
  }

  private handleKey(e: KeyboardEvent): void {
    if (!this.keyboard || !this.enabled || !this.root.isConnected) return;
    const t = e.target as HTMLElement | null;
    if (t && /^(INPUT|SELECT|TEXTAREA)$/.test(t.tagName)) return;
    if (/^[0-9]$/.test(e.key)) this.press(e.key);
    else if (e.key === "," || e.key === ".") this.press(",");
    else if (e.key === "Backspace") {
      this.text = this.text.slice(0, -1);
      this.render();
    } else if (e.key === "Enter") this.submit();
    else if (e.key === "Escape") this.clear();
  }

  private render(): void {
    const total = Object.values(this.counts).reduce((a, b) => a + b, 0);
    this.main.textContent = this.text !== "" ? this.text : "0";
    this.side.textContent = total > 0 ? this.items.filter((i) => this.counts[i.id]).map((i) => `${this.counts[i.id]} ${i.label}`).join(" · ") : "";
    for (const [id, { btn, badge }] of this.itemButtons) {
      const n = this.counts[id] ?? 0;
      badge.textContent = String(n);
      btn.classList.toggle("has", n > 0);
    }
  }
}
