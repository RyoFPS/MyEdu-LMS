<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Attendance;
use App\Models\ClassRoom;
use App\Models\Quiz;
use App\Models\QuizAttempt;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    /**
     * GET /api/dashboard
     *
     * Return role-specific dashboard statistics.
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        return match ($user->role) {
            'admin'   => $this->adminDashboard(),
            'teacher' => $this->teacherDashboard($user),
            'student' => $this->studentDashboard($user),
            default   => response()->json(['message' => 'Unknown role.'], 403),
        };
    }

    /**
     * Admin dashboard: system-wide overview.
     */
    private function adminDashboard(): JsonResponse
    {
        $totalUsers    = User::count();
        $totalTeachers = User::where('role', 'teacher')->count();
        $totalStudents = User::where('role', 'student')->count();
        $totalClasses  = ClassRoom::count();
        $totalQuizzes  = Quiz::count();

        // Today's attendance summary
        $todayAttendance = Attendance::whereDate('date', today())
            ->select('status', DB::raw('COUNT(*) as count'))
            ->groupBy('status')
            ->pluck('count', 'status');

        // Recent users
        $recentUsers = User::orderByDesc('created_at')
            ->take(5)
            ->get(['id', 'name', 'email', 'role', 'created_at']);

        return response()->json([
            'data' => [
                'role'             => 'admin',
                'total_users'      => $totalUsers,
                'total_teachers'   => $totalTeachers,
                'total_students'   => $totalStudents,
                'total_classes'    => $totalClasses,
                'total_quizzes'    => $totalQuizzes,
                'today_attendance' => [
                    'present' => $todayAttendance->get('present', 0),
                    'absent'  => $todayAttendance->get('absent', 0),
                    'late'    => $todayAttendance->get('late', 0),
                    'excused' => $todayAttendance->get('excused', 0),
                ],
                'recent_users'     => $recentUsers,
            ],
        ]);
    }

    /**
     * Teacher dashboard: classes, quizzes, and attendance for their classes.
     */
    private function teacherDashboard(User $user): JsonResponse
    {
        $classIds = $user->teachingClasses()->pluck('classes.id');

        $totalClasses  = $classIds->count();
        $totalStudents = DB::table('class_student')
            ->whereIn('class_id', $classIds)
            ->distinct('student_id')
            ->count('student_id');

        $totalQuizzes  = Quiz::where('teacher_id', $user->id)->count();
        $activeQuizzes = Quiz::where('teacher_id', $user->id)->where('is_active', true)->count();

        // Today's attendance for teacher's classes
        $todayAttendance = Attendance::whereIn('class_id', $classIds)
            ->whereDate('date', today())
            ->select('status', DB::raw('COUNT(*) as count'))
            ->groupBy('status')
            ->pluck('count', 'status');

        // Recent quiz results
        $recentAttempts = QuizAttempt::whereHas('quiz', fn ($q) => $q->where('teacher_id', $user->id))
            ->with(['student:id,name', 'quiz:id,title'])
            ->whereNotNull('completed_at')
            ->orderByDesc('completed_at')
            ->take(5)
            ->get()
            ->map(fn ($a) => [
                'student_name' => $a->student?->name,
                'quiz_title'   => $a->quiz?->title,
                'score'        => $a->score,
                'total_points' => $a->total_points,
                'completed_at' => $a->completed_at?->toISOString(),
            ]);

        return response()->json([
            'data' => [
                'role'             => 'teacher',
                'total_classes'    => $totalClasses,
                'total_students'   => $totalStudents,
                'total_quizzes'    => $totalQuizzes,
                'active_quizzes'   => $activeQuizzes,
                'today_attendance' => [
                    'present' => $todayAttendance->get('present', 0),
                    'absent'  => $todayAttendance->get('absent', 0),
                    'late'    => $todayAttendance->get('late', 0),
                    'excused' => $todayAttendance->get('excused', 0),
                ],
                'recent_attempts'  => $recentAttempts,
            ],
        ]);
    }

    /**
     * Student dashboard: enrolled classes, upcoming quizzes, attendance stats.
     */
    private function studentDashboard(User $user): JsonResponse
    {
        $classIds = $user->enrolledClasses()->pluck('classes.id');

        $totalClasses = $classIds->count();

        // Attendance stats for this student
        $attendanceStats = Attendance::where('user_id', $user->id)
            ->select('status', DB::raw('COUNT(*) as count'))
            ->groupBy('status')
            ->pluck('count', 'status');

        $totalAttendance = $attendanceStats->sum();
        $attendanceRate  = $totalAttendance > 0
            ? round(($attendanceStats->get('present', 0) + $attendanceStats->get('late', 0)) / $totalAttendance * 100, 1)
            : 0;

        // Active quizzes available
        $availableQuizzes = Quiz::whereIn('class_id', $classIds)
            ->where('is_active', true)
            ->whereDoesntHave('attempts', fn ($q) => $q->where('student_id', $user->id)->whereNotNull('completed_at'))
            ->with('classRoom:id,name')
            ->orderBy('end_time')
            ->take(5)
            ->get()
            ->map(fn ($quiz) => [
                'id'               => $quiz->id,
                'title'            => $quiz->title,
                'class_name'       => $quiz->classRoom?->name,
                'duration_minutes' => $quiz->duration_minutes,
                'end_time'         => $quiz->end_time?->toISOString(),
            ]);

        // Recent quiz results
        $recentResults = QuizAttempt::where('student_id', $user->id)
            ->whereNotNull('completed_at')
            ->with('quiz:id,title')
            ->orderByDesc('completed_at')
            ->take(5)
            ->get()
            ->map(fn ($a) => [
                'quiz_title'   => $a->quiz?->title,
                'score'        => $a->score,
                'total_points' => $a->total_points,
                'percentage'   => $a->total_points > 0
                    ? round($a->score / $a->total_points * 100, 1)
                    : 0,
                'completed_at' => $a->completed_at?->toISOString(),
            ]);

        return response()->json([
            'data' => [
                'role'              => 'student',
                'total_classes'     => $totalClasses,
                'attendance'        => [
                    'present'  => $attendanceStats->get('present', 0),
                    'absent'   => $attendanceStats->get('absent', 0),
                    'late'     => $attendanceStats->get('late', 0),
                    'excused'  => $attendanceStats->get('excused', 0),
                    'total'    => $totalAttendance,
                    'rate'     => $attendanceRate,
                ],
                'available_quizzes' => $availableQuizzes,
                'recent_results'    => $recentResults,
            ],
        ]);
    }
}
