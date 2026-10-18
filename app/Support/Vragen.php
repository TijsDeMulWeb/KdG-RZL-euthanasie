<?php

namespace App\Support;

use App\Models\Stelling;
use App\Models\Vraag;

class Vragen
{
    /** @return ?array<string, mixed> */
    public static function vind(string $id): ?array
    {
        $stelling = Stelling::firstWhere('code', $id);

        if ($stelling) {
            return ['id' => $id, 'type' => 'stelling', 'stelling' => $id, 'tekst' => $stelling->tekst];
        }

        $vraag = Vraag::firstWhere('sleutel', $id)?->naarFrontend();

        if (! $vraag) {
            return null;
        }

        if ($vraag['type'] === 'herstemming') {
            $vraag['stellingTeksten'] = Stelling::query()
                ->whereIn('code', $vraag['stellingen'] ?? [])
                ->pluck('tekst', 'code')
                ->all();
        }

        return $vraag;
    }

    /** @return array<string, array<int, mixed>> */
    public static function regels(array $vraag): array
    {
        if ($vraag['type'] === 'herstemming') {
            return collect($vraag['stellingen'])
                ->mapWithKeys(fn (string $stelling) => ["waarde.{$stelling}" => ['required', 'integer', 'in:1,2,3']])
                ->prepend(['required', 'array:'.implode(',', $vraag['stellingen'])], 'waarde')
                ->all();
        }

        return [
            'waarde' => match ($vraag['type']) {
                'open' => ['required', 'string', 'max:'.($vraag['maxLengte'] ?? 80)],
                'keuze' => ['required', 'integer', 'min:0', 'max:'.(count($vraag['opties']) - 1)],
                'getal', 'schuif' => ['required', 'numeric', "min:{$vraag['min']}", "max:{$vraag['max']}"],
                'stelling' => ['required', 'integer', 'in:1,2,3'],
            },
        ];
    }
}
