/**
 * Vilka riktiga bilder som finns, och namn på djur och poser.
 *
 * Så här byter du in en riktig bild: lägg PNG-filen i `client/public/art/...`
 * och lägg till dess nyckel i ART_AVAILABLE nedan. Då används bilden i stället
 * för platshållaren. Nyckel = sökväg under art/ utan .png, t.ex. "kunder/rav_glad".
 */
export const INK = 0x3a2a33;
export const FONT = "system-ui, sans-serif";

export const SPECIES = [
  "rav",
  "groda",
  "uggla",
  "katt",
  "hund",
  "kanin",
  "bjorn",
  "igelkott",
  "skoldpadda",
  "anka",
] as const;
export type Species = (typeof SPECIES)[number];

export const POSES = ["vantar", "pratar", "glad", "tveksam", "gapar", "vinkar"] as const;
export type Pose = (typeof POSES)[number];

/** Lägg till nycklar här när en riktig bild finns, t.ex. "kunder/rav_vantar". */
export const ART_AVAILABLE = new Set<string>([]);

export const animalKey = (species: Species, pose: Pose): string => `kunder/${species}_${pose}`;

export function artUrl(key: string): string {
  const base = (import.meta as unknown as { env?: { BASE_URL?: string } }).env?.BASE_URL ?? "/";
  return `${base}art/${key}.png`;
}
