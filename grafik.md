# Caféstjärnan: grafikspecifikation och prompter

Stil: isometrisk 2,5D, enkel tecknad (cel-shadad) look med rena linjer och starka, klara färger. Fast isometriskt fågelperspektiv. Karaktärer är djur med stora huvuden och förenklade ansikten, som i klassiska 2D-flashspel. Ljusa, överskådliga miljöer och tydliga gränssnitt.

## 1. Arbetsfördelning

Bild-AI är bra på illustrationer men dålig på exakt geometri. Därför ritas allt som måste passa ett rutnät eller styras av spelet i kod, och bild-AI:n får det som är ren illustration.

| Görs i kod (av Claude)                                                                            | Görs av bild-AI                                               |
| ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| Staden i leveransen: isometriskt rutnät, gator och hus (SVG), så att koordinaterna alltid stämmer | Kundernas porträtt (10 djur × 6 poser)                        |
| Frosting-virvlar i cupcake (SVG som färgsätts)                                                    | Cupcake-botten och alla toppings som enskilda ikoner          |
| Textrutor, dialogramar, knappar och kassans sifferknappsats                                       | Pizzadeg-botten ovanifrån                                     |
| Digitala mätare för pengar och tålamod                                                            | Inredning: cupcake-café, pizzeria, marknadsstånd (bakgrunder) |
| Bråk-bitar på pizzan (mask), reaktioner som hjärta, tänkebubbla, Zzz, mynt                        | Säljare vid stånden                                           |
| Animationer (hopp, vinkning, gungning) av stillbilder                                             | Ikoner (uppgraderingar, mynt, m.m.) och titelbild             |
| Platshållare med samma filnamn, så att spelet fungerar innan riktig grafik finns                  | Bilar (valfritt, annars ritar jag en enkel i kod)             |

Typsnitt: ett rundat, tydligt typsnitt (t.ex. Fredoka) som stöder å, ä och ö. Det kontrolleras vid bygget.

## 2. Gemensam stil (klistra in i varje prompt)

**STYLE:**

```
Clean cel-shaded cartoon illustration with a 2.5D isometric look. Bold, uniform, warm dark outlines (about 3-4 px at 1024 px). Flat saturated colors with exactly one hard-edged shadow tone per color (two-tone shading), no gradients, no textures, no airbrush. Bright, cheerful, very easy to read, big simple silhouettes, simplified shapes like classic 2D Flash game art. Light comes from the upper left. Palette: cream, tomato red, sunny yellow, mint green, sky blue, raspberry pink, orange, warm brown. No text, no letters, no logos, no watermark.
```

**NEGATIVE** (om verktyget har fält för det):

```
photorealistic, 3D render, gradients, noise, blurry, thin sketchy lines, dark or moody lighting, text, watermark, realistic fur, scary, angry expression, human characters, gendered clothing, makeup, eyelashes, bows
```

**Preliminär palett** (för UI och som riktning):

| Namn            | Hex     |
| --------------- | ------- |
| Kräm (bakgrund) | #FFF4DF |
| Varm mörk linje | #3A2A33 |
| Tomatröd        | #EF4D3C |
| Solgul          | #FFC730 |
| Mintgrön        | #3FC9A0 |
| Himmelsblå      | #3FA7F5 |
| Hallonrosa      | #FF6FA5 |
| Orange          | #FF8A2B |
| Brun            | #A8683A |

## 3. Arbetsordning och konsekvens

1. **Stilreferens först.** Generera en bild på ett djur (räv, pose `vantar`) tills stilen är rätt. Spara den som referens.
2. Använd referensbilden som stilreferens i **alla** följande bilder (om verktyget stöder det), plus samma STYLE-block.
3. Börja med **3 arter × 6 poser** (räv, groda, uggla) för att testa kedjan. Fortsätt med övriga först när resultatet fungerar i spelet.
4. Generera ett djur i taget, alla poser efter varandra, och be om "same character as the reference image".
5. Kontrollera varje bild mot checklistan nedan.

**Checklista:**

- Genomskinlig bakgrund med rena kanter (ingen vit kant).
- Ingen text eller bokstäver i bilden.
- Samma linjetjocklek och skuggning som referensen.
- Ljus från övre vänster.
- Könsneutralt: inga rosetter, ögonfransar, mustascher, kläder eller accessoarer.
- Karaktären fyller ca 85 % av bilden och är centrerad.

## 4. Filer, format och namn

- Format: **PNG med genomskinlighet** (eller WebP), dubbel upplösning mot visningsstorlek.
- Filnamn **utan å, ä, ö**, gemener, understreck.
- Mapp: `client/public/art/`. Spelet laddar bilder relativt `import.meta.env.BASE_URL`, eftersom servern serverar spelet både på `/` och `/cafestjarnan`.
- Nyckel och sökväg hålls i en fil, `client/src/art/manifest.ts`, så att en bild kan bytas utan kodändring.

| Grupp            | Sökväg                             | Storlek   | Antal |
| ---------------- | ---------------------------------- | --------- | ----- |
| Kunder           | `art/kunder/{art}_{pose}.png`      | 1024×1024 | 60    |
| Säljare          | `art/saljare/{namn}.png`           | 1600×1200 | 4     |
| Bakgrunder       | `art/bakgrund/{namn}.png`          | 2400×1350 | 4     |
| Cupcake-botten   | `art/mat/cupcake_botten.png`       | 512×512   | 1     |
| Pizzadeg         | `art/mat/pizza_deg.png`            | 512×512   | 1     |
| Toppings         | `art/mat/topping_{namn}.png`       | 256×256   | 14    |
| Ikoner           | `art/ikoner/{namn}.png`            | 256×256   | 14    |
| Titelbild        | `art/titel/titel.png`              | 2400×1350 | 1     |
| Bilar (valfritt) | `art/bil/bil{nivå}_{riktning}.png` | 512×512   | 12    |

## 5. Prompter

Alla prompter börjar med **STYLE**-blocket ovan.

### 5.1 Kunder: 10 djur × 6 poser

**Arter** (filnamn): räv `rav`, groda `groda`, uggla `uggla`, katt `katt`, hund `hund`, kanin `kanin`, björn `bjorn`, igelkott `igelkott`, sköldpadda `skoldpadda`, anka `anka`.

**Mall:**

```
[STYLE]
Head-and-shoulders portrait of a cute {SPECIES} customer for a café game. Oversized head (about 60% of the figure height), tiny simplified body with only the shoulders and upper chest visible, large round eyes, a tiny nose and a simple mouth, minimal facial detail like classic Flash cartoon characters. Gender-neutral, no clothing, no accessories. Natural species colors, but saturated. Front-facing with a slight three-quarter angle as seen from an isometric camera. Pose and expression: {POSE}. Centered, fills about 85% of the canvas, transparent background, 1024x1024.
```

**Poser** (filnamn, beskrivning):

| Fil       | `{POSE}`                                                                                    |
| --------- | ------------------------------------------------------------------------------------------- |
| `vantar`  | relaxed and neutral, mouth closed in a small friendly smile, waiting patiently              |
| `pratar`  | mouth open as if speaking mid-sentence, one paw raised slightly while giving an order       |
| `glad`    | big happy smile, eyes closed as happy arcs, cheeks lifted, joyful                           |
| `tveksam` | one eyebrow raised, mouth a small wavy line, head tilted, glancing sideways, unsure ("hmm") |
| `gapar`   | big yawn, eyes half closed, sleepy, one paw near the mouth                                  |
| `vinkar`  | friendly smile, one paw waving goodbye, shoulders in a small shrug                          |

Hjärtan, tänkebubblor, prislappar och "Zzz" ritas inte i bilderna, utan läggs på av spelet.

### 5.2 Säljare vid stånd

```
[STYLE]
Isometric view of a small colorful market stall with a counter, an awning in {COLOR} and crates of ingredients, and a friendly {SPECIES} seller behind the counter with an oversized head and simplified face, gender-neutral, no clothing. Cheerful and tidy. Leave the lower third of the image fairly empty for game UI. Transparent background, 1600x1200.
```

| Fil               | `{SPECIES}`         | `{COLOR}`    | Används           |
| ----------------- | ------------------- | ------------ | ----------------- |
| `saljare_cupcake` | mullvad (mole)      | sky blue     | Cupcake-marknaden |
| `saljare_1`       | sköldpadda (turtle) | tomato red   | Pizza, säljare 1  |
| `saljare_2`       | gris (pig)          | sunny yellow | Pizza, säljare 2  |
| `saljare_3`       | get (goat)          | mint green   | Pizza, säljare 3  |

### 5.3 Bakgrunder (inredning, inga karaktärer)

Bildens viktiga innehåll ska ligga i mitten (ca 60 % av bredden), eftersom kanterna beskärs på smala skärmar.

**`cupcake_cafe`:**

```
[STYLE]
Isometric cutaway interior of a bright, cozy cupcake café seen from a fixed isometric angle. A counter with an old-fashioned cash register on the right, glass display of cupcakes, pastel but saturated walls, a star-shaped sign on the wall (no letters). A clear, calm empty area in front of the counter where one customer will be added later. No characters, no text. Wide 16:9, 2400x1350.
```

**`pizzeria`:**

```
[STYLE]
Isometric cutaway interior of a cheerful pizzeria seen from a fixed isometric angle. A long counter with an old-fashioned cash register, a brick pizza oven on the back wall, a marked waiting line on the floor leading to the counter with space for five customers in a row. Warm but bright colors, no characters, no text. Wide 16:9, 2400x1350.
```

**`marknad_cupcake`** och **`marknad_pizza`:**

```
[STYLE]
Isometric view of a lively outdoor market square, bright and tidy, with empty stall spaces ({ONE or THREE}) in the middle where market stalls will be added later. Cobblestones, a few trees, a fountain, clear open space. No characters, no text. Wide 16:9, 2400x1350.
```

### 5.4 Mat

**`cupcake_botten`:**

```
[STYLE]
A single cupcake base: a pleated paper cup in sunny yellow with a sponge cake top, seen from a three-quarter front angle, the top of the sponge is flat and open so frosting can be added on top later. No frosting, no toppings. Centered, transparent background, 512x512.
```

**`pizza_deg`:**

```
[STYLE]
A round raw pizza dough base seen straight from above, golden crust edge, flat tan center, no sauce, no cheese, no toppings. Centered, transparent background, 512x512.
```

**Toppings** (en bit eller en liten klunga, ritas utströdda av spelet). Mall:

```
[STYLE]
A single {ITEM} as a small game icon, seen from above (or a three-quarter angle for cupcake toppings), simple, bold, readable at small size. Centered, transparent background, 256x256.
```

| Fil                    | `{ITEM}`                              |
| ---------------------- | ------------------------------------- |
| `topping_tomat`        | one tomato slice                      |
| `topping_ost`          | one slice of yellow cheese with holes |
| `topping_skinka`       | one folded slice of pink ham          |
| `topping_svamp`        | one sliced mushroom                   |
| `topping_paprika`      | one ring of red bell pepper           |
| `topping_ananas`       | one chunk of pineapple                |
| `topping_majs`         | a small cluster of three corn kernels |
| `topping_oliver`       | one slice of black olive ring         |
| `topping_strossel`     | a small cluster of colorful sprinkles |
| `topping_jordgubbe`    | one strawberry                        |
| `topping_blabar`       | a small cluster of three blueberries  |
| `topping_chokladbitar` | two chunks of dark chocolate          |
| `topping_gradde`       | one dollop of whipped cream           |
| `topping_korsbar`      | one red cherry with a stem            |

Listan har 14 sorter: 8 för pizza och 6 för cupcake. Frosting i cupcake ritas i kod och ingår inte här.

### 5.5 Ikoner (bygg gärna en i taget, för jämn stil)

Mall:

```
[STYLE]
A chunky game UI icon of {ICON}, thick outline, readable at 48 px, front view, single object centered, transparent background, 256x256.
```

| Fil          | `{ICON}`                                |
| ------------ | --------------------------------------- |
| `mynt`       | a shiny gold coin with a star           |
| `kassa`      | an old-fashioned cash register          |
| `bil`        | a small cute delivery van               |
| `skylt`      | a hanging shop sign with a star         |
| `ugn`        | a small brick oven with fire            |
| `dricksburk` | a glass tip jar with coins              |
| `menyplats`  | a menu card with a plus sign            |
| `klocka`     | a round alarm clock                     |
| `hjarta`     | a red heart                             |
| `stjarna`    | a yellow star                           |
| `kundko`     | three small round animal heads in a row |
| `lager`      | a wooden crate of ingredients           |
| `graf`       | a small bar chart                       |
| `pil`        | a bold curved arrow                     |

### 5.6 Titelbild

```
[STYLE]
Title screen illustration: a sunny isometric street corner with a cupcake café on the left and a pizzeria on the right, a big yellow star hanging above the middle, a few cute oversized-head animal customers walking by (gender-neutral, no clothing). Leave a clear space at the top for the game name, which will be added in code. No text. Wide 16:9, 2400x1350.
```

### 5.7 Bilar (valfritt)

Tre nivåer (liten bil, större bil, stor skåpbil) och fyra isometriska riktningar (`ne`, `nw`, `se`, `sw`). Mall:

```
[STYLE]
A cute {LEVEL} delivery vehicle in isometric view facing {DIRECTION} (diagonal), colors tomato red and cream, simple and chunky. Centered, transparent background, 512x512.
```

Om bilderna inte blir användbara ritar jag en enkel bil i SVG i kod.

## 6. Hur grafiken används i spelet

- **Försäljning:** bakgrunden ligger bakom, kunden visas som porträtt vid disken (pizza: fem i rad) och byter pose efter händelse (`pratar` vid beställning, `glad`, `tveksam`, `gapar`, `vinkar`). Spelet lägger på hjärta, tänkebubbla och mätare.
- **Menybyggare:** pizzan visas ovanifrån och cupcaken framifrån. Toppings sprids slumpmässigt (men samma varje gång för samma variant) av koden. Frosting är en färgsatt SVG-virvel.
- **Bråk:** pizzan klipps i bitar med en mask, så inga extra bilder behövs.
- **Leverans:** staden ritas i kod som isometriskt rutnät med koordinater längs kanterna, och bilen glider mellan rutorna.
- **Gränssnitt:** textrutor, knappar och digitala mätare för pengar och tålamod ritas i CSS/SVG med paletten ovan.
