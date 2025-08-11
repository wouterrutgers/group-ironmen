<?php

use App\Models\CollectionLog;
use App\Models\CollectionPage;
use App\Models\CollectionTab;
use App\Models\NewCollectionLog;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (DB::getDriverName() === 'mysql') {
            DB::statement('set foreign_key_checks = 0');
        }

        if (DB::getDriverName() === 'sqlite') {
            DB::statement('pragma foreign_keys = off');
        }

        Schema::table('collection_tabs', function (Blueprint $table) {
            $table->unsignedInteger('tab_id')->nullable()->after('id');
        });

        CollectionTab::orderBy('id', 'desc')->get()->each(function (CollectionTab $tab) {
            $tab->update([
                'id' => $tab->id + 1,
                'tab_id' => $tab->id,
            ]);

            CollectionPage::where('collection_tab_id', '=', $tab->id - 1)
                ->update(['collection_tab_id' => $tab->id]);

            CollectionLog::where('collection_page_id', '=', $tab->id - 1)
                ->update(['collection_page_id' => $tab->id]);

            NewCollectionLog::where('collection_page_id', '=', $tab->id - 1)
                ->update(['collection_page_id' => $tab->id]);
        });
    }
};
