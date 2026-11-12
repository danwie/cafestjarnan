# Caféstjärnan: speldesign och regelverk (version 5)

Ett spel för privat bruk, gjort för att minnas ett gammalt spel som inte längre finns kvar. Alla siffror här är startvärden som ska balanseras med en simulator och testspelning.

## 1. Översikt
Caféstjärnan är ett webbaserat, responsivt spel som tränar huvudräkning, bråk, prisjämförelse och ekonomi. Spelaren driver en restaurang och försöker tjäna så mycket som möjligt. Det finns två restauranger, **Cupcake** och **Pizza**.

| | **Cupcake** | **Pizza** |
|---|---|---|
| Svårighet | Lugn | Svår |
| Tempo | Ingen tidspress | Snabbt, 1 minut per försäljning |
| Antal dagar | 5 | 10 (kan justeras efter test) |
| Leverans | Ja | Nej |
| Bråk i beställningar | Nej | Ja |
| Prisjämförelse mellan säljare | Nej (en säljare) | Ja (upp till tre) |

En omgång tar ungefär **30 minuter**. Det finns ingen tidsbegränsning, utan siffran styr bara hur många dagar och hur mycket som ryms.

### Svårighetsnivå
- **Cupcake** är den lugna nivån: ingen tidspress, hela tal och enkla summor som växer långsamt.
- **Pizza** är den svåra nivån: tidspress, bråk, jämförelse av paketpriser och procent.
- Det finns ingen separat svårighetsinställning. Spelet blir svårare av sig själv under omgången, med större beställningar, fler sorter, snabbare tempo (pizza) och större rutnät (cupcake).
- **Hjälpstöd** kan slås på i inställningarna och är av som standard: små ikoner på beställningar och bild på pizza med skuren bit för bråk.

## 2. Spelare och topplista
- Spelaren får ett **automatiskt genererat namn** och en **spelkod** (8 tecken i grupper om 4, utan förväxlingsbara tecken som 0/O och 1/I).
- Namnet byts genom att välja ur listor: adjektiv + djur eller matord + tal.
- Spelkoden låser upp spelaren på en annan enhet, så att man behåller namn och rekord.
- **Topplistan** visas i startmenyn och efter avslutad omgång, med topp 10 och spelarens egen placering. Den är separat för cupcake och pizza.

## 3. Gemensamma regler

### Pengar och lager
- Man börjar med ett **startkapital**: **60 kr i cupcake** och **150 kr i pizza**. Lagret är tomt, så spelet börjar med att man får pengar att handla för och hamnar på marknaden. Beloppen är valda så att första inköpet tar nästan hela kapitalet men går att tjäna igen under dag 1 (kontrollerat med simulatorn).
- Pengar, lager och uppgraderingar följer med mellan dagarna.
- **Game over:** man har 0 kr och kan inte tillverka något som finns på menyn. Då börjar man om.

### Meny och priser
- Man kan **bara bygga varianter av ingredienser som går att köpa** den dagen (de som är upplåsta och finns hos en säljare).
- Om man bygger en variant med en ingrediens som är **slut i lagret** går det bra, men det visas tydligt att den **inte kan säljas just nu** (varning på menybyggaren och en "Slut"-märkning på menyn). Kunder väljer bara varianter som går att göra.
- Grundcupcake och grunddeg ingår gratis. Det man köper är **toppings** (och i cupcake även **frosting**). Ingredienser blir inte gamla.
- Spelaren dekorerar genom att **dra toppings till bottnen**. **Samma topping kan läggas flera gånger**, men högst 3 av samma och 6 totalt på cupcake, och högst 4 av samma och 10 totalt på pizza (justerbart i `data.ts`). Cupcake har alltid **exakt en frosting**. Varje topping som läggs på kostar, så varianten blir dyrare.
- Varje variant **måste namnges**, och kunderna beställer med namnet.
- **Referenskostnad** för en variant är summan av ingrediensernas styckpris hos säljare 1. Lägsta tillåtna pris är referenskostnaden + 1 kr.
- Man har alltid minst en variant på menyn, och kan ta bort varianter för att göra plats.
- Meny och priser kan ändras varje dag på marknaden, före försäljningen.
- Spelaren ser alltid sin meny och sina priser under försäljningen. Kunden behöver inte se den.

### Kunder
- Alla kunder är **djur** (ett tiotal arter). Inga könade karaktärer, kunderna benämns inte, och alla arter beter sig likadant.
- Kunden säger vilka produkter hen vill ha och hur många av varje, t.ex. "2 Kalles special och 1 Margherita". Det är den texten spelaren räknar på.
- **Dolt maxpris:** referenskostnaden för varianten × ett slumptal mellan 1,5 och 3, avrundat till hela kronor. Bäst vinst per kund ligger därför kring dubbla kostnaden.
- **Smak:** varje kund har 1–2 slumpade favoritingredienser. Kunden väljer tre gånger så ofta varianter som innehåller en favorit, och har **25 % högre maxpris** för dem. Favoriten visas inte. En kund som får sin favorit visar ett dubbelt hjärta, och dagssammanfattningen visar "Populärast idag: …".
- **För dyrt:** 70 % av kunderna går, och 30 % stannar och köper halva antalet (nedrundat, minst 1).
- **Reaktioner (mjuka, inga arga djur):**
  - *För dyrt:* tänkebubbla med prislapp och överstruket mynt, kunden lyfter på axlarna och vinkar adjö. De som stannar tittar tveksamt ("hmm").
  - *Tålamodet tar slut (pizza):* kunden gäspar, tittar på en klocka och går vinkande.
  - *Nöjd kund:* hjärta eller glad hoppning, och ett "pling" från kassan.

### Slut på ingredienser
- En variant där en ingrediens saknas **går inte att beställa**. Kunder väljer bara bland varianter som går att göra.
- Ingredienser dras från lagret **när beställningen tas emot**. Om kunden går efter det (tålamodet eller tiden tar slut) **återläggs ingredienserna** i lagret.
- När en ingrediens tar slut visas det tillfälligt på skärmen (t.ex. "Slut på ost!").
- Om **inga varianter alls** går att beställa visas det tydligt och kunden går.

### Vinst
- **Total vinst = kassan vid omgångens slut minus startkapitalet.** Det är vinsten som räknas på topplistan.
- **Kostnader = inköp + uppgraderingar.** Lager som blir över är värt 0 kr.

## 4. Dagsloop
0. **Start:** man väljer restaurang och får startkapitalet (bara första dagen).
1. **Marknaden:** lager, inköp och uppgraderingar. Dag 1 finns bara en säljare.
2. **Dekorering:** man bygger en cupcake/pizza och lägger den på menyn, med namn och pris. **Har man redan något på menyn kan man hoppa över steget** och gå direkt till försäljning. Ingredienser som är slut går att välja, men varianten märks som osäljbar.
3. **Försäljning.**
4. **Leverans** (bara cupcake).
5. **Dagssammanfattning:** intäkter, kostnader, vinst, populäraste ingrediens och feedback.

Ungefärlig tid per dag, som ger omkring 30 minuter per omgång:

| | Marknad + meny | Försäljning | Leverans | Sammanfattning | Totalt |
|---|---|---|---|---|---|
| Pizza | ca 1,5 min | 1 min | – | ca 0,5 min | ca 3 min |
| Cupcake | ca 1,5 min | ca 2,5 min | ca 1 min | ca 1 min | ca 6 min |

## 5. Cupcake (5 dagar, lugn)

### Marknad
- **En** säljare, utan mängdrabatt. Priser är per styck.
- **Toppings** (3 från början, 6 totalt): Strössel 1, Jordgubbe 2, Blåbär 2. Nya: Chokladbitar 2 (dag 2), Grädde 1 (dag 3), Körsbär 3 (dag 4).
- **Frosting** (2 från början, 4 totalt): Vanilj 1, Choklad 2. Nya: Hallon 2 (dag 3), Citron 3 (dag 5).
- Varje cupcake har **exakt en frosting**, som ingår i varianten och i dess kostnad.

### Försäljning
- Kunderna kommer **en i taget**, utan tidsgräns.
- **Kassan** har en sifferknappsats (0–9 och komma), en röd rensa-knapp och en grön summera-knapp, och dessutom en **färdig knapp för varje cupcake på menyn** med priset på. Spelaren tar emot beställningen genom att trycka på cupcake-knappen x gånger för x st, slår in summan på knappsatsen och trycker på den gröna knappen. Stämmer antal och summa betalar kunden. Är något **fel pipar kassaapparaten** och man får försöka igen.
- När **5 beställningar** har tagits emot startar leveranserna. En kund som går på grund av priset räknas inte, utan ersätts av en ny.
- Menyn har högst **3 varianter** (4–5 med ugnsuppgradering).
- Beställningarna växer långsamt: dag 1 en sort och 1–2 st, senare upp till 3 sorter och större antal.
- **Avancerad matte i högre nivåer:** större tal och fler sorter per beställning, och eventuellt "köp 3 betala för 2" eller en hel låda om 6. Justeras efter test.

### Leverans
- Varje beställning har ett **koordinatpar** (x,y) som spelaren får när beställningen tas emot. x är numret på en lodrät gata (blå siffror) och y numret på en vågrät gata (gula siffror). Leveransen går till **hörnet där de två gatorna möts**.
- **Rutnät:** 5×5 dag 1–2, 6×6 dag 3–4, 7×7 dag 5. Staden ses **uppifrån** och kameran följer bilen, så man ser bara några kvarter i taget och navigerar med siffrorna på vägarna.
- Man **trycker på en gata eller ett kvarter** så kör bilen dit, eller styr med **WASD/piltangenter**. När bilen **stannar på ett hörn lämnas leveransen automatiskt**. Är det fel hörn visas ett frågetecken och man kör vidare. Det ger inget straff.
- Fotgängare går på trottoarerna och korsar vid övergångsställen. **Bilen väntar** om någon går över vägen framför den.

## 6. Pizza (10 dagar, svår)

### Marknad
- Upp till **3 säljare**, och varje säljare har **ett eget stånd** där alla ingredienser finns, men till olika priser. **Alla stånd syns samtidigt**, så att spelaren kan jämföra och välja vilket stånd man köper varje ingrediens från. Man kan köpa olika ingredienser från olika stånd. Säljare 1 finns från dag 1, **säljare 2 från dag 3 och säljare 3 från dag 6**.
- Varje säljare har **mängdrabatt** och egna paketstorlekar, så att man måste räkna styckpris. Ingen säljare är bäst för alla storlekar. Priserna är fasta, så att alla spelare möter samma marknad.
- Exempel för Ost:

| Säljare 1 | Säljare 2 | Säljare 3 |
|---|---|---|
| 1 st 5 kr · 5 st 20 kr · 10 st 35 kr | 3 st 12 kr · 6 st 21 kr · 12 st 40 kr | 2 st 9 kr · 8 st 28 kr · 20 st 55 kr |

- Man köper en ingrediens och ett paket i taget, från valfritt stånd. Prisjämförelsen går inte på tid.
- **Styckpris visas som stöd** de dagar en ny säljare dyker upp (dag 3 och 6), och är annars dolt.
- Efter varje köp ges feedback, t.ex. "Bra val! Du sparade 8 kr på att välja den här säljaren", eller en uppgift om vilken säljare som hade varit billigare. Ingen stjärna eller bonus.
- **Toppings** (4 från början, 8 totalt), pris per styck hos säljare 1: Tomat 3, Ost 5, Skinka 6, Svamp 5. Nya: Paprika 4 (dag 3), Ananas 6 (dag 5), Majs 4 (dag 7), Oliver 5 (dag 9).

### Försäljning
- Hela momentet är **1 minut**, som startar när spelaren trycker på "Start" och slutar direkt när tiden är slut. Man hinner oftast inte med alla kunder.
- **Vy:** spelaren står **bakom disken** och ser kunderna komma in genom dörren, ställa sig i kö och gå fram till kassan. Kassaapparaten är stor och ligger nere till höger.
- **Kö:** 8 kunder dag 1, växer till 14 dag 10. Man betjänar en i taget och trycker på kunden för att ta emot beställningen. En kund som är klar eller lämnar **släpper kassan direkt**, så man behöver inte vänta på att hen går ut för att ta nästa.
- **Tålamod** börjar rinna ovanför kundens huvud när beställningen är tagen: 20 s dag 1, minskar med 1 s per dag till 11 s dag 10, plus 3 s per extra sort i beställningen.
- **Adaptiv fart:** för varje 3 rätt i rad minskar tålamodet med 5 % (lägst 70 % av grundvärdet). Ett fel ger tillbaka 10 %.
- Spelaren slår in rätt summa på kassan (siffror, komma och grön summera-knapp) och kunden får sina pizzor direkt, som en **stapel askar** (en per pizza) hen bär ut. Ingen tillagningstid.
- **Fel summa:** kundens mätare går dubbelt så fort, och vid ett andra fel går kunden.
- Menyn har högst **5 varianter** (6–7 med uppgradering).
- **Pausknapp** som döljer skärmen under pausen.
- Beställningarna växer med dagarna: en sort och 1–2 st i början, senare upp till 3 sorter och större antal.

### Bråk i beställningarna
- Kunder kan beställa delar av en pizza, t.ex. "1/2 Kalles special" eller "3 1/4-pizzor Margherita".
- **Progression:** 1/2 från dag 4–5, och 1/4 och 3/4 från dag 7. Inga tredjedelar.
- **Hela kronor:** så fort fjärdedelar förekommer får spelaren bara sätta pizzapriser som är **delbara med 4**. När steget ändras (dag 4: delbart med 2, dag 7: delbart med 4) **rundas befintliga priser upp automatiskt** med ett meddelande.
- **Lager:** en halv pizza drar en halv toppingportion, så lagret kan visa t.ex. 2 1/2 ost.

### Annan avancerad matte i högre nivåer
- Procent-rabatter, kunder med kuponger och att räkna ut växel.
- Procentsatserna begränsas till sådana som ger hela kronor för just det priset (t.ex. 50 % och 25 %), eller så väljer spelet rabatter som passar.

## 7. Uppgraderingar
Köps på marknaden. Tumregel: ungefär en dags vinst per nivå. Alla priser justeras efter test.

| | Cupcake | Pizza |
|---|---|---|
| **Bil** | 40 / 80 kr: fler beställningar per dag (5 → 6 → 7) | Finns inte |
| **Skylt** | 40 / 80 kr: kundernas maxpris +10 % / +20 % | 100 / 200 / 300 kr: +2 platser i kön per nivå |
| **Ugn** | 30 / 60 kr: fler menyplatser (4, 5) | 100 / 200 / 300 kr: kundernas tålamod +15 % per nivå |
| **Annat** | **Dricksburk** 40 / 80 kr: nöjda kunder lämnar +1 / +2 kr, utan att det ingår i summan som slås in | **Menyplatser** 80 / 160 kr (6, 7) |

## 8. Omgångens slut
- En **graf** (färdigt JS-bibliotek) visar **intäkter, kostnader och vinst** per dag, plus **total vinst**.
- Total vinst jämförs med spelarens rekord och med topplistan för restaurangtypen.
- Vill man spela vidare börjar man om med startkapitalet och tomt lager.

## 9. Grafik, ljud och kontroller
- **Grafikstil:** isometrisk 2,5D i enkel, tecknad (cel-shadad) stil med rena linjer och starka, klara färger, i ett fast isometriskt fågelperspektiv. Karaktärerna är djur med stora huvuden och förenklade ansikten, som i klassiska 2D-flashspel. Miljöer och gränssnitt är ljusa och överskådliga, med tydliga textrutor för dialog och digitala mätare för pengar och tålamod. Arbetsfördelning och prompter för bild-AI finns i `grafik.md`.
- **Typsnitt:** ett rundat, läsbart typsnitt som stöder å, ä och ö. Lättläst text med stora tecken och hög kontrast, särskilt på siffror och priser.
- **Bakgrundsmusik:** en mp3-fil som loopar under hela spelet (`client/public/music/bakgrund.mp3`). Den startar efter första tryck, eftersom webbläsare blockerar ljud innan användaren interagerat.
- **Ljudeffekter** (pling, pip, kassa, köp, hjärta, fel, leverans) ligger som filer med fasta namn i `client/public/sounds/`, så att de kan bytas mot egna mp3-filer. Musik och effekter har separata volymreglage, och spelet fungerar helt utan ljud.
- **Kassan** har en stor sifferknappsats på skärmen. Tangentbord fungerar också på dator.
- **Menybyggaren:** man drar toppings till bottnen (pizzabotten eller cupcake-botten) för att dekorera, och kan också trycka på +/− (nödvändigt på mobil). Variantnamn är fritext (max 14 tecken) med en "slumpa namn"-knapp. Priset ändras med +/–-knappar (steg 1 kr, steg 4 kr när fjärdedelar finns). Pizzan visas ovanifrån och cupcaken framifrån, med toppings utströdda av koden.
- **Skärmar:** startsida (namn, topplistor, spelkod in, välj restaurang), byt namn, inställningar, marknad, menybyggare, försäljning, leverans (cupcake), dagssammanfattning, slutresultat.
- **Tutorial:** en guidad första dag per restaurang som kan hoppas över, plus en hjälpknapp som alltid finns. Den visas bara första gången (sparas i webbläsaren).
- **Pågående omgång sparas i webbläsaren** (inte på servern), så att en omladdning inte raderar spelet.
- Språk: svenska, med texterna i en separat fil.

## 10. Teknik
- **Struktur:** Bun-workspaces med `client` (Vite + TypeScript), `server` (Hono + Zod) och `shared` (spelregler som rena funktioner, delade av klient och server).
- **Spellogik** körs i webbläsaren. Servern gör bara fem saker: skapa spelare, logga in med kod, byta namn, ta emot resultat och ge topplista.
- **Databas:** SQLite (`bun:sqlite`) i `/data`, som är en volym i Docker.
- **Drift:** Docker på Raspberry Pi 4 (`rpi4.local`), med Cloudflare framför. GitHub Actions bygger en linux/arm64-bild till ghcr.io och kör `bun test` före bygget. `deploy.sh` kör `docker compose pull` och `up -d` på Pi:n. Bilden taggas med både `latest` och commit-sha.
- **Säkerhet:** servern litar inte på klientens resultat och avvisar orimligt höga värden (maxvärdet räknas fram från reglerna). Begränsning av inloggningsförsök med spelkod använder klientens IP från `CF-Connecting-IP`. Servern har en `/api/health` för healthcheck.
- **Sparas på servern:** spelar-id och spelkod, spelarnamn och bästa totala vinst per restaurangtyp. Pågående spel sparas inte.
- Felrapportering med Sentry (finns redan).

## 11. Öppna punkter
- **Detaljer från det gamla spelet** som ska bevaras (namn, ljud, utseende, känsla).
- **Balansering av tal** med en simulator i `shared/`: priser, startlager, tålamodstider, uppgraderingspriser och antal dagar (särskilt pizza).
- Slutlig ordlista för spelarnamn och namn på pizza-säljare.
- **Grafikproduktion** med bild-AI enligt `grafik.md`.
