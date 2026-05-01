<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ActivityLogController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = ActivityLog::with('user:id,name,avatar')
            ->orderByDesc('created_at');

        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('user_name', 'like', "%{$search}%")
                  ->orWhere('target_name', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%");
            });
        }

        if ($request->filled('action')) {
            $query->where('action', $request->input('action'));
        }

        if ($request->filled('target_type')) {
            $query->where('target_type', $request->input('target_type'));
        }

        if ($request->filled('user_id')) {
            $query->where('user_id', $request->input('user_id'));
        }

        if ($request->filled('date_from')) {
            $query->whereDate('created_at', '>=', $request->input('date_from'));
        }

        if ($request->filled('date_to')) {
            $query->whereDate('created_at', '<=', $request->input('date_to'));
        }

        $logs = $query->paginate($request->input('per_page', 20));

        return response()->json([
            'data' => $logs->map(fn ($log) => [
                'id'          => $log->id,
                'user_id'     => $log->user_id,
                'user_name'   => $log->user_name,
                'user_role'   => $log->user_role,
                'user_avatar' => $log->user?->avatar,
                'action'      => $log->action,
                'target_type' => $log->target_type,
                'target_name' => $log->target_name,
                'target_id'   => $log->target_id,
                'description' => $log->description,
                'details'     => $log->details,
                'ip_address'  => $log->ip_address,
                'created_at'  => $log->created_at?->toISOString(),
            ]),
            'meta' => [
                'current_page' => $logs->currentPage(),
                'last_page'    => $logs->lastPage(),
                'per_page'     => $logs->perPage(),
                'total'        => $logs->total(),
            ],
        ]);
    }

    public function export(Request $request)
    {
        $query = ActivityLog::orderByDesc('created_at');

        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('user_name', 'like', "%{$search}%")
                  ->orWhere('target_name', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%");
            });
        }
        if ($request->filled('action')) $query->where('action', $request->input('action'));
        if ($request->filled('target_type')) $query->where('target_type', $request->input('target_type'));
        if ($request->filled('user_id')) $query->where('user_id', $request->input('user_id'));
        if ($request->filled('date_from')) $query->whereDate('created_at', '>=', $request->input('date_from'));
        if ($request->filled('date_to')) $query->whereDate('created_at', '<=', $request->input('date_to'));

        $logs = $query->get();

        $csv = [];
        $csv[] = ['Activity Log Export'];
        $csv[] = ['Generated: ' . now()->format('Y-m-d H:i:s')];
        $csv[] = ['Total Records: ' . $logs->count()];
        $csv[] = [];
        $csv[] = ['#', 'Date & Time', 'User', 'Role', 'Action', 'Target Type', 'Target', 'Description', 'IP Address'];

        foreach ($logs as $index => $log) {
            $csv[] = [
                $index + 1,
                $log->created_at?->format('Y-m-d H:i:s'),
                $log->user_name,
                ucfirst($log->user_role),
                ucfirst($log->action),
                ucfirst($log->target_type),
                $log->target_name,
                $log->description,
                $log->ip_address ?? '-',
            ];
        }

        $filename = 'activity-logs-' . now()->format('Y-m-d') . '.csv';

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

    public function stats(): JsonResponse
    {
        $today = ActivityLog::whereDate('created_at', today())->count();
        $week  = ActivityLog::where('created_at', '>=', now()->subDays(7))->count();
        $total = ActivityLog::count();

        $recentActions = ActivityLog::orderByDesc('created_at')
            ->take(5)
            ->get()
            ->map(fn ($log) => [
                'user_name'   => $log->user_name,
                'action'      => $log->action,
                'target_type' => $log->target_type,
                'target_name' => $log->target_name,
                'description' => $log->description,
                'created_at'  => $log->created_at?->toISOString(),
            ]);

        return response()->json([
            'data' => [
                'today'          => $today,
                'this_week'      => $week,
                'total'          => $total,
                'recent_actions' => $recentActions,
            ],
        ]);
    }
}
