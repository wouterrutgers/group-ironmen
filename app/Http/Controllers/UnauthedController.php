<?php

namespace App\Http\Controllers;

use App\Domain\GePrices;
use App\Models\Group;
use App\Models\Member;
use App\Domain\Validators;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Exception;

class UnauthedController extends Controller
{
    public function getGEPrices(): JsonResponse
    {
        return response()->json(GePrices::prices())
            ->header('Content-Type', 'application/json')
            ->header('Cache-Control', 'public, max-age=86400');
    }

    /**
     * Get collection log info
     */
    public function collectionLogInfo(): JsonResponse
    {
        $data = file_get_contents(storage_path('cache/collection_log_info.json'));

        return response()->json(json_decode($data))
            ->header('Content-Type', 'application/json');
    }
}
