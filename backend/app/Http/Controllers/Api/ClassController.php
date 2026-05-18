<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreClassRequest;
use App\Http\Resources\ClassResource;
use App\Models\ClassRoom;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class ClassController extends Controller
{
    /**
     * Find a class by slug or numeric ID.
     */
    private function findClass(string $identifier): ClassRoom
    {
        if (is_numeric($identifier)) {
            return ClassRoom::findOrFail((int) $identifier);
        }
        return ClassRoom::where('slug', $identifier)->firstOrFail();
    }

    /**
     * GET /api/classes
     *
     * List classes. Admins see all; teachers see their classes; students see enrolled classes.
     */
    public function index(Request $request): JsonResponse
    {
        $user  = $request->user();
        
        // Build cache key based on user role and filters
        $cacheKey = 'classes:index:' . $user->id . ':' . md5(json_encode([
            'grade_level' => $request->input('grade_level'),
            'academic_year' => $request->input('academic_year'),
            'search' => $request->input('search'),
            'per_page' => $request->input('per_page', 15),
            'page' => $request->input('page', 1),
        ]));
        
        return Cache::remember($cacheKey, 300, function () use ($request, $user) {
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
        });
    }

    /**
     * GET /api/classes/grade-levels
     *
     * Return distinct grade levels (for the class creation dropdown).
     * Admin only sees all; teachers/students see only their own.
     */
    public function gradeLevels(Request $request): JsonResponse
    {
        $user = $request->user();
        
        $cacheKey = 'classes:grade_levels:' . $user->id;
        
        return Cache::remember($cacheKey, 1800, function () use ($request, $user) {
            $query = ClassRoom::query();

            if ($user->isTeacher()) {
                $query->whereHas('teachers', fn ($q) => $q->where('users.id', $user->id));
            } elseif ($user->isStudent()) {
                $query->whereHas('students', fn ($q) => $q->where('users.id', $user->id));
            }

            $levels = $query->distinct()
                ->orderBy('grade_level')
                ->pluck('grade_level');

            return response()->json(['data' => $levels]);
        });
    }

    /**
     * POST /api/classes
     *
     * Create a new class (admin only — enforced by StoreClassRequest).
     */
    public function store(StoreClassRequest $request): JsonResponse
    {
        $classRoom = ClassRoom::create($request->validated());

        \App\Models\ActivityLog::log(
            $request->user(),
            'create',
            'class',
            $classRoom->name,
            "{$request->user()->name} created class '{$classRoom->name}' (Grade {$classRoom->grade_level}).",
            $classRoom->id,
            ['grade_level' => $classRoom->grade_level, 'academic_year' => $classRoom->academic_year],
            $request->ip()
        );

        // Clear cache
        $this->clearClassCache($request->user());

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
    public function show(string $id): JsonResponse
    {
        $classRoom = $this->findClass($id);
        $classRoom->load(['teachers.subjects', 'students']);
        $classRoom->loadCount(['students', 'teachers']);

        return response()->json([
            'data' => new ClassResource($classRoom),
        ]);
    }

    /**
     * PUT /api/classes/{id}
     *
     * Update a class (admin only).
     */
    public function update(Request $request, string $id): JsonResponse
    {
        if (! $request->user()->isAdmin()) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        $classRoom = $this->findClass($id);

        $validated = $request->validate([
            'name'          => ['sometimes', 'string', 'max:255'],
            'grade_level'   => ['sometimes', 'string', 'max:50'],
            'academic_year' => ['sometimes', 'string', 'max:20'],
        ]);

        $classRoom->update($validated);

        \App\Models\ActivityLog::log(
            $request->user(),
            'update',
            'class',
            $classRoom->name,
            "{$request->user()->name} updated class '{$classRoom->name}'.",
            $classRoom->id,
            null,
            $request->ip()
        );

        // Clear cache
        $this->clearClassCache($request->user());

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
    public function destroy(Request $request, string $id): JsonResponse
    {
        if (! $request->user()->isAdmin()) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        $classRoom = $this->findClass($id);

        \App\Models\ActivityLog::log(
            $request->user(),
            'delete',
            'class',
            $classRoom->name,
            "{$request->user()->name} deleted class '{$classRoom->name}'.",
            $classRoom->id,
            null,
            $request->ip()
        );

        $classRoom->delete();

        // Clear cache
        $this->clearClassCache($request->user());

        return response()->json([
            'message' => 'Kelas berhasil dihapus.',
        ]);
    }

    /**
     * POST /api/classes/{id}/assign-teacher
     *
     * Assign a teacher to a class with an optional subject.
     */
    public function assignTeacher(Request $request, string $id): JsonResponse
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

        $classRoom = $this->findClass($id);

        // Attach teacher (ignore if already attached with same subject)
        $classRoom->teachers()->syncWithoutDetaching([
            $validated['teacher_id'] => ['subject' => $validated['subject'] ?? null],
        ]);

        $classRoom->load('teachers');

        \App\Models\ActivityLog::log(
            $request->user(),
            'assign',
            'class',
            $classRoom->name,
            "{$request->user()->name} assigned teacher '{$teacher->name}' to class '{$classRoom->name}'.",
            $classRoom->id,
            ['teacher_id' => $teacher->id, 'teacher_name' => $teacher->name, 'subject' => $validated['subject'] ?? null],
            $request->ip()
        );

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
    public function assignStudent(Request $request, string $id): JsonResponse
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

        // Check if student is already enrolled in a class
        $currentClass = $student->enrolledClasses()->first();
        if ($currentClass) {
            return response()->json([
                'message' => 'Siswa sudah terdaftar di kelas "' . $currentClass->name . '". Hapus siswa dari kelas tersebut terlebih dahulu.',
            ], 422);
        }

        $classRoom = $this->findClass($id);
        $classRoom->students()->syncWithoutDetaching([$validated['student_id']]);

        // Notify the student
        \App\Models\Notification::create([
            'user_id' => $validated['student_id'],
            'type'    => 'class',
            'title'   => 'notif.added_to_class',
            'message' => 'notif.added_to_class',
            'link'    => '/classes/' . $classRoom->slug,
            'data'    => ['class_id' => $classRoom->id, 'class_name' => $classRoom->name],
        ]);

        $classRoom->load('students');

        \App\Models\ActivityLog::log(
            $request->user(),
            'assign',
            'class',
            $classRoom->name,
            "{$request->user()->name} added student '{$student->name}' to class '{$classRoom->name}'.",
            $classRoom->id,
            ['student_id' => $student->id, 'student_name' => $student->name],
            $request->ip()
        );

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
    public function removeTeacher(Request $request, string $id, int $teacherId): JsonResponse
    {
        if (! $request->user()->isAdmin()) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        $classRoom = $this->findClass($id);
        $classRoom->teachers()->detach($teacherId);

        \App\Models\ActivityLog::log(
            $request->user(),
            'remove',
            'class',
            $classRoom->name,
            "{$request->user()->name} removed a teacher from class '{$classRoom->name}'.",
            $classRoom->id,
            ['teacher_id' => $teacherId],
            $request->ip()
        );

        return response()->json([
            'message' => 'Guru berhasil dihapus dari kelas.',
        ]);
    }

    /**
     * DELETE /api/classes/{id}/remove-student/{studentId}
     *
     * Remove a student from a class.
     */
    public function removeStudent(Request $request, string $id, int $studentId): JsonResponse
    {
        if (! $request->user()->isAdmin()) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        $classRoom = $this->findClass($id);
        $classRoom->students()->detach($studentId);

        \App\Models\ActivityLog::log(
            $request->user(),
            'remove',
            'class',
            $classRoom->name,
            "{$request->user()->name} removed a student from class '{$classRoom->name}'.",
            $classRoom->id,
            ['student_id' => $studentId],
            $request->ip()
        );

        return response()->json([
            'message' => 'Siswa berhasil dihapus dari kelas.',
        ]);
    }

    /**
     * Clear class-related cache for all users.
     */
    private function clearClassCache(?User $user = null): void
    {
        // Clear cache patterns for classes
        Cache::forget('classes:grade_levels:' . ($user ? $user->id : '*'));
        
        // For index cache, we need to clear all variations
        // In production, consider using cache tags for better management
        $patterns = ['classes:index:*'];
        foreach ($patterns as $pattern) {
            // Note: This is a simple approach. For production, use Redis tags or similar
            if ($user) {
                Cache::forget('classes:index:' . $user->id);
            }
        }
    }
}
