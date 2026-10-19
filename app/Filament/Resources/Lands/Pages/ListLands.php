<?php

namespace App\Filament\Resources\Lands\Pages;

use App\Filament\Resources\Lands\LandResource;
use Filament\Actions\CreateAction;
use Filament\Resources\Pages\ListRecords;

class ListLands extends ListRecords
{
    protected static string $resource = LandResource::class;

    protected function getHeaderActions(): array
    {
        return [
            CreateAction::make(),
        ];
    }
}
