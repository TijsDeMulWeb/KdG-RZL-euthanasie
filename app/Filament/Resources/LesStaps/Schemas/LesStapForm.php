<?php

namespace App\Filament\Resources\LesStaps\Schemas;

use App\Filament\Support\Keuzes;
use App\Models\LesStap;
use Filament\Forms\Components\Repeater;
use Filament\Forms\Components\Select;
use Filament\Forms\Components\Textarea;
use Filament\Forms\Components\TextInput;
use Filament\Forms\Components\Toggle;
use Filament\Schemas\Components\Section;
use Filament\Schemas\Components\Utilities\Get;
use Filament\Schemas\Schema;

class LesStapForm
{
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
                            ->label('Soort scène')
                            ->options(LesStap::types())
                            ->required()
                            ->live(),
                        Toggle::make('actief')
                            ->helperText('Uitgezet = deze stap wordt overgeslagen in de les.')
                            ->default(true)
                            ->inline(false),
                    ]),

                Section::make('Instellingen')
                    ->visible(fn (Get $get) => in_array($get('type'), ['titel', 'openVraag', 'getallenlijn', 'theorie', 'quiz', 'commissie', 'pauze', 'mensen', 'sterrenbeeld', 'publieksvragen', 'wereldkaart']))
                    ->schema([
                        TextInput::make('instellingen.titel')
                            ->label('Titel')
                            ->visible($is('titel'))
                            ->required($is('titel')),

                        TextInput::make('instellingen.ondertitel')
                            ->label('Ondertitel')
                            ->helperText('Bijvoorbeeld de namen van de groepsleden.')
                            ->visible($is('titel')),

                        Select::make('instellingen.vraag')
                            ->label('Vraag')
                            ->options(fn () => Keuzes::vragen(['open']))
                            ->visible($is('openVraag'))
                            ->required($is('openVraag')),

                        Select::make('instellingen.vraag')
                            ->label('Vraag')
                            ->options(fn () => Keuzes::vragen(['getal', 'schuif']))
                            ->visible($is('getallenlijn'))
                            ->required($is('getallenlijn')),

                        Select::make('instellingen.vraag')
                            ->label('Eerst laten raden met deze vraag (optioneel)')
                            ->options(fn () => Keuzes::vragen(['landen']))
                            ->visible($is('wereldkaart')),

                        Select::make('instellingen.kaart')
                            ->label('Theoriekaart')
                            ->options(fn () => Keuzes::kaarten())
                            ->visible($is('theorie'))
                            ->required($is('theorie')),

                        TextInput::make('instellingen.naam')
                            ->label('Naam van de quiz')
                            ->visible($is('quiz')),
                        Select::make('instellingen.vragen')
                            ->label('Vragen, in deze volgorde')
                            ->multiple()
                            ->options(fn () => Keuzes::vragen(['keuze']))
                            ->visible($is('quiz'))
                            ->required($is('quiz')),

                        Select::make('instellingen.dossiers')
                            ->label('Dossiers in dit deel')
                            ->helperText('Splits de commissie gerust over twee stappen, bv. rond de pauze.')
                            ->multiple()
                            ->options(fn () => Keuzes::dossiers())
                            ->visible($is('commissie'))
                            ->required($is('commissie')),

                        Select::make('instellingen.vragen')
                            ->label('Publieksvragen, in deze volgorde')
                            ->helperText('Leeg laten = alle publieksvragen, in de volgorde van het overzicht.')
                            ->multiple()
                            ->options(fn () => Keuzes::publieksvragen())
                            ->visible($is('publieksvragen')),

                        TextInput::make('instellingen.minuten')
                            ->label('Minuten')
                            ->numeric()
                            ->default(10)
                            ->visible($is('pauze')),

                        TextInput::make('instellingen.aantal')
                            ->label('Aantal sterren (max 4.600)')
                            ->numeric()
                            ->maxValue(4600)
                            ->visible($is('mensen')),
                        Textarea::make('instellingen.tekst')
                            ->label('Zin onderaan')
                            ->rows(2)
                            ->visible($is('mensen')),
                        TextInput::make('instellingen.bron')
                            ->label('Bron (alleen voor presentatoren)')
                            ->visible($is('mensen')),
                        Repeater::make('instellingen.uitlichtingen')
                            ->label('Uitlichten, één per klik')
                            ->helperText('Na de sterren licht elke klik dit deel van de sterren groter en goud op, met de tekst eronder. Bv. 73,7 en "was ouder dan 70".')
                            ->columns(3)
                            ->schema([
                                Select::make('vraag')
                                    ->label('Eerst laten raden (optioneel)')
                                    ->helperText('De klas gokt op de gsm terwijl de sterren blijven staan. Daarna lichten de sterren op als antwoord.')
                                    ->options(fn () => Keuzes::vragen(['getal']))
                                    ->columnSpanFull(),
                                TextInput::make('procent')
                                    ->numeric()
                                    ->minValue(0.1)
                                    ->maxValue(100)
                                    ->step(0.1)
                                    ->suffix('%')
                                    ->required(),
                                TextInput::make('tekst')
                                    ->required()
                                    ->columnSpan(2),
                            ])
                            ->reorderable()
                            ->defaultItems(0)
                            ->addActionLabel('Uitlichting toevoegen')
                            ->visible($is('mensen')),

                        Select::make('instellingen.stelling')
                            ->label('Stelling')
                            ->options(fn () => Keuzes::stellingen())
                            ->visible($is('sterrenbeeld'))
                            ->required($is('sterrenbeeld')),
                        Select::make('instellingen.links')
                            ->label('Duel: links')
                            ->options(fn () => Keuzes::leerlingen())
                            ->visible($is('sterrenbeeld'))
                            ->required($is('sterrenbeeld')),
                        Select::make('instellingen.rechts')
                            ->label('Duel: rechts')
                            ->multiple()
                            ->options(fn () => Keuzes::leerlingen())
                            ->visible($is('sterrenbeeld'))
                            ->required($is('sterrenbeeld')),
                    ]),
            ]);
    }
}
