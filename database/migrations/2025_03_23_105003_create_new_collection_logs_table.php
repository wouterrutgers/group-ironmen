<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('new_collection_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('member_id')->constrained();
            $table->foreignId('collection_page_id')->constrained();
            $table->json('items');
            // $table->timestamp('last_updated')->nullable();
            // $table->foreignId('group_id')->nullable()->constrained();
            $table->timestamps();
        });
    }
};
