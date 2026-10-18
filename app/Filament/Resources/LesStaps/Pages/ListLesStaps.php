<?php

namespace App\Filament\Resources\LesStaps\Pages;

use App\Filament\Resources\LesStaps\LesStapResource;
use Filament\Actions\CreateAction;
use Filament\Resources\Pages\ListRecords;

class ListLesStaps extends ListRecords
{
    protected static string $resource = LesStapResource::class;

    protected function getHeaderActions(): array
    {
        return [
            CreateAction::make(),
        ];
    }
}
