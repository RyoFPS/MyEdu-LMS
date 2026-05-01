<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreQuizRequest;
use App\Http\Requests\SubmitQuizRequest;
use App\Http\Requests\UpdateQuizRequest;
use App\Http\Resources\QuizResource;
use App\Models\Quiz;
use App\Models\QuizAttempt;
use App\Models\QuizQuestion;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class QuizController extends Controller
{
    /**
     * GET /api/quizzes
     *
     * List quizzes.
     * - Teacher: sees quizzes they created
     * - Student: sees active quizzes for their enrolled classes
     * - Admin: sees all
     */
    public function index(Request $request): JsonResponse
    {
        $user  = $request->user();
        $query = Quiz::with(['teacher:id,name', 'classRoom', 'subject'])
                     ->withCount(['questions', 'attempts']);

        if ($user->isTeacher()) {
            $query->where('teacher_id', $user->id);
        } elseif ($user->isStudent()) {
            $enrolledClassIds = $user->enrolledClasses()->pluck('classes.id');
            $query->whereIn('class_id', $enrolledClassIds)
                  ->where('is_active', true)
                  ->where(function ($q) {
                      $q->whereNull('end_time')
                        ->orWhere('end_time', '>', now());
                  });
        }

        // Filters
        if ($request->filled('class_id')) {
            $query->where('class_id', $request->input('class_id'));
        }
        if ($request->filled('is_active')) {
            $query->where('is_active', filter_var($request->input('is_active'), FILTER_VALIDATE_BOOLEAN));
        }
        if ($request->filled('subject_id')) {
            $query->where('subject_id', $request->input('subject_id'));
        }
        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%");
            });
        }

        $quizzes = $query->orderByDesc('created_at')
                         ->paginate($request->input('per_page', 15));

        return response()->json([
            'data' => QuizResource::collection($quizzes),
            'meta' => [
                'current_page' => $quizzes->currentPage(),
                'last_page'    => $quizzes->lastPage(),
                'per_page'     => $quizzes->perPage(),
                'total'        => $quizzes->total(),
            ],
        ]);
    }

    /**
     * POST /api/quizzes
     *
     * Create a new quiz with optional questions (teacher only — enforced by StoreQuizRequest).
     */
    public function store(StoreQuizRequest $request): JsonResponse
    {
        $quiz = DB::transaction(function () use ($request) {
            $quiz = Quiz::create([
                'title'            => $request->input('title'),
                'description'      => $request->input('description'),
                'class_id'         => $request->input('class_id'),
                'subject_id'       => $request->input('subject_id'),
                'teacher_id'       => $request->user()->id,
                'duration_minutes' => $request->input('duration_minutes'),
                'is_active'        => $request->boolean('is_active', false),
                'max_attempts'     => $request->input('max_attempts', 1),
                'start_time'       => $request->input('start_time'),
                'end_time'         => $request->input('end_time'),
            ]);

            // Create questions if provided
            if ($request->has('questions')) {
                foreach ($request->input('questions') as $q) {
                    $quiz->questions()->create([
                        'question'       => $q['question'],
                        'option_a'       => $q['option_a'],
                        'option_b'       => $q['option_b'],
                        'option_c'       => $q['option_c'],
                        'option_d'       => $q['option_d'],
                        'correct_answer' => $q['correct_answer'],
                        'points'         => $q['points'] ?? 1,
                    ]);
                }
            }

            return $quiz;
        });

        $quiz->load(['questions', 'classRoom', 'teacher:id,name']);

        return response()->json([
            'message' => 'Kuis berhasil dibuat.',
            'data'    => new QuizResource($quiz),
        ], 201);
    }

    /**
     * GET /api/quizzes/{id}
     *
     * Show quiz details with questions.
     */
    public function show(Request $request, int $id): JsonResponse
    {
        $quiz = Quiz::with(['questions', 'classRoom', 'teacher:id,name', 'subject'])
                    ->withCount(['questions', 'attempts'])
                    ->findOrFail($id);

        $user = $request->user();

        // Students can only see quizzes for their enrolled classes
        if ($user->isStudent()) {
            $enrolledClassIds = $user->enrolledClasses()->pluck('classes.id');
            if (! $enrolledClassIds->contains($quiz->class_id)) {
                return response()->json(['message' => 'Forbidden.'], 403);
            }
        }

        // Teachers can only see their own quizzes
        if ($user->isTeacher() && $quiz->teacher_id !== $user->id) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        return response()->json([
            'data' => new QuizResource($quiz),
        ]);
    }

    /**
     * PUT /api/quizzes/{id}
     *
     * Update a quiz and optionally its questions (teacher only).
     */
    public function update(UpdateQuizRequest $request, int $id): JsonResponse
    {
        $quiz = Quiz::findOrFail($id);

        // Only the quiz creator can update
        if ($quiz->teacher_id !== $request->user()->id) {
            return response()->json(['message' => 'Forbidden. Hanya pembuat kuis yang dapat mengedit.'], 403);
        }

        DB::transaction(function () use ($request, $quiz) {
            $quiz->update($request->only([
                'title', 'description', 'class_id', 'subject_id', 'duration_minutes',
                'is_active', 'max_attempts', 'start_time', 'end_time',
            ]));

            // Update questions if provided
            if ($request->has('questions')) {
                // Remove old questions that are not in the update
                $keepIds = collect($request->input('questions'))
                    ->pluck('id')
                    ->filter()
                    ->toArray();

                $quiz->questions()->whereNotIn('id', $keepIds)->delete();

                foreach ($request->input('questions') as $q) {
                    if (isset($q['id'])) {
                        // Update existing question
                        QuizQuestion::where('id', $q['id'])
                            ->where('quiz_id', $quiz->id)
                            ->update([
                                'question'       => $q['question'],
                                'option_a'       => $q['option_a'],
                                'option_b'       => $q['option_b'],
                                'option_c'       => $q['option_c'],
                                'option_d'       => $q['option_d'],
                                'correct_answer' => $q['correct_answer'],
                                'points'         => $q['points'] ?? 1,
                            ]);
                    } else {
                        // Create new question
                        $quiz->questions()->create([
                            'question'       => $q['question'],
                            'option_a'       => $q['option_a'],
                            'option_b'       => $q['option_b'],
                            'option_c'       => $q['option_c'],
                            'option_d'       => $q['option_d'],
                            'correct_answer' => $q['correct_answer'],
                            'points'         => $q['points'] ?? 1,
                        ]);
                    }
                }
            }
        });

        $quiz->load(['questions', 'classRoom', 'teacher:id,name']);

        return response()->json([
            'message' => 'Kuis berhasil diperbarui.',
            'data'    => new QuizResource($quiz->fresh(['questions', 'classRoom', 'teacher'])),
        ]);
    }

    /**
     * DELETE /api/quizzes/{id}
     *
     * Delete a quiz (teacher who created it, or admin).
     */
    public function destroy(Request $request, int $id): JsonResponse
    {
        $quiz = Quiz::findOrFail($id);
        $user = $request->user();

        if (! $user->isAdmin() && $quiz->teacher_id !== $user->id) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        $quiz->delete();

        return response()->json([
            'message' => 'Kuis berhasil dihapus.',
        ]);
    }

    /**
     * POST /api/quizzes/{id}/start
     *
     * Start a quiz attempt (student only).
     */
    public function start(Request $request, int $id): JsonResponse
    {
        $user = $request->user();

        $quiz = Quiz::with('questions')->findOrFail($id);

        // Check if quiz is active
        if (! $quiz->is_active) {
            return response()->json(['message' => 'Kuis belum aktif.'], 422);
        }

        // Check time window
        $now = now();
        if ($quiz->start_time && $now->lt($quiz->start_time)) {
            return response()->json(['message' => 'Kuis belum dimulai.'], 422);
        }
        if ($quiz->end_time && $now->gt($quiz->end_time)) {
            // Auto-deactivate expired quiz
            if ($quiz->is_active) {
                $quiz->update(['is_active' => false]);
            }
            return response()->json(['message' => 'Kuis sudah berakhir.'], 422);
        }

        // Check if student is enrolled in the class
        $enrolledClassIds = $user->enrolledClasses()->pluck('classes.id');
        if (! $enrolledClassIds->contains($quiz->class_id)) {
            return response()->json(['message' => 'Anda tidak terdaftar di kelas ini.'], 403);
        }

        // Check existing attempts
        $attemptCount = QuizAttempt::where('quiz_id', $quiz->id)
            ->where('student_id', $user->id)
            ->count();

        $completedAttempts = QuizAttempt::where('quiz_id', $quiz->id)
            ->where('student_id', $user->id)
            ->whereNotNull('completed_at')
            ->count();

        // Check if there's an in-progress attempt
        $inProgressAttempt = QuizAttempt::where('quiz_id', $quiz->id)
            ->where('student_id', $user->id)
            ->whereNull('completed_at')
            ->first();

        if ($inProgressAttempt) {
            // Return existing in-progress attempt
            return response()->json([
                'message' => 'Melanjutkan kuis yang sedang dikerjakan.',
                'data'    => [
                    'attempt_id'       => $inProgressAttempt->id,
                    'attempt_number'   => $attemptCount,
                    'max_attempts'     => $quiz->max_attempts,
                    'started_at'       => $inProgressAttempt->started_at?->toISOString(),
                    'duration_minutes' => $quiz->duration_minutes,
                    'quiz'             => [
                        'id'               => $quiz->id,
                        'title'            => $quiz->title,
                        'description'      => $quiz->description,
                        'duration_minutes' => $quiz->duration_minutes,
                        'max_attempts'     => $quiz->max_attempts,
                    ],
                    'questions'        => $quiz->questions->map(fn ($q) => [
                        'id'       => $q->id,
                        'question' => $q->question,
                        'option_a' => $q->option_a,
                        'option_b' => $q->option_b,
                        'option_c' => $q->option_c,
                        'option_d' => $q->option_d,
                        'points'   => $q->points,
                    ]),
                ],
            ]);
        }

        // Check if max attempts reached (0 = unlimited)
        if ($quiz->max_attempts > 0 && $completedAttempts >= $quiz->max_attempts) {
            return response()->json([
                'message' => 'Anda sudah mencapai batas maksimal percobaan untuk kuis ini.',
                'data'    => [
                    'completed_attempts' => $completedAttempts,
                    'max_attempts'       => $quiz->max_attempts,
                ],
            ], 422);
        }

        // Create new attempt
        $totalPoints = $quiz->questions->sum('points');
        $attempt = QuizAttempt::create([
            'quiz_id'      => $quiz->id,
            'student_id'   => $user->id,
            'score'        => 0,
            'total_points' => $totalPoints,
            'started_at'   => now(),
        ]);

        return response()->json([
            'message' => 'Kuis dimulai.',
            'data'    => [
                'attempt_id'       => $attempt->id,
                'attempt_number'   => $completedAttempts + 1,
                'max_attempts'     => $quiz->max_attempts,
                'started_at'       => $attempt->started_at->toISOString(),
                'duration_minutes' => $quiz->duration_minutes,
                'quiz'             => [
                    'id'               => $quiz->id,
                    'title'            => $quiz->title,
                    'description'      => $quiz->description,
                    'duration_minutes' => $quiz->duration_minutes,
                    'max_attempts'     => $quiz->max_attempts,
                ],
                'questions'        => $quiz->questions->map(fn ($q) => [
                    'id'       => $q->id,
                    'question' => $q->question,
                    'option_a' => $q->option_a,
                    'option_b' => $q->option_b,
                    'option_c' => $q->option_c,
                    'option_d' => $q->option_d,
                    'points'   => $q->points,
                ]),
            ],
        ], 201);
    }

    /**
     * POST /api/quizzes/{id}/submit
     *
     * Submit quiz answers (student only).
     */
    public function submit(SubmitQuizRequest $request, int $id): JsonResponse
    {
        $user = $request->user();
        $quiz = Quiz::with('questions')->findOrFail($id);

        // Find the active attempt
        $attempt = QuizAttempt::where('quiz_id', $quiz->id)
            ->where('student_id', $user->id)
            ->whereNull('completed_at')
            ->first();

        if (! $attempt) {
            return response()->json([
                'message' => 'Tidak ada kuis yang sedang dikerjakan. Mulai kuis terlebih dahulu.',
            ], 422);
        }

        // Check if time has expired
        $deadline = $attempt->started_at->addMinutes($quiz->duration_minutes);
        if (now()->gt($deadline->addMinutes(1))) { // 1 minute grace period
            $attempt->update(['completed_at' => $deadline]);
            return response()->json([
                'message' => 'Waktu pengerjaan kuis telah habis.',
            ], 422);
        }

        // Process answers
        $score = 0;
        $answers = $request->input('answers');

        DB::transaction(function () use ($quiz, $attempt, $answers, &$score) {
            // Build a lookup of correct answers
            $questionMap = $quiz->questions->keyBy('id');

            foreach ($answers as $answer) {
                $question = $questionMap->get($answer['quiz_question_id']);
                if (! $question) {
                    continue;
                }

                $isCorrect = $question->correct_answer === $answer['selected_answer'];
                if ($isCorrect) {
                    $score += $question->points;
                }

                $attempt->answers()->updateOrCreate(
                    ['quiz_question_id' => $answer['quiz_question_id']],
                    [
                        'selected_answer' => $answer['selected_answer'],
                        'is_correct'      => $isCorrect,
                    ]
                );
            }

            $attempt->update([
                'score'        => $score,
                'completed_at' => now(),
            ]);
        });

        $attempt->refresh();
        $attempt->load('answers.question');

        return response()->json([
            'message' => 'Kuis berhasil dikumpulkan.',
            'data'    => [
                'attempt_id'   => $attempt->id,
                'score'        => $attempt->score,
                'total_points' => $attempt->total_points,
                'percentage'   => $attempt->total_points > 0
                    ? round($attempt->score / $attempt->total_points * 100, 1)
                    : 0,
                'started_at'   => $attempt->started_at?->toISOString(),
                'completed_at' => $attempt->completed_at?->toISOString(),
                'answers'      => $attempt->answers->map(fn ($a) => [
                    'question_id'     => $a->quiz_question_id,
                    'question'        => $a->question?->question,
                    'selected_answer' => $a->selected_answer,
                    'correct_answer'  => $a->question?->correct_answer,
                    'is_correct'      => $a->is_correct,
                    'points'          => $a->question?->points,
                ]),
            ],
        ]);
    }

    /**
     * GET /api/quizzes/{id}/results
     *
     * Get quiz results.
     * - Teacher: sees all student attempts
     * - Student: sees only their own result
     * - Admin: sees all
     */
    public function results(Request $request, int $id): JsonResponse
    {
        $quiz = Quiz::with('questions')->findOrFail($id);
        $user = $request->user();

        if ($user->isStudent()) {
            // Student sees only their own result
            $attempt = QuizAttempt::with('answers.question')
                ->where('quiz_id', $quiz->id)
                ->where('student_id', $user->id)
                ->first();

            if (! $attempt) {
                return response()->json([
                    'message' => 'Anda belum mengerjakan kuis ini.',
                ], 404);
            }

            return response()->json([
                'data' => [
                    'quiz_id'      => $quiz->id,
                    'quiz_title'   => $quiz->title,
                    'attempt'      => [
                        'id'           => $attempt->id,
                        'score'        => $attempt->score,
                        'total_points' => $attempt->total_points,
                        'percentage'   => $attempt->total_points > 0
                            ? round($attempt->score / $attempt->total_points * 100, 1)
                            : 0,
                        'started_at'   => $attempt->started_at?->toISOString(),
                        'completed_at' => $attempt->completed_at?->toISOString(),
                        'answers'      => $attempt->answers->map(fn ($a) => [
                            'question_id'     => $a->quiz_question_id,
                            'question'        => $a->question?->question,
                            'selected_answer' => $a->selected_answer,
                            'correct_answer'  => $a->question?->correct_answer,
                            'is_correct'      => $a->is_correct,
                            'points'          => $a->question?->points,
                        ]),
                    ],
                ],
            ]);
        }

        // Teacher or Admin: see all attempts
        if ($user->isTeacher() && $quiz->teacher_id !== $user->id) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        $attempts = QuizAttempt::with(['student:id,name,email', 'answers'])
            ->where('quiz_id', $quiz->id)
            ->orderByDesc('score')
            ->get();

        $totalStudents  = $attempts->count();
        $completedCount = $attempts->whereNotNull('completed_at')->count();
        $averageScore   = $totalStudents > 0 ? round($attempts->avg('score'), 1) : 0;
        $highestScore   = $attempts->max('score') ?? 0;
        $lowestScore    = $completedCount > 0
            ? $attempts->whereNotNull('completed_at')->min('score')
            : 0;

        return response()->json([
            'data' => [
                'quiz_id'         => $quiz->id,
                'quiz_title'      => $quiz->title,
                'total_points'    => $quiz->questions->sum('points'),
                'total_students'  => $totalStudents,
                'completed_count' => $completedCount,
                'average_score'   => $averageScore,
                'highest_score'   => $highestScore,
                'lowest_score'    => $lowestScore,
                'attempts'        => $attempts->map(fn ($a) => [
                    'id'           => $a->id,
                    'student'      => [
                        'id'    => $a->student?->id,
                        'name'  => $a->student?->name,
                        'email' => $a->student?->email,
                    ],
                    'score'        => $a->score,
                    'total_points' => $a->total_points,
                    'percentage'   => $a->total_points > 0
                        ? round($a->score / $a->total_points * 100, 1)
                        : 0,
                    'started_at'   => $a->started_at?->toISOString(),
                    'completed_at' => $a->completed_at?->toISOString(),
                ]),
            ],
        ]);
    }
}
