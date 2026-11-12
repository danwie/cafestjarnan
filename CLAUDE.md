# Caféstjärnan: projektinstruktioner

Privat webbspel (för 19-åring, nostalgi): två restauranger, **Cupcake** (5 dagar, lugnt) och **Pizza** (10 dagar, 60 s försäljning, kö).
Tränar huvudräkning, bråk, prisjämförelse och ekonomi. Kunderna är djur. **Allt på svenska** (kod-kommentarer, UI, dokument).

## Läs först (och bara det du behöver)
- `spel.md`: spelreglerna (källan till sanning). `grafik.md`: arkprompter för bild-AI. `client/src/scene/README.md`: scen- och kassa-API.
- Läs **inte** hela kodbasen i onödan. Sök med grep, läs bara berörda filer.

## Stack och kommandon
Bun + Hono + Zod + Vite + TypeScript, SQLite, Docker (rpi4 bakom Cloudflare). Klient med PixiJS v8 för scenerna, DOM/CSS för gränssnittet.
- `bun test` (43 test, ska vara gröna), `bunx tsc -p .` (strikt), `bun run dev:client`.
- Sidor: `client/play.html` (spelet), `client/scene.html` (scenprov), `client/proto.html` (gammal textprototyp, ingår inte i bygget).

## Struktur
- `shared/`: regler (`rules.ts`, `data.ts`, `rng.ts`), simulator (`sim.ts`, `simulate.ts`) och tester. Kvantiteter i **fjärdedelar** (4 = hel), inga flyttal.
- `client/src/game/`: skärmar (`state, market, decorate, sales, delivery, summary, main`). Varje skärm får en `Ctx` och returnerar en städfunktion.
- `client/src/scene/`: PixiJS-scener (`pizzeria.ts` isometrisk, `city.ts` uppifrån), `actors.ts` (platshållardjur med armar/ben), `manifest.ts` (`ART_AVAILABLE`: riktig grafik byts in via filnamn).
- `client/src/ui/register.ts`: kassan (display, 0-9, komma, grön ✓, cupcake-menyknappar).
- `tools/slice_sheet.py`: skär ut bilder ur AI-ark.

## Beslut som gäller
- Startkapital 150 kr (pizza) / 60 kr (cupcake), tomt lager. Vinst = slutkassa minus startkapital. Marknad → dekorering (kan hoppas över) → försäljning → leverans (cupcake) → sammanfattning.
- Meny får innehålla sådant som är slut men märks osäljbart. En kund som går släpper kassan direkt. Leverans lämnas automatiskt när bilen stannar på rätt hörn.
- Staden är uppifrån med kamera som följer bilen; fotgängare korsar bara vid övergångsställen och bilen väntar. Pizzerian är isometrisk, spelaren står bakom disken.
- Inget spårning/barnskydd behövs (internt bruk). Minimal serverdata: id, namn, bästa vinst per restaurang.

## Arbetssätt (användaren har ont om tokens)
- Var snål: batcha ändringar, fråga högst en kort fråga, inga skärmdumpar om det inte behövs, ingen återberättelse av arbetet.
- **Läs en fil innan du skriver över den** (det har gått fel förut: filer skrevs över utan att ses). Kolla `git status`.
- Testa med `bun test` + `tsc`; vid UI: Playwright/Chromium headless mot en lokal `python3 -m http.server` (moduler laddas inte från file://). WebGL: `--use-angle=swiftshader --enable-unsafe-swiftshader --ignore-gpu-blocklist`.

## Att göra (ungefär i prioritetsordning)
1. Användarens förbättringsförslag (väntar på listan).
2. Riktig grafik: ark från bild-AI → `tools/slice_sheet.py` → `ART_AVAILABLE`. Scenerna ska då använda helkroppsbilderna `{art}_stand/_gar1/_gar2` för gång och porträtten för cupcake-kunden (idag ritas djuren som platshållare).
3. Topplista och spelare mot servern (SQLite, `shared/player.ts`, `GET /api/players/top`, `PUT /api/players/:id`), autogenererat namn + kod.
4. Graf över intäkter och kostnader (Chart.js) på slutskärmen.
5. Ljud (användarens mp3 + effekter i `client/public/sounds/`), tutorial, kuponger/procent (senare pizza-dagar), balansjustering med simulatorn (`shared/simulate.ts`).
6. Marknad- och dekoreringsskärmarna har ännu knappar/emojis i stället för scener.
