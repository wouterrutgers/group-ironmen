<?php

namespace App\Domain;

use App\Models\CollectionPage;

class CollectionLogInfo
{
    protected static ?self $instance = null;

    private array $page_name_to_id_lookup = [];
    private array $page_id_item_set_lookup = [];
    private array $item_name_to_id_lookup = [];
    private array $item_id_to_page_id_lookup = [];

    // Static equivalent of lazy_static in Rust
    private static array $collection_page_remap = [
        'The Grumbler' => 'Phantom Muspah',
    ];

    private static array $collection_item_remap = [
        'Pharaoh\'s sceptre' => 'Pharaoh\'s sceptre (uncharged)',
    ];

    private static array $collection_item_id_remap = [
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

    private static ?array $collection_log_info = null;

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

    /**
     * Initialize from database
     */
    public function initialize(): void
    {
        $pages = CollectionPage::get();

        // Initialize page_name_to_id_lookup
        foreach ($pages as $page) {
            $this->page_name_to_id_lookup[$page->name] = $page->id;
        }

        // Initialize other lookup tables
        $this->item_id_to_page_id_lookup = [];
        $this->item_name_to_id_lookup = [];
        $this->page_id_item_set_lookup = [];

        foreach (self::getCollectionLogInfo() as $tab) {
            foreach ($tab['pages'] as $page) {
                $page_id = $this->page_name_to_id_lookup[$page['name']];

                if (! isset($this->page_id_item_set_lookup[$page_id])) {
                    $this->page_id_item_set_lookup[$page_id] = [];
                }

                foreach ($page['items'] as $item) {
                    $this->item_name_to_id_lookup[$item['name']] = $item['id'];

                    // Add item to page's item set
                    $this->page_id_item_set_lookup[$page_id][$item['id']] = true;

                    // Add page to item's page set
                    if (! isset($this->item_id_to_page_id_lookup[$item['id']])) {
                        $this->item_id_to_page_id_lookup[$item['id']] = [];
                    }
                    $this->item_id_to_page_id_lookup[$item['id']][$page_id] = true;
                }
            }
        }
    }

    /**
     * Load collection log data from JSON file
     */
    private static function loadCollectionLogData(): array
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

    /**
     * Get collection log info data
     */
    public static function getCollectionLogInfo(): array
    {
        return self::loadCollectionLogData();
    }

    /**
     * Convert page name to ID
     */
    public function page_name_to_id(string $page_name): ?int
    {
        if (isset($this->page_name_to_id_lookup[$page_name])) {
            return $this->page_name_to_id_lookup[$page_name];
        }

        if (isset(self::$collection_page_remap[$page_name])) {
            $remapped_name = self::$collection_page_remap[$page_name];
            return $this->page_name_to_id_lookup[$remapped_name] ?? null;
        }

        return null;
    }

    /**
     * Check if a page contains an item
     */
    public function has_item(int $page_id, int $item_id): bool
    {
        if (! isset($this->page_id_item_set_lookup[$page_id])) {
            return false;
        }

        return isset($this->page_id_item_set_lookup[$page_id][$item_id]);
    }

    /**
     * Remap an item ID if needed
     */
    public function remap_item_id(int $item_id): int
    {
        return self::$collection_item_id_remap[$item_id] ?? $item_id;
    }

    /**
     * Convert item name to ID
     */
    public function item_name_to_id(string $item_name): ?int
    {
        if (isset($this->item_name_to_id_lookup[$item_name])) {
            return $this->item_name_to_id_lookup[$item_name];
        }

        if (isset(self::$collection_item_remap[$item_name])) {
            $remapped_name = self::$collection_item_remap[$item_name];
            return $this->item_name_to_id_lookup[$remapped_name] ?? null;
        }

        return null;
    }

    /**
     * Get all page IDs that contain an item
     */
    public function page_ids_for_item(int $item_id): array
    {
        if (! isset($this->item_id_to_page_id_lookup[$item_id])) {
            return [];
        }

        return array_keys($this->item_id_to_page_id_lookup[$item_id]);
    }

    /**
     * Get the number of items in a page
     */
    public function number_of_items_in_page(int $page_id): int
    {
        if (! isset($this->page_id_item_set_lookup[$page_id])) {
            return 0;
        }

        return count($this->page_id_item_set_lookup[$page_id]);
    }
}
