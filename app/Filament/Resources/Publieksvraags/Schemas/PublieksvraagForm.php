<?php

namespace App\Filament\Resources\Publieksvraags\Schemas;

use App\Models\Publieksvraag;
use Filament\Forms\Components\Textarea;
use Filament\Forms\Components\TextInput;
use Filament\Forms\Components\Toggle;
use Filament\Schemas\Schema;

class PublieksvraagForm
{
    public static function configure(Schema $schema): Schema
    {
        return $schema
            ->columns(2)
            ->components([
                Textarea::make('vraag')
                    ->helperText('Zoals de medestudent ze stelde. Mag je inkorten, zolang de betekenis blijft.')
                    ->rows(3)
                    ->required()
                    ->columnSpanFull(),
                TextInput::make('van')
                    ->label('Gesteld door'),
                TextInput::make('invalshoek')
                    ->helperText('Bv. Wet, Ethiek, Zorg, Religie. Helpt om vragen te ordenen.')
                    ->datalist(fn () => Publieksvraag::query()->whereNotNull('invalshoek')->distinct()->pluck('invalshoek')->all()),
                Toggle::make('naam_tonen')
                    ->label('Naam tonen op de beamer')
                    ->default(true),
            ]);
    }
}
