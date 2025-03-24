<?php

namespace App\Console\Commands;

use App\Enums\AggregatePeriod;
use App\Models\AggregationInfo;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class ApplySkillsRetention extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'skills:retention';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Apply retention policy to skills data';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        try {
            DB::transaction(function () {
                $lastAggregation = $this->getLastSkillsAggregation();

                // Apply retention policy for each period
                $this->applySkillsRetentionForPeriod(AggregatePeriod::Day, $lastAggregation);
                $this->applySkillsRetentionForPeriod(AggregatePeriod::Month, $lastAggregation);
                $this->applySkillsRetentionForPeriod(AggregatePeriod::Year, $lastAggregation);
            });

            $this->info('Skills retention applied successfully.');

            return Command::SUCCESS;
        } catch (\Exception $e) {
            $this->error('Failed to apply skills retention: '.$e->getMessage());
            Log::error('Skills retention failed', [
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
     * Apply retention policy for a period
     */
    private function applySkillsRetentionForPeriod(AggregatePeriod $period, \Carbon\Carbon $lastAggregation): void
    {
        $retentionPeriod = $this->getRetentionInterval($period);
        $periodValue = $period->value;

        // MySQL-compatible approach: Create a temp table of records to keep
        DB::statement("
            DELETE ss FROM skill_stats ss
            WHERE ss.type = ?
            AND ss.created_at < DATE_SUB(?, INTERVAL {$retentionPeriod})
            AND (ss.member_id, ss.created_at) NOT IN (
                SELECT member_id, MAX(created_at)
                FROM (
                    SELECT member_id, created_at
                    FROM skill_stats
                    WHERE type = ?
                    AND created_at < DATE_SUB(?, INTERVAL {$retentionPeriod})
                ) AS temp
                GROUP BY member_id
            )
        ", [$periodValue, $lastAggregation, $periodValue, $lastAggregation]);
    }

    /**
     * Get the retention interval for a period
     */
    private function getRetentionInterval(AggregatePeriod $period): string
    {
        return match ($period) {
            AggregatePeriod::Day => '1 DAY',
            AggregatePeriod::Month => '1 MONTH',
            AggregatePeriod::Year => '1 YEAR',
        };
    }
}
