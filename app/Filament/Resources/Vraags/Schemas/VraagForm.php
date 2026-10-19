<?php

namespace App\Filament\Resources\Vraags\Schemas;

use App\Models\Stelling;
use Filament\Forms\Components\CheckboxList;
use Filament\Forms\Components\Repeater;
use Filament\Forms\Components\Select;
use Filament\Forms\Components\Textarea;
use Filament\Forms\Components\TextInput;
use Filament\Schemas\Components\Grid;
use Filament\Schemas\Components\Section;
use Filament\Schemas\Components\Utilities\Get;
use Filament\Schemas\Schema;

class VraagForm
{
    /** @return array<string, string> */
    public static function types(): array
    {
        return [
            'open' => 'Open vraag (antwoorden worden sterren)',
            'keuze' => 'Waar of niet waar / meerkeuze',
            'getal' => 'Raad het getal',
            'schuif' => 'Schuifbalk',
            'herstemming' => 'Herstemming over de stellingen',
            'landen' => 'Landen aanduiden op een wereldkaart',
        ];
    }

    public static function configure(Schema $schema): Schema
    {
        $is = fn (string ...$types) => fn (Get $get) => in_array($get('type'), $types);

        return $schema
            ->columns(1)
            ->components([
                Section::make()
                    ->columns(2)
                    ->schema([
                        Select::make('type')
                            ->options(static::types())
                            ->required()
                            ->live(),
                        TextInput::make('sleutel')
                            ->label('Korte naam')
                            ->helperText('Zonder spaties. Gebruikt in het lesverloop.')
                            ->required()
                            ->alphaDash()
                            ->unique(ignoreRecord: true),
                        Textarea::make('tekst')
                            ->label('Vraag')
                            ->rows(2)
                            ->required()
                            ->columnSpanFull(),
                    ]),

                Section::make('Antwoordmogelijkheden')
                    ->visible($is('keuze'))
                    ->schema([
                        Repeater::make('opties')
                            ->simple(TextInput::make('optie')->required())
                            ->minItems(2)
                            ->default(['Waar', 'Niet waar'])
                            ->reorderable()
                            ->addActionLabel('Optie toevoegen'),
                        TextInput::make('juist')
                            ->label('Nummer van het juiste antwoord')
                            ->helperText('1 = eerste optie. Leeg laten als er geen juist antwoord is.')
                            ->numeric()
                            ->minValue(1)
                            // Opgeslagen als index vanaf 0, getoond vanaf 1.
                            ->formatStateUsing(fn ($state) => $state === null ? null : $state + 1)
                            ->dehydrateStateUsing(fn ($state) => blank($state) ? null : (int) $state - 1),
                    ]),

                Section::make('Getallen')
                    ->visible($is('getal', 'schuif'))
                    ->columns(4)
                    ->schema([
                        TextInput::make('min')->label('Minimum')->numeric()->required()->default(0),
                        TextInput::make('max')->label('Maximum')->numeric()->required(),
                        TextInput::make('antwoord')->label('Juist antwoord')->numeric()->visible($is('getal')),
                        TextInput::make('eenheid')->placeholder('bv. %, weken'),
                    ]),

                Section::make('Markeringen op de lijn')
                    ->description('Verschijnen bij het onthullen, bv. de wet in België en Nederland.')
                    ->visible($is('schuif'))
                    ->schema([
                        Repeater::make('markeringen')
                            ->hiddenLabel()
                            ->columns(2)
                            ->schema([
                                TextInput::make('waarde')->numeric()->required(),
                                TextInput::make('label')->required(),
                            ])
                            ->defaultItems(0)
                            ->addActionLabel('Markering toevoegen'),
                    ]),

                Section::make('Stellingen')
                    ->visible($is('herstemming'))
                    ->schema([
                        CheckboxList::make('stellingen')
                            ->hiddenLabel()
                            ->options(fn () => Stelling::query()->orderBy('code')->get()->mapWithKeys(fn (Stelling $stelling) => [
                                $stelling->code => ltrim($stelling->code, 's').'. '.str($stelling->tekst)->limit(90),
                            ]))
                            ->required(),
                    ]),

                Section::make('Uitleg na het onthullen')
                    ->visible($is('keuze', 'getal', 'schuif'))
                    ->schema([
                        Textarea::make('uitleg')
                            ->helperText('Verschijnt op de beamer bij het juiste antwoord.')
                            ->rows(2),
                        TextInput::make('bron')
                            ->helperText('Alleen zichtbaar voor de presentatoren.'),
                    ]),

                Grid::make(4)
                    ->visible($is('open'))
                    ->schema([
                        Textarea::make('uitleg')
                            ->label('Hulpzin onder de vraag')
                            ->helperText('Optioneel. Staat klein onder de vraag, op de beamer en op de gsm. Bv. een voorbeeld van een antwoord.')
                            ->rows(2)
                            ->columnSpan(3),
                        TextInput::make('max_lengte')
                            ->label('Maximum aantal tekens')
                            ->numeric()
                            ->default(80),
                    ]),
            ]);
    }
}
