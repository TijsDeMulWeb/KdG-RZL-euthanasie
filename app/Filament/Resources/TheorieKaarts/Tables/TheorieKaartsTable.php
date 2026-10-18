<?php

namespace App\Filament\Resources\TheorieKaarts\Tables;

use App\Models\TheorieKaart;
use Filament\Actions\EditAction;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Table;

class TheorieKaartsTable
{
    public static function configure(Table $table): Table
    {
        return $table
            ->columns([
                TextColumn::make('titel')
                    ->searchable()
                    ->weight('medium'),
                TextColumn::make('punten')
                    ->label('Punten')
                    ->state(fn (TheorieKaart $record) => count($record->punten ?? [])),
                TextColumn::make('aanvullen')
                    ->label('Nog aanvullen')
                    ->state(fn (TheorieKaart $record) => count($record->aanvullen ?? []) ?: '')
                    ->badge()
                    ->color('warning'),
                TextColumn::make('sleutel')
                    ->label('Korte naam')
                    ->color('gray'),
            ])
            ->recordActions([
                EditAction::make(),
            ]);
    }
}
