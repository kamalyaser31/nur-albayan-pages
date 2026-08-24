/**
 * منصة نور البيان — جسر استيراد وتنسيق الوحدات الديناميكي
 * Dynamic Module Loader for Nur Al-Bayan Platform
 * 
 * يتيح هذا الجسر تحميل سائر وحدات النظام بالترتيب الصحيح مباشرة
 * بحيث تسري أي تعديلات في ملفات المصدر فوراً دون الحاجة لخطوات بناء.
 */
(function () {
    'use strict';

    const currentScript = document.currentScript;
    let basePath = '../shared/';
    if (currentScript && currentScript.src) {
        basePath = currentScript.src.substring(0, currentScript.src.lastIndexOf('/') + 1);
    }

    const modules = [
        'settings.js',
        'student-manager.js',
        'sound.js',
        'ui-template.js',
        'app.js',
        'games-wordwall.js',
        'games-board.js',
        'game-ai.js',
        'games-extra.js',
        'rule-manager.js'
    ];

    modules.forEach(function (file) {
        document.write('<script src="' + basePath + file + '"><\/script>');
    });
})();
