<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('skill_stats', function (Blueprint $table) {
            $table->id();
            $table->string('type');
            $table->foreignId('member_id')->constrained();
            $table->json('skills');
            $table->timestamps();
        });
    }
};
