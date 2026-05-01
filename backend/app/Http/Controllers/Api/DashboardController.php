<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Attendance;
use App\Models\ClassRoom;
use App\Models\Quiz;
use App\Models\QuizAttempt;
use App\Models\SubjectMatter;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
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

    private function adminDashboard(): JsonResponse
    {
        $totalUsers    = User::count();
        $totalTeachers = User::where('role', 'teacher')->count();
        $totalStudents = User::where('role', 'student')->count();
        $totalClasses  = ClassRoom::count();
        $totalQuizzes  = Quiz::count();
        $activeQuizzes = Quiz::where('is_active', true)->count();

        // Today's attendance summary
        $todayAttendance = Attendance::whereDate('date', today())
            ->select('status', DB::raw('COUNT(*) as count'))
            ->groupBy('status')
            ->pluck('count', 'status');

        $todayTotal = $todayAttendance->sum();
        $todayPresent = $todayAttendance->get('present', 0) + $todayAttendance->get('late', 0);
        $todayRate = $todayTotal > 0 ? round($todayPresent / $todayTotal * 100, 1) : 0;

        // Recent users
        $recentUsers = User::orderByDesc('created_at')
            ->take(5)
            ->get(['id', 'name', 'email', 'role', 'created_at']);

        // Today's new materials
        $todayMaterials = SubjectMatter::with(['classRoom:id,name', 'uploader:id,name'])
            ->whereDate('created_at', today())
            ->orderByDesc('created_at')
            ->take(5)
            ->get()
            ->map(fn ($m) => [
                'id'         => $m->id,
                'title'      => $m->title,
                'type'       => $m->type,
                'class_name' => $m->classRoom?->name,
                'uploader'   => $m->uploader?->name,
                'created_at' => $m->created_at?->toISOString(),
            ]);

        return response()->json([
            'data' => [
                'role'             => 'admin',
                'total_users'      => $totalUsers,
                'total_teachers'   => $totalTeachers,
                'total_students'   => $totalStudents,
                'total_classes'    => $totalClasses,
                'total_quizzes'    => $totalQuizzes,
                'active_quizzes'   => $activeQuizzes,
                'today_attendance' => [
                    'present' => $todayAttendance->get('present', 0),
                    'absent'  => $todayAttendance->get('absent', 0),
                    'late'    => $todayAttendance->get('late', 0),
                    'excused' => $todayAttendance->get('excused', 0),
                    'total'   => $todayTotal,
                    'rate'    => $todayRate,
                ],
                'recent_users'     => $recentUsers,
                'today_materials'  => $todayMaterials,
            ],
        ]);
    }

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

        $todayTotal = $todayAttendance->sum();
        $todayPresent = $todayAttendance->get('present', 0) + $todayAttendance->get('late', 0);
        $todayRate = $todayTotal > 0 ? round($todayPresent / $todayTotal * 100, 1) : 0;

        // Classes with attendance status today
        $classes = $user->teachingClasses()
            ->withCount('students')
            ->withPivot('subject')
            ->get()
            ->map(function ($class) {
                $todayRecorded = Attendance::where('class_id', $class->id)
                    ->whereDate('date', today())
                    ->count();

                return [
                    'id'              => $class->id,
                    'name'            => $class->name,
                    'slug'            => $class->slug,
                    'subject'         => $class->pivot->subject,
                    'students_count'  => $class->students_count,
                    'attendance_recorded' => $todayRecorded > 0,
                    'attendance_count'    => $todayRecorded,
                ];
            });

        // Active quizzes by this teacher
        $activeQuizList = Quiz::where('teacher_id', $user->id)
            ->where('is_active', true)
            ->with('classRoom:id,name')
            ->withCount('attempts')
            ->orderBy('end_time')
            ->take(5)
            ->get()
            ->map(fn ($q) => [
                'id'             => $q->id,
                'title'          => $q->title,
                'class_name'     => $q->classRoom?->name,
                'attempts_count' => $q->attempts_count,
                'end_time'       => $q->end_time?->toISOString(),
            ]);

        // Recent quiz attempts on teacher's quizzes
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
                'percentage'   => $a->total_points > 0 ? round($a->score / $a->total_points * 100, 1) : 0,
                'completed_at' => $a->completed_at?->toISOString(),
            ]);

        // Today's new materials in teacher's classes
        $todayMaterials = SubjectMatter::with(['classRoom:id,name'])
            ->whereIn('class_id', $classIds)
            ->whereDate('created_at', today())
            ->orderByDesc('created_at')
            ->take(5)
            ->get()
            ->map(fn ($m) => [
                'id'         => $m->id,
                'title'      => $m->title,
                'type'       => $m->type,
                'class_name' => $m->classRoom?->name,
                'created_at' => $m->created_at?->toISOString(),
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
                    'total'   => $todayTotal,
                    'rate'    => $todayRate,
                ],
                'classes'          => $classes,
                'active_quiz_list' => $activeQuizList,
                'recent_attempts'  => $recentAttempts,
                'today_materials'  => $todayMaterials,
            ],
        ]);
    }

    private function studentDashboard(User $user): JsonResponse
    {
        $classIds = $user->enrolledClasses()->pluck('classes.id');
        $totalClasses = $classIds->count();

        // My class info
        $myClass = $user->enrolledClasses()
            ->with(['teachers' => function ($q) {
                $q->select('users.id', 'users.name')->withPivot('subject');
            }])
            ->withCount('students')
            ->first();

        $classInfo = $myClass ? [
            'id'             => $myClass->id,
            'name'           => $myClass->name,
            'slug'           => $myClass->slug,
            'grade_level'    => $myClass->grade_level,
            'students_count' => $myClass->students_count,
            'teachers'       => $myClass->teachers->map(fn ($t) => [
                'id'      => $t->id,
                'name'    => $t->name,
                'subject' => $t->pivot->subject,
            ]),
        ] : null;

        // Today's attendance status
        $todayAttendance = Attendance::where('user_id', $user->id)
            ->whereDate('date', today())
            ->first();

        $todayStatus = $todayAttendance ? [
            'status'   => $todayAttendance->status,
            'notes'    => $todayAttendance->notes,
            'class_id' => $todayAttendance->class_id,
        ] : null;

        // Overall attendance stats
        $attendanceStats = Attendance::where('user_id', $user->id)
            ->select('status', DB::raw('COUNT(*) as count'))
            ->groupBy('status')
            ->pluck('count', 'status');

        $totalAttendance = $attendanceStats->sum();
        $attendanceRate  = $totalAttendance > 0
            ? round(($attendanceStats->get('present', 0) + $attendanceStats->get('late', 0)) / $totalAttendance * 100, 1)
            : 0;

        // Active quizzes available (not yet completed)
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

        // Upcoming quiz deadlines (ending within 7 days)
        $upcomingDeadlines = Quiz::whereIn('class_id', $classIds)
            ->where('is_active', true)
            ->whereNotNull('end_time')
            ->where('end_time', '>', now())
            ->where('end_time', '<=', now()->addDays(7))
            ->with('classRoom:id,name')
            ->orderBy('end_time')
            ->take(5)
            ->get()
            ->map(fn ($quiz) => [
                'id'         => $quiz->id,
                'title'      => $quiz->title,
                'class_name' => $quiz->classRoom?->name,
                'end_time'   => $quiz->end_time?->toISOString(),
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

        // New materials today in student's classes
        $todayMaterials = SubjectMatter::with(['classRoom:id,name', 'uploader:id,name'])
            ->whereIn('class_id', $classIds)
            ->whereDate('created_at', today())
            ->orderByDesc('created_at')
            ->take(5)
            ->get()
            ->map(fn ($m) => [
                'id'         => $m->id,
                'title'      => $m->title,
                'type'       => $m->type,
                'file_type'  => $m->file_type,
                'class_name' => $m->classRoom?->name,
                'uploader'   => $m->uploader?->name,
                'created_at' => $m->created_at?->toISOString(),
            ]);

        return response()->json([
            'data' => [
                'role'               => 'student',
                'total_classes'      => $totalClasses,
                'class_info'         => $classInfo,
                'today_attendance'   => $todayStatus,
                'attendance'         => [
                    'present'  => $attendanceStats->get('present', 0),
                    'absent'   => $attendanceStats->get('absent', 0),
                    'late'     => $attendanceStats->get('late', 0),
                    'excused'  => $attendanceStats->get('excused', 0),
                    'total'    => $totalAttendance,
                    'rate'     => $attendanceRate,
                ],
                'available_quizzes'  => $availableQuizzes,
                'upcoming_deadlines' => $upcomingDeadlines,
                'recent_results'     => $recentResults,
                'today_materials'    => $todayMaterials,
            ],
        ]);
    }
}
