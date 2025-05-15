<?php

namespace App\Domain;

use App\Models\CollectionPage;
use Exception;

class CollectionLogInfo
{
    protected static ?self $instance = null;

    protected array $pageNameToIdLookup = [];

    protected array $pageIdItemSetLookup = [];

    protected array $itemNameToIdLookup = [];

    protected array $itemIdToPageIdLookup = [];

    protected static array $collectionPageRemap = [
        'The Grumbler' => 'Phantom Muspah',
    ];

    protected static array $collectionItemRemap = [
        'Pharaoh\'s sceptre' => 'Pharaoh\'s sceptre (uncharged)',
    ];

    protected static array $collectionItemIdRemap = [
        25627 => 12019, // coal bag
        25628 => 12020, // gem bag
        25629 => 24882, // plank sack
        25617 => 10859, // tea flask
        25618 => 10877, // plain satchel
        25619 => 10878, // green satchel
        25620 => 10879, // red satchel
        25621 => 10880, // black stachel
        25622 => 10881, // gold satchel
        25623 => 10882, // rune satchel
        25624 => 13273, // unsired pet
        25630 => 12854, // Flamtaer bag
    ];

    protected static ?array $collectionLogInfo = null;

    public function __construct()
    {
        $this->loadCollectionLogData();
        $this->initialize();
    }

    public static function make(): static
    {
        if (is_null(static::$instance)) {
            static::$instance = new static;
        }

        return static::$instance;
    }

    public function initialize(): void
    {
        $pages = CollectionPage::get();

        foreach ($pages as $page) {
            $this->pageNameToIdLookup[$page->name] = $page->id;
        }

        $this->itemIdToPageIdLookup = [];
        $this->itemNameToIdLookup = [];
        $this->pageIdItemSetLookup = [];

        foreach (self::getCollectionLogInfo() as $tab) {
            foreach ($tab['pages'] as $page) {
                $pageId = $this->getPageIdFromPageArray($page);
                if (is_null($pageId)) {
                    continue;
                }

                if (! array_key_exists($pageId, $this->pageIdItemSetLookup)) {
                    $this->pageIdItemSetLookup[$pageId] = [];
                }

                foreach ($page['items'] as $item) {
                    $this->itemNameToIdLookup[$item['name']] = $item['id'];
                    $this->pageIdItemSetLookup[$pageId][$item['id']] = true;
                    if (! array_key_exists($item['id'], $this->itemIdToPageIdLookup)) {
                        $this->itemIdToPageIdLookup[$item['id']] = [];
                    }
                    $this->itemIdToPageIdLookup[$item['id']][$pageId] = true;
                }
            }
        }
    }

    protected function getPageIdFromPageArray(array $page): ?int
    {
        if (array_key_exists($page['name'], $this->pageNameToIdLookup)) {
            return $this->pageNameToIdLookup[$page['name']];
        }

        if (array_key_exists($page['name'], self::$collectionPageRemap)) {
            $remappedName = self::$collectionPageRemap[$page['name']];
            if (array_key_exists($remappedName, $this->pageNameToIdLookup)) {
                return $this->pageNameToIdLookup[$remappedName];
            }
        }

        return null;
    }

    protected static function loadCollectionLogData(): array
    {
        if (is_null(self::$collectionLogInfo)) {
            $path = storage_path('cache/collection_log_info.json');
            $jsonData = file_get_contents($path);
            if ($jsonData === false) {
                throw new Exception("Could not read collection log info file at {$path}");
            }
            self::$collectionLogInfo = json_decode($jsonData, true);
        }

        return self::$collectionLogInfo;
    }

    public static function getCollectionLogInfo(): array
    {
        return self::loadCollectionLogData();
    }

    public function pageNameToId(string $pageName): ?int
    {
        if (array_key_exists($pageName, $this->pageNameToIdLookup)) {
            return $this->pageNameToIdLookup[$pageName];
        }

        if (array_key_exists($pageName, self::$collectionPageRemap)) {
            $remappedName = self::$collectionPageRemap[$pageName];

            return $this->pageNameToIdLookup[$remappedName] ?? null;
        }

        return null;
    }

    public function hasItem(int $pageId, int $itemId): bool
    {
        if (! array_key_exists($pageId, $this->pageIdItemSetLookup)) {
            return false;
        }

        return array_key_exists($itemId, $this->pageIdItemSetLookup[$pageId]);
    }

    public function remapItemId(int $itemId): int
    {
        if (array_key_exists($itemId, self::$collectionItemIdRemap)) {
            return self::$collectionItemIdRemap[$itemId];
        }

        return $itemId;
    }

    public function itemNameToId(string $itemName): ?int
    {
        if (array_key_exists($itemName, $this->itemNameToIdLookup)) {
            return $this->itemNameToIdLookup[$itemName];
        }

        if (array_key_exists($itemName, self::$collectionItemRemap)) {
            $remappedName = self::$collectionItemRemap[$itemName];

            return $this->itemNameToIdLookup[$remappedName] ?? null;
        }

        return null;
    }

    public function pageIdsForItem(int $itemId): array
    {
        if (! array_key_exists($itemId, $this->itemIdToPageIdLookup)) {
            return [];
        }

        return array_keys($this->itemIdToPageIdLookup[$itemId]);
    }

    public function numberOfItemsInPage(int $pageId): int
    {
        if (! array_key_exists($pageId, $this->pageIdItemSetLookup)) {
            return 0;
        }

        return count($this->pageIdItemSetLookup[$pageId]);
    }
}
