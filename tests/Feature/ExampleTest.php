<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ExampleTest extends TestCase
{
    use RefreshDatabase;

    public function test_leerlingen_worden_naar_de_gsm_pagina_gestuurd(): void
    {
        $this->get('/')->assertRedirect(route('deelnemers.create'));

        $this->get(route('deelnemers.create'))->assertOk();
    }
}
