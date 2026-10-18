<?php

namespace App\Filament\Resources\Leerlings\Pages;

use App\Filament\Resources\Leerlings\LeerlingResource;
use Filament\Actions\DeleteAction;
use Filament\Resources\Pages\EditRecord;

class EditLeerling extends EditRecord
{
    protected static string $resource = LeerlingResource::class;

    protected function getHeaderActions(): array
    {
        return [
            DeleteAction::make(),
        ];
    }
}
