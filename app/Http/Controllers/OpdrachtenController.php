<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class OpdrachtenController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $na = (int) $request->query('na', 0);

        $opdrachten = collect(Cache::get('opdrachten', []))
            ->filter(fn (array $opdracht) => $opdracht['id'] > $na)
            ->values();

        return response()->json($opdrachten);
    }

    public function store(Request $request): JsonResponse
    {
        $opdracht = $request->validate([
            'soort' => ['required', 'in:volgende,vorige,zwart,scene'],
            'scene' => ['nullable', 'integer'],
        ]);

        $lijst = Cache::get('opdrachten', []);
        $id = (collect($lijst)->max('id') ?? 0) + 1;
        $lijst[] = [...$opdracht, 'id' => $id];

        Cache::put('opdrachten', array_slice($lijst, -20), now()->addHours(6));

        return response()->json(['id' => $id]);
    }
}
