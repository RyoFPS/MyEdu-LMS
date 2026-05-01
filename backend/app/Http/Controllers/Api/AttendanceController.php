<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\BulkAttendanceRequest;
use App\Http\Requests\StoreAttendanceRequest;
use App\Http\Resources\AttendanceResource;
use App\Models\Attendance;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AttendanceController extends Controller
{
    /**
     * GET /api/attendances
     *
     * List attendance records with filters. Paginated.
     * - Admin: sees all
     * - Teacher: sees attendances for their classes
     * - Student: sees only their own
     */
    public function index(Request $request): JsonResponse
    {
        $user  = $request->user();
        $query = Attendance::with(['user', 'classRoom']);

        // Role-based scoping
        if ($user->isStudent()) {
            $query->where('user_id', $user->id);
        } elseif ($user->isTeacher()) {
            // Only classes the teacher is assigned to
            $teacherClassIds = $user->teachingClasses()->pluck('classes.id');
            $query->whereIn('class_id', $teacherClassIds);
        }

        // Filters
        if ($request->filled('class_id')) {
            $query->where('class_id', $request->input('class_id'));
        }
        if ($request->filled('user_id')) {
            $query->where('user_id', $request->input('user_id'));
        }
        if ($request->filled('date')) {
            $query->whereDate('date', $request->input('date'));
        }
        if ($request->filled('date_from')) {
            $query->whereDate('date', '>=', $request->input('date_from'));
        }
        if ($request->filled('date_to')) {
            $query->whereDate('date', '<=', $request->input('date_to'));
        }
        if ($request->filled('status')) {
            $query->where('status', $request->input('status'));
        }

        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->whereHas('user', function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%");
            });
        }

        $attendances = $query->orderByDesc('date')
                             ->orderBy('user_id')
                             ->paginate($request->input('per_page', 15));

        return response()->json([
            'data' => AttendanceResource::collection($attendances),
            'meta' => [
                'current_page' => $attendances->currentPage(),
                'last_page'    => $attendances->lastPage(),
                'per_page'     => $attendances->perPage(),
                'total'        => $attendances->total(),
            ],
        ]);
    }

    /**
     * POST /api/attendances
     *
     * Record a single attendance entry.
     */
    public function store(StoreAttendanceRequest $request): JsonResponse
    {
        $attendance = Attendance::updateOrCreate(
            [
                'user_id'  => $request->input('user_id'),
                'class_id' => $request->input('class_id'),
                'date'     => $request->input('date'),
            ],
            [
                'status' => $request->input('status'),
                'notes'  => $request->input('notes'),
            ]
        );

        $attendance->load(['user', 'classRoom']);

        return response()->json([
            'message' => 'Kehadiran berhasil dicatat.',
            'data'    => new AttendanceResource($attendance),
        ], 201);
    }

    /**
     * POST /api/attendances/bulk
     *
     * Bulk record attendance for an entire class on a given date.
     */
    public function bulk(BulkAttendanceRequest $request): JsonResponse
    {
        $classId = $request->input('class_id');
        $date    = $request->input('date');
        $records = $request->input('attendances');

        $created = [];

        DB::transaction(function () use ($classId, $date, $records, &$created) {
            foreach ($records as $record) {
                $attendance = Attendance::updateOrCreate(
                    [
                        'user_id'  => $record['user_id'],
                        'class_id' => $classId,
                        'date'     => $date,
                    ],
                    [
                        'status' => $record['status'],
                        'notes'  => $record['notes'] ?? null,
                    ]
                );
                $created[] = $attendance;
            }
        });

        // Reload relationships
        $ids = collect($created)->pluck('id');
        $attendances = Attendance::with(['user', 'classRoom'])->whereIn('id', $ids)->get();

        // Notify each user about their attendance
        foreach ($attendances as $att) {
            \App\Models\Notification::create([
                'user_id' => $att->user_id,
                'type'    => 'attendance',
                'title'   => 'notif.attendance_recorded',
                'message' => 'notif.attendance_recorded',
                'link'    => '/attendance',
                'data'    => ['attendance_id' => $att->id, 'status' => $att->status, 'date' => $att->date],
            ]);
        }

        $class = \App\Models\ClassRoom::find($classId);
        \App\Models\ActivityLog::log(
            $request->user(),
            'record',
            'attendance',
            $class->name ?? "Class #{$classId}",
            "{$request->user()->name} recorded attendance for " . count($records) . " members in class " . ($class->name ?? "#{$classId}") . " on {$date}.",
            (int) $classId,
            ['date' => $date, 'count' => count($records)],
            $request->ip()
        );

        return response()->json([
            'message' => 'Kehadiran massal berhasil dicatat.',
            'data'    => AttendanceResource::collection($attendances),
        ], 201);
    }

    /**
     * GET /api/attendances/summary
     *
     * Get attendance summary statistics.
     * Requires class_id. Optionally filter by date range.
     */
    public function summary(Request $request): JsonResponse
    {
        $request->validate([
            'class_id'  => ['required', 'exists:classes,id'],
            'date_from' => ['nullable', 'date'],
            'date_to'   => ['nullable', 'date'],
        ]);

        $classId = $request->input('class_id');
        $query   = Attendance::where('class_id', $classId);

        if ($request->filled('date_from')) {
            $query->whereDate('date', '>=', $request->input('date_from'));
        }
        if ($request->filled('date_to')) {
            $query->whereDate('date', '<=', $request->input('date_to'));
        }

        // Overall counts by status
        $statusCounts = (clone $query)
            ->select('status', DB::raw('COUNT(*) as count'))
            ->groupBy('status')
            ->pluck('count', 'status');

        $total = $statusCounts->sum();

        // Per-student summary
        $perStudent = (clone $query)
            ->select(
                'user_id',
                DB::raw("SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as present_count"),
                DB::raw("SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END) as absent_count"),
                DB::raw("SUM(CASE WHEN status = 'late' THEN 1 ELSE 0 END) as late_count"),
                DB::raw("SUM(CASE WHEN status = 'excused' THEN 1 ELSE 0 END) as excused_count"),
                DB::raw('COUNT(*) as total')
            )
            ->groupBy('user_id')
            ->get();

        // Fetch user data separately to avoid eager loading on grouped query
        $userIds = $perStudent->pluck('user_id');
        $users = \App\Models\User::whereIn('id', $userIds)->get()->keyBy('id');

        $perStudentData = $perStudent->map(function ($row) use ($users) {
            $user = $users->get($row->user_id);
            return [
                'user_id'        => $row->user_id,
                'user_name'      => $user?->name,
                'present_count'  => (int) $row->present_count,
                'absent_count'   => (int) $row->absent_count,
                'late_count'     => (int) $row->late_count,
                'excused_count'  => (int) $row->excused_count,
                'total'          => (int) $row->total,
                'attendance_rate' => $row->total > 0
                    ? round(($row->present_count + $row->late_count) / $row->total * 100, 1)
                    : 0,
            ];
        });

        return response()->json([
            'data' => [
                'class_id'      => (int) $classId,
                'total_records' => $total,
                'present'       => $statusCounts->get('present', 0),
                'absent'        => $statusCounts->get('absent', 0),
                'late'          => $statusCounts->get('late', 0),
                'excused'       => $statusCounts->get('excused', 0),
                'per_student'   => $perStudentData,
            ],
        ]);
    }

    /**
     * POST /api/attendances/self
     *
     * Student marks their own attendance for today.
     */
    public function selfAttendance(Request $request): JsonResponse
    {
        $user = $request->user();

        if (!$user->isStudent()) {
            return response()->json(['message' => 'Hanya siswa yang dapat melakukan absensi mandiri.'], 403);
        }

        // Get student's enrolled class
        $class = $user->enrolledClasses()->first();
        if (!$class) {
            return response()->json(['message' => 'Anda belum terdaftar di kelas manapun.'], 422);
        }

        $today = today()->toDateString();

        // Check if already recorded today
        $existing = Attendance::where('user_id', $user->id)
            ->where('class_id', $class->id)
            ->where('date', $today)
            ->first();

        if ($existing) {
            return response()->json([
                'message' => 'Anda sudah melakukan absensi hari ini.',
                'data'    => new AttendanceResource($existing->load(['user', 'classRoom'])),
            ], 422);
        }

        $attendance = Attendance::create([
            'user_id'  => $user->id,
            'class_id' => $class->id,
            'date'     => $today,
            'status'   => 'present',
            'notes'    => 'Self-attendance',
        ]);

        $attendance->load(['user', 'classRoom']);

        return response()->json([
            'message' => 'Absensi berhasil dicatat. Anda hadir hari ini!',
            'data'    => new AttendanceResource($attendance),
        ], 201);
    }

    /**
     * GET /api/attendances/export
     *
     * Export attendance data as CSV (admin/teacher only).
     * Requires class_id. Optionally filter by date range.
     */
    public function export(Request $request)
    {
        $request->validate([
            'class_id'  => ['required', 'exists:classes,id'],
            'date_from' => ['nullable', 'date'],
            'date_to'   => ['nullable', 'date'],
        ]);

        $user = $request->user();
        $classId = $request->input('class_id');

        // Authorization for teachers
        if ($user->isTeacher()) {
            $teachesClass = $user->teachingClasses()->where('classes.id', $classId)->exists();
            if (!$teachesClass) {
                return response()->json(['message' => 'Forbidden.'], 403);
            }
        }

        $class = \App\Models\ClassRoom::findOrFail($classId);

        $query = Attendance::with(['user:id,name,email,role'])
            ->where('class_id', $classId);

        if ($request->filled('date_from')) {
            $query->whereDate('date', '>=', $request->input('date_from'));
        }
        if ($request->filled('date_to')) {
            $query->whereDate('date', '<=', $request->input('date_to'));
        }

        $records = $query->orderBy('date')->orderBy('user_id')->get();

        // Build CSV
        $csv = [];
        $csv[] = ['Attendance Report: ' . $class->name];
        $csv[] = ['Grade Level: ' . $class->grade_level];
        $csv[] = ['Academic Year: ' . $class->academic_year];
        if ($request->filled('date_from') || $request->filled('date_to')) {
            $csv[] = ['Period: ' . ($request->input('date_from', 'Start') . ' to ' . $request->input('date_to', 'Now'))];
        }
        $csv[] = ['Exported: ' . now()->format('Y-m-d H:i:s')];
        $csv[] = []; // empty row
        $csv[] = ['#', 'Name', 'Email', 'Role', 'Date', 'Status', 'Notes'];

        foreach ($records as $index => $record) {
            $csv[] = [
                $index + 1,
                $record->user?->name ?? 'Unknown',
                $record->user?->email ?? '-',
                ucfirst($record->user?->role ?? '-'),
                $record->date,
                ucfirst($record->status),
                $record->notes ?? '',
            ];
        }

        // Summary
        $csv[] = [];
        $csv[] = ['Summary'];
        $csv[] = ['Total Records', $records->count()];
        $csv[] = ['Present', $records->where('status', 'present')->count()];
        $csv[] = ['Absent', $records->where('status', 'absent')->count()];
        $csv[] = ['Late', $records->where('status', 'late')->count()];
        $csv[] = ['Excused', $records->where('status', 'excused')->count()];

        $filename = 'attendance-' . \Illuminate\Support\Str::slug($class->name) . '-' . now()->format('Y-m-d') . '.csv';

        $callback = function () use ($csv) {
            $file = fopen('php://output', 'w');
            fprintf($file, chr(0xEF) . chr(0xBB) . chr(0xBF));
            foreach ($csv as $row) {
                fputcsv($file, $row);
            }
            fclose($file);
        };

        return response()->stream($callback, 200, [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename="' . $filename . '"',
        ]);
    }

    /**
     * GET /api/attendances/{id}
     *
     * Show a single attendance record.
     */
    public function show(Request $request, int $id): JsonResponse
    {
        $attendance = Attendance::with(['user', 'classRoom'])->findOrFail($id);

        // Students can only see their own attendance
        $user = $request->user();
        if ($user->isStudent() && $attendance->user_id !== $user->id) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        return response()->json([
            'data' => new AttendanceResource($attendance),
        ]);
    }
}
