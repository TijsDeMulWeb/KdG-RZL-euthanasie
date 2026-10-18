<?php

namespace App\Http\Controllers;

use Illuminate\View\View;

class PresentatorController extends Controller
{
    public function __invoke(): View
    {
        return view('presentator');
    }
}
