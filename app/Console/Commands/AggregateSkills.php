<?php

namespace App\Console\Commands;

use App\Enums\AggregatePeriod;
use App\Models\AggregationInfo;
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
                    ['last_aggregation' => now()]
                );

                // Aggregate skills for each period
                $this->aggregateSkillsForPeriod(AggregatePeriod::Day, $lastAggregation);
                $this->aggregateSkillsForPeriod(AggregatePeriod::Month, $lastAggregation);
                $this->aggregateSkillsForPeriod(AggregatePeriod::Year, $lastAggregation);
            });

            $this->info('Skills data aggregated successfully.');
            return Command::SUCCESS;
        } catch (\Exception $e) {
            $this->error('Failed to aggregate skills data: ' . $e->getMessage());
            Log::error('Skills aggregation failed', [
                'exception' => $e
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
            ->value('last_aggregation');

        return $lastAggregation ?? \Carbon\Carbon::createFromTimestamp(0);
    }

    /**
     * Aggregate skills for a period
     */
    private function aggregateSkillsForPeriod(AggregatePeriod $period, \Carbon\Carbon $lastAggregation): void
    {
        $truncateFormat = $period->getTruncateFormat();

        $query = "
            INSERT INTO skill_stats (member_id, type, skills, created_at, updated_at)
            SELECT member_id, ".$period->value.", date_trunc('{$truncateFormat}', skills_last_update), skills, now(), now()
            FROM members
            WHERE skills_last_update IS NOT NULL
            AND skills IS NOT NULL
            AND skills_last_update >= ?
            ON CONFLICT (member_id, time)
            DO UPDATE SET skills=EXCLUDED.skills;
        ";

        DB::statement($query, [$lastAggregation]);
    }
}
