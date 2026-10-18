<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Model;

class Leerling extends Model
{
    protected $table = 'leerlingen';

    protected $guarded = [];

    protected function casts(): array
    {
        return [
            'antwoorden' => 'array',
            'citaten' => 'array',
            'gevoelig' => 'array',
        ];
    }

    /** Lege citaten weglaten, zodat de beamer '(geen citaat)' toont in plaats van een lege regel. */
    protected function citaten(): Attribute
    {
        return Attribute::make(
            set: fn (?array $citaten) => json_encode(array_filter($citaten ?? [], fn ($citaat) => filled($citaat))),
        );
    }

    /** Alleen stellingen waar een bedoeld antwoord ingevuld is, tellen als tegenstrijdig. */
    protected function tegenstrijdig(): Attribute
    {
        return Attribute::make(
            get: fn (?string $waarde) => $waarde ? json_decode($waarde, true) : null,
            set: function (?array $tegenstrijdig) {
                $ingevuld = collect($tegenstrijdig ?? [])
                    ->filter(fn ($regel) => filled($regel['bedoeld'] ?? null))
                    ->map(fn ($regel) => ['bedoeld' => (int) $regel['bedoeld'], 'uitleg' => $regel['uitleg'] ?? ''])
                    ->all();

                return $ingevuld ? json_encode($ingevuld) : null;
            },
        );
    }
}
