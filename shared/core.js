/**
 * منصة نور البيان — جسر استيراد وتنسيق الوحدات الديناميكي
 * Dynamic Module Loader for Nur Al-Bayan Platform
 * 
 * يتيح هذا الجسر تحميل سائر وحدات النظام بالترتيب الصحيح مباشرة
 * بحيث تسري أي تعديلات في ملفات المصدر فوراً دون الحاجة لخطوات بناء.
 */
(function () {
    'use strict';

    const root = typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : this);

    // الفضاء الاسمي المركزي الموحد لمنصة نور البيان
    root.NurAlBayan = root.NurAlBayan || {
        version: '2.0.0',
        get i18n() { return root.i18n; },
        get app() { return root.app; },
        get rules() { return root.ruleManager; },
        get rulesRegistry() { return root.RULES_REGISTRY; },
        get roster() { return root.rosterManager; },
        get studentManager() { return root.studentManager; },
        get sound() { return root.Sound; },
        get renderer() { return root.WordRenderer; },
        get games() {
            return {
                wordwall: root.wordwallRoom,
                xo: root.xoGame,
                c4: root.c4Game,
                ai: root.gameAI
            };
        }
    };

    let basePath = '../shared/';
    const currentScript = document.currentScript;

    if (currentScript && currentScript.src) {
        basePath = currentScript.src.substring(0, currentScript.src.lastIndexOf('/') + 1);
    } else {
        // البحث عن وسم السكربت في حال انعدام document.currentScript
        const coreScript = document.querySelector('script[src*="core.js"]') ||
            (document.scripts ? Array.from(document.scripts).find(s => s.src && s.src.includes('core.js')) : null);
        if (coreScript && coreScript.src) {
            basePath = coreScript.src.substring(0, coreScript.src.lastIndexOf('/') + 1);
        }
    }

    const modules = [
        'contracts.js',
        'store.js',
        'word-renderer.js',
        'i18n.js',
        'locales/ar.js',
        'locales/en.js',
        'settings-values.js',
        'settings-dialog.js',
        'settings.js',
        'student-repository.js',
        'student-progress.js',
        'mistake-bank.js',
        'student-backup.js',
        'index-progress-view.js',
        'student-manager.js',
        'vendor-loader.js',
        'sound.js',
        'lesson-template.js',
        'modal-accessibility.js',
        'ui-template.js',
        'lesson-session.js',
        'remediation-session.js',
        'lesson-summary.js',
        'app.js',
        'games-wordwall.js',
        'games-board.js',
        'game-ai.js',
        'games-extra.js',
        'rules-data.js',
        'rule-manager.js'
    ];

    if (document.readyState === 'loading') {
        modules.forEach(function (file) {
            document.write('<script src="' + basePath + file + '"><\/script>');
        });
    } else {
        // إذا كان المستند جاهزاً بالفعل، يتم الحقن المتسلسل عبر DOM مع حفظ الترتيب
        modules.forEach(function (file) {
            const script = document.createElement('script');
            script.src = basePath + file;
            script.async = false; // الحفاظ على ترتيب التنفيذ
            (document.head || document.documentElement).appendChild(script);
        });
    }
})();
