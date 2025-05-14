<?php

namespace App\Domain;

use App\Models\CollectionPage;

class CollectionLogInfo
{
    protected static ?self $instance = null;

    protected array $page_name_to_id_lookup = [];

    protected array $page_id_item_set_lookup = [];

    protected array $item_name_to_id_lookup = [];

    protected array $item_id_to_page_id_lookup = [];

    protected static array $collection_page_remap = [
        'The Grumbler' => 'Phantom Muspah',
    ];

    protected static array $collection_item_remap = [
        'Pharaoh\'s sceptre' => 'Pharaoh\'s sceptre (uncharged)',
    ];

    protected static array $collection_item_id_remap = [
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

    protected static ?array $collection_log_info = null;

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
            $this->page_name_to_id_lookup[$page->name] = $page->id;
        }

        $this->item_id_to_page_id_lookup = [];
        $this->item_name_to_id_lookup = [];
        $this->page_id_item_set_lookup = [];

        foreach (self::getCollectionLogInfo() as $tab) {
            foreach ($tab['pages'] as $page) {
                $page_id = $this->getPageIdFromPageArray($page);
                if ($page_id === null) {
                    continue;
                }

                if (!isset($this->page_id_item_set_lookup[$page_id])) {
                    $this->page_id_item_set_lookup[$page_id] = [];
                }

                foreach ($page['items'] as $item) {
                    $this->item_name_to_id_lookup[$item['name']] = $item['id'];
                    $this->page_id_item_set_lookup[$page_id][$item['id']] = true;
                    if (!isset($this->item_id_to_page_id_lookup[$item['id']])) {
                        $this->item_id_to_page_id_lookup[$item['id']] = [];
                    }
                    $this->item_id_to_page_id_lookup[$item['id']][$page_id] = true;
                }
            }
        }
    }

    protected function getPageIdFromPageArray(array $page): ?int
    {
        if (array_key_exists($page['name'], $this->page_name_to_id_lookup)) {
            return $this->page_name_to_id_lookup[$page['name']];
        }

        if (array_key_exists($page['name'], self::$collection_page_remap)) {
            $remapped_name = self::$collection_page_remap[$page['name']];
            if (array_key_exists($remapped_name, $this->page_name_to_id_lookup)) {
                return $this->page_name_to_id_lookup[$remapped_name];
            }
        }

        return null;
    }

    protected static function loadCollectionLogData(): array
    {
        if (self::$collection_log_info === null) {
            $path = storage_path('cache/collection_log_info.json');
            $jsonData = file_get_contents($path);
            if ($jsonData === false) {
                throw new \Exception("Could not read collection log info file at {$path}");
            }
            self::$collection_log_info = json_decode($jsonData, true);
        }

        return self::$collection_log_info;
    }

    public static function getCollectionLogInfo(): array
    {
        return self::loadCollectionLogData();
    }

    public function page_name_to_id(string $page_name): ?int
    {
        if (array_key_exists($page_name, $this->page_name_to_id_lookup)) {
            return $this->page_name_to_id_lookup[$page_name];
        }

        if (array_key_exists($page_name, self::$collection_page_remap)) {
            $remapped_name = self::$collection_page_remap[$page_name];
            return $this->page_name_to_id_lookup[$remapped_name] ?? null;
        }

        return null;
    }

    public function has_item(int $page_id, int $item_id): bool
    {
        if (!array_key_exists($page_id, $this->page_id_item_set_lookup)) {
            return false;
        }

        return array_key_exists($item_id, $this->page_id_item_set_lookup[$page_id]);
    }

    public function remap_item_id(int $item_id): int
    {
        if (array_key_exists($item_id, self::$collection_item_id_remap)) {
            return self::$collection_item_id_remap[$item_id];
        }

        return $item_id;
    }

    public function item_name_to_id(string $item_name): ?int
    {
        if (array_key_exists($item_name, $this->item_name_to_id_lookup)) {
            return $this->item_name_to_id_lookup[$item_name];
        }

        if (array_key_exists($item_name, self::$collection_item_remap)) {
            $remapped_name = self::$collection_item_remap[$item_name];
            return $this->item_name_to_id_lookup[$remapped_name] ?? null;
        }

        return null;
    }

    public function page_ids_for_item(int $item_id): array
    {
        if (!array_key_exists($item_id, $this->item_id_to_page_id_lookup)) {
            return [];
        }

        return \array_keys($this->item_id_to_page_id_lookup[$item_id]);
    }

    public function number_of_items_in_page(int $page_id): int
    {
        if (!array_key_exists($page_id, $this->page_id_item_set_lookup)) {
            return 0;
        }

        return \count($this->page_id_item_set_lookup[$page_id]);
    }
}
