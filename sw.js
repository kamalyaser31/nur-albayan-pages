/**
 * Nour Al-Bayan Interactive Platform - Progressive Web App Service Worker
 * Strategy: Cache-First with Network Fallback & Dynamic Cache Population
 */

const CACHE_NAME = 'nur-albayan-v2';

const PRECACHE_ASSETS = [
    './',
    './index.html',
    './manifest.json',
    // Core Scripts
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
    // Offline Fonts
    './shared/vendor/fonts/amiri-regular.woff2',
    './shared/vendor/fonts/amiri-bold.woff2',
    './shared/vendor/fonts/amiri-400.woff2',
    './shared/vendor/fonts/amiri-700.woff2',
    './shared/vendor/fonts/fredoka-regular.woff2',
    './shared/vendor/fonts/fredoka-semibold.woff2',
    './shared/vendor/fonts/fredoka-bold.woff2',
    './shared/vendor/fonts/fredoka-black.woff2',
    './shared/vendor/fonts/fredoka-400.woff2',
    './shared/vendor/fonts/fredoka-600.woff2',
    './shared/vendor/fonts/fredoka-700.woff2',
    // Lesson Pages & Remediation
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
        caches.open(CACHE_NAME)
            .then(async (cache) => {
                try {
                    // Attempt atomic precache of all defined assets
                    await cache.addAll(PRECACHE_ASSETS);
                    console.log('[SW] All precache assets successfully cached.');
                } catch (err) {
                    console.error('[SW] Precache failed during cache.addAll:', err);
                    // Fallback: cache individual items to maximize offline resilience while identifying missing assets
                    const results = await Promise.allSettled(
                        PRECACHE_ASSETS.map(async (asset) => {
                            try {
                                await cache.add(asset);
                            } catch (itemErr) {
                                console.error(`[SW] Failed to cache individual asset "${asset}":`, itemErr);
                                throw itemErr;
                            }
                        })
                    );
                    const failures = results.filter((r) => r.status === 'rejected');
                    if (failures.length > 0) {
                        console.error(`[SW] Precache finished with ${failures.length} missing asset(s).`);
                    }
                }
            })
            .then(() => self.skipWaiting())
            .catch((err) => {
                console.error('[SW] Critical install failure:', err);
            })
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
            .then((keys) => {
                return Promise.all(
                    keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
                );
            })
            .then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') return;
    if (!event.request.url.startsWith('http')) return;

    const requestUrl = new URL(event.request.url);

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
                    const responseToCache = networkResponse.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseToCache);
                    });
                    return networkResponse;
                })
                .catch((error) => {
                    // Check if this is a navigation or HTML request
                    const isHtmlRequest = event.request.mode === 'navigate' ||
                        (event.request.headers.get('accept') && event.request.headers.get('accept').includes('text/html'));

                    if (isHtmlRequest) {
                        // Only fallback to index.html for root/home navigation to prevent breaking relative asset paths on subpages
                        const isRootOrIndex = requestUrl.pathname.endsWith('/') || 
                                              requestUrl.pathname.endsWith('/index.html');

                        if (isRootOrIndex) {
                            return caches.match('./index.html').then((res) => res || caches.match('index.html'));
                        }
                    }

                    // For sub-page navigation or non-HTML resources that failed offline, propagate error
                    return Promise.reject(error);
                });
        })
    );
});
