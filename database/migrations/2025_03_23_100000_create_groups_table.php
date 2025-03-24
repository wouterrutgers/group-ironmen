<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('groups', function (Blueprint $table) {
            $table->id();
            // $table->bigInteger('group_id')->primary();
            $table->string('name')->index();
            $table->string('hash')->index();
            // $table->integer('version')->default(1);
            $table->timestamps();
        });
    }
};
