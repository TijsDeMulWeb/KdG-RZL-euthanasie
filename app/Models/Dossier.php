<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Dossier extends Model
{
    protected $table = 'dossiers';

    protected $guarded = [];

    protected function casts(): array
    {
        return [
            'kaart' => 'array',
            'duel' => 'array',
            'tegenspraak' => 'boolean',
        ];
    }
}
