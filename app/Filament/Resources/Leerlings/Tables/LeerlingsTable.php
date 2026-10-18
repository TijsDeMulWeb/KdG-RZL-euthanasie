<?php

namespace App\Filament\Resources\Leerlings\Tables;

use App\Models\Leerling;
use Filament\Actions\DeleteBulkAction;
use Filament\Actions\EditAction;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Table;

class LeerlingsTable
{
    public static function configure(Table $table): Table
    {
        $code = [1 => 'E', 2 => 'O', 3 => 'T'];

        return $table
            ->reorderable('volgorde')
            ->defaultSort('volgorde')
            ->columns([
                TextColumn::make('naam')->searchable()->weight('medium'),
                TextColumn::make('antwoorden')
                    ->label('Antwoorden (E eens, O oneens, T twijfel)')
                    ->state(fn (Leerling $record) => collect($record->antwoorden ?? [])
                        ->map(fn ($antwoord, $stelling) => ltrim($stelling, 's').':'.($code[$antwoord] ?? '?'))
                        ->join('  ')),
                TextColumn::make('gevoelig')
                    ->state(fn (Leerling $record) => $record->gevoelig ? 'gevoelig' : '')
                    ->badge()
                    ->color('warning'),
            ])
            ->recordActions([
                EditAction::make(),
            ])
            ->toolbarActions([
                DeleteBulkAction::make(),
            ]);
    }
}
