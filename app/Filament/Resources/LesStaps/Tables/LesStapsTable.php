<?php

namespace App\Filament\Resources\LesStaps\Tables;

use App\Models\LesStap;
use Filament\Actions\DeleteAction;
use Filament\Actions\EditAction;
use Filament\Actions\ReplicateAction;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Columns\ToggleColumn;
use Filament\Tables\Table;

class LesStapsTable
{
    public static function configure(Table $table): Table
    {
        return $table
            ->reorderable('volgorde')
            ->defaultSort('volgorde')
            ->paginated(false)
            ->description('Sleep de stappen in de juiste volgorde. Herlaad daarna de beamer.')
            ->columns([
                TextColumn::make('volgorde')
                    ->label('#')
                    ->state(fn (LesStap $record, $rowLoop) => $rowLoop->iteration),
                TextColumn::make('type')
                    ->label('Scène')
                    ->formatStateUsing(fn (string $state) => LesStap::types()[$state] ?? $state)
                    ->weight('medium'),
                TextColumn::make('beschrijving')
                    ->label('Inhoud')
                    ->state(fn (LesStap $record) => $record->beschrijving())
                    ->wrap()
                    ->color('gray'),
                ToggleColumn::make('actief'),
            ])
            ->recordActions([
                EditAction::make(),
                ReplicateAction::make()->label('Dupliceer'),
                DeleteAction::make(),
            ]);
    }
}
