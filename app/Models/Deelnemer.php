<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Deelnemer extends Model
{
    protected $table = 'deelnemers';

    protected $guarded = [];

    public function antwoorden(): HasMany
    {
        return $this->hasMany(Antwoord::class);
    }
}
