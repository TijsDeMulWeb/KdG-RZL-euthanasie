<?php

namespace App\Filament\Resources\TheorieKaarts\Pages;

use App\Filament\Resources\TheorieKaarts\TheorieKaartResource;
use Filament\Actions\DeleteAction;
use Filament\Resources\Pages\EditRecord;

class EditTheorieKaart extends EditRecord
{
    protected static string $resource = TheorieKaartResource::class;

    protected function getHeaderActions(): array
    {
        return [
            DeleteAction::make(),
        ];
    }
}
