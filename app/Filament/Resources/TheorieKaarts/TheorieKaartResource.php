<?php

namespace App\Filament\Resources\TheorieKaarts;

use App\Filament\Resources\TheorieKaarts\Pages\CreateTheorieKaart;
use App\Filament\Resources\TheorieKaarts\Pages\EditTheorieKaart;
use App\Filament\Resources\TheorieKaarts\Pages\ListTheorieKaarts;
use App\Filament\Resources\TheorieKaarts\Schemas\TheorieKaartForm;
use App\Filament\Resources\TheorieKaarts\Tables\TheorieKaartsTable;
use App\Models\TheorieKaart;
use BackedEnum;
use UnitEnum;
use Filament\Resources\Resource;
use Filament\Schemas\Schema;
use Filament\Support\Icons\Heroicon;
use Filament\Tables\Table;

class TheorieKaartResource extends Resource
{
    protected static ?string $model = TheorieKaart::class;

    protected static string|BackedEnum|null $navigationIcon = Heroicon::OutlinedPresentationChartLine;

    protected static ?string $slug = 'theoriekaarten';

    protected static ?string $modelLabel = 'theoriekaart';

    protected static ?string $pluralModelLabel = 'Theoriekaarten';

    protected static string|UnitEnum|null $navigationGroup = 'Les';

    protected static ?int $navigationSort = 2;

    public static function form(Schema $schema): Schema
    {
        return TheorieKaartForm::configure($schema);
    }

    public static function table(Table $table): Table
    {
        return TheorieKaartsTable::configure($table);
    }

    public static function getRelations(): array
    {
        return [
            //
        ];
    }

    public static function getPages(): array
    {
        return [
            'index' => ListTheorieKaarts::route('/'),
            'create' => CreateTheorieKaart::route('/create'),
            'edit' => EditTheorieKaart::route('/{record}/edit'),
        ];
    }
}
