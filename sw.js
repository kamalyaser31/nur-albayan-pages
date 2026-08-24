/**
 * Nour Al-Bayan Interactive Platform - Progressive Web App Service Worker
 * Strategy: Cache-First with Network Fallback & Dynamic Cache Population
 */

const CACHE_NAME = 'nur-albayan-v1';

const PRECACHE_ASSETS = [
    './',
    './index.html',
    './manifest.json',
    './shared/core.css',
    './shared/core.js',
    './shared/i18n.js',
    './shared/locales/ar.js',
    './shared/locales/en.js',
    './shared/settings.js',
    './shared/student-manager.js',
    './shared/roster-manager.js',
    './shared/sound.js',
    './shared/ui-template.js',
    './shared/app.js',
    './shared/games-wordwall.js',
    './shared/games-board.js',
    './shared/game-ai.js',
    './shared/games-extra.js',
    './shared/rule-manager.js',
    './shared/css/index.css',
    './shared/css/tokens.css',
    './shared/css/base.css',
    './shared/css/utilities.css',
    './shared/css/typography.css',
    './shared/css/cards.css',
    './shared/css/components.css',
    './shared/css/games-wordwall.css',
    './shared/css/games-board.css',
    './shared/css/animations.css',
    './shared/vendor/chart.umd.min.js',
    './shared/vendor/confetti.browser.min.js',
    './shared/vendor/icon.png',
    './shared/vendor/fonts/amiri-regular.woff2',
    './shared/vendor/fonts/amiri-bold.woff2',
    './shared/vendor/fonts/fredoka-regular.woff2',
    './shared/vendor/fonts/fredoka-semibold.woff2',
    './shared/vendor/fonts/fredoka-bold.woff2',
    './shared/vendor/fonts/fredoka-black.woff2',
    './pages/remediation.html'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(PRECACHE_ASSETS).catch((err) => {
                console.warn('[SW] Precache warning:', err);
            });
        }).then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
            );
        }).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') return;
    if (!event.request.url.startsWith('http')) return;

    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) {
                return cachedResponse;
            }
            return fetch(event.request).then((networkResponse) => {
                if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
                    return networkResponse;
                }
                const responseToCache = networkResponse.clone();
                caches.open(CACHE_NAME).then((cache) => {
                    cache.put(event.request, responseToCache);
                });
                return networkResponse;
            }).catch(() => {
                if (event.request.headers.get('accept') && event.request.headers.get('accept').includes('text/html')) {
                    return caches.match('./index.html');
                }
            });
        })
    );
});
