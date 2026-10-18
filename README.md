# Jullie sterrenhemel

Interactieve beamerpresentatie voor de les over euthanasie (Philosophy of Life, MicroTeaching). De klas verschijnt als sterren aan een hemel, leerlingen stemmen en antwoorden via hun gsm.

## Lokaal starten (Herd)

```bash
composer install
npm install
cp .env.example .env
php artisan key:generate
php artisan migrate
php artisan db:seed --class=InhoudSeeder
php artisan make:filament-user
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

Via het beheerplatform op `/admin` (log in met het account uit `make:filament-user`):

- **Lesverloop**: de scènes van de les, sleep ze in de juiste volgorde, zet ze aan of uit
- **Theoriekaarten**, **Gsm-vragen**, **Dossiers**, **Klas** en **Stellingen**

Herlaad de beamer na een wijziging. Wie ingelogd is in het beheer, kan ook meteen de beamer en het presentatorscherm openen.

`InhoudSeeder` zet de startinhoud uit `data/*.json` in de database. Voer hem alleen de eerste keer uit: hij overschrijft alles wat in het beheer aangepast is.

## Online zetten

PHP 8.3+, HTTPS (nodig voor de camera). Lokaal `npm run build`, upload alles inclusief `public/build`, en voer `php artisan migrate` uit op de server.
