<?php

namespace App\Filament\Resources\Vraags\Tables;

use App\Filament\Resources\Vraags\Schemas\VraagForm;
use Filament\Actions\EditAction;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Filters\SelectFilter;
use Filament\Tables\Table;

class VraagsTable
{
    public static function configure(Table $table): Table
    {
        return $table
            ->columns([
                TextColumn::make('tekst')
                    ->label('Vraag')
                    ->searchable()
                    ->wrap()
                    ->weight('medium'),
                TextColumn::make('type')
                    ->badge()
                    ->formatStateUsing(fn (string $state) => str(VraagForm::types()[$state] ?? $state)->before(' (')),
                TextColumn::make('sleutel')
                    ->label('Korte naam')
                    ->color('gray'),
            ])
            ->filters([
                SelectFilter::make('type')->options(VraagForm::types()),
            ])
            ->recordActions([
                EditAction::make(),
            ]);
    }
}
