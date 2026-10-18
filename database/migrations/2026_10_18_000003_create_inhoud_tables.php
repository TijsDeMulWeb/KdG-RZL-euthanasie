<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('stellingen', function (Blueprint $table) {
            $table->id();
            $table->string('code')->unique();
            $table->text('tekst');
            $table->timestamps();
        });

        Schema::create('leerlingen', function (Blueprint $table) {
            $table->id();
            $table->string('naam');
            $table->json('antwoorden');
            $table->json('citaten')->nullable();
            $table->json('tegenstrijdig')->nullable();
            $table->json('gevoelig')->nullable();
            $table->text('opgelet')->nullable();
            $table->unsignedInteger('volgorde')->default(0);
            $table->timestamps();
        });

        Schema::create('dossiers', function (Blueprint $table) {
            $table->id();
            $table->string('sleutel')->unique();
            $table->string('stelling');
            $table->string('titel');
            $table->json('kaart');
            $table->text('onthulling');
            $table->json('duel');
            $table->boolean('tegenspraak')->default(false);
            $table->unsignedInteger('volgorde')->default(0);
            $table->timestamps();
        });

        Schema::create('vragen', function (Blueprint $table) {
            $table->id();
            $table->string('sleutel')->unique();
            $table->string('type');
            $table->text('tekst');
            $table->json('opties')->nullable();
            $table->unsignedInteger('juist')->nullable();
            $table->double('min')->nullable();
            $table->double('max')->nullable();
            $table->double('antwoord')->nullable();
            $table->string('eenheid')->nullable();
            $table->text('uitleg')->nullable();
            $table->string('bron')->nullable();
            $table->unsignedInteger('max_lengte')->nullable();
            $table->json('markeringen')->nullable();
            $table->json('stellingen')->nullable();
            $table->timestamps();
        });

        Schema::create('theorie_kaarten', function (Blueprint $table) {
            $table->id();
            $table->string('sleutel')->unique();
            $table->string('titel');
            $table->json('punten');
            $table->string('bron')->nullable();
            $table->json('aanvullen')->nullable();
            $table->timestamps();
        });

        Schema::create('les_stappen', function (Blueprint $table) {
            $table->id();
            $table->unsignedInteger('volgorde')->default(0);
            $table->string('type');
            $table->json('instellingen')->nullable();
            $table->boolean('actief')->default(true);
            $table->timestamps();
        });
    }
};
