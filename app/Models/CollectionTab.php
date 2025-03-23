<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CollectionTab extends Model
{
    protected $guarded = [];

    public function pages(): HasMany
    {
        return $this->hasMany(CollectionPage::class);
    }
}
