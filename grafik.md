# Caféstjärnan: grafik (arkprompter)

**Arbetssätt:** bild-AI:n gör **ett ark per prompt**: en enda bild med flera separata figurer på platt magentabakgrund.
Claude skär ut dem med `tools/slice_sheet.py` (se avsnitt 4). Det sparar prompter, ger jämn stil inom arket och kräver inget exakt rutnät,
bara att figurerna inte rör vid varandra. Bildstorleken spelar mindre roll: be om **kvadratisk, så stor som verktyget tillåter** (helst 2048×2048 eller mer).

**Vad som görs i kod (inte bild-AI):** rummets golv och väggar, stadens gator, vägnummer, trottoarer och övergångsställen, frosting-virvlar,
kassan och alla knappar, mätare, bubblor och hjärtan, animationer. Bild-AI gör bara figurer, föremål och ikoner.

## 1. Gemensam stil (klistra in först i varje prompt)

**STYLE:**
```
Clean cel-shaded cartoon illustration with a 2.5D isometric look. Bold, uniform, warm dark outlines (#3A2A33), about 1% of the image width. Flat saturated colors with exactly one hard-edged shadow tone per color (two-tone shading), no gradients, no textures, no airbrush. Bright, cheerful, very easy to read, big simple silhouettes, simplified shapes like classic 2D Flash game art. Light comes from the upper left. Palette: cream, tomato red, sunny yellow, mint green, sky blue, raspberry pink, orange, warm brown. No text, no letters, no numbers, no logos, no watermark.
```

**SHEET-regler** (klistra in sist i varje prompt, ändra bara antalet kolumner/rader):
```
SHEET RULES: Create exactly ONE single image (do not make several images). The image is a sprite sheet with {COLS} columns and {ROWS} rows, {N} items in total, in reading order (left to right, top to bottom) as listed. Each item stands completely alone with a wide empty margin around it (at least 8% of the cell size). Items must NOT touch, overlap, or cross into other cells. All items have the same scale and the same viewing angle. The background is one flat, solid, pure magenta color (#FF00FF) everywhere, with no shadow on the ground, no gradient, no frame, no grid lines, no labels, no numbers. Do not use magenta, pink-purple or similar colors anywhere in the items. Square image, as large as possible.
```

**NEGATIVE** (om verktyget har ett fält för det):
```
photorealistic, 3D render, gradients, noise, blurry, thin sketchy lines, dark or moody lighting, text, watermark, realistic fur, scary, angry expression, human characters, gendered clothing, makeup, eyelashes, bows, ground shadow, drop shadow, grid lines
```

**Palett:** kräm #FFF4DF · linje #3A2A33 · tomatröd #EF4D3C · solgul #FFC730 · mintgrön #3FC9A0 · himmelsblå #3FA7F5 · hallonrosa #FF6FA5 · orange #FF8A2B · brun #A8683A.

## 2. Ordning (för att spara prompter)

1. **Räv-arket** (3.1). Upprepa tills stilen är rätt. Spara det som stilreferens.
2. Alla följande ark: bifoga räv-arket som stilreferens och skriv "Match the art style, outline weight and shading of the reference image exactly."
3. **Groda- och uggla-arken**, sedan **matark**, **ikonark**, **stadsark**, **inredningsark**. Övriga djur och säljare när kedjan fungerar i spelet.
4. Kontrollera varje ark mot checklistan (avsnitt 6) innan det skickas till Claude.

## 3. Prompter

### 3.1 Djurark (ett per art): 3 × 3 = 9 bilder

**Arter** (filnamnsstam): räv `rav`, groda `groda`, uggla `uggla`, katt `katt`, hund `hund`, kanin `kanin`, björn `bjorn`, igelkott `igelkott`, sköldpadda `skoldpadda`, anka `anka`. Börja med de tre första.

```
[STYLE]
Character sheet of one cute {SPECIES} customer for a café game. The same character in all 9 cells: oversized head (about 60% of the figure height), simplified round body, large round eyes, tiny nose, simple mouth, minimal facial detail like classic Flash cartoon characters. Gender-neutral, no clothing, no accessories, natural species colors but saturated. Friendly and never angry.
Row 1, head-and-shoulders portraits (head and upper chest only), front-facing with a slight three-quarter angle:
 1. neutral, small friendly closed-mouth smile, waiting patiently
 2. mouth open as if speaking mid-sentence, one paw slightly raised, giving an order
 3. big happy smile, eyes closed as happy arcs, cheeks lifted
Row 2, head-and-shoulders portraits, same angle:
 4. one eyebrow raised, small wavy mouth, head tilted, glancing sideways, unsure
 5. big yawn, eyes half closed, sleepy, one paw near the mouth
 6. friendly smile, one paw waving goodbye, shoulders in a small shrug
Row 3, FULL-BODY figures facing right (three-quarter view), feet visible, arms hanging at the sides, same size as each other:
 7. standing still, neutral
 8. walking, left leg forward, right arm forward, left arm back
 9. walking, right leg forward, left arm forward, right arm back
Hearts, thought bubbles, price tags and "Zzz" are NOT drawn, the game adds those.
[SHEET-regler med 3 columns, 3 rows, 9 items]
```
Filnamn i ordning: `{art}_vantar,{art}_pratar,{art}_glad,{art}_tveksam,{art}_gapar,{art}_vinkar,{art}_stand,{art}_gar1,{art}_gar2` → `client/public/art/kunder/`

### 3.2 Matark: 6 × 3 = 18 bilder

```
[STYLE]
Food sprite sheet for a café game, each item a single object, readable at small size.
Row 1: 1. an empty cupcake base: pleated yellow paper cup with a flat-topped sponge cake, no frosting, three-quarter front angle; 2. a round raw pizza dough base seen from straight above, golden crust, flat tan center, no sauce or toppings; 3. a closed cardboard pizza box seen from a three-quarter angle, cream with a red stripe, no text; 4. a small open cupcake box with two plain cupcakes, three-quarter angle; 5. one tomato slice, from above; 6. one slice of yellow cheese with holes, from above.
Row 2: 7. one folded slice of pink ham; 8. one sliced mushroom; 9. one ring of red bell pepper; 10. one chunk of pineapple; 11. a small cluster of three corn kernels; 12. one black olive ring.
Row 3: 13. a small cluster of colorful sprinkles; 14. one strawberry; 15. a small cluster of three blueberries; 16. two chunks of dark chocolate; 17. one dollop of whipped cream; 18. one red cherry with a stem.
[SHEET-regler med 6 columns, 3 rows, 18 items]
```
Filnamn: `cupcake_botten,pizza_deg,pizza_ask,cupcake_ask,topping_tomat,topping_ost,topping_skinka,topping_svamp,topping_paprika,topping_ananas,topping_majs,topping_oliver,topping_strossel,topping_jordgubbe,topping_blabar,topping_chokladbitar,topping_gradde,topping_korsbar` → `art/mat/`

### 3.3 Ikonark: 4 × 3 = 12 bilder

```
[STYLE]
Chunky game UI icons, thick outline, readable at 48 px, front view, one object each:
1. a shiny gold coin with a star; 2. an old-fashioned cash register; 3. a small cute delivery van seen from the front; 4. a hanging shop sign with a star (no letters); 5. a small brick oven with fire; 6. a glass tip jar with coins; 7. a menu card with a plus sign; 8. a red heart; 9. a round alarm clock; 10. a yellow star; 11. a shopping cart; 12. a green check mark in a circle.
[SHEET-regler med 4 columns, 3 rows, 12 items]
```
Filnamn: `mynt,kassa,bil,skylt,ugn,dricksburk,menyplats,hjarta,klocka,stjarna,kundvagn,ok` → `art/ikoner/`

### 3.4 Stadsark: 4 × 3 = 12 bilder (**sedda rakt uppifrån**, staden är uppifrån-och-ned, inte isometrisk)

```
[STYLE, but all items are seen straight from above (top-down map view), not isometric]
Top-down city sprites for a delivery game:
1-6. six different small houses seen from above, each with a distinct colored roof (pink, yellow, blue, orange, mint green, cream) and a tiny garden edge, each fitting a square footprint;
7. a small red delivery van seen from above, pointing right; 8. a round green tree seen from above; 9. a second, different round tree with pink blossoms; 10. a green bush; 11. a striped orange traffic cone seen from above; 12. a flower bed with red and yellow tulips seen from above.
[SHEET-regler med 4 columns, 3 rows, 12 items]
```
Filnamn: `hus1,hus2,hus3,hus4,hus5,hus6,bil_upp,trad1,trad2,buske,kon,blomsterland` → `art/stad/`

### 3.5 Inredningsark (pizzeria, isometriska föremål): 3 × 3 = 9 bilder

```
[STYLE]
Isometric pizzeria props, each a single standalone object seen from the same fixed isometric angle (from the front-right), no floor, no walls:
1. a long wooden service counter segment with an orange top (about 5 units long); 2. an old-fashioned cash register on a small base; 3. a red brick pizza oven with a glowing fire opening; 4. a large yellow star-shaped wall sign (no letters); 5. a potted green plant; 6. a window with a flower box; 7. a wall-mounted chalkboard menu with simple pizza icons (no letters); 8. a hanging ceiling lamp; 9. an open doorway frame with a red awning (no door).
[SHEET-regler med 3 columns, 3 rows, 9 items]
```
Filnamn: `disk,kassa,ugn,stjarnskylt,planta,fonster,menytavla,lampa,dorr` → `art/pizzeria/`

### 3.6 Säljarark: 2 × 2 = 4 bilder (senare)

```
[STYLE]
Four isometric market stalls, each with a counter, a colored awning, crates of ingredients and a friendly animal seller behind the counter with an oversized head and simplified face, gender-neutral, no clothing:
1. a mole, sky-blue awning; 2. a turtle, tomato-red awning; 3. a pig, sunny-yellow awning; 4. a goat, mint-green awning.
[SHEET-regler med 2 columns, 2 rows, 4 items]
```
Filnamn: `saljare_cupcake,saljare_1,saljare_2,saljare_3` → `art/saljare/`

### 3.7 Titelbild (senare, en vanlig bild, inget ark)

En bred bild (16:9) i samma stil: ett glatt café med en stor gul stjärna och några av djuren framför. Ingen text, den läggs på av spelet.

## 4. Så skär Claude ut arken

```
python3 tools/slice_sheet.py ark_rav.png --cols 3 --rows 3 --out client/public/art/kunder --size 1024 \
  --names rav_vantar,rav_pratar,rav_glad,rav_tveksam,rav_gapar,rav_vinkar,rav_stand,rav_gar1,rav_gar2
```
Verktyget gör magenta genomskinligt (utan färgkant), hittar figurerna oavsett exakt rutnät, ordnar dem rad för rad, skär och döper dem, och avbryter med felmeddelande om antalet inte stämmer. Därefter läggs nycklarna in i `ART_AVAILABLE` (`client/src/scene/manifest.ts`) och bilderna används i stället för platshållarna.

## 5. Filer

PNG med genomskinlighet, filnamn utan å/ä/ö (gemener, understreck), under `client/public/art/` i undermappar enligt ovan.

## 6. Checklista per ark

- Exakt rätt antal figurer, i rätt ordning, och ingen rör vid en annan eller vid bildkanten.
- Platt, jämn magentabakgrund. Inga skuggor på marken, inga rutnätslinjer, ingen text eller siffror.
- Samma linjetjocklek och skuggning som referensen. Ljus från övre vänster.
- Könsneutralt: inga rosetter, ögonfransar, kläder eller accessoarer.
- Djurarken: samma karaktär i alla 9 rutor, och helkroppsbilderna lika stora och vända åt höger.
