<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Laadt de inhoud van de les. Er wordt bewust geen testaccount aangemaakt:
     * een beheeraccount maak je zelf met `php artisan make:filament-user`.
     */
    public function run(): void
    {
        $this->call(InhoudSeeder::class);
    }
}
