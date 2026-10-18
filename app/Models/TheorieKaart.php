<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TheorieKaart extends Model
{
    protected $table = 'theorie_kaarten';

    protected $guarded = [];

    protected function casts(): array
    {
        return [
            'punten' => 'array',
            'aanvullen' => 'array',
        ];
    }
}
