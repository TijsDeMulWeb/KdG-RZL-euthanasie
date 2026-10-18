<?php

namespace App\Http\Controllers;

use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\View\View;

class BeamerController extends Controller
{
    public function __invoke(Request $request): View|RedirectResponse
    {
        if (! $request->session()->get('presentator')) {
            return redirect()->route('deelnemers.create');
        }

        return view('sterrenhemel');
    }
}
