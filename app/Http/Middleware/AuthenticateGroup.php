<?php

namespace App\Http\Middleware;

use App\Models\Group;
use Closure;
use Exception;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class AuthenticateGroup
{
    protected ?int $groupId = 1;

    public function handle(Request $request, Closure $next): mixed
    {
        if (! is_null($this->groupId)) {
            app()->instance('group', Group::findOrFail($this->groupId));

            return $next($request);
        }

        $group = $request->route('group');

        if (! $group) {
            return response()->json([
                'message' => 'Missing group name from request',
            ], Response::HTTP_BAD_REQUEST);
        }

        if ($group !== '_') {
            $token = $request->header('Authorization');

            if (! $token) {
                return response()->json([
                    'message' => 'Authorization header missing from request',
                ], Response::HTTP_BAD_REQUEST);
            }

            try {
                $group = Group::where('name', '=', $group)
                    ->where('hash', '=', $token)
                    ->firstOrFail();

                app()->instance('group', $group);
            } catch (Exception) {
                return response()->json([
                    'message' => 'Unauthorized',
                ], Response::HTTP_UNAUTHORIZED);
            }
        }

        return $next($request);
    }
}
