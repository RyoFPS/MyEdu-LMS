<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreAssignmentRequest;
use App\Http\Requests\UpdateAssignmentRequest;
use App\Http\Requests\SubmitAssignmentRequest;
use App\Http\Requests\GradeSubmissionRequest;
use App\Http\Resources\AssignmentResource;
use App\Http\Resources\AssignmentSubmissionResource;
use App\Models\Assignment;
use App\Models\AssignmentSubmission;
use App\Models\ActivityLog;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Storage;
use Carbon\Carbon;

class AssignmentController extends Controller
{
    /**
     * Display a listing of assignments.
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $query = Assignment::with(['classRoom', 'subject', 'teacher:id,name']);

        if ($user->isStudent()) {
            $enrolledClassIds = $user->enrolledClasses()->pluck('classes.id');
            $query->whereIn('class_id', $enrolledClassIds)
                  ->where('is_published', true);
        } elseif ($user->isTeacher()) {
            $query->where('teacher_id', $user->id);
        }

        if ($request->filled('class_id')) {
            $query->where('class_id', $request->input('class_id'));
        }
        if ($request->filled('subject_id')) {
            $query->where('subject_id', $request->input('subject_id'));
        }
        if ($request->filled('search')) {
            $query->where('title', 'like', '%' . $request->input('search') . '%');
        }
        if ($request->filled('status')) {
            $now = Carbon::now();
            match ($request->input('status')) {
                'upcoming' => $query->where('due_date', '>', $now),
                'overdue'  => $query->where('due_date', '<', $now),
                default    => null,
            };
        }

        $perPage = $request->input('per_page', 12);
        $assignments = $query->orderBy('due_date', 'desc')->paginate($perPage);

        return response()->json([
            'data' => AssignmentResource::collection($assignments),
            'meta' => [
                'current_page' => $assignments->currentPage(),
                'last_page'    => $assignments->lastPage(),
                'per_page'     => $assignments->perPage(),
                'total'        => $assignments->total(),
            ],
        ]);
    }

    /**
     * Store a newly created assignment.
     */
    public function store(StoreAssignmentRequest $request): JsonResponse
    {
        $data = $request->validated();
        $data['teacher_id'] = $request->user()->id;

        // Handle file upload
        if ($request->hasFile('attachment')) {
            $file = $request->file('attachment');
            $fileName = time() . '_' . $file->getClientOriginalName();
            $filePath = $file->storeAs('assignments/attachments', $fileName, 'public');
            
            $data['file_path'] = $filePath;
            $data['file_name'] = $file->getClientOriginalName();
        }

        $assignment = Assignment::create($data);

        // Log activity
        ActivityLog::log(
            $request->user(),
            'create',
            'assignment',
            $assignment->title,
            "{$request->user()->name} created assignment '{$assignment->title}'.",
            $assignment->id,
            ['class_id' => $assignment->class_id],
            $request->ip()
        );

        return response()->json([
            'success' => true,
            'message' => 'Assignment created successfully',
            'data' => new AssignmentResource($assignment->load(['classRoom', 'subject', 'teacher'])),
        ], 201);
    }

    /**
     * Display the specified assignment.
     */
    public function show(Request $request, $id): JsonResponse
    {
        $assignment = Assignment::with(['classRoom', 'subject', 'teacher'])->findOrFail($id);
        $user = $request->user();

        // Check authorization
        if ($user->isStudent()) {
            $enrolledClassIds = $user->enrolledClasses()->pluck('classes.id')->toArray();
            if (!in_array($assignment->class_id, $enrolledClassIds)) {
                return response()->json(['success' => false, 'message' => 'You are not enrolled in this class.'], 403);
            }
        }

        return response()->json([
            'success' => true,
            'data' => new AssignmentResource($assignment),
        ]);
    }

    /**
     * Update the specified assignment.
     */
    public function update(UpdateAssignmentRequest $request, $id): JsonResponse
    {
        $assignment = Assignment::findOrFail($id);
        $user = $request->user();

        // Check authorization
        if ($user->role === 'teacher' && $assignment->teacher_id !== $user->id) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized',
            ], 403);
        }

        $data = $request->validated();

        // Handle file upload
        if ($request->hasFile('attachment')) {
            // Delete old file if exists
            if ($assignment->file_path) {
                Storage::disk('public')->delete($assignment->file_path);
            }

            $file = $request->file('attachment');
            $fileName = time() . '_' . $file->getClientOriginalName();
            $filePath = $file->storeAs('assignments/attachments', $fileName, 'public');
            
            $data['file_path'] = $filePath;
            $data['file_name'] = $file->getClientOriginalName();
        }

        $assignment->update($data);

        // Log activity
        ActivityLog::log(
            $user,
            'update',
            'assignment',
            $assignment->title,
            "{$user->name} updated assignment '{$assignment->title}'.",
            $assignment->id,
            null,
            $request->ip()
        );

        return response()->json([
            'success' => true,
            'message' => 'Assignment updated successfully',
            'data' => new AssignmentResource($assignment->load(['classRoom', 'subject', 'teacher'])),
        ]);
    }

    /**
     * Remove the specified assignment.
     */
    public function destroy(Request $request, $id): JsonResponse
    {
        $assignment = Assignment::findOrFail($id);
        $user = $request->user();

        // Check authorization
        if ($user->role === 'teacher' && $assignment->teacher_id !== $user->id) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized',
            ], 403);
        }

        $title = $assignment->title;

        // Delete assignment file if exists
        if ($assignment->file_path) {
            Storage::disk('public')->delete($assignment->file_path);
        }

        // Delete all submission files
        foreach ($assignment->submissions as $submission) {
            Storage::disk('public')->delete($submission->file_path);
        }

        $assignment->delete();

        // Log activity
        ActivityLog::log(
            $user,
            'delete',
            'assignment',
            $title,
            "{$user->name} deleted assignment '{$title}'.",
            (int) $id,
            null,
            $request->ip()
        );

        return response()->json([
            'success' => true,
            'message' => 'Assignment deleted successfully',
        ]);
    }

    /**
     * Submit an assignment.
     */
    public function submit(SubmitAssignmentRequest $request, $id): JsonResponse
    {
        $assignment = Assignment::findOrFail($id);
        $student = $request->user();

        // Check if student can submit
        if (!$assignment->canSubmit($student)) {
            return response()->json([
                'success' => false,
                'message' => 'You cannot submit this assignment',
            ], 403);
        }

        // Check if student is in the correct class
        $enrolledClassIds = $student->enrolledClasses()->pluck('classes.id')->toArray();
        if (!in_array($assignment->class_id, $enrolledClassIds)) {
            return response()->json(['success' => false, 'message' => 'You are not enrolled in this class.'], 403);
        }

        // Handle file upload
        $file = $request->file('file');
        $fileName = time() . '_' . $student->id . '_' . $file->getClientOriginalName();
        $filePath = $file->storeAs('assignments/submissions', $fileName, 'public');

        // Determine version number
        $version = 1;
        if ($assignment->allow_resubmission) {
            $lastSubmission = AssignmentSubmission::where('assignment_id', $assignment->id)
                ->where('student_id', $student->id)
                ->orderBy('version', 'desc')
                ->first();
            
            if ($lastSubmission) {
                $version = $lastSubmission->version + 1;
            }
        }

        // Create submission
        $submission = AssignmentSubmission::create([
            'assignment_id' => $assignment->id,
            'student_id' => $student->id,
            'file_path' => $filePath,
            'file_name' => $file->getClientOriginalName(),
            'file_size' => $file->getSize(),
            'submitted_at' => Carbon::now(),
            'is_late' => $assignment->isOverdue(),
            'version' => $version,
        ]);

        // Log activity
        ActivityLog::log(
            $student,
            'submit',
            'assignment',
            $assignment->title,
            "{$student->name} submitted assignment '{$assignment->title}'.",
            $assignment->id,
            ['submission_id' => $submission->id, 'is_late' => $submission->is_late],
            $request->ip()
        );

        return response()->json([
            'success' => true,
            'message' => 'Assignment submitted successfully',
            'data' => new AssignmentSubmissionResource($submission->load(['assignment', 'student'])),
        ], 201);
    }

    /**
     * Grade a submission.
     */
    public function grade(GradeSubmissionRequest $request, $id): JsonResponse
    {
        $submission = AssignmentSubmission::with(['assignment', 'student'])->findOrFail($id);
        $user = $request->user();

        // Check authorization
        if ($user->role === 'teacher' && $submission->assignment->teacher_id !== $user->id) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized',
            ], 403);
        }

        $submission->update([
            'score' => $request->score,
            'feedback' => $request->feedback,
            'graded_at' => Carbon::now(),
            'graded_by' => $user->id,
        ]);

        // Log activity
        ActivityLog::log(
            $user,
            'update',
            'assignment',
            $submission->assignment->title,
            "{$user->name} graded {$submission->student->name}'s submission for '{$submission->assignment->title}' with score {$submission->score}.",
            $submission->assignment_id,
            ['submission_id' => $submission->id, 'score' => $submission->score, 'student_id' => $submission->student_id],
            $request->ip()
        );

        return response()->json([
            'success' => true,
            'message' => 'Submission graded successfully',
            'data' => new AssignmentSubmissionResource($submission->load(['assignment', 'student', 'gradedBy'])),
        ]);
    }

    /**
     * Download a submission file.
     */
    public function download($id): JsonResponse
    {
        $submission = AssignmentSubmission::findOrFail($id);

        if (!Storage::disk('public')->exists($submission->file_path)) {
            return response()->json([
                'success' => false,
                'message' => 'File not found',
            ], 404);
        }

        return response()->download(
            Storage::disk('public')->path($submission->file_path),
            $submission->file_name
        );
    }

    /**
     * Download assignment attachment.
     */
    public function downloadAttachment($id): JsonResponse
    {
        $assignment = Assignment::findOrFail($id);

        if (!$assignment->file_path || !Storage::disk('public')->exists($assignment->file_path)) {
            return response()->json([
                'success' => false,
                'message' => 'File not found',
            ], 404);
        }

        return response()->download(
            Storage::disk('public')->path($assignment->file_path),
            $assignment->file_name
        );
    }

    /**
     * Get student's own submission.
     */
    public function mySubmission(Request $request, $id): JsonResponse
    {
        $assignment = Assignment::findOrFail($id);
        $student = $request->user();

        $submission = AssignmentSubmission::where('assignment_id', $assignment->id)
            ->where('student_id', $student->id)
            ->with(['assignment', 'student', 'gradedBy'])
            ->orderBy('version', 'desc')
            ->first();

        if (!$submission) {
            return response()->json([
                'success' => false,
                'message' => 'No submission found',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => new AssignmentSubmissionResource($submission),
        ]);
    }

    /**
     * Get all submissions for an assignment.
     */
    public function submissions(Request $request, $id): JsonResponse
    {
        $assignment = Assignment::findOrFail($id);
        $user = $request->user();

        // Check authorization
        if ($user->role === 'teacher' && $assignment->teacher_id !== $user->id) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized',
            ], 403);
        }

        // Get latest submission for each student
        $submissions = AssignmentSubmission::where('assignment_id', $assignment->id)
            ->with(['assignment', 'student', 'gradedBy'])
            ->whereIn('id', function($query) use ($assignment) {
                $query->selectRaw('MAX(id)')
                    ->from('assignment_submissions')
                    ->where('assignment_id', $assignment->id)
                    ->groupBy('student_id');
            })
            ->orderBy('submitted_at', 'desc')
            ->get();

        return response()->json([
            'success' => true,
            'data' => AssignmentSubmissionResource::collection($submissions),
        ]);
    }
}
