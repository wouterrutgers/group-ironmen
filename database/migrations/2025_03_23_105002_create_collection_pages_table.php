<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('collection_pages', function (Blueprint $table) {
            $table->unsignedBigInteger('id')->primary();
            $table->foreignId('collection_tab_id')->constrained();
            $table->string('name');
            $table->timestamps();
        });
    }
};
