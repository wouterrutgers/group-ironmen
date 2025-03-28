<?php

namespace App\Http\Controllers;

use App\Domain\CollectionLogInfo;
use App\Domain\Validators;
use App\Enums\AggregatePeriod;
use App\Models\CollectionLog;
use App\Models\Member;
use App\Models\NewCollectionLog;
use App\Models\SkillStat;
use Carbon\Carbon;
use Exception;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class GroupMemberController extends Controller
{
    public function addGroupMember(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string',
        ]);

        $name = $validated['name'];
        $groupId = app('group')->id;

        // Check if name is not the reserved SHARED_MEMBER
        if ($name === Member::SHARED_MEMBER) {
            return response()->json([
                'error' => 'Member name '.Member::SHARED_MEMBER.' not allowed',
            ], 400);
        }

        // Validate name
        if (! Validators::validName($name)) {
            return response()->json([
                'error' => "Member name {$name} is not valid",
            ], 400);
        }

        // Check member count
        $memberCount = Member::where('group_id', $groupId)
            ->where('name', '!=', Member::SHARED_MEMBER)
            ->count();

        if ($memberCount >= 5) {
            return response()->json([
                'error' => 'Group already has maximum allowed members',
            ], 400);
        }

        // Add member to database
        Member::create([
            'group_id' => $groupId,
            'name' => $name,
        ]);

        return response()->json(null, 201);
    }

    public function deleteGroupMember(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string',
        ]);

        $name = $validated['name'];
        $groupId = app('group')->id;

        if ($name === Member::SHARED_MEMBER) {
            return response()->json([
                'error' => 'Member name '.Member::SHARED_MEMBER.' not allowed',
            ], 400);
        }

        DB::transaction(function () use ($groupId, $name) {
            // Get member ID
            $member = Member::where('group_id', $groupId)
                ->where('name', $name)
                ->firstOrFail();

            $memberId = $member->id;

            // Delete skills data for all periods
            SkillStat::where('member_id', $memberId)->delete();

            // Delete collection log data
            CollectionLog::where('member_id', $memberId)->delete();
            NewCollectionLog::where('member_id', $memberId)->delete();

            // Delete the member
            $member->delete();
        });

        return response()->json(null, 200);
    }

    public function renameGroupMember(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'original_name' => 'required|string',
            'new_name' => 'required|string',
        ]);

        $originalName = $validated['original_name'];
        $newName = $validated['new_name'];
        $groupId = app('group')->id;

        if ($originalName === Member::SHARED_MEMBER || $newName === Member::SHARED_MEMBER) {
            return response()->json([
                'error' => 'Member name '.Member::SHARED_MEMBER.' not allowed',
            ], 400);
        }

        if (! Validators::validName($newName)) {
            return response()->json([
                'error' => "Member name {$newName} is not valid",
            ], 400);
        }

        $updated = Member::where('group_id', $groupId)
            ->where('name', $originalName)
            ->update(['name' => $newName]);

        if (! $updated) {
            return response()->json(['error' => 'Member not found'], 404);
        }

        return response()->json(null, 200);
    }

    public function updateGroupMember(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string',
            'stats' => 'nullable|array',
            'coordinates' => 'nullable|array',
            'skills' => 'nullable|array',
            'quests' => 'nullable|array',
            'inventory' => 'nullable|array',
            'equipment' => 'nullable|array',
            'bank' => 'nullable|array',
            'shared_bank' => 'nullable|array',
            'rune_pouch' => 'nullable|array',
            'seed_vault' => 'nullable|array',
            'deposited' => 'nullable|array',
            'diary_vars' => 'nullable|array',
            'collection_log' => 'nullable|array',
            'collection_log_new' => 'nullable|array',
            'interacting' => 'nullable',
        ]);

        $name = $validated['name'];
        $groupId = app('group')->id;

        // Check if member is in group
        $member = Member::where('group_id', $groupId)
            ->where('name', $name)
            ->first();

        if (! $member) {
            return response()->json([
                'error' => 'Player is not a member of this group',
            ], 401);
        }

        // Validate all member properties
        Validators::validateMemberPropLength('stats', $validated['stats'] ?? null, 7, 7);
        Validators::validateMemberPropLength('coordinates', $validated['coordinates'] ?? null, 3, 3);
        Validators::validateMemberPropLength('skills', $validated['skills'] ?? null, 23, 24);
        Validators::validateMemberPropLength('quests', $validated['quests'] ?? null, 0, 200);
        Validators::validateMemberPropLength('inventory', $validated['inventory'] ?? null, 56, 56);
        Validators::validateMemberPropLength('equipment', $validated['equipment'] ?? null, 28, 28);
        Validators::validateMemberPropLength('bank', $validated['bank'] ?? null, 0, 3000);
        Validators::validateMemberPropLength('shared_bank', $validated['shared_bank'] ?? null, 0, 1000);
        Validators::validateMemberPropLength('rune_pouch', $validated['rune_pouch'] ?? null, 6, 8);
        Validators::validateMemberPropLength('seed_vault', $validated['seed_vault'] ?? null, 0, 500);
        Validators::validateMemberPropLength('deposited', $validated['deposited'] ?? null, 0, 200);
        Validators::validateMemberPropLength('diary_vars', $validated['diary_vars'] ?? null, 0, 62);

        // Get collection log info
        $collectionLogInfo = CollectionLogInfo::make();

        // Clone the collection log data for validation
        $collectionLogData = $validated['collection_log'] ?? null;

        // Validate collection log data using direct validation to match Rust implementation
        try {
            if ($collectionLogData !== null) {
                foreach ($collectionLogData as $key => $log) {
                    // Check if page exists
                    $pageId = $collectionLogInfo->page_name_to_id($log['page_name'] ?? '');
                    if ($pageId === null) {
                        throw new Exception('Invalid collection log page: '.($log['page_name'] ?? 'unknown'));
                    }

                    // Check number of items (assuming pairs of item_id, quantity)
                    if (isset($log['items'])) {
                        $numberOfItems = count($log['items']) / 2;
                        $maxItems = $collectionLogInfo->number_of_items_in_page($pageId);
                        if ($numberOfItems > $maxItems) {
                            throw new Exception("$numberOfItems is too many items for collection log {$log['page_name']}");
                        }

                        // Remap and validate each item ID (only checking even indices)
                        for ($i = 0; $i < count($log['items']); $i += 2) {
                            $itemId = $collectionLogInfo->remap_item_id($log['items'][$i]);
                            $collectionLogData[$key]['items'][$i] = $itemId; // Update with remapped ID

                            if (! $collectionLogInfo->has_item($pageId, $itemId)) {
                                throw new Exception("Collection log {$log['page_name']} does not have item id $itemId");
                            }
                        }
                    }
                }
            }
        } catch (Exception $e) {
            return response()->json([
                'error' => $e->getMessage(),
            ], 400);
        }

        DB::transaction(function () use ($member, $groupId, $validated, $collectionLogInfo, $collectionLogData) {
            $now = now();

            // Update member data
            if (isset($validated['stats'])) {
                $member->stats = $validated['stats'];
                $member->stats_last_update = $now;
            }

            if (isset($validated['coordinates'])) {
                $member->coordinates = $validated['coordinates'];
                $member->coordinates_last_update = $now;
            }

            if (isset($validated['skills'])) {
                $member->skills = $validated['skills'];
                $member->skills_last_update = $now;
            }

            if (isset($validated['quests'])) {
                $member->quests = $validated['quests'];
                $member->quests_last_update = $now;
            }

            if (isset($validated['inventory'])) {
                $member->inventory = $validated['inventory'];
                $member->inventory_last_update = $now;
            }

            if (isset($validated['equipment'])) {
                $member->equipment = $validated['equipment'];
                $member->equipment_last_update = $now;
            }

            if (isset($validated['bank'])) {
                $member->bank = $validated['bank'];
                $member->bank_last_update = $now;
            }

            if (isset($validated['rune_pouch'])) {
                $member->rune_pouch = $validated['rune_pouch'];
                $member->rune_pouch_last_update = $now;
            }

            if (isset($validated['seed_vault'])) {
                $member->seed_vault = $validated['seed_vault'];
                $member->seed_vault_last_update = $now;
            }

            if (isset($validated['diary_vars'])) {
                $member->diary_vars = $validated['diary_vars'];
                $member->diary_vars_last_update = $now;
            }

            if (isset($validated['interacting'])) {
                $member->interacting = $validated['interacting'];
                $member->interacting_last_update = $now;
            }

            $member->save();

            // Process deposited items
            if (! empty($validated['deposited'])) {
                $this->depositItems($groupId, $member->name, $validated['deposited']);
            }

            // Update shared bank
            if (! empty($validated['shared_bank'])) {
                Member::where('group_id', $groupId)
                    ->where('name', Member::SHARED_MEMBER)
                    ->update([
                        'bank' => $validated['shared_bank'],
                        'bank_last_update' => $now,
                    ]);
            }

            // Update collection log - use the validated and potentially modified collection log data
            if ($collectionLogData !== null) {
                $this->updateCollectionLog($groupId, $member, $collectionLogData, $collectionLogInfo);
            }

            // Update new collection log drops
            if (! empty($validated['collection_log_new'])) {
                $this->updateCollectionLogNew($groupId, $member, $validated['collection_log_new'], $collectionLogInfo);
            }
        });

        return response()->json(null, 200);
    }

    /**
     * Update collection log items and completion counts
     */
    protected function updateCollectionLog(int $groupId, Member $member, array $collectionLogs, CollectionLogInfo $collectionLogInfo): void
    {
        $now = now();

        foreach ($collectionLogs as $log) {
            $pageId = $collectionLogInfo->page_name_to_id($log['page_name']);

            if ($pageId === null) {
                continue;
            }

            // Update or create collection log entry
            CollectionLog::updateOrCreate(
                [
                    'member_id' => $member->id,
                    'collection_page_id' => $pageId,
                ],
                [
                    'items' => $log['items'],
                    'counts' => $log['completion_counts'],
                    'updated_at' => $now,
                ]
            );

            // Clear new items for this page
            NewCollectionLog::updateOrCreate(
                [
                    'member_id' => $member->id,
                    'collection_page_id' => $pageId,
                ],
                [
                    'items' => [],
                    'updated_at' => $now,
                ]
            );
        }
    }

    /**
     * Update new collection log items
     */
    protected function updateCollectionLogNew(int $groupId, Member $member, array $collectionLogNew, CollectionLogInfo $collectionLogInfo): void
    {
        $now = now();

        // Convert item names to IDs
        $itemIds = [];
        foreach ($collectionLogNew as $itemName) {
            $itemId = $collectionLogInfo->item_name_to_id($itemName);
            if ($itemId === null) {
                throw new Exception("{$itemName} is not a known collection log item");
            }
            $itemIds[] = $itemId;
        }

        // Map page IDs to item IDs
        $pageIdsToItemIds = [];
        foreach ($itemIds as $itemId) {
            $pageIds = $collectionLogInfo->page_ids_for_item($itemId);
            foreach ($pageIds as $pageId) {
                if (! isset($pageIdsToItemIds[$pageId])) {
                    $pageIdsToItemIds[$pageId] = [];
                }
                $pageIdsToItemIds[$pageId][$itemId] = true;
            }
        }

        // Update the new items for each page
        foreach ($pageIdsToItemIds as $pageId => $pageItemIds) {
            // Get existing items
            $existingItems = $this->getCollectionNewForPage($member->id, $pageId);

            // Combine existing and new items
            $combinedItems = array_values(array_unique(array_merge($existingItems, array_keys($pageItemIds))));

            // Update the collection log new table
            NewCollectionLog::updateOrCreate(
                [
                    'member_id' => $member->id,
                    'collection_page_id' => $pageId,
                ],
                [
                    'items' => $combinedItems,
                    'updated_at' => $now,
                ]
            );
        }
    }

    /**
     * Get collection new items for a page
     */
    protected function getCollectionNewForPage(int $memberId, int $pageId): array
    {
        $result = NewCollectionLog::where('member_id', $memberId)
            ->where('collection_page_id', $pageId)
            ->value('items');

        return $result ?? [];
    }

    /**
     * Add deposited items to the player's bank
     */
    protected function depositItems(int $groupId, string $memberName, array $deposited): void
    {
        if (empty($deposited)) {
            return;
        }

        $member = Member::where('group_id', $groupId)
            ->where('name', $memberName)
            ->first();

        if (! $member) {
            return;
        }

        $bankItems = $member->bank ?? [];

        // Convert deposited items to a map of item_id => quantity
        $depositedMap = [];
        for ($i = 0; $i < count($deposited); $i += 2) {
            $itemId = $deposited[$i];
            $quantity = $deposited[$i + 1];
            $depositedMap[$itemId] = $quantity;
        }

        // Update quantities of items already in bank
        for ($i = 0; $i < count($bankItems); $i += 2) {
            $itemId = $bankItems[$i];
            if (isset($depositedMap[$itemId])) {
                $bankItems[$i + 1] += $depositedMap[$itemId];
                unset($depositedMap[$itemId]);
            }
        }

        // Add new items to bank
        foreach ($depositedMap as $itemId => $quantity) {
            if ($itemId == 0 || $quantity <= 0) {
                continue;
            }

            $bankItems[] = $itemId;
            $bankItems[] = $quantity;
        }

        // Update bank in database
        $member->bank = $bankItems;
        $member->bank_last_update = now();
        $member->save();
    }

    public function getGroupData(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'from_time' => 'required|date',
        ]);

        $fromTime = Carbon::parse($validated['from_time']);
        $groupId = app('group')->id;

        $query = Member::where('group_id', $groupId)
            ->selectRaw('name')
            ->selectRaw('GREATEST(
                    stats_last_update,
                    coordinates_last_update,
                    skills_last_update,
                    quests_last_update,
                    inventory_last_update,
                    equipment_last_update,
                    bank_last_update,
                    rune_pouch_last_update,
                    interacting_last_update,
                    seed_vault_last_update,
                    diary_vars_last_update
                ) as last_updated')
            ->selectRaw('CASE WHEN stats_last_update >= ? THEN stats ELSE NULL END as stats', [$fromTime])
            ->selectRaw('CASE WHEN coordinates_last_update >= ? THEN coordinates ELSE NULL END as coordinates', [$fromTime])
            ->selectRaw('CASE WHEN skills_last_update >= ? THEN skills ELSE NULL END as skills', [$fromTime])
            ->selectRaw('CASE WHEN quests_last_update >= ? THEN quests ELSE NULL END as quests', [$fromTime])
            ->selectRaw('CASE WHEN inventory_last_update >= ? THEN inventory ELSE NULL END as inventory', [$fromTime])
            ->selectRaw('CASE WHEN equipment_last_update >= ? THEN equipment ELSE NULL END as equipment', [$fromTime])
            ->selectRaw('CASE WHEN bank_last_update >= ? THEN bank ELSE NULL END as bank', [$fromTime])
            ->selectRaw('CASE WHEN rune_pouch_last_update >= ? THEN rune_pouch ELSE NULL END as rune_pouch', [$fromTime])
            ->selectRaw('CASE WHEN interacting_last_update >= ? THEN json_set(interacting, "$.last_updated", date_format(interacting_last_update, "%Y-%m-%dT%H:%i:%s.000Z")) ELSE NULL END as interacting', [$fromTime])
            ->selectRaw('CASE WHEN seed_vault_last_update >= ? THEN seed_vault ELSE NULL END as seed_vault', [$fromTime])
            ->selectRaw('CASE WHEN diary_vars_last_update >= ? THEN diary_vars ELSE NULL END as diary_vars', [$fromTime]);

        $members = $query->get();

        $result = $members->map(function ($member) {
            return [
                'name' => $member->name,
                'last_updated' => Carbon::make($member->last_updated)?->toIso8601ZuluString(),
                'stats' => $member->stats,
                'coordinates' => $member->coordinates,
                'skills' => $member->skills,
                'quests' => $member->quests,
                'inventory' => $member->inventory,
                'equipment' => $member->equipment,
                'bank' => $member->bank,
                'rune_pouch' => $member->rune_pouch,
                'interacting' => $member->interacting,
                'seed_vault' => $member->seed_vault,
                'diary_vars' => $member->diary_vars,
                'shared_bank' => null,
                'deposited' => null,
                'collection_log' => null,
                'collection_log_new' => null,
            ];
        });

        return response()->json($result);
    }

    public function getSkillData(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'period' => 'required|in:Day,Week,Month,Year',
        ]);

        $groupId = app('group')->id;
        $period = $validated['period'];

        $aggregatePeriod = match ($period) {
            'Day' => AggregatePeriod::Day,
            'Week' => AggregatePeriod::Month, // Week uses month data as per Rust implementation
            'Month' => AggregatePeriod::Month,
            'Year' => AggregatePeriod::Year,
            default => AggregatePeriod::Day
        };

        // Use Eloquent relationships to get skill stats
        $members = Member::where('group_id', $groupId)
            ->with(['skillStats' => function ($query) use ($aggregatePeriod) {
                $query->where('type', $aggregatePeriod->value)
                    ->orderBy('created_at');
            }])
            ->get();

        // Organize data by member
        $memberData = [];
        foreach ($members as $member) {
            $memberData[] = [
                'name' => $member->name,
                'skill_data' => $member->skillStats->map(function ($stat) {
                    return [
                        'time' => Carbon::make($stat->created_at)->toIso8601ZuluString(),
                        'data' => $stat->skills,
                    ];
                })->toArray(),
            ];
        }

        return response()->json(array_values(array_filter($memberData, function ($member) {
            return ! empty($member['skill_data']);
        })));
    }

    public function getCollectionLog(Request $request): JsonResponse
    {
        $groupId = app('group')->id;

        // Get collection logs with their related members and pages
        $logs = CollectionLog::with(['member', 'page'])
            ->whereHas('member.group', function ($query) use ($groupId) {
                $query->where('group_id', $groupId);
            })
            ->get();

        // Get new collection log items
        $newLogs = NewCollectionLog::with('member')
            ->whereHas('member.group', function ($query) use ($groupId) {
                $query->where('group_id', $groupId);
            })
            ->get();

        // Build lookup for new items
        $newItemsLookup = [];
        foreach ($newLogs as $newLog) {
            $key = "{$newLog->member_id}_{$newLog->collection_page_id}";
            $newItemsLookup[$key] = $newLog->items ?? [];
        }

        // Build the final result
        $result = [];
        foreach ($logs as $log) {
            $memberName = $log->member->name;
            $pageId = $log->collection_page_id;
            $memberId = $log->member_id;

            // Get new items for this page and member (if any)
            $key = "{$memberId}_{$pageId}";
            $newItems = $newItemsLookup[$key] ?? [];

            $collectionLog = [
                'page_name' => $log->page->name,
                'completion_counts' => $log->counts,
                'items' => $log->items,
                'new_items' => $newItems,
            ];

            // Add to result
            if (! isset($result[$memberName])) {
                $result[$memberName] = [];
            }

            $result[$memberName][] = $collectionLog;
        }

        return response()->json($result);
    }

    public function amILoggedIn(Request $request): JsonResponse
    {
        return response()->json(null, 200);
    }

    public function amIInGroup(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string',
        ]);

        $memberName = $validated['name'];
        $groupId = app('group')->id;

        $memberExists = Member::where('group_id', $groupId)
            ->where('name', $memberName)
            ->exists();

        if (! $memberExists) {
            return response()->json([
                'error' => 'Player is not a member of this group',
            ], 401);
        }

        return response()->json(null, 200);
    }
}
