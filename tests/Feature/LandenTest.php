<?php

namespace Tests\Feature;

use App\Models\Antwoord;
use App\Models\User;
use Database\Seeders\InhoudSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Tests\TestCase;

class LandenTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(InhoudSeeder::class);
    }

    public function test_inhoud_bevat_de_landen_en_de_wereldkaart_in_het_lesverloop(): void
    {
        $inhoud = $this->actingAs(User::factory()->create())->getJson('/presentator/inhoud')->assertOk();

        $inhoud->assertJsonFragment(['iso' => '056', 'naam' => 'België', 'status' => 'euthanasie']);
        $this->assertContains('wereldkaart', collect($inhoud->json('les'))->pluck('type')->all());
    }

    public function test_leerling_kan_landen_aanduiden(): void
    {
        Cache::forever('actieve-vraag', 'wereld-raden');
        $this->postJson('/deelnemers', ['naam' => 'Anna'])->assertOk();

        $this->postJson('/antwoorden', ['vraag' => 'wereld-raden', 'waarde' => ['056', '528']])->assertOk();

        $this->assertSame(['056', '528'], Antwoord::sole()->waarde);
    }

    public function test_ongeldige_landcode_wordt_geweigerd(): void
    {
        Cache::forever('actieve-vraag', 'wereld-raden');
        $this->postJson('/deelnemers', ['naam' => 'Bram'])->assertOk();

        $this->postJson('/antwoorden', ['vraag' => 'wereld-raden', 'waarde' => ['België']])->assertUnprocessable();
    }
}
