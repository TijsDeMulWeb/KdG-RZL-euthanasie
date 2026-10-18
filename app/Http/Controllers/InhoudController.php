<?php

namespace App\Http\Controllers;

use App\Models\Dossier;
use App\Models\LesStap;
use App\Models\Leerling;
use App\Models\Stelling;
use App\Models\TheorieKaart;
use App\Models\Vraag;
use Illuminate\Http\JsonResponse;

class InhoudController extends Controller
{
    public function __invoke(): JsonResponse
    {
        return response()->json([
            'stellingen' => Stelling::query()->orderBy('code')->pluck('tekst', 'code'),
            'klas' => Leerling::query()->orderBy('volgorde')->get()->map(fn (Leerling $leerling) => array_filter([
                'naam' => $leerling->naam,
                'antwoorden' => $leerling->antwoorden,
                'citaten' => $leerling->citaten ?? [],
                'tegenstrijdig' => $leerling->tegenstrijdig ?: null,
                'gevoelig' => $leerling->gevoelig ?: null,
                'opgelet' => $leerling->opgelet,
            ], fn ($waarde) => $waarde !== null)),
            'dossiers' => Dossier::query()->orderBy('volgorde')->get()->map(fn (Dossier $dossier) => [
                'id' => $dossier->sleutel,
                'stelling' => $dossier->stelling,
                'titel' => $dossier->titel,
                'kaart' => $dossier->kaart,
                'onthulling' => $dossier->onthulling,
                'duel' => $dossier->duel,
                'tegenspraak' => $dossier->tegenspraak,
            ]),
            'vragen' => Vraag::query()->get()->map(fn (Vraag $vraag) => $vraag->naarFrontend()),
            'kaarten' => TheorieKaart::query()->get()->map(fn (TheorieKaart $kaart) => [
                'id' => $kaart->sleutel,
                'titel' => $kaart->titel,
                'punten' => $kaart->punten,
                'bron' => $kaart->bron ?? '',
                'aanvullen' => $kaart->aanvullen ?? [],
            ]),
            'les' => LesStap::query()->where('actief', true)->orderBy('volgorde')->get(['type', 'instellingen']),
        ]);
    }
}
