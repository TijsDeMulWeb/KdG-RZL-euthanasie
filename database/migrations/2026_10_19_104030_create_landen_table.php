<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('landen', function (Blueprint $table) {
            $table->id();
            $table->string('iso', 3)->unique();
            $table->string('naam');
            $table->string('status');
            $table->unsignedSmallInteger('jaar')->nullable();
            $table->boolean('gedeeltelijk')->default(false);
            $table->json('voorwaarden')->nullable();
            $table->string('bron')->nullable();
            $table->timestamps();
        });
    }
};
