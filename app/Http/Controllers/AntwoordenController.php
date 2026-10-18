<?php

namespace App\Http\Controllers;

use App\Models\Antwoord;
use App\Support\Vragen;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class AntwoordenController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $antwoorden = Antwoord::query()
            ->with('deelnemer:id,naam')
            ->when($request->query('vraag'), fn ($query, $vraag) => $query->where('vraag', $vraag))
            ->orderBy('id')
            ->get()
            ->map(fn (Antwoord $antwoord) => [
                'id' => $antwoord->id,
                'deelnemer' => $antwoord->deelnemer_id,
                'naam' => $antwoord->deelnemer->naam,
                'vraag' => $antwoord->vraag,
                'waarde' => $antwoord->waarde,
            ]);

        return response()->json($antwoorden);
    }

    public function store(Request $request): JsonResponse
    {
        $deelnemerId = $request->session()->get('deelnemer_id');

        if (! $deelnemerId) {
            abort(401, 'Meld je eerst aan.');
        }

        $vraag = Vragen::vind((string) $request->input('vraag'));

        if (! $vraag) {
            abort(422, 'Onbekende vraag.');
        }

        if (Cache::get('actieve-vraag') !== $vraag['id']) {
            abort(409, 'Deze vraag is gesloten.');
        }

        $gegevens = $request->validate(Vragen::regels($vraag));

        Antwoord::updateOrCreate(
            ['deelnemer_id' => $deelnemerId, 'vraag' => $vraag['id']],
            ['waarde' => $gegevens['waarde']],
        );

        return response()->json(['ok' => true]);
    }

    public function destroy(): JsonResponse
    {
        Antwoord::query()->delete();

        return response()->json(['ok' => true]);
    }
}
