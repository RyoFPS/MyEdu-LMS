# HTTP Cache Headers Configuration

## Overview
The MyEdu LMS API now includes intelligent HTTP cache headers to improve performance and reduce server load. The `SetCacheHeaders` middleware automatically applies appropriate cache policies based on the endpoint being accessed.

## Cache Strategy

### Cache Durations by Endpoint Type

| Endpoint Pattern | Duration | Reason |
|-----------------|----------|---------|
| `classes/grade-levels` | 30 minutes | Static reference data, rarely changes |
| `classes`, `users`, `teachers`, `students` | 5 minutes | Changes occasionally |
| `quizzes` | 2 minutes | Moderate update frequency |
| `dashboard`, `attendances` | 1 minute | Frequently updated data |
| `me`, `profile` | No cache | Real-time user data |
| POST/PUT/DELETE requests | No cache | Mutations never cached |

## How It Works

### Middleware Location
- **File**: `backend/app/Http/Middleware/SetCacheHeaders.php`
- **Registration**: `backend/bootstrap/app.php`

### Cache Headers Applied

#### For Cacheable GET Requests (200 OK):
```
Cache-Control: private, max-age={duration}
Expires: {timestamp}
Last-Modified: {timestamp}
```

#### For Non-Cacheable Requests:
```
Cache-Control: no-store, no-cache, must-revalidate, max-age=0
```

### Rules
1. **Only GET requests** are cached
2. **Only 200 OK responses** are cached
3. **Private cache** - stored in browser only, not shared proxies
4. **POST/PUT/DELETE** requests always return no-cache headers

## Testing Cache Headers

### Using cURL:
```bash
# Test cached endpoint (classes)
curl -I http://localhost:8000/api/classes

# Expected response:
# Cache-Control: private, max-age=300
# Expires: Mon, 18 May 2026 13:21:30 GMT
# Last-Modified: Mon, 18 May 2026 13:16:30 GMT

# Test non-cached endpoint (profile)
curl -I http://localhost:8000/api/me

# Expected response:
# Cache-Control: no-store, no-cache, must-revalidate, max-age=0
```

### Using Browser DevTools:
1. Open Network tab
2. Make a GET request to `/api/classes`
3. Check Response Headers for `Cache-Control`
4. Refresh - should see "(from disk cache)" or "(from memory cache)"

## Customizing Cache Durations

To modify cache durations, edit the `CACHE_DURATIONS` array in `SetCacheHeaders.php`:

```php
private const CACHE_DURATIONS = [
    'your-endpoint' => 600, // 10 minutes in seconds
];
```

## Benefits

1. **Reduced Server Load**: Repeated requests served from browser cache
2. **Faster Response Times**: No network round-trip for cached data
3. **Lower Bandwidth**: Fewer requests to the server
4. **Better UX**: Instant page loads for cached resources

## Cache Invalidation

The browser cache will automatically expire after the `max-age` duration. To force immediate invalidation:

1. **Client-side**: Clear browser cache or use Ctrl+Shift+R (hard refresh)
2. **Server-side**: Modify the response data (cache will expire naturally)
3. **Manual**: Change cache duration to 0 temporarily

## Notes

- Cache is **private** (browser-only), not shared across users
- Authentication tokens are not cached (handled by Sanctum)
- Error responses (4xx, 5xx) are never cached
- The middleware runs after authentication, so protected routes remain secure
