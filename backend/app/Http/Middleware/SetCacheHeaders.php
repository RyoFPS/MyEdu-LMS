<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class SetCacheHeaders
{
    /**
     * Cache durations by route pattern (in seconds)
     * 
     * Strategy:
     * - Long cache (30 min): Static/reference data that rarely changes
     * - Medium cache (5 min): Data that changes occasionally
     * - Short cache (2 min): Data with moderate update frequency
     * - Very short cache (1 min): Frequently updated data
     * - No cache: Real-time data that must always be fresh
     */
    private const CACHE_DURATIONS = [
        // Long cache (30 minutes) - rarely changes
        'classes/grade-levels' => 1800,
        
        // Medium cache (5 minutes) - changes occasionally
        'classes' => 300,
        'users' => 300,
        'teachers' => 300,
        'students' => 300,
        
        // Short cache (2 minutes) - moderate updates
        'quizzes' => 120,
        
        // Very short cache (1 minute) - frequently updated
        'dashboard' => 60,
        'attendances' => 60,
        
        // No cache (real-time) - must always be fresh
        'me' => 0,
        'profile' => 0,
    ];

    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        if ($response instanceof \Symfony\Component\HttpFoundation\BinaryFileResponse ||
            $response instanceof \Symfony\Component\HttpFoundation\StreamedResponse) {
            return $response;
        }

        // Only cache GET requests
        if ($request->method() !== 'GET') {
            return $response->header('Cache-Control', 'no-store, no-cache, must-revalidate');
        }

        // Only cache successful responses
        if ($response->getStatusCode() !== 200) {
            return $response;
        }

        $path = $request->path();
        $duration = $this->getCacheDuration($path);

        if ($duration > 0) {
            return $response
                ->header('Cache-Control', "private, max-age={$duration}")
                ->header('Expires', gmdate('D, d M Y H:i:s', time() + $duration) . ' GMT')
                ->header('Last-Modified', gmdate('D, d M Y H:i:s') . ' GMT');
        }

        return $response->header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
    }

    /**
     * Determine cache duration based on request path.
     *
     * @param string $path
     * @return int Cache duration in seconds
     */
    private function getCacheDuration(string $path): int
    {
        // Remove 'api/' prefix if present
        $path = preg_replace('#^api/#', '', $path);

        // Check for exact or partial matches
        foreach (self::CACHE_DURATIONS as $pattern => $duration) {
            if (str_contains($path, $pattern)) {
                return $duration;
            }
        }

        // Default: no cache for unmatched routes
        return 0;
    }
}
