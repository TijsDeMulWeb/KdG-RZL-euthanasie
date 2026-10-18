<?php

namespace App\Filament\Resources\TheorieKaarts\Schemas;

use Filament\Forms\Components\Repeater;
use Filament\Forms\Components\Textarea;
use Filament\Forms\Components\TextInput;
use Filament\Schemas\Components\Section;
use Filament\Schemas\Schema;

class TheorieKaartForm
{
    public static function configure(Schema $schema): Schema
    {
        return $schema
            ->columns(1)
            ->components([
                Section::make()
                    ->columns(2)
                    ->schema([
                        TextInput::make('titel')
                            ->required()
                            ->maxLength(120),
                        TextInput::make('sleutel')
                            ->label('Korte naam')
                            ->helperText('Zonder spaties, bv. "wet". Gebruikt in het lesverloop.')
                            ->required()
                            ->alphaDash()
                            ->unique(ignoreRecord: true),
                    ]),
                Repeater::make('punten')
                    ->helperText('Elk punt verschijnt na een klik. Houd ze kort: ze moeten achteraan in de klas leesbaar zijn.')
                    ->simple(Textarea::make('punt')->rows(2)->required())
                    ->minItems(1)
                    ->reorderable()
                    ->addActionLabel('Punt toevoegen'),
                TextInput::make('bron')
                    ->helperText('Alleen zichtbaar voor de presentatoren.'),
                Repeater::make('aanvullen')
                    ->label('Nog aanvullen')
                    ->helperText('Alleen zichtbaar voor de presentatoren, als herinnering.')
                    ->simple(TextInput::make('notitie'))
                    ->defaultItems(0)
                    ->addActionLabel('Notitie toevoegen'),
            ]);
    }
}
