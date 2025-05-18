<?php

namespace App\Console\Commands;

use App\Enums\AggregatePeriod;
use App\Models\AggregationInfo;
use Carbon\Carbon;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class ApplySkillsRetention extends Command
{
    protected $signature = 'skills:retention';

    protected $description = 'Apply retention policy to skills data';

    public function handle(): int
    {
        DB::transaction(function () {
            $lastAggregation = $this->getLastSkillsAggregation();

            $this->applySkillsRetentionForPeriod(AggregatePeriod::Day, $lastAggregation);
            $this->applySkillsRetentionForPeriod(AggregatePeriod::Month, $lastAggregation);
            $this->applySkillsRetentionForPeriod(AggregatePeriod::Year, $lastAggregation);
        });

        $this->info('Skills retention applied successfully.');

        return static::SUCCESS;
    }

    protected function getLastSkillsAggregation(): Carbon
    {
        $lastAggregation = AggregationInfo::where('type', '=', 'skills')
            ->value('updated_at');

        return $lastAggregation ? Carbon::parse($lastAggregation) : Carbon::createFromTimestamp(0);
    }

    protected function applySkillsRetentionForPeriod(AggregatePeriod $period, Carbon $lastAggregation): void
    {
        $retentionInterval = $this->getRetentionInterval($period);
        $periodValue = $period->value;

        $cutoff = $this->subtractInterval($lastAggregation, $retentionInterval);

        $subQuery = DB::table('skill_stats')
            ->select('member_id', DB::raw('MAX(created_at) as max_created_at'))
            ->where('type', '=', $periodValue)
            ->where('created_at', '<', $cutoff)
            ->groupBy('member_id');

        $idsToKeep = collect($subQuery->get())->map(function ($row) {
            return [
                'member_id' => $row->member_id,
                'created_at' => $row->max_created_at,
            ];
        });

        $query = DB::table('skill_stats')
            ->where('type', '=', $periodValue)
            ->where('created_at', '<', $cutoff);

        if ($idsToKeep->isNotEmpty()) {
            foreach ($idsToKeep as $keep) {
                $query->where(function ($q) use ($keep) {
                    $q->where('member_id', '!=', $keep['member_id'])
                        ->orWhere('created_at', '!=', $keep['created_at']);
                });
            }
        }

        $query->delete();
    }

    protected function getRetentionInterval(AggregatePeriod $period): string
    {
        return match ($period) {
            AggregatePeriod::Day => '1 day',
            AggregatePeriod::Month => '1 month',
            AggregatePeriod::Year => '1 year',
        };
    }

    protected function subtractInterval(Carbon $date, string $interval): string
    {
        [$amount, $unit] = explode(' ', $interval);

        $carbon = clone $date;
        match ($unit) {
            'day' => $carbon->subDays((int) $amount),
            'month' => $carbon->subMonths((int) $amount),
            'year' => $carbon->subYears((int) $amount),
            default => $carbon,
        };

        return $carbon->toDateTimeString();
    }
}
