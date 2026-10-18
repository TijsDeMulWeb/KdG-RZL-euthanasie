<?php

namespace App\Filament\Support;

use App\Models\Dossier;
use App\Models\Leerling;
use App\Models\Stelling;
use App\Models\TheorieKaart;
use App\Models\Vraag;

/** Keuzelijsten die op meerdere plaatsen in het beheer terugkomen. */
class Keuzes
{
    /** @return array<string, string> */
    public static function stellingen(): array
    {
        return Stelling::query()->orderBy('code')->get()
            ->mapWithKeys(fn (Stelling $stelling) => [$stelling->code => ltrim($stelling->code, 's').'. '.str($stelling->tekst)->limit(70)])
            ->all();
    }

    /** @return array<string, string> */
    public static function leerlingen(): array
    {
        return Leerling::query()->orderBy('naam')->pluck('naam', 'naam')->all();
    }

    /** @return array<int, string> */
    public static function antwoordcodes(): array
    {
        return [1 => 'Eens', 2 => 'Oneens', 3 => 'Twijfel'];
    }

    /** @param array<int, string> $types
     *  @return array<string, string> */
    public static function vragen(array $types): array
    {
        return Vraag::query()->whereIn('type', $types)->get()
            ->mapWithKeys(fn (Vraag $vraag) => [$vraag->sleutel => str($vraag->tekst)->limit(80)->toString()])
            ->all();
    }

    /** @return array<string, string> */
    public static function kaarten(): array
    {
        return TheorieKaart::query()->pluck('titel', 'sleutel')->all();
    }

    /** @return array<string, string> */
    public static function dossiers(): array
    {
        return Dossier::query()->orderBy('volgorde')->pluck('titel', 'sleutel')->all();
    }
}
