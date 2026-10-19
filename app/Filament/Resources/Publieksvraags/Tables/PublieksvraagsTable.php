<?php

namespace App\Filament\Resources\Publieksvraags\Tables;

use App\Models\Publieksvraag;
use Filament\Actions\DeleteBulkAction;
use Filament\Actions\EditAction;
use Filament\Tables\Columns\IconColumn;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Filters\SelectFilter;
use Filament\Tables\Table;

class PublieksvraagsTable
{
    public static function configure(Table $table): Table
    {
        return $table
            ->reorderable('volgorde')
            ->defaultSort('volgorde')
            ->paginated(false)
            ->description('Sleep ze in de volgorde waarin jullie ze willen bespreken.')
            ->columns([
                TextColumn::make('vraag')
                    ->searchable()
                    ->wrap()
                    ->weight('medium'),
                TextColumn::make('van')
                    ->label('Gesteld door'),
                IconColumn::make('naam_tonen')
                    ->label('Naam zichtbaar')
                    ->boolean(),
                TextColumn::make('invalshoek')
                    ->badge(),
            ])
            ->filters([
                SelectFilter::make('invalshoek')
                    ->options(fn () => Publieksvraag::query()->whereNotNull('invalshoek')->distinct()->pluck('invalshoek', 'invalshoek')->all()),
            ])
            ->recordActions([
                EditAction::make(),
            ])
            ->toolbarActions([
                DeleteBulkAction::make(),
            ]);
    }
}
