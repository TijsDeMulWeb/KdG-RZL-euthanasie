<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('publieksvragen', function (Blueprint $table) {
            $table->id();
            $table->text('vraag');
            $table->string('van')->nullable();
            $table->string('invalshoek')->nullable();
            $table->boolean('naam_tonen')->default(true);
            $table->unsignedInteger('volgorde')->default(0);
            $table->timestamps();
        });
    }
};
