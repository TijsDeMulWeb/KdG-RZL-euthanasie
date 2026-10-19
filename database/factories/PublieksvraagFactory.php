<?php

namespace Database\Factories;

use App\Models\Publieksvraag;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Publieksvraag>
 */
class PublieksvraagFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'vraag' => fake()->sentence().'?',
            'van' => fake()->firstName(),
            'invalshoek' => fake()->randomElement(['Ethiek', 'Wet', 'Zorg', 'Religie']),
            'naam_tonen' => true,
            'volgorde' => 0,
        ];
    }

    public function anoniem(): static
    {
        return $this->state(fn () => ['naam_tonen' => false]);
    }
}
