import { ART_AVAILABLE, animalKey, artUrl, type Pose, type Species } from "../scene";
import { ANIMAL_EMOJI } from "./state";

/**
 * Kundens porträtt i cupcake-kassan. Använder riktig bild om den finns (kunder/{art}_{pose}),
 * annars en emoji som platshållare.
 */
export function portrait(species: Species, pose: Pose): HTMLElement {
  const box = document.createElement("div");
  box.className = `portrait pose-${pose}`;
  const key = animalKey(species, pose);
  if (ART_AVAILABLE.has(key)) {
    const img = document.createElement("img");
    img.src = artUrl(key);
    img.alt = "";
    box.append(img);
  } else {
    const e = document.createElement("span");
    e.className = "emoji";
    e.textContent = ANIMAL_EMOJI[species];
    box.append(e);
  }
  return box;
}
