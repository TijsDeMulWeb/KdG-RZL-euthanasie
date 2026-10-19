<?php

namespace App\Filament\Resources\Publieksvraags\Pages;

use App\Filament\Resources\Publieksvraags\PublieksvraagResource;
use Filament\Actions\CreateAction;
use Filament\Resources\Pages\ListRecords;

class ListPublieksvraags extends ListRecords
{
    protected static string $resource = PublieksvraagResource::class;

    protected function getHeaderActions(): array
    {
        return [
            CreateAction::make(),
        ];
    }
}
