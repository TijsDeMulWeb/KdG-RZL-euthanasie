<?php

namespace App\Filament\Resources\LesStaps;

use App\Filament\Resources\LesStaps\Pages\CreateLesStap;
use App\Filament\Resources\LesStaps\Pages\EditLesStap;
use App\Filament\Resources\LesStaps\Pages\ListLesStaps;
use App\Filament\Resources\LesStaps\Schemas\LesStapForm;
use App\Filament\Resources\LesStaps\Tables\LesStapsTable;
use App\Models\LesStap;
use BackedEnum;
use UnitEnum;
use Filament\Resources\Resource;
use Filament\Schemas\Schema;
use Filament\Support\Icons\Heroicon;
use Filament\Tables\Table;

class LesStapResource extends Resource
{
    protected static ?string $model = LesStap::class;

    protected static string|BackedEnum|null $navigationIcon = Heroicon::OutlinedQueueList;

    protected static ?string $slug = 'lesverloop';

    protected static ?string $modelLabel = 'stap';

    protected static ?string $pluralModelLabel = 'Lesverloop';

    protected static string|UnitEnum|null $navigationGroup = 'Les';

    protected static ?int $navigationSort = 1;

    public static function form(Schema $schema): Schema
    {
        return LesStapForm::configure($schema);
    }

    public static function table(Table $table): Table
    {
        return LesStapsTable::configure($table);
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
            'index' => ListLesStaps::route('/'),
            'create' => CreateLesStap::route('/create'),
            'edit' => EditLesStap::route('/{record}/edit'),
        ];
    }
}
