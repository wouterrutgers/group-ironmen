<?php

namespace App\Http\Middleware;

use App\Models\Group;
use Closure;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class AuthenticateGroup
{
    protected ?int $groupId = 1;

    public function handle(Request $request, Closure $next): mixed
    {
        if (! is_null($this->groupId)) {
            $group = Group::findOrFail($this->groupId);

            app()->instance('group', $group);

            return $next($request);
        }

        $routeGroup = $request->route('group');

        if (! $routeGroup) {
            return $this->badRequest('Missing group name from request');
        }

        if ($routeGroup === '_') {
            return $next($request);
        }

        $token = $request->header('Authorization');

        if (! $token) {
            return $this->badRequest('Authorization header missing from request');
        }

        $group = Group::where('name', '=', $routeGroup)
            ->where('hash', '=', $token)
            ->first();

        if (! $group) {
            return $this->unauthorized();
        }

        app()->instance('group', $group);

        return $next($request);
    }

    protected function badRequest(string $message): JsonResponse
    {
        return response()->json([
            'message' => $message,
        ], Response::HTTP_BAD_REQUEST);
    }

    protected function unauthorized(): JsonResponse
    {
        return response()->json([
            'message' => 'Unauthorized',
        ], Response::HTTP_UNAUTHORIZED);
    }
}
