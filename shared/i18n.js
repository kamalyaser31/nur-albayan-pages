/**
 * Nour Al-Bayan Interactive Platform - Modular i18n Localization Engine
 * Pluggable Registry Architecture supporting infinite language packs,
 * automatic fallback, dynamic language switching, and RTL/LTR synchronization.
 */

const i18n = {
    _locales: {},
    _activeLocale: 'ar',
    _fallbackLocale: 'ar',
    _storageKey: 'nb_language',
    _isInitialized: false,

    /**
     * تهيئة المحرك واستعادة اللغة المحفوظة
     */
    init() {
        if (this._isInitialized) return;
        
        let saved = 'ar';
        try {
            saved = localStorage.getItem(this._storageKey) || 'ar';
        } catch (e) {
            console.warn('i18n: localStorage not accessible, using default (ar)', e);
        }

        if (this._locales[saved]) {
            this._activeLocale = saved;
        } else if (this._locales[this._fallbackLocale]) {
            this._activeLocale = this._fallbackLocale;
        }

        this._applyDirection();
        this._isInitialized = true;
    },

    /**
     * تسجيل حزمة لغة جديدة في المنظومة
     * @param {string} code رمز اللغة (مثال: 'ar', 'en', 'de', 'ur')
     * @param {Object} meta البيانات الوصفية { name: 'العربية', dir: 'rtl' }
     * @param {Object} dictionary قاموس المفاتيح والترجمات
     */
    register(code, meta = {}, dictionary = {}) {
        if (!code || typeof code !== 'string') return;
        const cleanCode = code.trim().toLowerCase();
        
        this._locales[cleanCode] = {
            name: meta.name || cleanCode.toUpperCase(),
            dir: (meta.dir && meta.dir.toLowerCase() === 'ltr') ? 'ltr' : 'rtl',
            nativeName: meta.nativeName || meta.name || cleanCode.toUpperCase(),
            strings: dictionary && typeof dictionary === 'object' ? { ...dictionary } : {}
        };

        // إذا كانت اللغة النشطة هي هذه اللغة بعد تسجيلها
        if (cleanCode === this._activeLocale && this._isInitialized) {
            this._applyDirection();
        }
    },

    /**
     * جلب النص المترجم لمفتاح محدد مع معالجة الـ Fallback والبارامترات
     * @param {string} key مفتاح النص
     * @param {string} [fallbackText] النص البديل إن لم يتوفر المفتاح
     * @param {Object} [params] متغيرات للحقن داخل النص { count: 5 }
     * @returns {string}
     */
    t(key, fallbackText = null, params = {}) {
        if (!key) return '';

        const activeDict = this._locales[this._activeLocale]?.strings || {};
        const fallbackDict = this._locales[this._fallbackLocale]?.strings || {};

        let text = activeDict[key] ?? fallbackDict[key] ?? (fallbackText || key);

        // حقن المتغيرات إذا وُجدت {param}
        if (params && typeof params === 'object') {
            for (const [pKey, pVal] of Object.entries(params)) {
                text = text.replace(new RegExp(`\\{${pKey}\\}`, 'g'), String(pVal));
            }
        }

        return text;
    },

    /**
     * تغيير اللغة النشطة وتحديث اتجاه المستند وحفظ الإعداد
     * @param {string} code رمز اللغة الجديدة
     */
    setLocale(code) {
        if (!code || typeof code !== 'string') return;
        const cleanCode = code.trim().toLowerCase();

        if (!this._locales[cleanCode]) {
            console.warn(`i18n: Locale '${cleanCode}' is not registered yet.`);
            return;
        }

        this._activeLocale = cleanCode;
        try {
            localStorage.setItem(this._storageKey, cleanCode);
        } catch (e) {
            console.warn('i18n: Failed to save locale preference', e);
        }

        this._applyDirection();

        // بث حدث تغيير اللغة لتحديث الواجهات التفاعلية
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('nb:locale-changed', {
                detail: {
                    locale: cleanCode,
                    meta: this._locales[cleanCode]
                }
            }));
        }
    },

    /**
     * جلب كود اللغة النشطة حالياً
     * @returns {string}
     */
    getLocale() {
        return this._activeLocale;
    },

    /**
     * جلب البيانات الوصفية للغة النشطة (الاسم، الاتجاه)
     * @returns {Object}
     */
    getActiveMeta() {
        return this._locales[this._activeLocale] || { name: 'العربية', dir: 'rtl' };
    },

    /**
     * جلب قائمة بكافة اللغات المسجلة في المنظومة
     * @returns {Array<Object>} مصفوفة { code, name, dir, nativeName }
     */
    getAvailableLocales() {
        return Object.entries(this._locales).map(([code, data]) => ({
            code,
            name: data.name,
            dir: data.dir,
            nativeName: data.nativeName
        }));
    },

    /**
     * تبديل اللغة بين اللغات المتاحة (افتراضياً بين ar و en)
     * @returns {string} كود اللغة الجديدة
     */
    toggleLocale() {
        const next = this._activeLocale === 'ar' ? 'en' : 'ar';
        this.setLocale(next);
        return next;
    },

    /**
     * تطبيق اتجاه المستند واللغة على وسم <html>
     * @private
     */
    _applyDirection() {
        if (typeof document === 'undefined') return;
        const meta = this.getActiveMeta();
        const html = document.documentElement;
        if (html) {
            html.lang = this._activeLocale;
            html.dir = meta.dir || 'rtl';
        }
    }
};

// تهيئة تلقائية عند تحميل الصفحة
if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => i18n.init());
    } else {
        i18n.init();
    }
}
