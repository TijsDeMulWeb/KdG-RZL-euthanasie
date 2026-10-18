<?php

namespace App\Filament\Resources\Stellings;

use App\Filament\Resources\Stellings\Pages\EditStelling;
use App\Filament\Resources\Stellings\Pages\ListStellings;
use App\Filament\Resources\Stellings\Schemas\StellingForm;
use App\Filament\Resources\Stellings\Tables\StellingsTable;
use App\Models\Stelling;
use BackedEnum;
use UnitEnum;
use Filament\Resources\Resource;
use Filament\Schemas\Schema;
use Filament\Support\Icons\Heroicon;
use Filament\Tables\Table;

class StellingResource extends Resource
{
    protected static ?string $model = Stelling::class;

    protected static string|BackedEnum|null $navigationIcon = Heroicon::OutlinedChatBubbleBottomCenterText;

    protected static ?string $slug = 'stellingen';

    protected static ?string $modelLabel = 'stelling';

    protected static ?string $pluralModelLabel = 'Stellingen';

    protected static string|UnitEnum|null $navigationGroup = 'Klas';

    protected static ?int $navigationSort = 3;

    public static function form(Schema $schema): Schema
    {
        return StellingForm::configure($schema);
    }

    public static function table(Table $table): Table
    {
        return StellingsTable::configure($table);
    }

    /** De zes stellingen horen bij de vragenlijst; alleen hun tekst is aanpasbaar. */
    public static function canCreate(): bool
    {
        return false;
    }

    public static function canDelete($record): bool
    {
        return false;
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
            'index' => ListStellings::route('/'),
            'edit' => EditStelling::route('/{record}/edit'),
        ];
    }
}
