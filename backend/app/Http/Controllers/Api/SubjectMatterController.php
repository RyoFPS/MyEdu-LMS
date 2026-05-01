<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreSubjectMatterRequest;
use App\Http\Requests\UpdateSubjectMatterRequest;
use App\Http\Resources\SubjectMatterResource;
use App\Models\ClassRoom;
use App\Models\SubjectMatter;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class SubjectMatterController extends Controller
{
    /**
     * GET /api/classes/{classId}/subject-matters
     *
     * List subject matters for a class.
     * - Admin: sees all
     * - Teacher: sees materials for classes they teach
     * - Student: sees materials for classes they're enrolled in
     */
    public function index(Request $request, int $classId): JsonResponse
    {
        $user = $request->user();
        $class = ClassRoom::findOrFail($classId);

        // Authorization: check if user has access to this class
        if ($user->isTeacher()) {
            $teachesClass = $user->teachingClasses()->where('classes.id', $class->id)->exists();
            if (!$teachesClass) {
                return response()->json(['message' => 'Forbidden.'], 403);
            }
        } elseif ($user->isStudent()) {
            $enrolledInClass = $user->enrolledClasses()->where('classes.id', $class->id)->exists();
            if (!$enrolledInClass) {
                return response()->json(['message' => 'Forbidden.'], 403);
            }
        }

        $query = SubjectMatter::with(['subject', 'uploader:id,name,role'])
            ->where('class_id', $class->id)
            ->where('type', 'optional');

        // Filters
        if ($request->filled('subject_id')) {
            $query->where('subject_id', $request->input('subject_id'));
        }
        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%")
                  ->orWhere('file_name', 'like', "%{$search}%");
            });
        }

        $materials = $query->orderByDesc('created_at')
                           ->paginate($request->input('per_page', 15));

        return response()->json([
            'data' => SubjectMatterResource::collection($materials),
            'meta' => [
                'current_page' => $materials->currentPage(),
                'last_page'    => $materials->lastPage(),
                'per_page'     => $materials->perPage(),
                'total'        => $materials->total(),
            ],
        ]);
    }

    /**
     * POST /api/classes/{classId}/subject-matters
     *
     * Upload a new subject matter.
     * - Admin: can upload main & optional
     * - Teacher: can only upload optional (for classes they teach)
     */
    public function store(StoreSubjectMatterRequest $request, int $classId): JsonResponse
    {
        $user = $request->user();
        $class = ClassRoom::findOrFail($classId);

        // Teacher must be assigned to this class
        if ($user->isTeacher()) {
            $teachesClass = $user->teachingClasses()->where('classes.id', $class->id)->exists();
            if (!$teachesClass) {
                return response()->json(['message' => 'Anda tidak mengajar di kelas ini.'], 403);
            }
        }

        $file = $request->file('file');
        $path = $file->store('subject-matters/' . $class->id, 'public');

        if (!$path) {
            return response()->json(['message' => 'Gagal menyimpan file.'], 500);
        }

        $material = SubjectMatter::create([
            'title'       => $request->input('title'),
            'description' => $request->input('description'),
            'file_path'   => $path,
            'file_name'   => pathinfo($file->getClientOriginalName(), PATHINFO_BASENAME),
            'file_size'   => $file->getSize(),
            'file_type'   => $file->getMimeType(),
            'type'        => 'optional',
            'class_id'    => $class->id,
            'subject_id'  => $request->input('subject_id'),
            'uploaded_by'  => $user->id,
        ]);

        $material->load(['subject', 'uploader:id,name,role', 'classRoom']);

        // Notify students in the class
        $studentIds = $class->students()->pluck('users.id')->toArray();
        if (!empty($studentIds)) {
            \App\Models\Notification::notifyMany(
                $studentIds,
                'material',
                'notif.material_uploaded',
                'notif.material_uploaded',
                '/classes/' . $class->slug,
                ['material_id' => $material->id, 'class_id' => $class->id, 'material_title' => $material->title, 'class_name' => $class->name]
            );
        }

        \App\Models\ActivityLog::log(
            $request->user(),
            'upload',
            'material',
            $material->title,
            "{$request->user()->name} uploaded class material '{$material->title}' to class {$class->name}.",
            $material->id,
            ['class_id' => $class->id, 'file_name' => $material->file_name, 'file_size' => $material->file_size],
            $request->ip()
        );

        return response()->json([
            'message' => 'Materi berhasil diunggah.',
            'data'    => new SubjectMatterResource($material),
        ], 201);
    }

    /**
     * GET /api/subject-matters/{id}
     *
     * Show subject matter details.
     */
    public function show(Request $request, int $id): JsonResponse
    {
        $material = SubjectMatter::with(['subject', 'uploader:id,name,role', 'classRoom'])
            ->findOrFail($id);

        $user = $request->user();

        // Authorization
        if ($user->isTeacher()) {
            $teachesClass = $user->teachingClasses()->where('classes.id', $material->class_id)->exists();
            if (!$teachesClass) {
                return response()->json(['message' => 'Forbidden.'], 403);
            }
        } elseif ($user->isStudent()) {
            $enrolledInClass = $user->enrolledClasses()->where('classes.id', $material->class_id)->exists();
            if (!$enrolledInClass) {
                return response()->json(['message' => 'Forbidden.'], 403);
            }
        }

        return response()->json([
            'data' => new SubjectMatterResource($material),
        ]);
    }

    /**
     * POST /api/subject-matters/{id}
     *
     * Update subject matter (using POST with _method for file upload support).
     * - Admin: can update any
     * - Teacher: can only update their own optional materials
     */
    public function update(UpdateSubjectMatterRequest $request, int $id): JsonResponse
    {
        $material = SubjectMatter::findOrFail($id);
        $user = $request->user();

        // Authorization
        if ($user->isTeacher()) {
            // Teachers can only edit their own optional materials
            if ($material->uploaded_by !== $user->id) {
                return response()->json(['message' => 'Anda hanya dapat mengedit materi yang Anda unggah.'], 403);
            }
            if ($material->isMain()) {
                return response()->json(['message' => 'Guru tidak dapat mengedit materi utama.'], 403);
            }
            // Cannot change type to main
            if ($request->input('type') === 'main') {
                return response()->json(['message' => 'Guru tidak dapat mengubah tipe menjadi materi utama.'], 403);
            }
        }

        // Update file if provided
        if ($request->hasFile('file')) {
            // Delete old file
            if ($material->file_path && Storage::disk('public')->exists($material->file_path)) {
                Storage::disk('public')->delete($material->file_path);
            }

            $file = $request->file('file');
            $path = $file->store('subject-matters/' . $material->class_id, 'public');

            if (!$path) {
                return response()->json(['message' => 'Gagal menyimpan file.'], 500);
            }

            $material->file_path = $path;
            $material->file_name = pathinfo($file->getClientOriginalName(), PATHINFO_BASENAME);
            $material->file_size = $file->getSize();
            $material->file_type = $file->getMimeType();
        }

        // Update other fields
        if ($request->filled('title')) {
            $material->title = $request->input('title');
        }
        if ($request->has('description')) {
            $material->description = $request->input('description');
        }
        if ($request->filled('type') && $user->isAdmin()) {
            $material->type = $request->input('type');
        }
        if ($request->has('subject_id')) {
            $material->subject_id = $request->input('subject_id');
        }

        $material->save();
        $material->load(['subject', 'uploader:id,name,role', 'classRoom']);

        return response()->json([
            'message' => 'Materi berhasil diperbarui.',
            'data'    => new SubjectMatterResource($material),
        ]);
    }

    /**
     * DELETE /api/subject-matters/{id}
     *
     * Delete subject matter.
     * - Admin: can delete any
     * - Teacher: can only delete their own optional materials
     */
    public function destroy(Request $request, int $id): JsonResponse
    {
        $material = SubjectMatter::findOrFail($id);
        $user = $request->user();

        // Authorization
        if (!$user->isAdmin()) {
            if ($material->uploaded_by !== $user->id) {
                return response()->json(['message' => 'Forbidden.'], 403);
            }
            if ($material->isMain()) {
                return response()->json(['message' => 'Guru tidak dapat menghapus materi utama.'], 403);
            }
        }

        // Delete file from storage
        if ($material->file_path && Storage::disk('public')->exists($material->file_path)) {
            Storage::disk('public')->delete($material->file_path);
        }

        \App\Models\ActivityLog::log(
            $request->user(),
            'delete',
            'material',
            $material->title,
            "{$request->user()->name} deleted class material '{$material->title}'.",
            $material->id,
            null,
            $request->ip()
        );

        $material->delete();

        return response()->json([
            'message' => 'Materi berhasil dihapus.',
        ]);
    }

    /**
     * GET /api/subject-matters/{id}/download
     *
     * Download the file.
     */
    public function download(Request $request, int $id)
    {
        $material = SubjectMatter::findOrFail($id);
        $user = $request->user();

        // Authorization
        if ($user->isTeacher()) {
            $teachesClass = $user->teachingClasses()->where('classes.id', $material->class_id)->exists();
            if (!$teachesClass) {
                return response()->json(['message' => 'Forbidden.'], 403);
            }
        } elseif ($user->isStudent()) {
            $enrolledInClass = $user->enrolledClasses()->where('classes.id', $material->class_id)->exists();
            if (!$enrolledInClass) {
                return response()->json(['message' => 'Forbidden.'], 403);
            }
        }

        $filePath = Storage::disk('public')->path($material->file_path);

        if (!file_exists($filePath)) {
            return response()->json(['message' => 'File tidak ditemukan.'], 404);
        }

        return response()->download($filePath, $material->file_name);
    }

    /**
     * GET /api/subject-matters/{id}/preview
     *
     * Serve the file inline for in-browser viewing.
     */
    public function preview(Request $request, int $id)
    {
        $material = SubjectMatter::findOrFail($id);
        $user = $request->user();

        // Authorization
        if ($user->isTeacher()) {
            $teachesClass = $user->teachingClasses()->where('classes.id', $material->class_id)->exists();
            if (!$teachesClass) {
                return response()->json(['message' => 'Forbidden.'], 403);
            }
        } elseif ($user->isStudent()) {
            $enrolledInClass = $user->enrolledClasses()->where('classes.id', $material->class_id)->exists();
            if (!$enrolledInClass) {
                return response()->json(['message' => 'Forbidden.'], 403);
            }
        }

        if (!Storage::disk('public')->exists($material->file_path)) {
            return response()->json(['message' => 'File tidak ditemukan.'], 404);
        }

        $filePath = Storage::disk('public')->path($material->file_path);
        $mimeType = $material->file_type;

        return response()->file($filePath, [
            'Content-Type' => $mimeType,
            'Content-Disposition' => 'inline; filename="' . $material->file_name . '"',
        ]);
    }
}
