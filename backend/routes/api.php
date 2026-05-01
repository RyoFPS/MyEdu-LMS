<?php

use App\Http\Controllers\Api\AttendanceController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\ClassController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\QuizController;
use App\Http\Controllers\Api\UserController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes — MyEdu LMS
|--------------------------------------------------------------------------
|
| All routes are prefixed with /api automatically.
|
*/

// ─── Public (guest) routes ───────────────────────────────────────────────────
Route::post('/login', [AuthController::class, 'login']);

// ─── Authenticated routes ────────────────────────────────────────────────────
Route::middleware('auth:sanctum')->group(function () {

    // Auth / Profile
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);
    Route::put('/profile', [AuthController::class, 'updateProfile']);

    // Dashboard (role-specific)
    Route::get('/dashboard', [DashboardController::class, 'index']);

    // ── Users (admin only for CUD, all authenticated can list/show) ──────
    Route::get('/users', [UserController::class, 'index']);
    Route::get('/users/{id}', [UserController::class, 'show']);
    Route::post('/users', [UserController::class, 'store'])->middleware('role:admin');
    Route::put('/users/{id}', [UserController::class, 'update'])->middleware('role:admin');
    Route::delete('/users/{id}', [UserController::class, 'destroy'])->middleware('role:admin');

    // Convenience endpoints for listing teachers / students
    Route::get('/teachers', [UserController::class, 'teachers']);
    Route::get('/students', [UserController::class, 'students']);

    // ── Classes ──────────────────────────────────────────────────────────
    Route::get('/classes', [ClassController::class, 'index']);
    Route::get('/classes/{id}', [ClassController::class, 'show']);
    Route::post('/classes', [ClassController::class, 'store'])->middleware('role:admin');
    Route::put('/classes/{id}', [ClassController::class, 'update'])->middleware('role:admin');
    Route::delete('/classes/{id}', [ClassController::class, 'destroy'])->middleware('role:admin');

    // Class member management (admin only)
    Route::post('/classes/{id}/assign-teacher', [ClassController::class, 'assignTeacher'])->middleware('role:admin');
    Route::post('/classes/{id}/assign-student', [ClassController::class, 'assignStudent'])->middleware('role:admin');
    Route::delete('/classes/{id}/remove-teacher/{teacherId}', [ClassController::class, 'removeTeacher'])->middleware('role:admin');
    Route::delete('/classes/{id}/remove-student/{studentId}', [ClassController::class, 'removeStudent'])->middleware('role:admin');

    // ── Attendance ───────────────────────────────────────────────────────
    Route::get('/attendances', [AttendanceController::class, 'index']);
    Route::get('/attendances/summary', [AttendanceController::class, 'summary']);
    Route::get('/attendances/{id}', [AttendanceController::class, 'show']);
    Route::post('/attendances', [AttendanceController::class, 'store'])->middleware('role:admin|teacher');
    Route::post('/attendances/bulk', [AttendanceController::class, 'bulk'])->middleware('role:admin|teacher');

    // ── Quizzes ──────────────────────────────────────────────────────────
    Route::get('/quizzes', [QuizController::class, 'index']);
    Route::get('/quizzes/{id}', [QuizController::class, 'show']);
    Route::post('/quizzes', [QuizController::class, 'store'])->middleware('role:admin|teacher');
    Route::put('/quizzes/{id}', [QuizController::class, 'update'])->middleware('role:admin|teacher');
    Route::delete('/quizzes/{id}', [QuizController::class, 'destroy'])->middleware('role:admin|teacher');

    // Quiz attempt flow (students)
    Route::post('/quizzes/{id}/start', [QuizController::class, 'start'])->middleware('role:student');
    Route::post('/quizzes/{id}/submit', [QuizController::class, 'submit'])->middleware('role:student');

    // Quiz results (teacher sees all, student sees own)
    Route::get('/quizzes/{id}/results', [QuizController::class, 'results']);

    // ── Subjects ─────────────────────────────────────────────────────────
    Route::get('/subjects', [\App\Http\Controllers\Api\SubjectController::class, 'index']);

    // ── Subject Matters (Materi Pelajaran) ───────────────────────────────
    Route::get('/classes/{classId}/subject-matters', [\App\Http\Controllers\Api\SubjectMatterController::class, 'index']);
    Route::post('/classes/{classId}/subject-matters', [\App\Http\Controllers\Api\SubjectMatterController::class, 'store'])->middleware('role:admin|teacher');
    Route::get('/subject-matters/{id}', [\App\Http\Controllers\Api\SubjectMatterController::class, 'show']);
    Route::post('/subject-matters/{id}/update', [\App\Http\Controllers\Api\SubjectMatterController::class, 'update'])->middleware('role:admin|teacher');
    Route::delete('/subject-matters/{id}', [\App\Http\Controllers\Api\SubjectMatterController::class, 'destroy'])->middleware('role:admin|teacher');
    Route::get('/subject-matters/{id}/download', [\App\Http\Controllers\Api\SubjectMatterController::class, 'download']);
});
