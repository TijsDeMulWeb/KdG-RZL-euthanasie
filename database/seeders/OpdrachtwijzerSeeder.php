<?php

namespace Database\Seeders;

use App\Models\LesStap;
use App\Models\TheorieKaart;
use App\Models\Vraag;
use Illuminate\Database\Seeder;

/**
 * Aanvullingen na het lezen van de opdrachtwijzer (oktober 2026): begrippen, drie perspectieven met een steelman,
 * publieksvragen, een conclusie en de officiële cijfers van 2025.
 * Mag meerdere keren lopen: wat er al is, wordt bijgewerkt in plaats van verdubbeld.
 */
class OpdrachtwijzerSeeder extends Seeder
{
    public function run(): void
    {
        $this->kaarten();
        $this->vragen();
        $this->lesverloop();
    }

    private function kaarten(): void
    {
        TheorieKaart::updateOrCreate(['sleutel' => 'begrippen'], [
            'titel' => 'Begrippen scherpstellen',
            'punten' => [
                'Euthanasie: een arts beëindigt opzettelijk het leven van iemand, op diens eigen verzoek.',
                'Hulp bij zelfdoding: de patiënt neemt het dodelijke middel zelf in.',
                'Palliatieve sedatie: het bewustzijn verlagen om onbehandelbaar lijden te verlichten, niet om het leven te beëindigen.',
                'Betwiste termen: wat is "ondraaglijk"? Wanneer ben je "wilsbekwaam"? Wanneer is een leven "voltooid"?',
                'Feit, interpretatie of waarde? "Het aantal stijgt" is een feit. "Dat is een hellend vlak" is een interpretatie. "Het leven is heilig" is een waarde.',
            ],
            'bron' => 'Euthanasiewet van 28 mei 2002, art. 2; themabundel p. 1, 6 en 7',
            'aanvullen' => ['Controleer de omschrijving van hulp bij zelfdoding en palliatieve sedatie met een bron, bv. LEIF of de FOD Volksgezondheid.'],
        ]);

        TheorieKaart::updateOrCreate(['sleutel' => 'perspectieven'], [
            'titel' => 'Drie perspectieven, in hun sterkste vorm',
            'punten' => [
                'Autonomie: mijn leven, mijn keuze. Niemand anders kan beoordelen of mijn lijden draaglijk is.',
                'Heiligheid van het leven: het leven is een gave, geen bezit. Een samenleving beschermt juist haar kwetsbaarste mensen.',
                'Zorg en verbondenheid (Gastmans): we beslissen nooit alleen. Een verzoek hoort besproken te worden met familie en zorgverleners.',
                'Waar botsen ze? Bij psychisch lijden, dementie en voltooid leven: wie bepaalt wat ondraaglijk is?',
            ],
            'bron' => 'Themabundel p. 1, 5 en 6',
            'aanvullen' => ['Toets elk perspectief aan een bron van die kant zelf, zodat het geen karikatuur wordt.'],
        ]);

        TheorieKaart::updateOrCreate(['sleutel' => 'conclusie'], [
            'titel' => 'Wat nemen we mee?',
            'punten' => [
                'De kernspanning: zelfbeschikking tegenover de bescherming van het leven en van kwetsbare mensen.',
                'Wat open blijft: waar ligt de grens bij psychisch lijden, dementie en voltooid leven?',
                'Onze voorlopige positie: (nog in te vullen in het beheer)',
            ],
            'bron' => 'Opdrachtwijzer Philosophy of Life, punt 7',
            'aanvullen' => ['Schrijf jullie eigen, genuanceerde positie in het derde punt. De opdracht vraagt dat uitdrukkelijk.'],
        ]);

        TheorieKaart::updateOrCreate(['sleutel' => 'cijfers'], [
            'titel' => 'De cijfers (2025)',
            'punten' => [
                '4.486 euthanasies in 2025, 12,4 procent meer dan in 2024. Dat is 4 procent van alle overlijdens.',
                'Bijna drie op vier (73,7 procent) was ouder dan 70, 45 procent zelfs ouder dan 80.',
                'Kanker in de helft van de gevallen (49,9 procent). Psychiatrische aandoeningen 1,6 procent, dementie 1,7 procent.',
                'Bij 1.117 mensen werd het overlijden niet op korte termijn verwacht, tegenover 923 in 2024.',
                'Je hoeft geen Belg te zijn om in België euthanasie te krijgen.',
            ],
            'bron' => 'Federale Controle- en Evaluatiecommissie Euthanasie, cijfers 2025 (FOD Volksgezondheid, 20 maart 2026); themabundel p. 15',
            'aanvullen' => ['Controleer welke landen euthanasie nu toelaten (situatie 2026) voor je een kaartje toont.'],
        ]);
    }

    private function vragen(): void
    {
        Vraag::updateOrCreate(['sleutel' => 'steelman'], [
            'type' => 'open',
            'tekst' => 'Ben jij voor of tegen euthanasie bij psychisch lijden? Geef het beste argument van de andere kant.',
            'uitleg' => 'Ben je voor? Schrijf het sterkste argument tegen. Ben je tegen? Schrijf het sterkste argument voor.',
            'max_lengte' => 120,
        ]);

        Vraag::query()->where('sleutel', 'cijfer-2022')->update(['sleutel' => 'cijfer-aantal']);
        Vraag::updateOrCreate(['sleutel' => 'cijfer-aantal'], [
            'type' => 'getal',
            'tekst' => 'Hoeveel mensen kregen in 2025 euthanasie in België?',
            'min' => 0,
            'max' => 20000,
            'antwoord' => 4486,
            'uitleg' => '4.486 mensen, 12,4 procent meer dan in 2024. Dat is 4 procent van alle overlijdens.',
            'bron' => 'FCEE, cijfers 2025 (FOD Volksgezondheid, 20 maart 2026)',
        ]);

        Vraag::updateOrCreate(['sleutel' => 'wereld-raden'], [
            'type' => 'landen',
            'tekst' => 'In welke landen is euthanasie of hulp bij zelfdoding legaal?',
            'uitleg' => 'Tik de landen aan op de kaart, of zoek ze in de lijst.',
        ]);

        Vraag::updateOrCreate(['sleutel' => 'cijfer-70'], [
            'type' => 'getal',
            'tekst' => 'Hoeveel procent van hen was ouder dan 70?',
            'min' => 0,
            'max' => 100,
            'eenheid' => '%',
            'antwoord' => 74,
            'uitleg' => '73,7 procent was ouder dan 70, 45 procent zelfs ouder dan 80.',
            'bron' => 'FCEE, cijfers 2025 (FOD Volksgezondheid, 20 maart 2026)',
        ]);
    }

    private function lesverloop(): void
    {
        LesStap::all()
            ->filter(fn (LesStap $stap) => ($stap->instellingen['vraag'] ?? null) === 'cijfer-2022')
            ->each(fn (LesStap $stap) => $stap->update(['instellingen' => [...$stap->instellingen, 'vraag' => 'cijfer-aantal']]));

        LesStap::query()->where('type', 'mensen')->get()->each(fn (LesStap $stap) => $stap->update(['instellingen' => [
            'aantal' => 4486,
            'tekst' => '4.486 mensen kregen in 2025 euthanasie in België. Elk lichtje is een mens.',
            'bron' => 'FCEE, cijfers 2025 (FOD Volksgezondheid, 20 maart 2026)',
        ]]));

        $this->voegToe(['theorie', ['kaart' => 'begrippen']], na: ['openVraag', 'betekenis']);
        $this->voegToe(['theorie', ['kaart' => 'perspectieven']], na: ['jullieHemel']);
        $this->voegToe(['openVraag', ['vraag' => 'steelman']], na: ['theorie', 'perspectieven']);
        $this->voegToe(['wereldkaart', ['vraag' => 'wereld-raden']], na: ['theorie', 'cijfers']);
        $this->voegToe(['publieksvragen', []], voor: ['herstemming']);
        $this->voegToe(['theorie', ['kaart' => 'conclusie']], na: ['herstemming']);
    }

    /**
     * Voegt een stap toe na (of voor) de eerste stap die overeenkomt, tenzij ze al bestaat.
     *
     * @param  array{0: string, 1: array<string, mixed>}  $nieuw
     * @param  ?array{0: string, 1?: string}  $na
     * @param  ?array{0: string, 1?: string}  $voor
     */
    private function voegToe(array $nieuw, ?array $na = null, ?array $voor = null): void
    {
        [$type, $instellingen] = $nieuw;
        $stappen = LesStap::query()->orderBy('volgorde')->get();

        $bestaat = $stappen->contains(fn (LesStap $stap) => $stap->type === $type
            && ($instellingen === [] || ($stap->instellingen ?? []) == $instellingen));

        if ($bestaat) {
            return;
        }

        $past = fn (LesStap $stap, array $zoek) => $stap->type === $zoek[0]
            && (! isset($zoek[1]) || in_array($zoek[1], [$stap->instellingen['vraag'] ?? null, $stap->instellingen['kaart'] ?? null], true));

        $index = $stappen->search(fn (LesStap $stap) => $past($stap, $na ?? $voor));
        $positie = $index === false ? $stappen->count() : ($na ? $index + 1 : $index);

        $stappen->splice($positie, 0, [new LesStap(['type' => $type, 'instellingen' => $instellingen ?: null, 'actief' => true])]);

        $stappen->values()->each(function (LesStap $stap, int $volgorde) {
            $stap->volgorde = $volgorde;
            $stap->save();
        });
    }
}
