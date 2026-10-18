# Bouwplan: "Jullie sterrenhemel"

Geef dit bestand samen met de map `data/` aan Claude Code. Het inhoudelijke lesverloop staat in `../lesverloop-sterrenhemel.md`.

## Doel

Een schermvullende webpagina voor de beamer die de hele les (2 uur, Philosophy of Life, thema euthanasie) begeleidt. Een sterrenhemel groeit mee met de les. De 13 klasgenoten zijn sterren met hun naam, geplaatst volgens hun antwoorden op de publieksvragen.

- Bediening alleen door de presentator: pijltjes links en rechts (en de clicker, die PageUp en PageDown stuurt), plus muisklikken op sterren.
- Geen gsm's en geen backend. Werkt offline vanaf een laptop of usb-stick.
- Toon: sober, rustig en respectvol. Geen game-effecten, geen geluiden, geen felle kleuren. Donkerblauwe tot zwarte hemel, wit en zacht goud licht.

## Stack

- Vite + TypeScript, statische build (`npm run build` geeft een `dist/` die je zo kan openen).
- Three.js voor de sterren (`Points` met een eigen shader voor de gloed) en GSAP voor de overgangen. Pure canvas 2D mag ook, als het vlot blijft bij 3.000 punten.
- Tekst en kaarten als HTML-overlay boven het canvas, zodat ze scherp blijven.
- De data komt uit `data/klas.json` en `data/dossiers.json`, geïmporteerd tijdens de build.

## Architectuur

- **Scènemachine:** een lijst scènes met `enter()`, `exit()` en optioneel substappen. → gaat naar de volgende stap, ← terug. Elke scène moet terug te draaien zijn.
- **Sterrenlaag:** één puntenwolk voor de achtergrond (tot ongeveer 3.000) en 13 aparte, grotere "klassterren" met een naamlabel. Posities worden met tweens geanimeerd.
- **Presentatorhulp:** `H` toont of verbergt een klein hulpvenster met de scènenaam, de volgende stap en de duelnamen. `F` zet volledig scherm aan. `B` maakt het scherm zwart (pauze).

## Scènes (volgorde van de les)

1. **Leeg:** zwart, één ster in het midden. Titel "Hoe ver mag zelfbeschikking gaan?".
2. **Jullie hemel:** de 13 klassterren verschijnen één voor één met naam.
   - Positie x is de zelfbeschikkingsscore. Per stelling s1 tot s5: eens = +1, oneens = −1, twijfel = 0, behalve s2, waar het omgekeerd is (eens met het verbod = −1). Gebruik het `bedoeld`-cijfer waar `tegenstrijdig` gezet is. Schaal naar de schermbreedte: links "mijn leven is van mij", rechts "het leven behoort ons niet toe". Let op: hogere score = links.
   - Positie y is willekeurig maar vast, met een seed, zodat sterren niet overlappen.
   - Substap: s1 toont de telling (10 eens, 2 oneens, 1 twijfel) en licht Eda en Nicolas op.
3. **Achtergrond:** de hemel dimt tot 20 %, zodat C en D met slides of Wooclap verder kunnen. Een toets brengt hem terug.
4. **Commissie:** vier dossiersterren pulseren. Per dossier:
   - a) klik op de ster: de camera zoomt in en de kaart verschijnt (4 regels, geen naam)
   - b) "Stem nu: handen omhoog" (alleen tekst)
   - c) onthulling met naam en afloop
   - d) de 13 klassterren vliegen naar drie sterrenbeelden (eens, oneens, twijfel) met tellingen, en klikken op een ster toont het citaat bij die stelling
   - e) duel: de twee namen uit `duel` lichten op met een lijn ertussen, met hun citaten links en rechts
   - f) terug naar de hemel, en de besproken dossierster krijgt een gedempte gouden kleur
   - Bij `tegenspraak: true` (Lhermitte) een extra stap: de sterren met s5 = eens en s4 = oneens (met `bedoeld`) flikkeren, met de tekst "Bij voltooid leven zeiden jullie: eigen keuze."
5. **Waar stopt zelfbeschikking?** Dezelfde flikkerende sterren plus de vraag groot in beeld (de pen-en-papieropdracht na de pauze).
6. **De cijfers:** de achtergrond vult zich met een jaarteller van 2003 tot het laatste jaar met cijfers, telkens met evenveel sterren als euthanasies dat jaar. Daarna splitst de zwerm in groepen per aandoening, met labels en aantallen. De 13 klassterren blijven zichtbaar ertussen.
7. **Abortus:** sterrenbeelden voor s6 met citaten. In het duel staat Wout ("iets te makkelijk") tegenover Romy en Franka ("12 weken is te kort").
8. **Herstemming:** de klas staat in het lokaal. De presentator klikt op elke klasster die van mening veranderd is en kiest de nieuwe kant (toets 1 = eens, 2 = oneens, 3 = twijfel). De ster schiet als vallende ster met een lichtspoor naar de nieuwe plek. Op het einde verschijnt de teller "x van 13 veranderden van mening".
9. **Afsluiter:** alles dooft behalve één ster: "Achter elk lichtje zit een mens met een verhaal." Daarna een rustig scherm met Tele-Onthaal 106 en Zelfmoordlijn 1813.

## Data

- `data/klas.json`: per klasgenoot de antwoorden s1 tot s6, citaten per stelling, `tegenstrijdig` (met het `bedoeld`-cijfer) en `gevoelig`. Een citaat van een stelling in `gevoelig` toon je pas na een extra klik, zodat de presentator eerst kan vragen of het mag.
- `data/dossiers.json`: de vier commissiedossiers met kaarttekst, onthulling, gekoppelde stelling en duel.
- **Nog te doen:** `data/cijfers.json` met het aantal euthanasies per jaar sinds 2003 en de verdeling per aandoening voor het laatste jaar, uit de officiële verslagen van de Federale Commissie Euthanasie. Gebruik geen cijfers uit het geheugen. Het lesplan zegt alleen "bijna 3.000 in 2022". Laat Claude Code de bron per cijfer in het bestand noteren.

## Kwaliteit

- Moet vlot draaien (60 fps) op een gewone laptop op 1920×1080 en op een beamer met lage resolutie.
- Leesbaar van achteraan in het lokaal: minimaal 32 px tekst, citaten op maximaal 2 regels.
- Werkt zonder internet: lettertypes en bibliotheken lokaal bundelen.
- Test elke scène vooruit en achteruit, en test de herstemming met 0 en met 13 wissels.

## Volgorde om te bouwen

1. Scènemachine, toetsen en volledig scherm, met lege scènes.
2. Sterrenlaag: achtergrondsterren en de 13 klassterren met labels en posities volgens de formule.
3. Commissie: de dossiers, sterrenbeelden, citaten en duels (dit is de kern, daar zit de meeste waarde).
4. Herstemming met vallende sterren.
5. Cijferscène (zodra `cijfers.json` gecontroleerd is).
6. Afwerking: tempo van de overgangen, hulpvenster en een generale repetitie met de vier presentatoren.
