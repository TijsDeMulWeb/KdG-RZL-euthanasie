<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Antwoord extends Model
{
    protected $table = 'antwoorden';

    protected $guarded = [];

    protected function casts(): array
    {
        return [
            'waarde' => 'json',
        ];
    }

    public function deelnemer(): BelongsTo
    {
        return $this->belongsTo(Deelnemer::class);
    }
}
