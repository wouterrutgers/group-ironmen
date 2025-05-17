<?php

namespace App\Console\Commands;

use App\Domain\CollectionLogInfo;
use App\Models\CollectionPage;
use Illuminate\Console\Command;

class UpdateCollectionPages extends Command
{
    protected $signature = 'update-collection-pages';

    protected $description = 'Update all collection pages';

    public function handle(): int
    {
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
