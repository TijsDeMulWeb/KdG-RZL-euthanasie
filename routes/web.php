<?php

use App\Http\Controllers\ActieveVraagController;
use App\Http\Controllers\AntwoordenController;
use App\Http\Controllers\BeamerController;
use App\Http\Controllers\BeamerStandController;
use App\Http\Controllers\DeelnemersController;
use App\Http\Controllers\OpdrachtenController;
use App\Http\Controllers\PresentatorController;
use App\Http\Controllers\PresentatorSessieController;
use App\Http\Middleware\EnsurePresentator;
use Illuminate\Support\Facades\Route;

Route::get('/', BeamerController::class)->name('beamer');

Route::get('doe-mee', [DeelnemersController::class, 'create'])->name('deelnemers.create');
Route::post('deelnemers', [DeelnemersController::class, 'store'])->name('deelnemers.store');
Route::get('actieve-vraag', [ActieveVraagController::class, 'show'])->name('actieveVraag.show');
Route::post('antwoorden', [AntwoordenController::class, 'store'])->name('antwoorden.store');

Route::get('presentator/inloggen', [PresentatorSessieController::class, 'store'])->name('presentatorSessie.store');

Route::middleware(EnsurePresentator::class)->prefix('presentator')->group(function () {
    Route::get('/', PresentatorController::class)->name('presentator');
    Route::put('actieve-vraag', [ActieveVraagController::class, 'update'])->name('actieveVraag.update');
    Route::get('deelnemers', [DeelnemersController::class, 'index'])->name('deelnemers.index');
    Route::delete('deelnemers', [DeelnemersController::class, 'destroy'])->name('deelnemers.destroy');
    Route::get('antwoorden', [AntwoordenController::class, 'index'])->name('antwoorden.index');
    Route::delete('antwoorden', [AntwoordenController::class, 'destroy'])->name('antwoorden.destroy');
    Route::get('beamer', [BeamerStandController::class, 'show'])->name('beamerStand.show');
    Route::put('beamer', [BeamerStandController::class, 'update'])->name('beamerStand.update');
    Route::get('opdrachten', [OpdrachtenController::class, 'index'])->name('opdrachten.index');
    Route::post('opdrachten', [OpdrachtenController::class, 'store'])->name('opdrachten.store');
});
