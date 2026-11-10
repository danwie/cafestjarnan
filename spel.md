# Caféstjärnan: speldesign och regelverk (version 3, godkänd)

## 1. Översikt

Caféstjärnan är ett webbaserat, responsivt spel som tränar huvudräkning, bråk, prisjämförelse och ekonomi. Spelaren driver en restaurang och försöker tjäna så mycket som möjligt. Spelaren väljer mellan två restauranger:

|                      | **Cupcake**            | **Pizza**                       |
| -------------------- | ---------------------- | ------------------------------- |
| Ålder                | Från 5 år              | Från 7 år                       |
| Tempo                | Lugnt, ingen tidspress | Snabbt, 1 minut per försäljning |
| Antal dagar          | 5                      | 10 (kan justeras efter test)    |
| Leverans             | Ja                     | Nej                             |
| Bråk i beställningar | Nej                    | Ja                              |

Vuxna spelar samma spel. Spelet blir svårare av sig själv under omgången, och det finns ingen separat svårighetsnivå.

## 2. Spelare och topplista

- Spelaren får ett **automatiskt genererat namn** och en **spelkod**. Namnet kan ändras via en ordlista eller ett filter. Inga personuppgifter sparas.
- Spelkoden låser upp spelaren på en annan enhet, så att man behåller namn och rekord.
- **Topplistan** visas i startmenyn och efter avslutad omgång. Den är separat för cupcake och pizza.
- Spelaren väljer därefter restaurang.

## 3. Gemensamma regler

### Pengar och lager

- Man börjar med **0 kr** och ett litet startlager av grundingredienser, så att man har något att sälja dag 1.
- Pengar, lager och uppgraderingar följer med mellan dagarna.
- **Game over:** man har 0 kr och kan inte tillverka något som finns på menyn. Då börjar man om från början.

### Meny och priser

- Grundcupcake och grunddeg ingår gratis. **Toppings** är det enda man köper, och de blir inte gamla.
- Spelaren drar på så många toppings man vill. Fler toppings gör varianten dyrare att tillverka.
- Varje variant **måste namnges**, och kunderna beställer med namnet.
- Priset måste alltid vara **högre än ingrediens-kostnaden**.
- Man har alltid minst en variant på menyn, och kan ta bort varianter för att göra plats åt nya.
- Meny och priser kan ändras varje dag på marknaden, före försäljningen.
- Spelaren ser alltid sin meny och sina priser under försäljningen. Kunden behöver inte se den.

### Kunder

- Alla kunder är **djur** (ett tiotal arter). Spelet har inga könade karaktärer och kunderna benämns inte, man ser bara att de är djur. Alla arter beter sig likadant och har samma tålamod.
- Kunden säger vilka produkter hen vill ha och hur många av varje, t.ex. "2 Kalles special och 1 Margherita". Det är den texten spelaren räknar på.
- Varje kund har ett **dolt maxpris** som varierar.
- **Reaktioner (mjuka, inga arga djur):**
  - _För dyrt:_ kunden visar en tänkebubbla med en prislapp och ett överstruket mynt, lyfter på axlarna och vinkar adjö. Kunder som stannar ändå tittar tveksamt ("hmm") och köper mindre.
  - _Tålamodet tar slut (pizza):_ kunden gäspar, tittar på en klocka och går vinkande.
  - _Nöjd kund:_ ett hjärta eller en glad hoppning, och ett "pling" från kassan.

### Slut på ingredienser

- En variant där en ingrediens saknas **går inte att beställa**.
- Ingredienser dras från lagret **när beställningen tas emot**, så att en beställning alltid går att slutföra.
- När en ingrediens tar slut visas det **tillfälligt på skärmen** (t.ex. "Slut på ost!").
- Om **inga varianter alls** går att beställa visas det tydligt och kunden går. Det gäller både cupcake och pizza.

## 4. Dagsloop

1. **Marknaden:** lager, inköp, uppgraderingar, meny och priser.
2. **Försäljning.**
3. **Leverans** (bara cupcake).
4. **Dagssammanfattning:** intäkter, kostnader, vinst och feedback.

## 5. Cupcake (5 dagar)

### Marknad

- **En** säljare, utan mängdrabatt.
- 3 topping-sorter i början, växer till 6 under omgången.

### Försäljning

- Kunderna kommer **en i taget**, utan tidsgräns.
- Spelaren räknar ut summan och slår in den. Är den **fel pipar kassaapparaten** och man får försöka igen.
- När **5 beställningar** har tagits emot startar leveranserna. En kund som går på grund av priset räknas inte, utan ersätts av en ny.
- Menyn har högst **3 varianter**.
- Beställningarna växer långsamt: dag 1 en sort och 1–2 st, senare upp till 3 sorter och större antal.
- **Avancerad matte i högre nivåer:** större tal och fler sorter per beställning, och eventuellt erbjudanden som "köp 3 betala för 2" eller en hel låda om 6. Justeras efter test.

### Leverans

- Varje beställning har ett **koordinatpar** (t.ex. 3,5) som spelaren får när beställningen tas emot.
- Staden är ett rutnät (5×5 i början, större senare), och spelaren kör bilen till rätt ruta.
- Kör man fel händer inget, men man måste komma rätt för att komma vidare.

## 6. Pizza (10 dagar)

### Marknad

- Upp till **3 säljare** med samma toppings till olika priser. Säljare 1 finns från dag 1, **säljare 2 från dag 3 och säljare 3 från dag 6**.
- Varje säljare har **mängdrabatt** med paket som "1 st för 5 kr, 5 st för 20 kr, 10 st för 35 kr". Paketen skiljer sig mellan säljarna.
- Man köper en ingrediens, en säljare och ett paket i taget. Prisjämförelsen går inte på tid.
- Efter varje köp får man feedback, t.ex. "Bra val! Du sparade 8 kr på att välja den här säljaren". Valde man sämre ser man vad man hade kunnat spara. Ingen stjärna eller bonus, eftersom fördelen är att man tjänar mer.
- 4 topping-sorter i början, växer till 8, ungefär en ny sort varannan dag.

### Försäljning

- Hela momentet är **1 minut**, och man hinner oftast inte med alla kunder.
- Flera kunder kan stå i **kö**, men man betjänar en i taget och trycker på kunden för att ta emot beställningen.
- När beställningen är tagen börjar en **tålamodsmätare ovanför kundens huvud** att rinna. Är den tom går kunden.
- Spelaren slår in rätt summa och kunden får pizzan direkt. Ingen tillagningstid.
- **Fel summa:** tålamodet sjunker snabbare, och vid ett andra fel går kunden.
- Menyn har högst **5 varianter**.
- Beställningarna växer med dagarna: i början en sort och 1–2 st, senare upp till 3 sorter och större antal. Farten ökar adaptivt, t.ex. vid många rätt i rad.

### Bråk i beställningarna

- Kunder kan beställa delar av en pizza, t.ex. "1/2 Kalles special" eller "3 1/4-pizzor Margherita".
- **Progression:** 1/2 från dag 4–5, och 1/4 och 3/4 från dag 7 till 10. Inga tredjedelar.
- **Hela kronor:** så fort fjärdedelar förekommer får spelaren bara sätta pizzapriser som är **delbara med 4**, så att alla delar blir hela kronor.
- **Lager:** lagret räknas i toppingportioner och en halv pizza drar en halv portion. Lagret kan alltså visa t.ex. 2 1/2 ost.
- **Visuellt stöd:** bråk visas både som tal och som en liten bild av en pizza med skuren bit. Bilden tas bort på de högsta nivåerna.

### Annan avancerad matte i högre nivåer

- Procent-rabatter ("25 % rabatt på allt"), kunder med kuponger och att räkna ut växel.
- **Rabatter ger hela kronor:** procentsatserna begränsas till sådana som ger hela kronor för just det priset (t.ex. 50 % och 25 %), eller så väljer spelet rabatter som passar.

## 7. Uppgraderingar

Köps på marknaden med intjänade pengar.

|           | Cupcake                                | Pizza                        |
| --------- | -------------------------------------- | ---------------------------- |
| **Bil**   | Fler beställningar per dag (5 → 6 → 7) | Finns inte                   |
| **Skylt** | Kunderna har högre maxpris             | Fler kunder i kön            |
| **Ugn**   | Fler menyplatser (3 → 4 → 5)           | Kunderna har mer tålamod     |
| **Annat** | Definieras senare                      | Fler menyplatser (5 → 6 → 7) |

Pizza har 10 dagar och därmed plats för fler uppgraderingsnivåer än cupcake. Priser sätts under balanseringen.

## 8. Omgångens slut

- En **graf** (färdigt JS-bibliotek) visar **intäkter, kostnader och vinst** per dag, plus **total vinst**.
- Total vinst jämförs med spelarens rekord och med topplistan för restaurangtypen.
- Vill man spela vidare börjar man om med 0 kr och nytt startlager.

## 9. Grafik och utseende

- **90-tals-stil**, enkel pixelgrafik med ett begränsat färgschema.
- **Lättläst text** med stora tecken och hög kontrast, särskilt på siffror och priser.

## 10. Sparas på servern (minimalt)

Spelar-id och spelkod, spelarnamn och **bästa totala vinst per restaurangtyp**. Pågående spel sparas inte.

## 11. Teknik

Webbaserat och responsivt, med Render.com (gratisnivå). Gratisnivån har begränsningar (t.ex. att tjänsten somnar och att gratisdatabaser kan ha tidsgräns), vilket påverkar hur topplistan lagras. Det tas upp vid den tekniska designen.

## 12. Öppna punkter inför nästa steg

- **Balansering av tal:** priser, startlager, tålamodstider, uppgraderingspriser, antal dagar (särskilt pizza).
- **Cupcake-uppgradering "Annat":** inte definierad.
- **Skärmflöden** och **teknisk design** (topplista, spelkod, hosting).
