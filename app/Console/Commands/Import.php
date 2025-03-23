<?php

namespace App\Console\Commands;

use App\Models\AggregationInfo;
use App\Models\CollectionLog;
use App\Models\CollectionPage;
use App\Models\CollectionTab;
use App\Models\Group;
use App\Models\Member;
use App\Models\NewCollectionLog;
use App\Models\SkillStat;
use Carbon\Carbon;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class Import extends Command
{
    protected $signature = 'app:import';

    protected $description = 'Import old data';

    public function handle()
    {
        $this->aggregationInfo();
        $this->groups();
        $this->members();
        $this->skills();
        $this->collectionTabs();
        $this->collectionPages();
        $this->collectionLogs();
    }

    protected function aggregationInfo(): void
    {
        foreach (DB::connection('old')->table('aggregation_info')->get() as $aggregationInfo) {
            AggregationInfo::create([
                'type' => $aggregationInfo->type,
                'created_at' => $aggregationInfo->last_aggregation,
            ]);
        }
    }

    protected function groups(): void
    {
        foreach (DB::connection('old')->table('groups')->get() as $group) {
            Group::create([
                'name' => $group->group_name,
                'hash' => '//',
            ]);
        }
    }

    protected function members(): void
    {
        foreach (DB::connection('old')->table('members')->get() as $member) {
            Member::create([
                'id' => $member->member_id,
                'group_id' => $member->group_id,
                'name' => $member->member_name,
                'stats' => $this->json($member->stats),
                'stats_last_update' => Carbon::make($member->stats_last_update),
                'coordinates' => $this->json($member->coordinates),
                'coordinates_last_update' => Carbon::make($member->coordinates_last_update),
                'skills' => $this->json($member->skills),
                'skills_last_update' => Carbon::make($member->skills_last_update),
                'quests' => $member->quests ? array_values(unpack('C*', stream_get_contents($member->quests))) : null,
                'quests_last_update' => Carbon::make($member->quests_last_update),
                'inventory' => $this->json($member->inventory),
                'inventory_last_update' => Carbon::make($member->inventory_last_update),
                'equipment' => $this->json($member->equipment),
                'equipment_last_update' => Carbon::make($member->equipment_last_update),
                'rune_pouch' => $this->json($member->rune_pouch),
                'rune_pouch_last_update' => Carbon::make($member->rune_pouch_last_update),
                'bank' => $this->json($member->bank),
                'bank_last_update' => Carbon::make($member->bank_last_update),
                'seed_vault' => $this->json($member->seed_vault),
                'seed_vault_last_update' => Carbon::make($member->seed_vault_last_update),
                'interacting' => json_decode($member->interacting),
                'interacting_last_update' => Carbon::make($member->interacting_last_update),
                'diary_vars' => $this->json($member->diary_vars),
                'diary_vars_last_update' => Carbon::make($member->diary_vars_last_update),
            ]);
        }
    }

    protected function skills(): void
    {
        foreach (['day', 'month', 'year'] as $type) {
            foreach (DB::connection('old')->table("skills_{$type}")->get() as $skill) {
                SkillStat::create([
                    'type' => $type,
                    'member_id' => $skill->member_id,
                    'skills' => $this->json($skill->skills),
                    'created_at' => Carbon::make($skill->time),
                ]);
            }
        }
    }

    protected function collectionTabs(): void
    {
        foreach (DB::connection('old')->table('collection_tab')->get() as $tab) {
            CollectionTab::create([
                'id' => $tab->tab_id,
                'name' => $tab->name,
            ]);
        }
    }

    protected function collectionPages(): void
    {
        foreach (DB::connection('old')->table('collection_page')->get() as $page) {
            CollectionPage::create([
                'id' => $page->page_id,
                'collection_tab_id' => $page->tab_id,
                'name' => $page->page_name,
            ]);
        }
    }

    protected function collectionLogs(): void
    {
        foreach (DB::connection('old')->table('collection_log')->get() as $log) {
            CollectionLog::create([
                'member_id' => $log->member_id,
                'collection_page_id' => $log->page_id,
                'items' => $this->json($log->items),
                'counts' => $this->json($log->counts),
            ]);
        }

        foreach (DB::connection('old')->table('collection_log_new')->get() as $log) {
            NewCollectionLog::create([
                'member_id' => $log->member_id,
                'collection_page_id' => $log->page_id,
                'items' => $this->json($log->new_items),
            ]);
        }
    }

    protected function json(?string $json): ?array
    {
        if (is_null($json)) {
            return null;
        }

        return json_decode(strtr($json, [
            '{' => '[',
            '}' => ']',
        ]), flags: JSON_THROW_ON_ERROR);
    }
}
