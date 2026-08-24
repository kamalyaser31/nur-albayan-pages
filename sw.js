/**
 * Nour Al-Bayan Interactive Platform - Progressive Web App Service Worker
 * Multi-Tier Caching Architecture:
 * - Network-First for Navigation / HTML documents (ensuring live content updates with offline resilience)
 * - Cache-First with Dynamic Runtime Fallback for Static Assets & Offline Fonts
 */

const CACHE_VERSION = 'v3';
const CACHE_STATIC_NAME = `nur-albayan-static-${CACHE_VERSION}`;
const CACHE_RUNTIME_NAME = `nur-albayan-runtime-${CACHE_VERSION}`;

const PRECACHE_ASSETS = [
    './',
    './index.html',
    './guide.html',
    './manifest.json',
    // Core Scripts
    './shared/store.js',
    './shared/core.js',
    './shared/app.js',
    './shared/i18n.js',
    './shared/locales/ar.js',
    './shared/locales/en.js',
    './shared/settings.js',
    './shared/student-manager.js',
    './shared/roster-manager.js',
    './shared/sound.js',
    './shared/ui-template.js',
    './shared/games-wordwall.js',
    './shared/games-board.js',
    './shared/game-ai.js',
    './shared/games-extra.js',
    './shared/rule-manager.js',
    // Core Stylesheets
    './shared/core.css',
    './shared/css/index.css',
    './shared/css/tokens.css',
    './shared/css/base.css',
    './shared/css/typography.css',
    './shared/css/cards.css',
    './shared/css/components.css',
    './shared/css/games-wordwall.css',
    './shared/css/games-board.css',
    './shared/css/animations.css',
    './shared/css/utilities.css',
    // Granular CSS Utilities Modules
    './shared/css/utilities/borders.css',
    './shared/css/utilities/buttons.css',
    './shared/css/utilities/colors.css',
    './shared/css/utilities/effects.css',
    './shared/css/utilities/layout.css',
    './shared/css/utilities/responsive.css',
    './shared/css/utilities/spacing.css',
    './shared/css/utilities/text.css',
    // Third-party Vendors & Assets
    './shared/vendor/chart.umd.min.js',
    './shared/vendor/confetti.browser.min.js',
    './shared/vendor/icon.png',
    // Optimized Offline Fonts (Unique, De-duplicated)
    './shared/vendor/fonts/amiri-regular.woff2',
    './shared/vendor/fonts/amiri-bold.woff2',
    './shared/vendor/fonts/fredoka-regular.woff2',
    './shared/vendor/fonts/fredoka-semibold.woff2',
    './shared/vendor/fonts/fredoka-bold.woff2',
    './shared/vendor/fonts/fredoka-black.woff2',
    // Lesson Pages & Remediation Hub
    './pages/6.html',
    './pages/7.html',
    './pages/8.html',
    './pages/9.html',
    './pages/10.html',
    './pages/11.html',
    './pages/12.html',
    './pages/13.html',
    './pages/14.html',
    './pages/15.html',
    './pages/16.html',
    './pages/17.html',
    './pages/18.html',
    './pages/19.html',
    './pages/20.html',
    './pages/21.html',
    './pages/22.html',
    './pages/23.html',
    './pages/24.html',
    './pages/25.html',
    './pages/26.html',
    './pages/27.html',
    './pages/28.html',
    './pages/29.html',
    './pages/30.html',
    './pages/31.html',
    './pages/32.html',
    './pages/33.html',
    './pages/34.html',
    './pages/35.html',
    './pages/36.html',
    './pages/37.html',
    './pages/39.html',
    './pages/remediation.html'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_STATIC_NAME)
            .then(async (cache) => {
                try {
                    await cache.addAll(PRECACHE_ASSETS);
                    console.log('[SW] All precache assets successfully stored in static cache.');
                } catch (err) {
                    console.error('[SW] Atomic precache failed, falling back to individual caching:', err);
                    await Promise.allSettled(
                        PRECACHE_ASSETS.map((asset) => cache.add(asset).catch((itemErr) => {
                            console.error(`[SW] Precache item failed: "${asset}"`, itemErr);
                        }))
                    );
                }
            })
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', (event) => {
    const validCaches = [CACHE_STATIC_NAME, CACHE_RUNTIME_NAME];
    event.waitUntil(
        caches.keys()
            .then((keys) => {
                return Promise.all(
                    keys.filter((key) => !validCaches.includes(key)).map((key) => {
                        console.log(`[SW] Deleting deprecated cache: ${key}`);
                        return caches.delete(key);
                    })
                );
            })
            .then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') return;
    if (!event.request.url.startsWith('http')) return;

    const isNavigation = event.request.mode === 'navigate' ||
        (event.request.headers.get('accept') && event.request.headers.get('accept').includes('text/html'));

    // 1. Navigation / HTML Document Strategy: Network-First
    if (isNavigation) {
        event.respondWith(
            fetch(event.request)
                .then((networkResponse) => {
                    if (networkResponse && networkResponse.status === 200) {
                        const responseClone = networkResponse.clone();
                        caches.open(CACHE_RUNTIME_NAME).then((cache) => {
                            cache.put(event.request, responseClone);
                        });
                    }
                    return networkResponse;
                })
                .catch(async () => {
                    // Network unavailable -> Check static and runtime caches
                    const cachedResponse = await caches.match(event.request, { ignoreSearch: true });
                    if (cachedResponse) {
                        return cachedResponse;
                    }

                    const requestUrl = new URL(event.request.url);
                    const isRootOrIndex = requestUrl.pathname.endsWith('/') || 
                                          requestUrl.pathname.endsWith('/index.html');
                    if (isRootOrIndex) {
                        return caches.match('./index.html').then((res) => res || caches.match('index.html'));
                    }
                    
                    return Promise.reject(new Error('Offline: Resource not cached'));
                })
        );
        return;
    }

    // 2. Static Assets, Fonts & Stylesheets Strategy: Cache-First
    event.respondWith(
        caches.match(event.request, { ignoreSearch: true }).then((cachedResponse) => {
            if (cachedResponse) {
                return cachedResponse;
            }

            return fetch(event.request)
                .then((networkResponse) => {
                    if (!networkResponse || networkResponse.status !== 200 || (networkResponse.type !== 'basic' && networkResponse.type !== 'cors')) {
                        return networkResponse;
                    }
                    const responseClone = networkResponse.clone();
                    caches.open(CACHE_RUNTIME_NAME).then((cache) => {
                        cache.put(event.request, responseClone);
                    });
                    return networkResponse;
                })
                .catch((err) => {
                    console.warn(`[SW] Static asset fetch failed offline: ${event.request.url}`);
                    return Promise.reject(err);
                });
        })
    );
});
