<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class RoleMiddleware
{
    /**
     * Handle an incoming request.
     *
     * Accepts one or more roles separated by pipes:
     *   middleware('role:admin')
     *   middleware('role:admin|teacher')
     */
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $user = $request->user();

        if (! $user) {
            return response()->json([
                'message' => 'Unauthenticated.',
            ], 401);
        }

        // Flatten roles that may be pipe-separated (e.g. "admin|teacher")
        $allowed = collect($roles)
            ->flatMap(fn (string $r) => explode('|', $r))
            ->toArray();

        if (! in_array($user->role, $allowed, true)) {
            return response()->json([
                'message' => 'Forbidden. You do not have the required role.',
            ], 403);
        }

        return $next($request);
    }
}
