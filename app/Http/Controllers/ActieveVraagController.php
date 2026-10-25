<?php

namespace App\Http\Controllers;

use App\Models\Antwoord;
use App\Support\Vragen;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class ActieveVraagController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        $id = Cache::get('actieve-vraag');
        $vraag = $id ? Vragen::vind($id) : null;

        $eigenAntwoord = $vraag
            ? Antwoord::query()
                ->where('deelnemer_id', $request->session()->get('deelnemer_id'))
                ->where('vraag', $vraag['id'])
                ->value('waarde')
            : null;

        return response()->json([
            'vraag' => $vraag ? $this->voorGsm($vraag) : null,
            'pauze' => Cache::get('pauze-tot'),
            'einde' => Cache::get('einde', false),
            'lichtje' => Cache::get('lichtje', false),
            'antwoord' => $eigenAntwoord,
        ]);
    }

    public function update(Request $request): JsonResponse
    {
        $gegevens = $request->validate([
            'vraag' => ['nullable', 'string'],
            'pauzeTot' => ['nullable', 'integer'],
            'einde' => ['boolean'],
            'lichtje' => ['boolean'],
        ]);

        $vraag = isset($gegevens['vraag']) ? Vragen::vind($gegevens['vraag']) : null;

        $vraag
            ? Cache::forever('actieve-vraag', $vraag['id'])
            : Cache::forget('actieve-vraag');

        isset($gegevens['pauzeTot'])
            ? Cache::forever('pauze-tot', $gegevens['pauzeTot'])
            : Cache::forget('pauze-tot');

        Cache::forever('einde', $gegevens['einde'] ?? false);
        Cache::forever('lichtje', $gegevens['lichtje'] ?? false);

        return response()->json(['vraag' => $vraag['id'] ?? null]);
    }

    /**
     * Het juiste antwoord en de uitleg blijven op de server tot de beamer ze toont.
     * Bij een open vraag is de uitleg een hulpzin, die mag wel mee.
     */
    private function voorGsm(array $vraag): array
    {
        $verborgen = $vraag['type'] === 'open' ? ['juist', 'antwoord', 'bron'] : ['juist', 'antwoord', 'uitleg', 'bron'];

        return collect($vraag)->except($verborgen)->all();
    }
}
