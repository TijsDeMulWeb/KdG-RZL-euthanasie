<?php

namespace Database\Factories;

use App\Models\Land;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Land>
 */
class LandFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'iso' => (string) fake()->unique()->numberBetween(100, 999),
            'naam' => fake()->country(),
            'status' => fake()->randomElement(array_keys(Land::statussen())),
            'jaar' => fake()->numberBetween(1990, 2026),
            'gedeeltelijk' => false,
            'voorwaarden' => [fake()->sentence()],
            'bron' => fake()->url(),
        ];
    }
}
