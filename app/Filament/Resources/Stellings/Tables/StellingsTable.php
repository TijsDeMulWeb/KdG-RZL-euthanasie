<?php

namespace App\Filament\Resources\Stellings\Tables;

use Filament\Actions\EditAction;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Table;

class StellingsTable
{
    public static function configure(Table $table): Table
    {
        return $table
            ->defaultSort('code')
            ->columns([
                TextColumn::make('code')
                    ->label('Nr.')
                    ->formatStateUsing(fn (string $state) => ltrim($state, 's')),
                TextColumn::make('tekst')
                    ->wrap(),
            ])
            ->recordActions([
                EditAction::make(),
            ]);
    }
}
