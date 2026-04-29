<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreClassRequest;
use App\Http\Resources\ClassResource;
use App\Models\ClassRoom;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ClassController extends Controller
{
    /**
     * GET /api/classes
     *
     * List classes. Admins see all; teachers see their classes; students see enrolled classes.
     */
    public function index(Request $request): JsonResponse
    {
        $user  = $request->user();
        $query = ClassRoom::withCount(['students', 'teachers']);

        if ($user->isTeacher()) {
            // Teachers only see classes they are assigned to
            $query->whereHas('teachers', fn ($q) => $q->where('users.id', $user->id));
        } elseif ($user->isStudent()) {
            // Students only see classes they are enrolled in
            $query->whereHas('students', fn ($q) => $q->where('users.id', $user->id));
        }

        // Optional filters
        if ($request->filled('grade_level')) {
            $query->where('grade_level', $request->input('grade_level'));
        }
        if ($request->filled('academic_year')) {
            $query->where('academic_year', $request->input('academic_year'));
        }
        if ($request->filled('search')) {
            $query->where('name', 'like', '%' . $request->input('search') . '%');
        }

        $classes = $query->orderBy('name')->paginate($request->input('per_page', 15));

        return response()->json([
            'data' => ClassResource::collection($classes),
            'meta' => [
                'current_page' => $classes->currentPage(),
                'last_page'    => $classes->lastPage(),
                'per_page'     => $classes->perPage(),
                'total'        => $classes->total(),
            ],
        ]);
    }

    /**
     * POST /api/classes
     *
     * Create a new class (admin only — enforced by StoreClassRequest).
     */
    public function store(StoreClassRequest $request): JsonResponse
    {
        $classRoom = ClassRoom::create($request->validated());

        return response()->json([
            'message' => 'Kelas berhasil dibuat.',
            'data'    => new ClassResource($classRoom),
        ], 201);
    }

    /**
     * GET /api/classes/{id}
     *
     * Show a class with its teachers and students.
     */
    public function show(int $id): JsonResponse
    {
        $classRoom = ClassRoom::with(['teachers', 'students'])
            ->withCount(['students', 'teachers'])
            ->findOrFail($id);

        return response()->json([
            'data' => new ClassResource($classRoom),
        ]);
    }

    /**
     * PUT /api/classes/{id}
     *
     * Update a class (admin only).
     */
    public function update(Request $request, int $id): JsonResponse
    {
        if (! $request->user()->isAdmin()) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        $classRoom = ClassRoom::findOrFail($id);

        $validated = $request->validate([
            'name'          => ['sometimes', 'string', 'max:255'],
            'grade_level'   => ['sometimes', 'string', 'max:50'],
            'academic_year' => ['sometimes', 'string', 'max:20'],
        ]);

        $classRoom->update($validated);

        return response()->json([
            'message' => 'Kelas berhasil diperbarui.',
            'data'    => new ClassResource($classRoom->fresh()),
        ]);
    }

    /**
     * DELETE /api/classes/{id}
     *
     * Delete a class (admin only).
     */
    public function destroy(Request $request, int $id): JsonResponse
    {
        if (! $request->user()->isAdmin()) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        $classRoom = ClassRoom::findOrFail($id);
        $classRoom->delete();

        return response()->json([
            'message' => 'Kelas berhasil dihapus.',
        ]);
    }

    /**
     * POST /api/classes/{id}/assign-teacher
     *
     * Assign a teacher to a class with an optional subject.
     */
    public function assignTeacher(Request $request, int $id): JsonResponse
    {
        if (! $request->user()->isAdmin()) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        $validated = $request->validate([
            'teacher_id' => ['required', 'exists:users,id'],
            'subject'    => ['nullable', 'string', 'max:255'],
        ]);

        // Verify the user is actually a teacher
        $teacher = User::findOrFail($validated['teacher_id']);
        if (! $teacher->isTeacher()) {
            return response()->json([
                'message' => 'User yang dipilih bukan seorang guru.',
            ], 422);
        }

        $classRoom = ClassRoom::findOrFail($id);

        // Attach teacher (ignore if already attached with same subject)
        $classRoom->teachers()->syncWithoutDetaching([
            $validated['teacher_id'] => ['subject' => $validated['subject'] ?? null],
        ]);

        $classRoom->load('teachers');

        return response()->json([
            'message' => 'Guru berhasil ditambahkan ke kelas.',
            'data'    => new ClassResource($classRoom),
        ]);
    }

    /**
     * POST /api/classes/{id}/assign-student
     *
     * Assign a student to a class.
     */
    public function assignStudent(Request $request, int $id): JsonResponse
    {
        if (! $request->user()->isAdmin()) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        $validated = $request->validate([
            'student_id' => ['required', 'exists:users,id'],
        ]);

        // Verify the user is actually a student
        $student = User::findOrFail($validated['student_id']);
        if (! $student->isStudent()) {
            return response()->json([
                'message' => 'User yang dipilih bukan seorang siswa.',
            ], 422);
        }

        $classRoom = ClassRoom::findOrFail($id);
        $classRoom->students()->syncWithoutDetaching([$validated['student_id']]);

        $classRoom->load('students');

        return response()->json([
            'message' => 'Siswa berhasil ditambahkan ke kelas.',
            'data'    => new ClassResource($classRoom),
        ]);
    }

    /**
     * DELETE /api/classes/{id}/remove-teacher/{teacherId}
     *
     * Remove a teacher from a class.
     */
    public function removeTeacher(Request $request, int $id, int $teacherId): JsonResponse
    {
        if (! $request->user()->isAdmin()) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        $classRoom = ClassRoom::findOrFail($id);
        $classRoom->teachers()->detach($teacherId);

        return response()->json([
            'message' => 'Guru berhasil dihapus dari kelas.',
        ]);
    }

    /**
     * DELETE /api/classes/{id}/remove-student/{studentId}
     *
     * Remove a student from a class.
     */
    public function removeStudent(Request $request, int $id, int $studentId): JsonResponse
    {
        if (! $request->user()->isAdmin()) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        $classRoom = ClassRoom::findOrFail($id);
        $classRoom->students()->detach($studentId);

        return response()->json([
            'message' => 'Siswa berhasil dihapus dari kelas.',
        ]);
    }
}
