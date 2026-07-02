const CACHE_NAME = 'school-timer-v5-school-cache-fix';

const CORE_ASSETS = [
  './index.html',
  './style.css',
  './ticker-fix.css',
  './mobile-current-row-clean.css',
  './desktop-bg.webp',
  './mobile-bg.webp',
  './supabase-config.js',
  './viewer-multischool-identity.js',
  './script.js',
  './script-optimizations.js',
  './ticker-messages.js',
  './viewer-multischool-message-guard.js',
  './viewer-schedule-sync.js',
  './viewer-schedule-direct.js',
  './viewer-alerts-v2.js',
  './viewer-alerts-external-fix.js',
  './viewer-phone-notification-android-fix.js',
  './text-corrections.js',
  './pwa-register.js',
  './pwa-school-redirect.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => Promise.allSettled(CORE_ASSETS.map((asset) => cache.add(asset))))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME && key.indexOf('school-timer') !== -1).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

function isHtmlRequest(request){
  return request.mode === 'navigate' || (request.headers.get('accept') || '').includes('text/html');
}

function isIndexUrl(url){
  return url.pathname.endsWith('/') || url.pathname.endsWith('/index.html');
}

function canCache(response){
  return response && response.ok && response.type !== 'opaque';
}

async function updateCache(request, cacheKey){
  try {
    const response = await fetch(request);
    if (canCache(response)) {
      const cache = await caches.open(CACHE_NAME);
      await cache.put(cacheKey || request, response.clone());
    }
    return response;
  } catch (error) {
    return null;
  }
}

async function serveIndexFast(event){
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match('./index.html', { ignoreSearch: true });
  const networkPromise = updateCache(event.request, './index.html');

  if (cached) {
    event.waitUntil(networkPromise);
    return cached;
  }

  const network = await networkPromise;
  if (network) return network;

  return new Response('تعذر فتح مؤقت الحصص بدون اتصال. افتح التطبيق مرة واحدة بعد الاتصال بالإنترنت.', {
    status: 503,
    headers: { 'Content-Type': 'text/plain; charset=utf-8' }
  });
}

async function serveHtmlNetworkFirst(event){
  const network = await updateCache(event.request);
  if (network) return network;

  const cached = await caches.match(event.request, { ignoreSearch: true });
  if (cached) return cached;

  return new Response('تعذر تحميل الصفحة حاليًا.', {
    status: 503,
    headers: { 'Content-Type': 'text/plain; charset=utf-8' }
  });
}

async function serveAssetFast(event){
  const cached = await caches.match(event.request, { ignoreSearch: true });
  const networkPromise = updateCache(event.request);

  if (cached) {
    event.waitUntil(networkPromise);
    return cached;
  }

  const network = await networkPromise;
  if (network) return network;

  return caches.match(event.request, { ignoreSearch: true });
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (isHtmlRequest(request)) {
    if (isIndexUrl(url)) {
      event.respondWith(serveIndexFast(event));
      return;
    }

    event.respondWith(serveHtmlNetworkFirst(event));
    return;
  }

  event.respondWith(serveAssetFast(event));
});
