<?php

namespace App\Http\Controllers;

use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class PresentatorSessieController extends Controller
{
    public function store(Request $request): RedirectResponse
    {
        $code = config('sterrenhemel.presentator_code');

        if (! $code) {
            abort(403, 'Zet PRESENTATOR_CODE in .env.');
        }

        if (! hash_equals($code, (string) $request->query('code'))) {
            abort(403, 'Verkeerde code.');
        }

        $request->session()->put('presentator', true);

        return redirect()->route('beamer');
    }
}
