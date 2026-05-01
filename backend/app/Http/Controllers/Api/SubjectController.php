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
     * List all subjects. Supports ?search= and ?category= filters.
     */
    public function index(Request $request): JsonResponse
    {
        $query = Subject::withCount('subjectMatters');

        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('code', 'like', "%{$search}%");
            });
        }

        if ($request->filled('category')) {
            $query->where('category', $request->input('category'));
        }

        $subjects = $query->orderBy('category')->orderBy('name')->get();

        return response()->json([
            'data' => $subjects->map(fn ($s) => [
                'id'                   => $s->id,
                'name'                 => $s->name,
                'code'                 => $s->code,
                'category'             => $s->category,
                'description'          => $s->description,
                'subject_matters_count' => $s->subject_matters_count,
                'created_at'           => $s->created_at?->toISOString(),
                'updated_at'           => $s->updated_at?->toISOString(),
            ]),
        ]);
    }

    /**
     * POST /api/subjects
     *
     * Create a new subject (admin only).
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name'        => ['required', 'string', 'max:255'],
            'code'        => ['required', 'string', 'max:20', 'unique:subjects,code'],
            'category'    => ['nullable', 'string', 'max:100'],
            'description' => ['nullable', 'string', 'max:500'],
        ]);

        $subject = Subject::create($validated);

        return response()->json([
            'message' => 'Mata pelajaran berhasil ditambahkan.',
            'data'    => [
                'id'          => $subject->id,
                'name'        => $subject->name,
                'code'        => $subject->code,
                'category'    => $subject->category,
                'description' => $subject->description,
                'created_at'  => $subject->created_at?->toISOString(),
            ],
        ], 201);
    }

    /**
     * PUT /api/subjects/{id}
     *
     * Update a subject (admin only).
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $subject = Subject::findOrFail($id);

        $validated = $request->validate([
            'name'        => ['sometimes', 'required', 'string', 'max:255'],
            'code'        => ['sometimes', 'required', 'string', 'max:20', 'unique:subjects,code,' . $subject->id],
            'category'    => ['nullable', 'string', 'max:100'],
            'description' => ['nullable', 'string', 'max:500'],
        ]);

        $subject->update($validated);

        return response()->json([
            'message' => 'Mata pelajaran berhasil diperbarui.',
            'data'    => [
                'id'          => $subject->id,
                'name'        => $subject->name,
                'code'        => $subject->code,
                'category'    => $subject->category,
                'description' => $subject->description,
                'updated_at'  => $subject->updated_at?->toISOString(),
            ],
        ]);
    }

    /**
     * DELETE /api/subjects/{id}
     *
     * Delete a subject (admin only).
     */
    public function destroy(int $id): JsonResponse
    {
        $subject = Subject::findOrFail($id);

        // Check if subject has materials
        if ($subject->subjectMatters()->exists()) {
            return response()->json([
                'message' => 'Tidak dapat menghapus mata pelajaran yang masih memiliki materi.',
            ], 422);
        }

        $subject->delete();

        return response()->json([
            'message' => 'Mata pelajaran berhasil dihapus.',
        ]);
    }

    /**
     * GET /api/subjects/categories
     *
     * List distinct categories for filtering.
     */
    public function categories(): JsonResponse
    {
        $categories = Subject::whereNotNull('category')
            ->where('category', '!=', '')
            ->distinct()
            ->orderBy('category')
            ->pluck('category');

        return response()->json([
            'data' => $categories,
        ]);
    }
}
