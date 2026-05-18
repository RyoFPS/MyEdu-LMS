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
        $query = Assignment::with(['class', 'subject', 'teacher']);

        // Filter by role
        if ($user->role === 'student') {
            // Students see assignments for their class
            $query->where('class_id', $user->class_id)
                  ->where('is_published', true);
        } elseif ($user->role === 'teacher') {
            // Teachers see their own assignments
            $query->where('teacher_id', $user->id);
        }

        // Filter by class
        if ($request->has('class_id')) {
            $query->where('class_id', $request->class_id);
        }

        // Filter by subject
        if ($request->has('subject_id')) {
            $query->where('subject_id', $request->subject_id);
        }

        // Filter by status
        if ($request->has('status')) {
            $now = Carbon::now();
            switch ($request->status) {
                case 'upcoming':
                    $query->where('due_date', '>', $now);
                    break;
                case 'overdue':
                    $query->where('due_date', '<', $now);
                    break;
            }
        }

        $assignments = $query->orderBy('due_date', 'desc')->get();

        return response()->json([
            'success' => true,
            'data' => AssignmentResource::collection($assignments),
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
        ActivityLog::create([
            'user_id' => $request->user()->id,
            'action' => 'create',
            'model' => 'Assignment',
            'model_id' => $assignment->id,
            'description' => "Created assignment '{$assignment->title}'",
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Assignment created successfully',
            'data' => new AssignmentResource($assignment->load(['class', 'subject', 'teacher'])),
        ], 201);
    }

    /**
     * Display the specified assignment.
     */
    public function show(Request $request, $id): JsonResponse
    {
        $assignment = Assignment::with(['class', 'subject', 'teacher'])->findOrFail($id);
        $user = $request->user();

        // Check authorization
        if ($user->role === 'student' && $assignment->class_id !== $user->class_id) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized',
            ], 403);
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
        ActivityLog::create([
            'user_id' => $user->id,
            'action' => 'update',
            'model' => 'Assignment',
            'model_id' => $assignment->id,
            'description' => "Updated assignment '{$assignment->title}'",
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Assignment updated successfully',
            'data' => new AssignmentResource($assignment->load(['class', 'subject', 'teacher'])),
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
        ActivityLog::create([
            'user_id' => $user->id,
            'action' => 'delete',
            'model' => 'Assignment',
            'model_id' => $id,
            'description' => "Deleted assignment '{$title}'",
        ]);

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
        if ($assignment->class_id !== $student->class_id) {
            return response()->json([
                'success' => false,
                'message' => 'You are not enrolled in this class',
            ], 403);
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
        ActivityLog::create([
            'user_id' => $student->id,
            'action' => 'create',
            'model' => 'AssignmentSubmission',
            'model_id' => $submission->id,
            'description' => "Submitted assignment '{$assignment->title}'",
        ]);

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
        ActivityLog::create([
            'user_id' => $user->id,
            'action' => 'update',
            'model' => 'AssignmentSubmission',
            'model_id' => $submission->id,
            'description' => "Graded {$submission->student->name}'s submission for '{$submission->assignment->title}'",
        ]);

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
