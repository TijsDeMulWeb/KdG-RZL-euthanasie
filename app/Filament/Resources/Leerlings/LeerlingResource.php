<?php

namespace App\Filament\Resources\Leerlings;

use App\Filament\Resources\Leerlings\Pages\CreateLeerling;
use App\Filament\Resources\Leerlings\Pages\EditLeerling;
use App\Filament\Resources\Leerlings\Pages\ListLeerlings;
use App\Filament\Resources\Leerlings\Schemas\LeerlingForm;
use App\Filament\Resources\Leerlings\Tables\LeerlingsTable;
use App\Models\Leerling;
use BackedEnum;
use UnitEnum;
use Filament\Resources\Resource;
use Filament\Schemas\Schema;
use Filament\Support\Icons\Heroicon;
use Filament\Tables\Table;

class LeerlingResource extends Resource
{
    protected static ?string $model = Leerling::class;

    protected static string|BackedEnum|null $navigationIcon = Heroicon::OutlinedUserGroup;

    protected static ?string $slug = 'klas';

    protected static ?string $modelLabel = 'leerling';

    protected static ?string $pluralModelLabel = 'Klas';

    protected static string|UnitEnum|null $navigationGroup = 'Klas';

    protected static ?int $navigationSort = 2;

    public static function form(Schema $schema): Schema
    {
        return LeerlingForm::configure($schema);
    }

    public static function table(Table $table): Table
    {
        return LeerlingsTable::configure($table);
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
            'index' => ListLeerlings::route('/'),
            'create' => CreateLeerling::route('/create'),
            'edit' => EditLeerling::route('/{record}/edit'),
        ];
    }
}
