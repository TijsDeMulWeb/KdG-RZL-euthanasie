<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsurePresentator
{
    public function handle(Request $request, Closure $next): Response
    {
        if (! $request->session()->get('presentator')) {
            abort(403, 'Alleen voor de presentatoren.');
        }

        return $next($request);
    }
}
