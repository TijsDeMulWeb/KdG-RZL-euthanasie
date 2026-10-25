<?php

namespace Database\Seeders;

use App\Models\Vraag;
use Illuminate\Database\Seeder;

/**
 * De gsm-vraag van de afsluiter. Raakt niets aan als ze al bestaat,
 * dus veilig om op hosting te draaien zonder aanpassingen uit het beheer te verliezen.
 */
class AfsluiterSeeder extends Seeder
{
    public function run(): void
    {
        Vraag::firstOrCreate(['sleutel' => 'meeneem'], [
            'type' => 'open',
            'tekst' => 'Welk woord neem je mee uit deze les?',
            'uitleg' => 'Eén woord. Het verschijnt anoniem aan de hemel.',
            'max_lengte' => 24,
        ]);
    }
}
