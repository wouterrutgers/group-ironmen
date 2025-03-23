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
            $this->error('Failed to apply skills retention: ' . $e->getMessage());
            Log::error('Skills retention failed', [
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
     * Apply retention policy for a period
     */
    private function applySkillsRetentionForPeriod(AggregatePeriod $period, \Carbon\Carbon $lastAggregation): void
    {
        $retentionInterval = $period->getRetentionInterval();

        $query = "
            DELETE FROM skill_stats
            WHERE created_at < (? - interval '{$retentionInterval}') AND (member_id, created_at) NOT IN (
              SELECT member_id, max(created_at) FROM skill_stats
              WHERE created_at < (? - interval '{$retentionInterval}') AND type = ?
              GROUP BY member_id
            ) and type = ?
        ";

        DB::statement($query, [$lastAggregation, $lastAggregation, $period->value, $period->value]);
    }
}
