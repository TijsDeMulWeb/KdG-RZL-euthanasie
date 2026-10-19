<?php

namespace App\Filament\Resources\Publieksvraags;

use App\Filament\Resources\Publieksvraags\Pages\CreatePublieksvraag;
use App\Filament\Resources\Publieksvraags\Pages\EditPublieksvraag;
use App\Filament\Resources\Publieksvraags\Pages\ListPublieksvraags;
use App\Filament\Resources\Publieksvraags\Schemas\PublieksvraagForm;
use App\Filament\Resources\Publieksvraags\Tables\PublieksvraagsTable;
use App\Models\Publieksvraag;
use BackedEnum;
use Filament\Resources\Resource;
use Filament\Schemas\Schema;
use Filament\Support\Icons\Heroicon;
use Filament\Tables\Table;
use UnitEnum;

class PublieksvraagResource extends Resource
{
    protected static ?string $model = Publieksvraag::class;

    protected static string|BackedEnum|null $navigationIcon = Heroicon::OutlinedQuestionMarkCircle;

    protected static ?string $slug = 'publieksvragen';

    protected static ?string $modelLabel = 'publieksvraag';

    protected static ?string $pluralModelLabel = 'Publieksvragen';

    protected static string|UnitEnum|null $navigationGroup = 'Les';

    protected static ?int $navigationSort = 4;

    public static function form(Schema $schema): Schema
    {
        return PublieksvraagForm::configure($schema);
    }

    public static function table(Table $table): Table
    {
        return PublieksvraagsTable::configure($table);
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
            'index' => ListPublieksvraags::route('/'),
            'create' => CreatePublieksvraag::route('/create'),
            'edit' => EditPublieksvraag::route('/{record}/edit'),
        ];
    }
}
