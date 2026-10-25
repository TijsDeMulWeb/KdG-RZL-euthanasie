<?php

namespace App\Filament\Resources\Leerlings\Schemas;

use App\Filament\Support\Keuzes;
use App\Models\Stelling;
use Filament\Forms\Components\CheckboxList;
use Filament\Forms\Components\Select;
use Filament\Forms\Components\Textarea;
use Filament\Forms\Components\TextInput;
use Filament\Schemas\Components\Section;
use Filament\Schemas\Schema;

class LeerlingForm
{
    public static function configure(Schema $schema): Schema
    {
        $stellingen = Stelling::query()->orderBy('code')->get();

        return $schema
            ->columns(1)
            ->components([
                TextInput::make('naam')
                    ->helperText('Moet uniek zijn en overeenkomen met de voornaam die ze op hun gsm typen, anders telt de herstemming niet mee.')
                    ->required()
                    ->unique(ignoreRecord: true),
                Section::make('Antwoorden en citaten uit de vragenlijst')
                    ->schema($stellingen->flatMap(fn (Stelling $stelling) => [
                        Select::make("antwoorden.{$stelling->code}")
                            ->label('Stelling '.ltrim($stelling->code, 's'))
                            ->helperText(str($stelling->tekst)->limit(110))
                            ->options(Keuzes::antwoordcodes())
                            ->required(),
                        Textarea::make("citaten.{$stelling->code}")
                            ->hiddenLabel()
                            ->placeholder('Citaat (mag leeg)')
                            ->rows(2),
                    ])->all()),
                CheckboxList::make('gevoelig')
                    ->label('Gevoelig: citaat pas na extra klik')
                    ->helperText('Schreef vanuit persoonlijke ervaring. De presentator vraagt eerst toestemming.')
                    ->options(fn () => Keuzes::stellingen())
                    ->columns(2),
                Section::make('Tegenstrijdig antwoord')
                    ->description('Als het cijfer niet strookt met wat er geschreven werd: kies wat bedoeld was. Dat telt dan overal.')
                    ->collapsed()
                    ->columns(2)
                    ->schema($stellingen->flatMap(fn (Stelling $stelling) => [
                        Select::make("tegenstrijdig.{$stelling->code}.bedoeld")
                            ->label('Stelling '.ltrim($stelling->code, 's').': bedoeld')
                            ->options(Keuzes::antwoordcodes())
                            ->placeholder('Niet tegenstrijdig'),
                        TextInput::make("tegenstrijdig.{$stelling->code}.uitleg")
                            ->label('Waarom'),
                    ])->all()),
                Textarea::make('opgelet')
                    ->label('Opgelet (alleen voor presentatoren)')
                    ->rows(2),
            ]);
    }
}
