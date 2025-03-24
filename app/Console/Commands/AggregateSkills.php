<?php

namespace App\Console\Commands;

use App\Enums\AggregatePeriod;
use App\Models\AggregationInfo;
use App\Models\Member;
use App\Models\SkillStat;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class AggregateSkills extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'skills:aggregate';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Aggregate member skills data';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        try {
            DB::transaction(function () {
                $lastAggregation = $this->getLastSkillsAggregation();

                // Update the last aggregation time
                AggregationInfo::updateOrCreate(
                    ['type' => 'skills'],
                    ['updated_at' => now()]
                );

                // Aggregate skills for each period
                $this->aggregateSkillsForPeriod(AggregatePeriod::Day, $lastAggregation);
                $this->aggregateSkillsForPeriod(AggregatePeriod::Month, $lastAggregation);
                $this->aggregateSkillsForPeriod(AggregatePeriod::Year, $lastAggregation);
            });

            $this->info('Skills data aggregated successfully.');

            return Command::SUCCESS;
        } catch (\Exception $e) {
            $this->error('Failed to aggregate skills data: '.$e->getMessage());
            Log::error('Skills aggregation failed', [
                'exception' => $e,
            ]);

            return Command::FAILURE;
        }
    }

    /**
     * Get the last skills aggregation time
     */
    private function getLastSkillsAggregation(): \Carbon\Carbon
    {
        $lastAggregation = AggregationInfo::where('type', 'skills')
            ->value('updated_at');

        return $lastAggregation ?? \Carbon\Carbon::createFromTimestamp(0);
    }

    /**
     * Aggregate skills for a period
     */
    private function aggregateSkillsForPeriod(AggregatePeriod $period, \Carbon\Carbon $lastAggregation): void
    {
        $truncateFormat = match ($period) {
            AggregatePeriod::Day => 'hour',
            AggregatePeriod::Month => 'day',
            AggregatePeriod::Year => 'month',
        };

        // Using query builder with upsert
        $members = Member::whereNotNull('skills_last_update')
            ->whereNotNull('skills')
            ->where('skills_last_update', '>=', $lastAggregation)
            ->get();

        $skillStats = [];
        $now = now();

        foreach ($members as $member) {
            $time = DB::raw("date_trunc('$truncateFormat', skills_last_update)");

            // Extract the truncated time value for the unique key
            $timeValue = DB::selectOne(
                "SELECT date_trunc('$truncateFormat', ?) as time",
                [$member->skills_last_update]
            )->time;

            $skillStats[] = [
                'member_id' => $member->id,
                'type' => $period->value,
                'time' => $timeValue,
                'skills' => $member->skills,
                'created_at' => $now,
                'updated_at' => $now,
            ];
        }

        // Using upsert to handle conflicts
        if (! empty($skillStats)) {
            SkillStat::upsert(
                $skillStats,
                ['member_id', 'type', 'time'], // Unique key constraints
                ['skills', 'updated_at']       // Fields to update on conflict
            );
        }
    }
}
