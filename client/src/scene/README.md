# Scenmotor (PixiJS)

Spelet styr scenerna med metoder, scenen animerar. UI (knappar, menyer) ligger i DOM/CSS ovanpå.

**PizzeriaScene**: `mount(el)`, `customerArrives(id, species)`, `customerOrders(id, text)`, `setPatience(id, 0..1|null)`,
`customerReacts(id, "happy"|"unsure"|"yawn"|"wave")`, `customerLeaves(id, "paid"|"price"|"patience"|"noStock")`,
`onCustomerTap(cb)`, `clear()`, `destroy()`.

**CityScene**: `mount(el)`, `setGrid(5..7)`, `setPedestrians(n)`, `highlight(x,y|null)`, `driveTo(x,y)`, `flash(x,y,ok)`, `onTileTap(cb)`.
Koordinater som i spelet: x åt höger, y uppåt, 1..n.

## Riktig grafik
Lägg PNG i `client/public/art/` enligt `grafik.md` (t.ex. `kunder/rav_glad.png`) och lägg nyckeln (`"kunder/rav_glad"`) i
`ART_AVAILABLE` i `manifest.ts`. Saknade filer ritas som platshållare.

## Provsida
`bun add pixi.js` i client, `bun run dev:client`, öppna `/cafestjarnan/scene.html`.

## Stadens kamera
Staden ses uppifrån och kameran följer bilen; man ser ca 3-4 kvarter. Blå siffror på lodräta gator = x, gula på vågräta = y.
En leverans till (x, y) är hörnet där gata x och gata y möts.

## Till riktig grafik (se även grafik.md)
Platshållardjuren har rörliga armar och ben. Riktiga bilder är stillbilder per pose, så för gång behövs två extra bilder per art
(`_gar1`, `_gar2`) som scenen växlar mellan när figuren går.

## Styrning i staden
Tryck på en gata eller ett kvarter: bilen kör till närmaste hörn. WASD/piltangenter styr bilen längs gatorna (svänger i korsningar),
mellanslag/Enter = lämna leveransen (`onDrop(cb)` får hörnets (x, y)). `driveTo` returnerar true om bilen kom fram (false om den avbröts).

## Pizzerian
Spelaren står bakom disken längst fram. Kunderna kommer in genom dörren i bakre väggen, köar längs ett led och går fram till kassan.
Kassaapparatens knappsats (där man slår in priset) är DOM-UI ovanpå scenen, inte en del av scenen.

## Kassaapparaten (client/src/ui/register.ts)
DOM-komponent: display, 0-9, komma, röd C, grön ✓ (tangentbord fungerar också). `new Register(parent, items?, {compact})`,
`onSubmit(({amount, counts}) => ...)`, sedan `ok()` eller `wrong()`. Med `items` (cupcake-menyn) får varje cupcake en egen knapp:
tryck x gånger för x st. `setLayout("order"|"price")` växlar mellan menyknappar och knappsats.
Pizza: `customerLeaves(id, "paid", antalPizzor)` ger kunden en stapel askar att bära ut.

## Bilen och fotgängare
Fotgängare går på trottoaren och över övergångsställena; bilen väntar om någon går över vägen framför den. Leveransen lämnas automatiskt
(`onDrop`) när bilen stannar på ett hörn, vare sig man tryckt på kartan eller släppt WASD-tangenterna.
