<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('antwoorden', function (Blueprint $table) {
            $table->id();
            $table->foreignId('deelnemer_id')->constrained('deelnemers')->cascadeOnDelete();
            $table->string('vraag');
            $table->json('waarde');
            $table->timestamps();

            $table->unique(['deelnemer_id', 'vraag']);
        });
    }
};
