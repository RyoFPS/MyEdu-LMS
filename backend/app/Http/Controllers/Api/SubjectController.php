<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Subject;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SubjectController extends Controller
{
    /**
     * GET /api/subjects
     *
     * List all subjects (for dropdown selections).
     */
    public function index(Request $request): JsonResponse
    {
        $query = Subject::query();

        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('code', 'like', "%{$search}%");
            });
        }

        $subjects = $query->orderBy('name')->get();

        return response()->json([
            'data' => $subjects->map(fn ($s) => [
                'id'   => $s->id,
                'name' => $s->name,
                'code' => $s->code,
            ]),
        ]);
    }
}
