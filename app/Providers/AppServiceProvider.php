<?php

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        //
    }

    public function boot(): void
    {
        Model::shouldBeStrict();

        RateLimiter::for('global', function (Request $request) {
            $isExcluded = collect(
                ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg', 'css', 'js']
            )->contains(fn (string $extension) => str_ends_with(strtolower($request->path()), ".{$extension}"));

            if ($isExcluded) {
                return Limit::none();
            }

            return Limit::perMinute(180)->by($request->user()?->id ?: $request->ip());
        });
    }
}
