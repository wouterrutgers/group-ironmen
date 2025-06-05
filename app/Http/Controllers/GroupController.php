<?php

namespace App\Http\Controllers;

use App\Models\Group;
use App\Models\Member;
use Exception;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Ramsey\Uuid\Uuid;

class GroupController extends Controller
{
    public function createGroup(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string',
            'member_names' => 'required|array',
        ]);

        $group = Group::create([
            'name' => $validated['name'],
            'hash' => Uuid::uuid4(),
        ]);

        Member::create([
            'group_id' => $group->id,
            'name' => Member::SHARED_MEMBER,
        ]);

        foreach (array_filter($validated['member_names']) as $memberName) {
            Member::create([
                'group_id' => $group->id,
                'name' => $memberName,
            ]);
        }

        return response()->json([
            'name' => $validated['name'],
            'token' => $group->hash,
        ], 201);
    }

    public function getGroup(Request $request): JsonResponse
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
