<?php

namespace Tests\Feature;

use App\Models\LesStap;
use App\Models\Publieksvraag;
use App\Models\User;
use Database\Seeders\InhoudSeeder;
use Database\Seeders\OpdrachtwijzerSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class InhoudTest extends TestCase
{
    use RefreshDatabase;

    public function test_inhoud_is_alleen_voor_presentatoren(): void
    {
        $this->getJson('/presentator/inhoud')->assertForbidden();
    }

    public function test_presentatorcode_geeft_toegang_tot_de_inhoud(): void
    {
        config(['sterrenhemel.presentator_code' => 'geheim']);
        $this->seed(InhoudSeeder::class);

        $this->get('/presentator/inhoud')->assertForbidden();
        $this->get('/presentator/inloggen?code=fout')->assertForbidden();
        $this->get('/presentator/inloggen?code=geheim')->assertRedirect('/');

        $this->getJson('/presentator/inhoud')
            ->assertOk()
            ->assertJsonCount(13, 'klas')
            ->assertJsonPath('stellingen.s1', fn (string $tekst) => str_starts_with($tekst, 'Ik ben blij'));
    }

    public function test_publieksvraag_verbergt_de_naam_als_dat_gevraagd_is(): void
    {
        Publieksvraag::factory()->create(['vraag' => 'Met naam?', 'van' => 'Anna', 'volgorde' => 1]);
        Publieksvraag::factory()->anoniem()->create(['vraag' => 'Zonder naam?', 'van' => 'Bram', 'volgorde' => 2]);

        $this->actingAs(User::factory()->create())
            ->getJson('/presentator/inhoud')
            ->assertOk()
            ->assertJsonPath('publieksvragen.0.van', 'Anna')
            ->assertJsonPath('publieksvragen.1.van', null);
    }

    public function test_opdrachtwijzer_seeder_verdubbelt_geen_stappen(): void
    {
        $this->seed(InhoudSeeder::class);
        $aantal = LesStap::count();

        $this->seed(OpdrachtwijzerSeeder::class);

        $this->assertSame($aantal, LesStap::count());
        $this->assertSame(
            ['theorie', 'openVraag'],
            LesStap::query()->orderBy('volgorde')->get()
                ->filter(fn (LesStap $stap) => in_array($stap->instellingen['kaart'] ?? $stap->instellingen['vraag'] ?? null, ['perspectieven', 'steelman']))
                ->pluck('type')->values()->all(),
        );
    }
}
