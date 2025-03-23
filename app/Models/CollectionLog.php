<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CollectionLog extends Model
{
    protected $guarded = [];

    protected $casts = [
        'items' => 'array',
        'counts' => 'array',
    ];

    public function member(): BelongsTo
    {
        return $this->belongsTo(Member::class);
    }

    public function page(): BelongsTo
    {
        return $this->belongsTo(CollectionPage::class, 'collection_page_id');
    }
}
