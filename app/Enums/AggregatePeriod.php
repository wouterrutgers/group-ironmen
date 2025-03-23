<?php

namespace App\Enums;

enum AggregatePeriod: string
{
    case Day = 'day';
    case Month = 'month';
    case Year = 'year';

    /**
     * Get the date truncation format for SQL
     */
    public function getTruncateFormat(): string
    {
        return match ($this) {
            self::Day => 'hour',
            self::Month => 'day',
            self::Year => 'month',
        };
    }

    /**
     * Get the retention interval
     */
    public function getRetentionInterval(): string
    {
        return match ($this) {
            self::Day => '1 day',
            self::Month => '1 month',
            self::Year => '1 year',
        };
    }
}
