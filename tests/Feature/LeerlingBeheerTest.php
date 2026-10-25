<?php

namespace Tests\Feature;

use App\Filament\Resources\Leerlings\Pages\CreateLeerling;
use App\Models\User;
use Database\Seeders\InhoudSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Livewire\Livewire;
use Tests\TestCase;

class LeerlingBeheerTest extends TestCase
{
    use RefreshDatabase;

    public function test_twee_leerlingen_met_dezelfde_naam_kan_niet(): void
    {
        $this->seed(InhoudSeeder::class);
        $this->actingAs(User::factory()->create());

        Livewire::test(CreateLeerling::class)
            ->fillForm([
                'naam' => 'Alexis',
                'antwoorden' => ['s1' => 1, 's2' => 1, 's3' => 1, 's4' => 1, 's5' => 1, 's6' => 1],
            ])
            ->call('create')
            ->assertHasFormErrors(['naam' => 'unique']);
    }
}
