(function (global) {
    'use strict';

    const STORAGE_KEY = 'nb_teacher_settings';
    const defaults = Object.freeze({
        soundEnabled: true,
        volume: 80,
        gameBreaksEnabled: false,
        defaultGameMode: 'computer',
        defaultDifficulty: 'easy',
        timerDuration: 10,
        fontScale: 'normal',
        fontPreference: 'auto',
        themeMode: 'system',
        shuffleCards: false,
        noPenaltyMode: false,
        manualAdvance: false,
        remediationDrillMode: 'loop',
        repeatGradingPolicy: 'best'
    });
    let cache = null;

    function validate(input = {}) {
        if (!input || typeof input !== 'object') return {};
        const clean = {};
        if ('soundEnabled' in input) clean.soundEnabled = Boolean(input.soundEnabled);
        if ('volume' in input) {
            const volume = Number(input.volume);
            clean.volume = Number.isFinite(volume)
                ? Math.max(0, Math.min(100, Math.round(volume)))
                : defaults.volume;
        }
        if ('gameBreaksEnabled' in input) clean.gameBreaksEnabled = Boolean(input.gameBreaksEnabled);
        if ('defaultGameMode' in input) clean.defaultGameMode = ['computer', 'teacher'].includes(input.defaultGameMode) ? input.defaultGameMode : defaults.defaultGameMode;
        if ('defaultDifficulty' in input) clean.defaultDifficulty = ['easy', 'smart'].includes(input.defaultDifficulty) ? input.defaultDifficulty : defaults.defaultDifficulty;
        if ('timerDuration' in input) {
            const timerDuration = Number(input.timerDuration);
            clean.timerDuration = Number.isFinite(timerDuration)
                ? Math.max(3, Math.min(60, timerDuration))
                : defaults.timerDuration;
        }
        if ('fontScale' in input) clean.fontScale = ['normal', 'large', 'xlarge'].includes(input.fontScale) ? input.fontScale : defaults.fontScale;
        const allowedFontPrefs = (typeof NBContracts !== 'undefined' && NBContracts.FONT_PREFERENCES)
            ? Object.values(NBContracts.FONT_PREFERENCES)
            : ['auto', 'kfgqpc', 'noto', 'amiri'];
        if ('fontPreference' in input) clean.fontPreference = allowedFontPrefs.includes(input.fontPreference) ? input.fontPreference : defaults.fontPreference;
        if ('themeMode' in input) clean.themeMode = ['system', 'light', 'dark'].includes(input.themeMode) ? input.themeMode : defaults.themeMode;
        for (const key of ['shuffleCards', 'noPenaltyMode', 'manualAdvance']) {
            if (key in input) clean[key] = Boolean(input[key]);
        }
        if ('remediationDrillMode' in input) clean.remediationDrillMode = ['loop', 'single_pass', 'instant_repeat'].includes(input.remediationDrillMode) ? input.remediationDrillMode : defaults.remediationDrillMode;
        if ('repeatGradingPolicy' in input) clean.repeatGradingPolicy = ['best', 'latest', 'cumulative'].includes(input.repeatGradingPolicy) ? input.repeatGradingPolicy : defaults.repeatGradingPolicy;
        return clean;
    }

    const SettingsValues = {
        STORAGE_KEY,
        defaults,
        validate,
        get() {
            if (cache) return { ...defaults, ...cache };
            try {
                const raw = localStorage.getItem(STORAGE_KEY);
                cache = raw ? validate(JSON.parse(raw)) : {};
            } catch (error) {
                console.warn('تعذر قراءة الإعدادات من localStorage:', error);
                cache = {};
            }
            return { ...defaults, ...cache };
        },
        persist(settings) {
            const nextSettings = { ...defaults, ...validate(settings) };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(nextSettings));
            cache = nextSettings;
            return { ...nextSettings };
        },
        reset() {
            localStorage.removeItem(STORAGE_KEY);
            cache = {};
            return { ...defaults };
        },
        replaceMemory(settings) {
            cache = validate(settings);
        }
    };

    global.SettingsValues = SettingsValues;
})(typeof window !== 'undefined' ? window : globalThis);
