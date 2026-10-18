# Jullie sterrenhemel

Interactieve beamerpresentatie voor de les over euthanasie (Philosophy of Life, MicroTeaching). De klas verschijnt als sterren aan een hemel, leerlingen stemmen en antwoorden via hun gsm.

## Lokaal starten (Herd)

```bash
composer install
npm install
cp .env.example .env
php artisan key:generate
php artisan migrate
npm run build
herd link sterrenhemel
herd secure sterrenhemel
```

Zet een eigen `PRESENTATOR_CODE` in `.env`.

- Beamer: `https://sterrenhemel.test/presentator/inloggen?code=JOUWCODE`
- Presentatorscherm (gsm, zelfde browser na inloggen): `/presentator`
- Leerlingen: `/doe-mee` (staat ook als QR-code op de beamer)

## Bediening

Volgende en vorige alleen via het presentatorscherm (`/presentator`); pijltjes en clicker doen niets op de beamer. F volledig scherm, B zwart scherm, H hulpvenster met de scènelijst. Bij de staande stemming: 1, 2, 3 telt een persoon bij (Shift trekt er een af), M spiegelt links en rechts.

## Inhoud aanpassen

- `data/klas.json`: antwoorden en citaten van de klas
- `data/dossiers.json`: de vier commissiedossiers
- `data/vragen.json`: vragen voor de gsm's
- `data/theorie.json`: theoriekaarten (punten onder "aanvullen" moeten nog ingevuld worden)

## Online zetten

PHP 8.3+, HTTPS (nodig voor de camera). Lokaal `npm run build`, upload alles inclusief `public/build`, en voer `php artisan migrate` uit op de server.
