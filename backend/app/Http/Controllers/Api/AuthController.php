<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\LoginRequest;
use App\Http\Resources\UserResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;

class AuthController extends Controller
{
    /**
     * POST /api/login
     *
     * Authenticate user and return a Sanctum token.
     */
    public function login(LoginRequest $request): JsonResponse
    {
        $credentials = $request->only('email', 'password');

        if (! Auth::attempt($credentials)) {
            return response()->json([
                'message' => 'Email atau password salah.',
            ], 401);
        }

        $user  = Auth::user();
        $token = $user->createToken('auth-token')->plainTextToken;

        \App\Models\ActivityLog::log(
            $user,
            'login',
            'auth',
            $user->name,
            "{$user->name} ({$user->role}) logged in.",
            $user->id,
            null,
            $request->ip()
        );

        return response()->json([
            'message' => 'Login berhasil.',
            'data'    => [
                'user'  => new UserResource($user),
                'token' => $token,
            ],
        ]);
    }

    /**
     * POST /api/logout
     *
     * Revoke the current access token.
     */
    public function logout(Request $request): JsonResponse
    {
        \App\Models\ActivityLog::log(
            $request->user(),
            'logout',
            'auth',
            $request->user()->name,
            "{$request->user()->name} logged out.",
            $request->user()->id,
            null,
            $request->ip()
        );

        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'message' => 'Logout berhasil.',
        ]);
    }

    /**
     * GET /api/me
     *
     * Return the authenticated user's profile.
     */
    public function me(Request $request): JsonResponse
    {
        $user = $request->user();

        // Eager-load classes based on role
        if ($user->isTeacher()) {
            $user->load('teachingClasses');
        } elseif ($user->isStudent()) {
            $user->load('enrolledClasses');
        }

        return response()->json([
            'data' => new UserResource($user),
        ]);
    }

    /**
     * PUT /api/profile
     *
     * Update the authenticated user's own profile.
     */
    public function updateProfile(Request $request): JsonResponse
    {
        $user = $request->user();

        $validated = $request->validate([
            'name'     => ['sometimes', 'string', 'max:255'],
            'email'    => ['sometimes', 'string', 'email', 'max:255', 'unique:users,email,' . $user->id],
            'phone'    => ['nullable', 'string', 'max:20'],
            'avatar'   => ['nullable', 'string', 'max:255'],
            'password' => ['sometimes', 'string', 'min:8', 'confirmed'],
        ]);

        // Hash password if provided
        if (isset($validated['password'])) {
            $validated['password'] = Hash::make($validated['password']);
        }

        $user->update($validated);

        return response()->json([
            'message' => 'Profil berhasil diperbarui.',
            'data'    => new UserResource($user->fresh()),
        ]);
    }

    /**
     * POST /api/profile/avatar
     *
     * Upload or update the authenticated user's avatar.
     */
    public function updateAvatar(Request $request): JsonResponse
    {
        $request->validate([
            'avatar' => ['required', 'image', 'mimes:jpg,jpeg,png,webp', 'max:2048'],
        ], [
            'avatar.required' => 'Pilih foto terlebih dahulu.',
            'avatar.image'    => 'File harus berupa gambar.',
            'avatar.mimes'    => 'Format yang diizinkan: JPG, PNG, WEBP.',
            'avatar.max'      => 'Ukuran foto maksimal 2 MB.',
        ]);

        $user = $request->user();

        // Delete old avatar if exists
        if ($user->avatar) {
            $oldPath = str_replace('/storage/', '', $user->avatar);
            if (Storage::disk('public')->exists($oldPath)) {
                Storage::disk('public')->delete($oldPath);
            }
        }

        // Store new avatar
        $file = $request->file('avatar');
        $path = $file->store('avatars/' . $user->id, 'public');

        if (!$path) {
            return response()->json(['message' => 'Gagal menyimpan foto.'], 500);
        }

        // Save the public URL path
        $user->update(['avatar' => '/storage/' . $path]);

        return response()->json([
            'message' => 'Foto profil berhasil diperbarui.',
            'data'    => new UserResource($user->fresh()),
        ]);
    }

    /**
     * DELETE /api/profile/avatar
     *
     * Remove the authenticated user's avatar.
     */
    public function removeAvatar(Request $request): JsonResponse
    {
        $user = $request->user();

        if ($user->avatar) {
            $oldPath = str_replace('/storage/', '', $user->avatar);
            if (Storage::disk('public')->exists($oldPath)) {
                Storage::disk('public')->delete($oldPath);
            }
            $user->update(['avatar' => null]);
        }

        return response()->json([
            'message' => 'Foto profil berhasil dihapus.',
            'data'    => new UserResource($user->fresh()),
        ]);
    }
}
