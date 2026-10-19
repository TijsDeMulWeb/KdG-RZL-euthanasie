<?php

namespace App\Filament\Resources\Lands\Schemas;

use App\Models\Land;
use Filament\Forms\Components\Repeater;
use Filament\Forms\Components\Select;
use Filament\Forms\Components\TextInput;
use Filament\Forms\Components\Toggle;
use Filament\Schemas\Components\Section;
use Filament\Schemas\Schema;

class LandForm
{
    public static function configure(Schema $schema): Schema
    {
        return $schema
            ->columns(1)
            ->components([
                Section::make()
                    ->columns(3)
                    ->schema([
                        TextInput::make('naam')
                            ->required(),
                        TextInput::make('iso')
                            ->label('Landcode (ISO, 3 cijfers)')
                            ->helperText('Bv. 056 voor België. Zo vindt de kaart het land.')
                            ->required()
                            ->length(3)
                            ->unique(ignoreRecord: true),
                        TextInput::make('jaar')
                            ->label('Legaal sinds')
                            ->numeric()
                            ->minValue(1900)
                            ->maxValue(2100),
                        Select::make('status')
                            ->options(Land::statussen())
                            ->required()
                            ->columnSpan(2),
                        Toggle::make('gedeeltelijk')
                            ->label('Maar een deel van het land')
                            ->helperText('Bv. enkele staten in de VS.')
                            ->inline(false),
                    ]),
                Repeater::make('voorwaarden')
                    ->helperText('Korte regels. Verschijnen op de beamer als je het land aantikt.')
                    ->simple(TextInput::make('regel')->required())
                    ->reorderable()
                    ->defaultItems(1)
                    ->addActionLabel('Regel toevoegen'),
                TextInput::make('bron')
                    ->helperText('Staat klein onder de voorwaarden op de beamer.'),
            ]);
    }
}
