<?php

namespace Database\Seeders;

use App\Models\Dossier;
use App\Models\Leerling;
use App\Models\LesStap;
use App\Models\Stelling;
use App\Models\TheorieKaart;
use App\Models\Vraag;
use Illuminate\Database\Seeder;

/**
 * Zet de startinhoud uit data/*.json in de database. Bestaande inhoud wordt vervangen.
 */
class InhoudSeeder extends Seeder
{
    public function run(): void
    {
        $klas = $this->lees('klas.json');

        Stelling::query()->delete();
        collect($klas['stellingen'])->each(fn (string $tekst, string $code) => Stelling::create([
            'code' => $code,
            'tekst' => $tekst,
        ]));

        Leerling::query()->delete();
        collect($klas['klas'])->each(fn (array $leerling, int $index) => Leerling::create([
            'naam' => $leerling['naam'],
            'antwoorden' => $leerling['antwoorden'],
            'citaten' => $leerling['citaten'] ?? [],
            'tegenstrijdig' => $leerling['tegenstrijdig'] ?? null,
            'gevoelig' => $leerling['gevoelig'] ?? null,
            'opgelet' => $leerling['opgelet'] ?? null,
            'volgorde' => $index,
        ]));

        Dossier::query()->delete();
        collect($this->lees('dossiers.json')['dossiers'])->each(fn (array $dossier, int $index) => Dossier::create([
            'sleutel' => $dossier['id'],
            'stelling' => $dossier['stelling'],
            'titel' => $dossier['titel'],
            'kaart' => $dossier['kaart'],
            'onthulling' => $dossier['onthulling'],
            'duel' => $dossier['duel'],
            'tegenspraak' => $dossier['tegenspraak'] ?? false,
            'volgorde' => $index,
        ]));

        Vraag::query()->delete();
        collect($this->lees('vragen.json')['vragen'])->each(fn (array $vraag) => Vraag::create([
            'sleutel' => $vraag['id'],
            'type' => $vraag['type'],
            'tekst' => $vraag['tekst'],
            'opties' => $vraag['opties'] ?? null,
            'juist' => $vraag['juist'] ?? null,
            'min' => $vraag['min'] ?? null,
            'max' => $vraag['max'] ?? null,
            'antwoord' => $vraag['antwoord'] ?? null,
            'eenheid' => $vraag['eenheid'] ?? null,
            'uitleg' => $vraag['uitleg'] ?? null,
            'bron' => $vraag['bron'] ?? null,
            'max_lengte' => $vraag['maxLengte'] ?? null,
            'markeringen' => $vraag['markeringen'] ?? null,
            'stellingen' => $vraag['stellingen'] ?? null,
        ]));

        TheorieKaart::query()->delete();
        collect($this->lees('theorie.json')['kaarten'])->each(fn (array $kaart) => TheorieKaart::create([
            'sleutel' => $kaart['id'],
            'titel' => $kaart['titel'],
            'punten' => $kaart['punten'],
            'bron' => $kaart['bron'] ?? null,
            'aanvullen' => $kaart['aanvullen'] ?? [],
        ]));

        LesStap::query()->delete();
        collect($this->lesverloop())->each(fn (array $stap, int $index) => LesStap::create([
            'volgorde' => $index,
            'type' => $stap[0],
            'instellingen' => $stap[1] ?? null,
        ]));

        $this->call(OpdrachtwijzerSeeder::class);
    }

    /** @return array<int, array{0: string, 1?: array<string, mixed>}> */
    private function lesverloop(): array
    {
        return [
            ['titel', ['titel' => 'Hoe ver mag zelfbeschikking gaan?']],
            ['aanmelden'],
            ['openVraag', ['vraag' => 'betekenis']],
            ['theorie', ['kaart' => 'kader']],
            ['jullieHemel'],
            ['theorie', ['kaart' => 'wet']],
            ['quiz', ['naam' => 'Waar of niet waar: de wet', 'vragen' => ['wet-terminaal', 'wet-psychisch', 'wet-dementie', 'wet-familie', 'wet-kinderen', 'wet-belg']]],
            ['theorie', ['kaart' => 'uitvoering']],
            ['commissie', ['dossiers' => ['trauma', 'misdaad']]],
            ['pauze', ['minuten' => 10]],
            ['theorie', ['kaart' => 'ethiek']],
            ['openVraag', ['vraag' => 'voltooid']],
            ['commissie', ['dossiers' => ['voltooid', 'dementie']]],
            ['getallenlijn', ['vraag' => 'cijfer-2022']],
            ['mensen', ['aantal' => 3000, 'tekst' => 'Zo’n 3.000 mensen kregen in 2022 euthanasie in België. Elk lichtje is een mens.', 'bron' => '"Zo\'n 3.000 mensen" in 2022, VRT NWS februari 2023 (p. 14). Afgerond getal.']],
            ['getallenlijn', ['vraag' => 'cijfer-70']],
            ['theorie', ['kaart' => 'cijfers']],
            ['theorie', ['kaart' => 'afbakening']],
            ['getallenlijn', ['vraag' => 'abortus-weken']],
            ['theorie', ['kaart' => 'abortus']],
            ['sterrenbeeld', ['stelling' => 's6', 'links' => 'Wout', 'rechts' => ['Romy', 'Franka']]],
            ['herstemming'],
            ['afsluiter'],
        ];
    }

    /** @return array<string, mixed> */
    private function lees(string $bestand): array
    {
        return json_decode(file_get_contents(base_path("data/{$bestand}")), true);
    }
}
