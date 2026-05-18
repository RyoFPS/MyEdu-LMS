// Cache configuration
const CACHE_VERSION = 'v2';
const STATIC_CACHE = `myedu-static-${CACHE_VERSION}`;
const API_CACHE = `myedu-api-${CACHE_VERSION}`;
const IMAGE_CACHE = `myedu-images-${CACHE_VERSION}`;

// Cache size limits
const CACHE_LIMITS = {
  [API_CACHE]: 50,
  [IMAGE_CACHE]: 100,
};

// API cache durations (in milliseconds)
const API_CACHE_DURATION = {
  long: 30 * 60 * 1000,   // 30 minutes - rarely changing data
  medium: 5 * 60 * 1000,  // 5 minutes - moderately changing data
  short: 1 * 60 * 1000,   // 1 minute - frequently changing data
};

// Static assets to pre-cache
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/offline.html',
];

// API endpoints with cache strategies
const API_CACHE_STRATEGIES = {
  long: ['/api/subjects', '/api/classes/grade-levels'],
  medium: ['/api/classes', '/api/users', '/api/teachers', '/api/students'],
  short: ['/api/dashboard', '/api/attendances'],
  noCache: ['/api/login', '/api/logout', '/api/auth'],
};

// Install — cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('Failed to cache some static assets:', err);
        // Cache what we can, don't fail the install
        return Promise.all(
          STATIC_ASSETS.map((url) =>
            cache.add(url).catch(() => console.warn(`Failed to cache: ${url}`))
          )
        );
      });
    })
  );
  self.skipWaiting();
});

// Activate — clean old caches
self.addEventListener('activate', (event) => {
  const currentCaches = [STATIC_CACHE, API_CACHE, IMAGE_CACHE];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => !currentCaches.includes(name))
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// Helper: Determine cache duration for API endpoint
function getApiCacheDuration(pathname) {
  for (const [duration, endpoints] of Object.entries(API_CACHE_STRATEGIES)) {
    if (duration === 'noCache') continue;
    if (endpoints.some((endpoint) => pathname.startsWith(endpoint))) {
      return API_CACHE_DURATION[duration];
    }
  }
  return null; // No caching
}

// Helper: Check if API endpoint should not be cached
function shouldNotCacheApi(pathname) {
  return API_CACHE_STRATEGIES.noCache.some((endpoint) =>
    pathname.startsWith(endpoint)
  );
}

// Helper: Stale-while-revalidate strategy
async function staleWhileRevalidate(request, cacheName, maxAge) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  // Check if cached response is still fresh
  if (cached) {
    const cachedTime = cached.headers.get('sw-cached-time');
    if (cachedTime) {
      const age = Date.now() - new Date(cachedTime).getTime();
      if (age < maxAge) {
        // Return fresh cached response
        return cached;
      }
    }
  }

  // Fetch fresh data in background
  const fetchPromise = fetch(request)
    .then(async (response) => {
      if (response.ok) {
        const clone = response.clone();
        const headers = new Headers(clone.headers);
        headers.set('sw-cached-time', new Date().toISOString());

        const responseToCache = new Response(clone.body, {
          status: clone.status,
          statusText: clone.statusText,
          headers,
        });

        await cache.put(request, responseToCache);
        await trimCache(cacheName, CACHE_LIMITS[cacheName]);
      }
      return response;
    })
    .catch((err) => {
      // Network failed, return stale cache if available
      if (cached) {
        return cached;
      }
      throw err;
    });

  // Return cached immediately if available, otherwise wait for network
  return cached || fetchPromise;
}

// Helper: Trim cache to size limit
async function trimCache(cacheName, maxItems) {
  if (!maxItems) return;

  const cache = await caches.open(cacheName);
  const keys = await cache.keys();

  if (keys.length > maxItems) {
    // Delete oldest entries
    const toDelete = keys.slice(0, keys.length - maxItems);
    await Promise.all(toDelete.map((key) => cache.delete(key)));
  }
}

// Helper: Create offline fallback response
function createOfflineFallback() {
  return new Response(
    `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Offline - MyEdu LMS</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          margin: 0;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          text-align: center;
          padding: 20px;
        }
        .container {
          max-width: 500px;
        }
        h1 {
          font-size: 3rem;
          margin: 0 0 1rem;
        }
        p {
          font-size: 1.2rem;
          margin: 0 0 2rem;
          opacity: 0.9;
        }
        .icon {
          font-size: 5rem;
          margin-bottom: 1rem;
        }
        button {
          background: white;
          color: #667eea;
          border: none;
          padding: 12px 32px;
          font-size: 1rem;
          font-weight: 600;
          border-radius: 8px;
          cursor: pointer;
          transition: transform 0.2s;
        }
        button:hover {
          transform: scale(1.05);
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="icon">📡</div>
        <h1>You're Offline</h1>
        <p>It looks like you've lost your internet connection. Some features may not be available until you're back online.</p>
        <button onclick="window.location.reload()">Try Again</button>
      </div>
    </body>
    </html>
    `,
    {
      headers: {
        'Content-Type': 'text/html',
      },
    }
  );
}

// Fetch — handle all requests with appropriate strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests for caching
  if (request.method !== 'GET') return;

  // API requests with stale-while-revalidate
  if (url.pathname.startsWith('/api')) {
    // Skip auth and mutation endpoints
    if (shouldNotCacheApi(url.pathname)) {
      return;
    }

    const cacheDuration = getApiCacheDuration(url.pathname);
    if (cacheDuration) {
      event.respondWith(
        staleWhileRevalidate(request, API_CACHE, cacheDuration)
      );
      return;
    }

    // Default: network only for unconfigured API endpoints
    return;
  }

  // Navigation requests — network first, fallback to offline page
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(STATIC_CACHE).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          if (cached) return cached;

          // Try to return cached offline page
          const offlinePage = await caches.match('/offline.html');
          if (offlinePage) return offlinePage;

          // Fallback to generated offline page
          return createOfflineFallback();
        })
    );
    return;
  }

  // Images — cache first with size limit
  if (url.pathname.match(/\.(png|jpg|jpeg|svg|gif|webp|ico)$/)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;

        return fetch(request).then(async (response) => {
          if (response.ok) {
            const clone = response.clone();
            const cache = await caches.open(IMAGE_CACHE);
            await cache.put(request, clone);
            await trimCache(IMAGE_CACHE, CACHE_LIMITS[IMAGE_CACHE]);
          }
          return response;
        });
      })
    );
    return;
  }

  // Static assets (JS, CSS, fonts) — cache first
  if (url.pathname.match(/\.(js|css|woff2?|ttf|eot)$/)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;

        return fetch(request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(STATIC_CACHE).then((cache) => cache.put(request, clone));
          }
          return response;
        });
      })
    );
    return;
  }

  // Default — network first
  event.respondWith(
    fetch(request)
      .then((response) => {
        const clone = response.clone();
        caches.open(STATIC_CACHE).then((cache) => cache.put(request, clone));
        return response;
      })
      .catch(() => caches.match(request))
  );
});
