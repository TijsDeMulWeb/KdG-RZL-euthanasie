<?php

namespace App\Filament\Resources\Lands;

use App\Filament\Resources\Lands\Pages\CreateLand;
use App\Filament\Resources\Lands\Pages\EditLand;
use App\Filament\Resources\Lands\Pages\ListLands;
use App\Filament\Resources\Lands\Schemas\LandForm;
use App\Filament\Resources\Lands\Tables\LandsTable;
use App\Models\Land;
use BackedEnum;
use Filament\Resources\Resource;
use Filament\Schemas\Schema;
use Filament\Support\Icons\Heroicon;
use Filament\Tables\Table;
use UnitEnum;

class LandResource extends Resource
{
    protected static ?string $model = Land::class;

    protected static string|BackedEnum|null $navigationIcon = Heroicon::OutlinedGlobeEuropeAfrica;

    protected static ?string $slug = 'wereldkaart';

    protected static ?string $modelLabel = 'land';

    protected static ?string $pluralModelLabel = 'Wereldkaart';

    protected static string|UnitEnum|null $navigationGroup = 'Les';

    protected static ?int $navigationSort = 5;

    public static function form(Schema $schema): Schema
    {
        return LandForm::configure($schema);
    }

    public static function table(Table $table): Table
    {
        return LandsTable::configure($table);
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
            'index' => ListLands::route('/'),
            'create' => CreateLand::route('/create'),
            'edit' => EditLand::route('/{record}/edit'),
        ];
    }
}
