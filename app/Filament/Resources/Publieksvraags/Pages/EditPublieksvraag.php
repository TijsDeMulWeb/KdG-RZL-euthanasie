<?php

namespace App\Filament\Resources\Publieksvraags\Pages;

use App\Filament\Resources\Publieksvraags\PublieksvraagResource;
use Filament\Actions\DeleteAction;
use Filament\Resources\Pages\EditRecord;

class EditPublieksvraag extends EditRecord
{
    protected static string $resource = PublieksvraagResource::class;

    protected function getHeaderActions(): array
    {
        return [
            DeleteAction::make(),
        ];
    }
}
