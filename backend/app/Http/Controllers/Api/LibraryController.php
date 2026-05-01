<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\SubjectMatterResource;
use App\Models\SubjectMatter;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class LibraryController extends Controller
{
    /**
     * GET /api/library
     *
     * Browse library materials (main/core curriculum).
     * All authenticated users can browse.
     * Students see their grade_level by default.
     */
    public function index(Request $request): JsonResponse
    {
        $query = SubjectMatter::with(['subject', 'uploader:id,name,role'])
            ->where('type', 'main')
            ->whereNull('class_id');

        // Filters — all explicit, no auto-filtering
        if ($request->filled('grade_level')) {
            $query->where('grade_level', $request->input('grade_level'));
        }

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

        $materials = $query->orderBy('grade_level')
                           ->orderByDesc('created_at')
                           ->paginate($request->input('per_page', 20));

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
     * POST /api/library
     *
     * Upload a library material (admin only).
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'title'       => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:1000'],
            'file'        => ['required', 'file', 'max:10240', 'mimes:pdf,doc,docx,ppt,pptx,xls,xlsx,jpg,jpeg,png,mp4,avi,webp,svg'],
            'grade_level' => ['required', 'string', 'max:50'],
            'subject_id'  => ['required', 'exists:subjects,id'],
        ]);

        $file = $request->file('file');
        $path = $file->store('library/' . $validated['grade_level'], 'public');

        if (!$path) {
            return response()->json(['message' => 'Gagal menyimpan file.'], 500);
        }

        $material = SubjectMatter::create([
            'title'       => $validated['title'],
            'description' => $validated['description'] ?? null,
            'file_path'   => $path,
            'file_name'   => pathinfo($file->getClientOriginalName(), PATHINFO_BASENAME),
            'file_size'   => $file->getSize(),
            'file_type'   => $file->getMimeType(),
            'type'        => 'main',
            'grade_level'  => $validated['grade_level'],
            'class_id'    => null,
            'subject_id'  => $validated['subject_id'],
            'uploaded_by'  => $request->user()->id,
        ]);

        $material->load(['subject', 'uploader:id,name,role']);

        return response()->json([
            'message' => 'Materi perpustakaan berhasil diunggah.',
            'data'    => new SubjectMatterResource($material),
        ], 201);
    }

    /**
     * POST /api/library/{id}/update
     *
     * Update a library material (admin only).
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $material = SubjectMatter::where('type', 'main')->whereNull('class_id')->findOrFail($id);

        $validated = $request->validate([
            'title'       => ['sometimes', 'required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:1000'],
            'file'        => ['nullable', 'file', 'max:10240', 'mimes:pdf,doc,docx,ppt,pptx,xls,xlsx,jpg,jpeg,png,mp4,avi,webp,svg'],
            'grade_level' => ['sometimes', 'required', 'string', 'max:50'],
            'subject_id'  => ['sometimes', 'required', 'exists:subjects,id'],
        ]);

        // Update file if provided
        if ($request->hasFile('file')) {
            if ($material->file_path && Storage::disk('public')->exists($material->file_path)) {
                Storage::disk('public')->delete($material->file_path);
            }

            $file = $request->file('file');
            $gradeLevel = $validated['grade_level'] ?? $material->grade_level;
            $path = $file->store('library/' . $gradeLevel, 'public');

            if (!$path) {
                return response()->json(['message' => 'Gagal menyimpan file.'], 500);
            }

            $material->file_path = $path;
            $material->file_name = pathinfo($file->getClientOriginalName(), PATHINFO_BASENAME);
            $material->file_size = $file->getSize();
            $material->file_type = $file->getMimeType();
        }

        if (isset($validated['title'])) $material->title = $validated['title'];
        if (array_key_exists('description', $validated)) $material->description = $validated['description'];
        if (isset($validated['grade_level'])) $material->grade_level = $validated['grade_level'];
        if (isset($validated['subject_id'])) $material->subject_id = $validated['subject_id'];

        $material->save();
        $material->load(['subject', 'uploader:id,name,role']);

        return response()->json([
            'message' => 'Materi perpustakaan berhasil diperbarui.',
            'data'    => new SubjectMatterResource($material),
        ]);
    }

    /**
     * DELETE /api/library/{id}
     *
     * Delete a library material (admin only).
     */
    public function destroy(int $id): JsonResponse
    {
        $material = SubjectMatter::where('type', 'main')->whereNull('class_id')->findOrFail($id);

        if ($material->file_path && Storage::disk('public')->exists($material->file_path)) {
            Storage::disk('public')->delete($material->file_path);
        }

        $material->delete();

        return response()->json([
            'message' => 'Materi perpustakaan berhasil dihapus.',
        ]);
    }

    /**
     * GET /api/library/grade-levels
     *
     * List distinct grade levels that have library materials.
     */
    public function gradeLevels(): JsonResponse
    {
        $levels = SubjectMatter::where('type', 'main')
            ->whereNull('class_id')
            ->whereNotNull('grade_level')
            ->distinct()
            ->orderBy('grade_level')
            ->pluck('grade_level');

        return response()->json(['data' => $levels]);
    }
}
