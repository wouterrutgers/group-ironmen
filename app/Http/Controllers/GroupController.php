<?php

namespace App\Http\Controllers;

use App\Models\Group;
use App\Models\Member;
use Exception;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class GroupController extends Controller
{
    protected function createGroup(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string',
            'token' => 'required|string',
            'member_names' => 'required|array',
            'member_names.*' => 'string',
        ]);

        try {
            DB::transaction(function () use ($validated) {
                $group = Group::create([
                    'group_name' => $validated['name'],
                    'hash' => $validated['token'],
                ]);

                Member::create([
                    'group_id' => $group->group_id,
                    'member_name' => Member::SHARED_MEMBER,
                ]);

                foreach ($validated['member_names'] as $memberName) {
                    Member::create([
                        'group_id' => $group->group_id,
                        'member_name' => $memberName,
                    ]);
                }
            });

            return response()->json(['message' => 'Group created successfully'], 201);
        } catch (Exception $e) {
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    protected function getGroup(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'group_name' => 'required|string',
            'token' => 'required|string',
        ]);

        try {
            $group = Group::where('hash', '=', $validated['token'])
                ->where('group_name', '=', $validated['group_name'])
                ->first(['group_id']);

            if (is_null($group)) {
                return response()->json(['error' => 'Group not found'], 404);
            }

            return response()->json([
                'group_id' => $group->group_id,
            ]);
        } catch (Exception $e) {
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }
}
