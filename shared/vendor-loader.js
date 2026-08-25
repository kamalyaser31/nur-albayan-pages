(function (global) {
    'use strict';

    const ownScript = typeof document !== 'undefined' ? document.currentScript : null;
    const basePath = ownScript?.src
        ? ownScript.src.substring(0, ownScript.src.lastIndexOf('/') + 1)
        : '../shared/';
    const pending = new Map();

    function load(file, globalName) {
        if (global[globalName]) return Promise.resolve(global[globalName]);
        if (pending.has(file)) return pending.get(file);
        const promise = new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = `${basePath}vendor/${file}`;
            script.onload = () => resolve(global[globalName]);
            script.onerror = () => {
                pending.delete(file);
                reject(new Error(`Failed to load ${file}`));
            };
            document.head.appendChild(script);
        });
        pending.set(file, promise);
        return promise;
    }

    global.VendorLoader = Object.freeze({
        loadChart: () => load('chart.umd.min.js', 'Chart'),
        loadConfetti: () => load('confetti.browser.min.js', 'confetti')
    });
})(typeof window !== 'undefined' ? window : globalThis);
