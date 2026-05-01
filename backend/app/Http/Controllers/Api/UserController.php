<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreUserRequest;
use App\Http\Requests\UpdateUserRequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class UserController extends Controller
{
    /**
     * GET /api/users
     *
     * List all users with optional role, search, and date filters. Paginated.
     * Includes role counts (unaffected by filters).
     */
    public function index(Request $request): JsonResponse
    {
        $query = User::with(['subjects']);

        // Filter by role
        if ($request->filled('role')) {
            $query->where('role', $request->input('role'));
        }

        // Search by name or email
        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%");
            });
        }

        // Filter by joined date (created_at)
        if ($request->filled('joined_from')) {
            $query->whereDate('created_at', '>=', $request->input('joined_from'));
        }
        if ($request->filled('joined_to')) {
            $query->whereDate('created_at', '<=', $request->input('joined_to'));
        }

        // Filter by subject (for teachers)
        if ($request->filled('subject_id')) {
            $query->whereHas('subjects', function ($q) use ($request) {
                $q->where('subjects.id', $request->input('subject_id'));
            });
        }

        $users = $query->orderBy('name')->paginate($request->input('per_page', 15));

        // Role counts (unaffected by filters)
        $counts = [
            'total'   => User::count(),
            'admin'   => User::where('role', 'admin')->count(),
            'teacher' => User::where('role', 'teacher')->count(),
            'student' => User::where('role', 'student')->count(),
        ];

        return response()->json([
            'data'   => UserResource::collection($users),
            'meta'   => [
                'current_page' => $users->currentPage(),
                'last_page'    => $users->lastPage(),
                'per_page'     => $users->perPage(),
                'total'        => $users->total(),
            ],
            'counts' => $counts,
        ]);
    }

    /**
     * POST /api/users
     *
     * Create a new user (admin only).
     */
    public function store(StoreUserRequest $request): JsonResponse
    {
        $user = User::create($request->validated());

        // Sync subjects for teachers
        if ($user->isTeacher() && $request->has('subject_ids')) {
            $user->subjects()->sync($request->input('subject_ids', []));
        }

        $user->load('subjects');

        return response()->json([
            'message' => 'User berhasil dibuat.',
            'data'    => new UserResource($user),
        ], 201);
    }

    /**
     * GET /api/users/{id}
     *
     * Show a single user with their class relationships.
     */
    public function show(int $id): JsonResponse
    {
        $user = User::findOrFail($id);

        if ($user->isTeacher()) {
            $user->load(['teachingClasses', 'subjects']);
        } elseif ($user->isStudent()) {
            $user->load('enrolledClasses');
        }

        return response()->json([
            'data' => new UserResource($user),
        ]);
    }

    /**
     * PUT /api/users/{id}
     *
     * Update a user (admin only).
     */
    public function update(UpdateUserRequest $request, int $id): JsonResponse
    {
        $user = User::findOrFail($id);
        $user->update($request->validated());

        // Sync subjects for teachers
        if ($user->isTeacher() && $request->has('subject_ids')) {
            $user->subjects()->sync($request->input('subject_ids', []));
        } elseif (!$user->isTeacher()) {
            // If role changed away from teacher, detach all subjects
            $user->subjects()->detach();
        }

        $user->load('subjects');

        return response()->json([
            'message' => 'User berhasil diperbarui.',
            'data'    => new UserResource($user->fresh(['subjects'])),
        ]);
    }

    /**
     * DELETE /api/users/{id}
     *
     * Delete a user (admin only).
     */
    public function destroy(Request $request, int $id): JsonResponse
    {
        if (! $request->user()->isAdmin()) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        $user = User::findOrFail($id);

        // Prevent deleting yourself
        if ($user->id === $request->user()->id) {
            return response()->json([
                'message' => 'Tidak dapat menghapus akun sendiri.',
            ], 422);
        }

        $user->delete();

        return response()->json([
            'message' => 'User berhasil dihapus.',
        ]);
    }

    /**
     * GET /api/teachers
     *
     * List all teachers.
     */
    public function teachers(Request $request): JsonResponse
    {
        $query = User::where('role', 'teacher')->with('subjects');

        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where('name', 'like', "%{$search}%");
        }

        if ($request->filled('subject_id')) {
            $query->whereHas('subjects', function ($q) use ($request) {
                $q->where('subjects.id', $request->input('subject_id'));
            });
        }

        $teachers = $query->orderBy('name')->paginate($request->input('per_page', 15));

        return response()->json([
            'data' => UserResource::collection($teachers),
            'meta' => [
                'current_page' => $teachers->currentPage(),
                'last_page'    => $teachers->lastPage(),
                'per_page'     => $teachers->perPage(),
                'total'        => $teachers->total(),
            ],
        ]);
    }

    /**
     * GET /api/students
     *
     * List all students, optionally filtered by class.
     */
    public function students(Request $request): JsonResponse
    {
        $query = User::where('role', 'student');

        // Filter by class
        if ($request->filled('class_id')) {
            $classId = $request->input('class_id');
            $query->whereHas('enrolledClasses', function ($q) use ($classId) {
                $q->where('classes.id', $classId);
            });
        }

        // Filter to only students not enrolled in any class
        if ($request->boolean('unassigned')) {
            $query->whereDoesntHave('enrolledClasses');
        }

        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where('name', 'like', "%{$search}%");
        }

        $students = $query->orderBy('name')->paginate($request->input('per_page', 15));

        return response()->json([
            'data' => UserResource::collection($students),
            'meta' => [
                'current_page' => $students->currentPage(),
                'last_page'    => $students->lastPage(),
                'per_page'     => $students->perPage(),
                'total'        => $students->total(),
            ],
        ]);
    }
}
