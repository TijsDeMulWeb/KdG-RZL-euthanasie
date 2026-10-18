<?php

namespace App\Filament\Resources\Leerlings\Pages;

use App\Filament\Resources\Leerlings\LeerlingResource;
use Filament\Actions\CreateAction;
use Filament\Resources\Pages\ListRecords;

class ListLeerlings extends ListRecords
{
    protected static string $resource = LeerlingResource::class;

    protected function getHeaderActions(): array
    {
        return [
            CreateAction::make(),
        ];
    }
}
