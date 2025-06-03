<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('members', function (Blueprint $table) {
            $table->id();
            $table->foreignId('group_id')->constrained();
            $table->string('name');
            $table->dateTime('stats_last_update')->nullable();
            $table->json('stats')->nullable();
            $table->dateTime('coordinates_last_update')->nullable();
            $table->json('coordinates')->nullable();
            $table->dateTime('skills_last_update')->nullable();
            $table->json('skills')->nullable();
            $table->dateTime('quests_last_update')->nullable();
            $table->json('quests')->nullable();
            $table->dateTime('inventory_last_update')->nullable();
            $table->json('inventory')->nullable();
            $table->dateTime('equipment_last_update')->nullable();
            $table->json('equipment')->nullable();
            $table->dateTime('rune_pouch_last_update')->nullable();
            $table->json('rune_pouch')->nullable();
            $table->dateTime('bank_last_update')->nullable();
            $table->json('bank')->nullable();
            $table->dateTime('seed_vault_last_update')->nullable();
            $table->json('seed_vault')->nullable();
            $table->dateTime('interacting_last_update')->nullable();
            $table->text('interacting')->nullable();
            $table->dateTime('diary_vars_last_update')->nullable();
            $table->json('diary_vars')->nullable();
            $table->timestamps();
        });
    }
};
