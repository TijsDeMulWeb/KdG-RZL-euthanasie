<?php

namespace App\Models;

use Database\Factories\PublieksvraagFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Publieksvraag extends Model
{
    /** @use HasFactory<PublieksvraagFactory> */
    use HasFactory;

    protected $table = 'publieksvragen';

    protected $guarded = [];

    protected function casts(): array
    {
        return [
            'naam_tonen' => 'boolean',
        ];
    }

    /** @return array{id: int, vraag: string, van: ?string, invalshoek: ?string} */
    public function naarFrontend(): array
    {
        return [
            'id' => $this->id,
            'vraag' => $this->vraag,
            'van' => $this->naam_tonen ? $this->van : null,
            'invalshoek' => $this->invalshoek,
        ];
    }
}
