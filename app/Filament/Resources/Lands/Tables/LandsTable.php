<?php

namespace App\Filament\Resources\Lands\Tables;

use App\Models\Land;
use Filament\Actions\DeleteBulkAction;
use Filament\Actions\EditAction;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Table;

class LandsTable
{
    public static function configure(Table $table): Table
    {
        return $table
            ->defaultSort('jaar')
            ->paginated(false)
            ->description('Landen die niet in deze lijst staan, blijven donker op de kaart.')
            ->columns([
                TextColumn::make('naam')->searchable()->weight('medium'),
                TextColumn::make('status')
                    ->badge()
                    ->formatStateUsing(fn (string $state) => Land::statussen()[$state] ?? $state)
                    ->color(fn (string $state) => match ($state) {
                        'beide', 'euthanasie' => 'warning',
                        'hulp' => 'info',
                        default => 'gray',
                    }),
                TextColumn::make('jaar')->label('Sinds')->sortable(),
                TextColumn::make('bron')->limit(50)->color('gray'),
            ])
            ->recordActions([
                EditAction::make(),
            ])
            ->toolbarActions([
                DeleteBulkAction::make(),
            ]);
    }
}
