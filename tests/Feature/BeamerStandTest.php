<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BeamerStandTest extends TestCase
{
    use RefreshDatabase;

    public function test_beamer_bewaart_zijn_positie_voor_na_het_herladen(): void
    {
        $this->actingAs(User::factory()->create());

        $this->putJson(route('beamerStand.update'), [
            'nummer' => 9,
            'naam' => 'Commissie',
            'stap' => 'gaan staan',
            'volgende' => 'onthulling',
            'positie' => ['scene' => 8, 'vanaf' => 'begin', 'stappen' => 3],
            'toestanden' => ['8' => ['staan' => [['trauma', [4, 1, 2]]]]],
        ])->assertOk();

        $this->getJson(route('beamerStand.show'))
            ->assertOk()
            ->assertJsonPath('positie.scene', 8)
            ->assertJsonPath('positie.stappen', 3)
            ->assertJsonPath('toestanden.8.staan.0.1', [4, 1, 2]);
    }

    public function test_ongeldige_positie_wordt_geweigerd(): void
    {
        $this->actingAs(User::factory()->create());

        $this->putJson(route('beamerStand.update'), [
            'nummer' => 1,
            'naam' => 'Leeg',
            'stap' => 'titel',
            'volgende' => 'aanmelden',
            'positie' => ['scene' => 0, 'vanaf' => 'midden', 'stappen' => -1],
        ])->assertUnprocessable();
    }
}
