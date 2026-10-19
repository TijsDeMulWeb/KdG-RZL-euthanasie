<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class LesStap extends Model
{
    protected $table = 'les_stappen';

    protected $guarded = [];

    protected function casts(): array
    {
        return [
            'instellingen' => 'array',
            'actief' => 'boolean',
        ];
    }

    /** @return array<string, string> */
    public static function types(): array
    {
        return [
            'titel' => 'Titel met één ster',
            'aanmelden' => 'Aanmelden met QR-code',
            'openVraag' => 'Open vraag (gsm)',
            'theorie' => 'Theoriekaart',
            'jullieHemel' => 'Jullie hemel (vragenlijst van de klas)',
            'quiz' => 'Waar of niet waar (gsm)',
            'commissie' => 'Commissie: dossiers',
            'pauze' => 'Pauze met aftelklok',
            'getallenlijn' => 'Raad het getal of schuifbalk (gsm)',
            'mensen' => 'Hemel vult zich met sterren',
            'wereldkaart' => 'Wereldkaart: waar is het legaal?',
            'sterrenbeeld' => 'Sterrenbeelden van een stelling met duel',
            'publieksvragen' => 'Publieksvragen van medestudenten',
            'herstemming' => 'Herstemming (gsm)',
            'afsluiter' => 'Afsluiter met hulplijnen',
        ];
    }

    public function beschrijving(): string
    {
        $instellingen = $this->instellingen ?? [];

        return match ($this->type) {
            'titel' => $instellingen['titel'] ?? '',
            'openVraag', 'getallenlijn' => Vraag::firstWhere('sleutel', $instellingen['vraag'] ?? null)?->tekst ?? 'Vraag ontbreekt',
            'theorie' => TheorieKaart::firstWhere('sleutel', $instellingen['kaart'] ?? null)?->titel ?? 'Kaart ontbreekt',
            'quiz' => ($instellingen['naam'] ?? 'Quiz').' ('.count($instellingen['vragen'] ?? []).' vragen)',
            'commissie' => Dossier::query()->whereIn('sleutel', $instellingen['dossiers'] ?? [])->pluck('titel')->join(', '),
            'pauze' => ($instellingen['minuten'] ?? 10).' minuten',
            'publieksvragen' => empty($instellingen['vragen'])
                ? 'Alle publieksvragen ('.Publieksvraag::count().')'
                : count($instellingen['vragen']).' gekozen vragen',
            'mensen' => ($instellingen['aantal'] ?? 3000).' sterren',
            'wereldkaart' => empty($instellingen['vraag']) ? 'Zonder raden' : 'Eerst raden op de gsm',
            'sterrenbeeld' => 'Stelling '.ltrim($instellingen['stelling'] ?? '', 's').': '.($instellingen['links'] ?? '').' tegenover '.implode(' en ', $instellingen['rechts'] ?? []),
            default => '',
        };
    }
}
