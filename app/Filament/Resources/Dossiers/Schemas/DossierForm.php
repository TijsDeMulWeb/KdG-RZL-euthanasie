<?php

namespace App\Filament\Resources\Dossiers\Schemas;

use App\Filament\Support\Keuzes;
use Filament\Forms\Components\Repeater;
use Filament\Forms\Components\Select;
use Filament\Forms\Components\Textarea;
use Filament\Forms\Components\TextInput;
use Filament\Forms\Components\Toggle;
use Filament\Schemas\Components\Section;
use Filament\Schemas\Schema;

class DossierForm
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
                            ->helperText('Staat bij de ster in het overzicht. Geen naam: die volgt pas bij de onthulling.')
                            ->required(),
                        TextInput::make('sleutel')
                            ->label('Korte naam')
                            ->required()
                            ->alphaDash()
                            ->unique(ignoreRecord: true),
                        Select::make('stelling')
                            ->helperText('Over deze stelling stemt de klas, en daarvan komen de sterrenbeelden.')
                            ->options(fn () => Keuzes::stellingen())
                            ->required()
                            ->columnSpanFull(),
                    ]),
                Repeater::make('kaart')
                    ->label('Kaart (zonder naam)')
                    ->helperText('Eén regel per zin, zoals op de beamer.')
                    ->simple(TextInput::make('regel')->required())
                    ->minItems(1)
                    ->reorderable()
                    ->addActionLabel('Regel toevoegen'),
                Textarea::make('onthulling')
                    ->label('Onthulling: naam en afloop')
                    ->rows(2)
                    ->required(),
                Section::make('Duel')
                    ->description('Twee klasgenoten met hun citaat links en rechts.')
                    ->columns(2)
                    ->schema([
                        Select::make('duel.0')->label('Links')->options(fn () => Keuzes::leerlingen())->required(),
                        Select::make('duel.1')->label('Rechts')->options(fn () => Keuzes::leerlingen())->required(),
                    ]),
                Toggle::make('tegenspraak')
                    ->label('Tegenspraak met voltooid leven tonen')
                    ->helperText('Extra stap: wie bij voltooid leven "eens" zei maar hier "oneens", flikkert.'),
            ]);
    }
}
