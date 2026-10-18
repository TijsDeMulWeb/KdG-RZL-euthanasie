<?php

namespace App\Filament\Resources\Stellings\Schemas;

use Filament\Forms\Components\Textarea;
use Filament\Forms\Components\TextInput;
use Filament\Schemas\Schema;

class StellingForm
{
    public static function configure(Schema $schema): Schema
    {
        return $schema
            ->columns(1)
            ->components([
                TextInput::make('code')
                    ->disabled()
                    ->dehydrated(false),
                Textarea::make('tekst')
                    ->rows(4)
                    ->required(),
            ]);
    }
}
