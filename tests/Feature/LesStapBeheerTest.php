<?php

namespace Tests\Feature;

use App\Filament\Resources\LesStaps\Pages\EditLesStap;
use App\Models\LesStap;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Livewire\Livewire;
use Tests\TestCase;

class LesStapBeheerTest extends TestCase
{
    use RefreshDatabase;

    public function test_sterrenstap_bewaart_uitlichtingen(): void
    {
        $this->actingAs(User::factory()->create());
        $stap = LesStap::create(['volgorde' => 0, 'type' => 'mensen', 'instellingen' => ['aantal' => 4486]]);

        Livewire::test(EditLesStap::class, ['record' => $stap->getRouteKey()])
            ->fillForm([
                'instellingen.uitlichtingen' => [
                    ['procent' => 73.7, 'tekst' => 'was ouder dan 70'],
                    ['procent' => 49.9, 'tekst' => 'had kanker'],
                ],
            ])
            ->call('save')
            ->assertHasNoFormErrors();

        $this->assertSame(
            ['was ouder dan 70', 'had kanker'],
            array_column($stap->fresh()->instellingen['uitlichtingen'], 'tekst'),
        );
        $this->assertSame(4486, (int) $stap->fresh()->instellingen['aantal']);
    }
}
