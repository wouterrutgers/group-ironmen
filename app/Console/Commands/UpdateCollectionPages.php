<?php

namespace App\Console\Commands;

use App\Domain\CollectionLogInfo;
use App\Models\CollectionPage;
use App\Models\CollectionTab;
use Illuminate\Console\Command;

class UpdateCollectionPages extends Command
{
    protected $signature = 'update-collection-pages';

    protected $description = 'Update all collection pages';

    public function handle(): int
    {
        CollectionTab::updateOrCreate([
            'id' => 0,
            'name' => 'Bosses',
        ]);

        CollectionTab::updateOrCreate([
            'id' => 1,
            'name' => 'Raids',
        ]);

        CollectionTab::updateOrCreate([
            'id' => 2,
            'name' => 'Clues',
        ]);

        CollectionTab::updateOrCreate([
            'id' => 3,
            'name' => 'Minigames',
        ]);

        CollectionTab::updateOrCreate([
            'id' => 4,
            'name' => 'Other',
        ]);

        foreach (CollectionLogInfo::getCollectionLogInfo() as $tab) {
            foreach ($tab['pages'] as $page) {
                CollectionPage::updateOrCreate([
                    'collection_tab_id' => $tab['tabId'],
                    'name' => $page['name'],
                ]);
            }
        }

        return static::SUCCESS;
    }
}
