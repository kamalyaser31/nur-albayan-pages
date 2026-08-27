/**
 * Settings Manager - نظام إدارة وحفظ إعدادات المعلم والمنظومة
 * المنظومة: نور البيان
 *
 * الخصائص:
 * 1. الحفظ التلقائي الفوري في المتصفح مع موزع الحالة المركزي nbStore والذاكرة الوسيطة (LocalStorage + In-Memory Fallback).
 * 2. نافذة إعدادات منبثقة تفاعلية ويسيرة الوصول ومزينة بسمات data-i18n* (Accessible Modal with Focus Trap & Restoration).
 * 3. سريان الإعدادات تلقائياً على الصفحة الرئيسية وكافة صفحات الدروس الـ 33.
 */

const settingsManager = {
    STORAGE_KEY: SettingsValues.STORAGE_KEY,
    _lastFocusedElement: null,
    get defaults() { return SettingsValues.defaults; },

    // دالة مساعدة آمنة للترجمة والتعريب
    _t(key, fallback = '') {
        if (typeof i18n !== 'undefined' && typeof i18n.t === 'function') {
            const res = i18n.t(key);
            if (res && res !== key) return res;
        }
        return fallback;
    },

    // دالة فحص وتطهير لحدود وصحة القيم المدخلة (Schema Validation & Clamping)
    _validateAndClamp(input) {
        return SettingsValues.validate(input);
    },

    // جلب الإعدادات الحالية من localStorage أو الذاكرة الوسيطة بنسخة معزولة
    get() {
        return SettingsValues.get();
    },

    // حفظ تعديل جزئي أو كلي وتطبيقه فوراً وربطه بموزع الحالة nbStore
    save(newSettings, options = {}) {
        const validated = this._validateAndClamp(newSettings);
        const current = this.get();
        const updated = Object.assign({}, current, validated);
        try {
            SettingsValues.persist(updated);
        } catch (e) {
            console.warn('تعذر الحفظ الدائم في localStorage (جلسة خاصة):', e);
            this.syncFormWithSettings(current);
            this.showToast(this._t('settings_save_failed', 'تعذر حفظ الإعدادات. لم يطبق التغيير.'));
            return current;
        }

        if (typeof nbStore !== 'undefined' && typeof nbStore.set === 'function') {
            nbStore.set('settings', updated, { fromManager: true });
        }
        this.apply(updated);
        if (current.repeatGradingPolicy !== updated.repeatGradingPolicy &&
            typeof studentManager !== 'undefined' &&
            typeof studentManager.recalculateAllStudentScores === 'function') {
            studentManager.recalculateAllStudentScores();
        }
        if (!options.silent) {
            this.showToast(this._t('settings_saved_toast', 'تم حفظ الإعدادات بنجاح ✔'));
        }
        return updated;
    },

    // استعادة الإعدادات الافتراضية
    reset() {
        try {
            SettingsValues.reset();
        } catch (error) {
            console.warn('تعذر استعادة الإعدادات الافتراضية:', error);
            this.showToast(this._t('settings_save_failed', 'تعذر حفظ الإعدادات. لم يطبق التغيير.'));
            return false;
        }

        // تحديث موزع الحالة المركزي
        if (typeof nbStore !== 'undefined' && typeof nbStore.set === 'function') {
            nbStore.set('settings', this.defaults);
        }

        this.apply(this.defaults);
        this.syncFormWithSettings(this.defaults);
        const msg = this._t('settings_reset_toast', 'تمت استعادة الإعدادات الافتراضية 🔄');
        this.showToast(msg);
        return true;
    },

    // تطبيق الإعدادات الحالية على الصفحة النشطة
    apply(settings) {
        if (!settings) settings = this.get();

        // 1. تطبيق مقياس الخط القرآني
        document.documentElement.classList.remove('font-scale-normal', 'font-scale-large', 'font-scale-xlarge');
        document.documentElement.classList.add(`font-scale-${settings.fontScale || 'normal'}`);

        // السمة اليدوية تعلو اختيار النظام، وغياب السمة يعيد التحكم للمتصفح.
        const themeMode = settings.themeMode || 'system';
        if (themeMode === 'system') {
            document.documentElement.removeAttribute('data-theme');
        } else {
            document.documentElement.setAttribute('data-theme', themeMode);
        }

        // 2. مزامنة استراحات الألعاب مع تطبيق الدرس
        const toggleBreaksEl = document.getElementById('toggle-game-breaks');
        if (toggleBreaksEl) {
            toggleBreaksEl.checked = !!settings.gameBreaksEnabled;
        }
        if (typeof app !== 'undefined') {
            app.enableGameBreaks = !!settings.gameBreaksEnabled;
        }

        // 3. مزامنة وضع الخصم وصعوبته مع gameAI
        if (typeof gameAI !== 'undefined') {
            gameAI.mode = settings.defaultGameMode || 'computer';
            gameAI.difficulty = settings.defaultDifficulty || 'easy';
            gameAI.updateUI();
        }

        // 4. تطبيق مستوى الصوت فورياً على محرك الصوتيات
        if (typeof Sound !== 'undefined' && typeof Sound.updateMasterVolume === 'function') {
            Sound.updateMasterVolume();
        }
    },

    // فتح نافذة الإعدادات مع حصر التركيز والترجمة التصريحية (Focus Trap)
    open() {
        return SettingsDialog.open.call(this);
    },

    close() {
        return SettingsDialog.close.call(this);
    },

    syncFormWithSettings(s) {
        return SettingsDialog.syncFormWithSettings.call(this, s);
    },

    getModalHTML() {
        return SettingsDialog.getModalHTML.call(this);
    },

    ensureModalExists() {
        return SettingsDialog.ensureModalExists.call(this);
    },

    showToast(msg) {
        return SettingsDialog.showToast.call(this, msg);
    }

};

// تشغيل وتطبيق الإعدادات تلقائياً عند جاهزية المستند
if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            if (typeof settingsManager !== 'undefined') settingsManager.apply();
        });
    } else {
        if (typeof settingsManager !== 'undefined') settingsManager.apply();
    }
}

// مزامنة موزع الحالة nbStore مع settingsManager
if (typeof nbStore !== 'undefined' && typeof nbStore.subscribe === 'function') {
    nbStore.subscribe('settings', (newSettings) => {
        if (newSettings && typeof newSettings === 'object') {
            const current = settingsManager.get();
            const hasDiff = Object.keys(newSettings).some(k => current[k] !== newSettings[k]);
            if (hasDiff) {
                settingsManager.save(newSettings, { silent: true });
            }
        }
    });
}

// الاستماع لحدث تبديل اللغة لإعادة بناء هيكل النافذة باللغة الجديدة
if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
    window.addEventListener(NBContracts.EVENTS.LOCALE_CHANGED, () => {
        const existing = (typeof document !== 'undefined') ? document.getElementById('nb-settings-modal') : null;
        if (existing) {
            const wasOpen = !existing.classList.contains('hidden');
            existing.remove();
            if (wasOpen && typeof settingsManager !== 'undefined') {
                settingsManager.open();
            }
        }
    });
}
