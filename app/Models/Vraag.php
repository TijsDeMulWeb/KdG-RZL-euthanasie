<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Vraag extends Model
{
    protected $table = 'vragen';

    protected $guarded = [];

    protected function casts(): array
    {
        return [
            'opties' => 'array',
            'markeringen' => 'array',
            'stellingen' => 'array',
        ];
    }

    /** @return array<string, mixed> */
    public function naarFrontend(): array
    {
        return array_filter([
            'id' => $this->sleutel,
            'type' => $this->type,
            'tekst' => $this->tekst,
            'opties' => $this->opties,
            'juist' => $this->juist,
            'min' => $this->min,
            'max' => $this->max,
            'antwoord' => $this->antwoord,
            'eenheid' => $this->eenheid,
            'uitleg' => $this->uitleg,
            'bron' => $this->bron,
            'maxLengte' => $this->max_lengte,
            'markeringen' => $this->markeringen,
            'stellingen' => $this->stellingen,
        ], fn ($waarde) => $waarde !== null);
    }
}
