<?php

namespace App\Filament\Resources\Stellings\Pages;

use App\Filament\Resources\Stellings\StellingResource;
use Filament\Resources\Pages\ListRecords;

class ListStellings extends ListRecords
{
    protected static string $resource = StellingResource::class;

    protected function getHeaderActions(): array
    {
        return [];
    }
}
