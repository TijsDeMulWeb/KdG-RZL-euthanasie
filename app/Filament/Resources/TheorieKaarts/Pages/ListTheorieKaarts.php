<?php

namespace App\Filament\Resources\TheorieKaarts\Pages;

use App\Filament\Resources\TheorieKaarts\TheorieKaartResource;
use Filament\Actions\CreateAction;
use Filament\Resources\Pages\ListRecords;

class ListTheorieKaarts extends ListRecords
{
    protected static string $resource = TheorieKaartResource::class;

    protected function getHeaderActions(): array
    {
        return [
            CreateAction::make(),
        ];
    }
}
