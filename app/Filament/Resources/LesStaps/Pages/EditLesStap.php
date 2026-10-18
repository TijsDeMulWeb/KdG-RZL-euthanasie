<?php

namespace App\Filament\Resources\LesStaps\Pages;

use App\Filament\Resources\LesStaps\LesStapResource;
use Filament\Actions\DeleteAction;
use Filament\Resources\Pages\EditRecord;

class EditLesStap extends EditRecord
{
    protected static string $resource = LesStapResource::class;

    protected function getHeaderActions(): array
    {
        return [
            DeleteAction::make(),
        ];
    }
}
