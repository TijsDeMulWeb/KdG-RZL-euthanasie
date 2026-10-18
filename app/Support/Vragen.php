<?php

namespace App\Support;

use Illuminate\Support\Collection;

class Vragen
{
    /** @return Collection<string, array<string, mixed>> */
    public static function alle(): Collection
    {
        $vragen = json_decode(file_get_contents(base_path('data/vragen.json')), true)['vragen'];

        return collect($vragen)->keyBy('id');
    }

    /** @return ?array<string, mixed> */
    public static function vind(string $id): ?array
    {
        if (preg_match('/^s[1-6]$/', $id)) {
            return ['id' => $id, 'type' => 'stelling', 'stelling' => $id];
        }

        return static::alle()->get($id);
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
