<?php

namespace App\Filament\Resources\Vraags\Pages;

use App\Filament\Resources\Vraags\VraagResource;
use Filament\Actions\DeleteAction;
use Filament\Resources\Pages\EditRecord;

class EditVraag extends EditRecord
{
    protected static string $resource = VraagResource::class;

    protected function getHeaderActions(): array
    {
        return [
            DeleteAction::make(),
        ];
    }
}
