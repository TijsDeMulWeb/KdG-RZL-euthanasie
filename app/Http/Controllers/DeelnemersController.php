<?php

namespace App\Http\Controllers;

use App\Models\Deelnemer;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\View\View;

class DeelnemersController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json(
            Deelnemer::query()->orderBy('id')->get(['id', 'naam']),
        );
    }

    public function create(Request $request): View
    {
        $deelnemer = Deelnemer::find($request->session()->get('deelnemer_id'));

        return view('deelnemer', ['naam' => $deelnemer?->naam]);
    }

    public function store(Request $request): JsonResponse
    {
        $gegevens = $request->validate([
            'naam' => ['required', 'string', 'max:30'],
        ]);

        $deelnemer = Deelnemer::create(['naam' => trim($gegevens['naam'])]);

        $request->session()->put('deelnemer_id', $deelnemer->id);

        return response()->json(['naam' => $deelnemer->naam]);
    }

    public function destroy(): JsonResponse
    {
        Deelnemer::query()->delete();

        return response()->json(['ok' => true]);
    }
}
