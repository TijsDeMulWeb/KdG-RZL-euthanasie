<?php

namespace App\Filament\Resources\Dossiers\Tables;

use App\Models\Dossier;
use Filament\Actions\EditAction;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Table;

class DossiersTable
{
    public static function configure(Table $table): Table
    {
        return $table
            ->reorderable('volgorde')
            ->defaultSort('volgorde')
            ->columns([
                TextColumn::make('titel')->weight('medium'),
                TextColumn::make('stelling')->formatStateUsing(fn (string $state) => 'Stelling '.ltrim($state, 's')),
                TextColumn::make('duel')
                    ->state(fn (Dossier $record) => implode(' tegen ', $record->duel ?? [])),
                TextColumn::make('sleutel')->label('Korte naam')->color('gray'),
            ])
            ->recordActions([
                EditAction::make(),
            ]);
    }
}
