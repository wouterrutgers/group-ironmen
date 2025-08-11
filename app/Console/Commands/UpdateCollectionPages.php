<?php

namespace App\Console\Commands;

use App\Domain\CollectionLogInfo;
use App\Models\CollectionTab;
use Illuminate\Console\Command;

class UpdateCollectionPages extends Command
{
    protected $signature = 'update-collection-pages';

    protected $description = 'Update all collection pages';

    public function handle(): int
    {
        CollectionTab::updateOrCreate([
            'tab_id' => 0,
            'name' => 'Bosses',
        ]);

        CollectionTab::updateOrCreate([
            'tab_id' => 1,
            'name' => 'Raids',
        ]);

        CollectionTab::updateOrCreate([
            'tab_id' => 2,
            'name' => 'Clues',
        ]);

        CollectionTab::updateOrCreate([
            'tab_id' => 3,
            'name' => 'Minigames',
        ]);

        CollectionTab::updateOrCreate([
            'tab_id' => 4,
            'name' => 'Other',
        ]);

        foreach (CollectionLogInfo::getCollectionLogInfo() as $tab) {
            foreach ($tab['pages'] as $page) {
                CollectionTab::where('tab_id', '=', $tab['tabId'])->firstOrFail()
                    ->pages()->updateOrCreate([], [
                        'name' => $page['name'],
                    ]);
            }
        }

        return static::SUCCESS;
    }
}
