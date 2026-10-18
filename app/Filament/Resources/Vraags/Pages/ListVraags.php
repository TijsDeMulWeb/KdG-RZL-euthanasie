<?php

namespace App\Filament\Resources\Vraags\Pages;

use App\Filament\Resources\Vraags\VraagResource;
use Filament\Actions\CreateAction;
use Filament\Resources\Pages\ListRecords;

class ListVraags extends ListRecords
{
    protected static string $resource = VraagResource::class;

    protected function getHeaderActions(): array
    {
        return [
            CreateAction::make(),
        ];
    }
}
