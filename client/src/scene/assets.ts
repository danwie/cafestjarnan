import { Assets, type Texture } from "pixi.js";
import { ART_AVAILABLE, POSES, SPECIES, animalKey, artUrl } from "./manifest";

const cache = new Map<string, Texture>();

/** Laddar de bilder som finns i manifestet. Saknade eller trasiga bilder ersätts av platshållare. */
export async function preload(keys: Iterable<string>): Promise<void> {
  await Promise.all(
    [...keys]
      .filter((k) => ART_AVAILABLE.has(k) && !cache.has(k))
      .map(async (k) => {
        try {
          cache.set(k, await Assets.load<Texture>(artUrl(k)));
        } catch {
          console.warn(`Bilden art/${k}.png gick inte att ladda, använder platshållare.`);
        }
      }),
  );
}

export const preloadAnimals = (): Promise<void> =>
  preload(SPECIES.flatMap((s) => POSES.map((p) => animalKey(s, p))));

export const getTexture = (key: string): Texture | null => cache.get(key) ?? null;
