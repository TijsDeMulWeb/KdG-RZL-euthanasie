<?php

namespace App\Filament\Resources\Vraags;

use App\Filament\Resources\Vraags\Pages\CreateVraag;
use App\Filament\Resources\Vraags\Pages\EditVraag;
use App\Filament\Resources\Vraags\Pages\ListVraags;
use App\Filament\Resources\Vraags\Schemas\VraagForm;
use App\Filament\Resources\Vraags\Tables\VraagsTable;
use App\Models\Vraag;
use BackedEnum;
use UnitEnum;
use Filament\Resources\Resource;
use Filament\Schemas\Schema;
use Filament\Support\Icons\Heroicon;
use Filament\Tables\Table;

class VraagResource extends Resource
{
    protected static ?string $model = Vraag::class;

    protected static string|BackedEnum|null $navigationIcon = Heroicon::OutlinedDevicePhoneMobile;

    protected static ?string $slug = 'vragen';

    protected static ?string $modelLabel = 'vraag';

    protected static ?string $pluralModelLabel = 'Gsm-vragen';

    protected static string|UnitEnum|null $navigationGroup = 'Les';

    protected static ?int $navigationSort = 3;

    public static function form(Schema $schema): Schema
    {
        return VraagForm::configure($schema);
    }

    public static function table(Table $table): Table
    {
        return VraagsTable::configure($table);
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
            'index' => ListVraags::route('/'),
            'create' => CreateVraag::route('/create'),
            'edit' => EditVraag::route('/{record}/edit'),
        ];
    }
}
