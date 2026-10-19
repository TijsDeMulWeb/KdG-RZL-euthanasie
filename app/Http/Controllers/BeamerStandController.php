<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class BeamerStandController extends Controller
{
    public function show(): JsonResponse
    {
        return response()->json(Cache::get('beamer-stand'));
    }

    public function update(Request $request): JsonResponse
    {
        $stand = $request->validate([
            'nummer' => ['required', 'integer'],
            'naam' => ['required', 'string'],
            'stap' => ['required', 'string'],
            'volgende' => ['required', 'string'],
            'notities' => ['array'],
            'scenes' => ['array'],
            'zwart' => ['boolean'],
            'bekijk' => ['nullable', 'string'],
            'getoond' => ['nullable', 'array'],
            'camera' => ['nullable', 'array'],
            'opdracht' => ['nullable', 'integer'],
            'land' => ['nullable', 'string'],
            'wereld' => ['boolean'],
        ]);

        Cache::put('beamer-stand', [...$stand, 'tijd' => now()->timestamp], now()->addHours(6));

        return response()->json(['ok' => true]);
    }
}
