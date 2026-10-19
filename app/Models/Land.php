<?php

namespace App\Models;

use Database\Factories\LandFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Land extends Model
{
    /** @use HasFactory<LandFactory> */
    use HasFactory;

    protected $table = 'landen';

    protected $guarded = [];

    protected function casts(): array
    {
        return [
            'gedeeltelijk' => 'boolean',
            'voorwaarden' => 'array',
        ];
    }

    /** @return array<string, string> */
    public static function statussen(): array
    {
        return [
            'beide' => 'Euthanasie én hulp bij zelfdoding',
            'euthanasie' => 'Euthanasie',
            'hulp' => 'Alleen hulp bij zelfdoding',
            'niet_in_werking' => 'Wet aangenomen, niet in werking',
        ];
    }

    /** @return array{iso: string, naam: string, status: string, jaar: ?int, gedeeltelijk: bool, voorwaarden: array<int, string>, bron: ?string} */
    public function naarFrontend(): array
    {
        return [
            'iso' => $this->iso,
            'naam' => $this->naam,
            'status' => $this->status,
            'jaar' => $this->jaar,
            'gedeeltelijk' => $this->gedeeltelijk,
            'voorwaarden' => $this->voorwaarden ?? [],
            'bron' => $this->bron,
        ];
    }
}
