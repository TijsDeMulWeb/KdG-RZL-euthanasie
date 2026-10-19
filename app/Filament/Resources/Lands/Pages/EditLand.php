<?php

namespace App\Filament\Resources\Lands\Pages;

use App\Filament\Resources\Lands\LandResource;
use Filament\Actions\DeleteAction;
use Filament\Resources\Pages\EditRecord;

class EditLand extends EditRecord
{
    protected static string $resource = LandResource::class;

    protected function getHeaderActions(): array
    {
        return [
            DeleteAction::make(),
        ];
    }
}
