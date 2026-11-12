/**
 * Bilder till scenerna. Varje bild har ett fast filnamn under public/art/.
 * Finns filen används den, annars ritas en platshållare i kod. Då fungerar
 * allt innan riktig grafik finns, och riktiga bilder byts in utan kodändring.
 *
 *   art/kroppar/{art}.png      hela djuret, stående, vänt åt höger (≈ 220 px högt)
 *   art/bakgrund/pizzeria.png  2400×1350, se grafik.md för var kön och disken ska ligga
 *   art/bakgrund/cupcake_cafe.png
 *   art/bil/bil{nivå}_{ne|nw|se|sw}.png
 */
import { Assets, Container, Graphics, Texture, type Renderer } from "pixi.js";
import { SPECIES, type Species } from "./events";

export const INK = 0x3a2a33;

const baseUrl = (): string => (import.meta.env?.BASE_URL as string | undefined) ?? "/";

type Ears = "point" | "round" | "long" | "floppy" | "none" | "tufts" | "spikes";
const LOOK: Record<Species, { color: number; dark: number; belly: number; ears: Ears }> = {
  rav: { color: 0xff8a2b, dark: 0xd9650f, belly: 0xfff1d6, ears: "point" },
  groda: { color: 0x3fc9a0, dark: 0x25a07c, belly: 0xd8ffe9, ears: "none" },
  uggla: { color: 0xa8683a, dark: 0x84501f, belly: 0xffe6c2, ears: "tufts" },
  katt: { color: 0x9aa6b8, dark: 0x76839a, belly: 0xf1f4fa, ears: "point" },
  hund: { color: 0xd9a05b, dark: 0xb57f3c, belly: 0xfff0d2, ears: "floppy" },
  kanin: { color: 0xf6f1ee, dark: 0xd3c8c2, belly: 0xffffff, ears: "long" },
  bjorn: { color: 0x8a5a3a, dark: 0x6b4128, belly: 0xe7c7a0, ears: "round" },
  igelkott: { color: 0xc9a27e, dark: 0x6b4d3a, belly: 0xfbe5cc, ears: "spikes" },
  skoldpadda: { color: 0x7ed957, dark: 0x4fae30, belly: 0xf3ffcf, ears: "none" },
  anka: { color: 0xffc730, dark: 0xe0a312, belly: 0xfff3b0, ears: "none" },
};

function drawEars(g: Graphics, kind: Ears, color: number, dark: number, hy: number): void {
  const stroke = { width: 3, color: INK };
  switch (kind) {
    case "point":
      for (const s of [-1, 1]) g.poly([s * 14, hy - 28, s * 38, hy - 66, s * 40, hy - 22]).fill(color).stroke(stroke);
      break;
    case "round":
      for (const s of [-1, 1]) g.circle(s * 30, hy - 30, 14).fill(color).stroke(stroke);
      break;
    case "long":
      for (const s of [-1, 1]) g.ellipse(s * 17, hy - 66, 11, 38).fill(color).stroke(stroke);
      break;
    case "floppy":
      for (const s of [-1, 1]) g.ellipse(s * 40, hy - 6, 13, 28).fill(dark).stroke(stroke);
      break;
    case "tufts":
      for (const s of [-1, 1]) g.poly([s * 12, hy - 32, s * 34, hy - 60, s * 38, hy - 24]).fill(dark).stroke(stroke);
      break;
    case "spikes":
      for (let i = -3; i <= 3; i++) g.poly([i * 11 - 7, hy - 30, i * 11, hy - 58 + Math.abs(i) * 4, i * 11 + 7, hy - 30]).fill(dark).stroke(stroke);
      break;
    default:
      break;
  }
}

/** Platshållare: ett litet djur med stort huvud, som i stilguiden (cel-shadat, tjocka linjer). */
function placeholderBody(renderer: Renderer, species: Species): Texture {
  const look = LOOK[species];
  const c = new Container();
  const g = new Graphics();
  const stroke = { width: 3, color: INK };
  const hy = -118; // huvudets mitt
  if (species === "skoldpadda") g.ellipse(0, -52, 40, 34).fill(0x4fae30).stroke(stroke); // skal
  g.ellipse(-16, -6, 14, 8).fill(look.dark).stroke(stroke); // fötter
  g.ellipse(16, -6, 14, 8).fill(look.dark).stroke(stroke);
  g.ellipse(0, -44, 32, 40).fill(look.color).stroke(stroke); // kropp
  g.ellipse(0, -40, 19, 26).fill(look.belly); // mage
  drawEars(g, look.ears, look.color, look.dark, hy);
  g.circle(0, hy, 42).fill(look.color).stroke(stroke); // huvud
  if (species === "uggla" || species === "katt") g.ellipse(0, hy + 14, 22, 16).fill(look.belly);
  const eyeY = species === "groda" ? hy - 34 : hy - 4;
  const eyeX = species === "groda" ? 24 : 15;
  for (const s of [-1, 1]) {
    g.circle(s * eyeX, eyeY, species === "groda" ? 14 : 11).fill(0xffffff).stroke({ width: 2.5, color: INK });
    g.circle(s * eyeX + 2, eyeY + 1, 5).fill(INK);
  }
  if (species === "anka") g.ellipse(0, hy + 14, 20, 9).fill(0xff8a2b).stroke(stroke);
  else g.circle(0, hy + 12, 5).fill(INK);
  g.arc(0, hy + 18, 13, 0.25, Math.PI - 0.25).stroke({ width: 3, color: INK });
  c.addChild(g);
  return renderer.generateTexture({ target: c, resolution: 2 });
}

function placeholderCar(renderer: Renderer): Texture {
  const c = new Container();
  const g = new Graphics();
  const stroke = { width: 3, color: INK };
  g.roundRect(-44, -38, 88, 26, 8).fill(0xef4d3c).stroke(stroke);
  g.roundRect(-24, -62, 46, 28, 8).fill(0xffe9a8).stroke(stroke);
  g.rect(-14, -56, 12, 16).fill(0xcfe8ff);
  g.rect(2, -56, 12, 16).fill(0xcfe8ff);
  for (const x of [-26, 26]) g.circle(x, -10, 11).fill(INK).circle(x, -10, 4).fill(0xdddddd);
  c.addChild(g);
  return renderer.generateTexture({ target: c, resolution: 2 });
}

export class ArtLibrary {
  private real = new Map<string, Texture>();
  private fake = new Map<string, Texture>();

  constructor(private renderer: Renderer) {}

  /** Försöker ladda bilderna. Saknas en fil används en platshållare. Returnerar de som hittades. */
  async preload(paths: readonly string[]): Promise<string[]> {
    const found: string[] = [];
    await Promise.all(
      paths.map(async (path) => {
        const url = `${baseUrl()}art/${path}`;
        try {
          const res = await fetch(url, { method: "HEAD" });
          if (!res.ok || !(res.headers.get("content-type") ?? "").startsWith("image/")) return;
          this.real.set(path, await Assets.load<Texture>(url));
          found.push(path);
        } catch {
          /* saknas: platshållare används */
        }
      }),
    );
    return found;
  }

  private pick(path: string, make: () => Texture): Texture {
    const real = this.real.get(path);
    if (real) return real;
    let fake = this.fake.get(path);
    if (!fake) {
      fake = make();
      this.fake.set(path, fake);
    }
    return fake;
  }

  body(species: Species): Texture {
    return this.pick(`kroppar/${species}.png`, () => placeholderBody(this.renderer, species));
  }

  car(level: number, dir: "ne" | "nw" | "se" | "sw"): Texture {
    return this.pick(`bil/bil${level}_${dir}.png`, () => placeholderCar(this.renderer));
  }

  /** Riktig bakgrund om den finns, annars null (scenen ritar då en platshållare). */
  background(name: "pizzeria" | "cupcake_cafe"): Texture | null {
    return this.real.get(`bakgrund/${name}.png`) ?? null;
  }
}

export const PRELOAD_PATHS: string[] = [
  ...SPECIES.map((s) => `kroppar/${s}.png`),
  "bakgrund/pizzeria.png",
  "bakgrund/cupcake_cafe.png",
  ...(["ne", "nw", "se", "sw"] as const).map((d) => `bil/bil1_${d}.png`),
];
