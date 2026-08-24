/**
 * Nour Al-Bayan Interactive Platform - Modular i18n Localization Engine
 * Pluggable Registry Architecture supporting infinite language packs,
 * automatic fallback, dynamic language switching, declarative DOM translation,
 * and RTL/LTR synchronization.
 */

const i18n = {
    _locales: {},
    _activeLocale: 'ar',
    _fallbackLocale: 'ar',
    _storageKey: 'nb_language',
    _isInitialized: false,

    /**
     * استرجاع تفضيل اللغة المحفوظ في التخزين المحلي بأمان
     * @private
     */
    _getSavedLocale() {
        try {
            if (typeof localStorage !== 'undefined') {
                return localStorage.getItem(this._storageKey);
            }
        } catch (e) {
            console.warn('i18n: localStorage not accessible', e);
        }
        return null;
    },

    /**
     * تهيئة المحرك واستعادة اللغة المحفوظة وترجمة DOM
     */
    init() {
        if (this._isInitialized) return;

        let saved = null;
        if (typeof window !== 'undefined' && window.nbStore && typeof window.nbStore.get === 'function') {
            saved = window.nbStore.get('locale');
        }
        if (!saved) {
            saved = this._getSavedLocale() || this._fallbackLocale;
        }

        if (this._locales[saved]) {
            this._activeLocale = saved;
        } else if (this._locales[this._fallbackLocale]) {
            this._activeLocale = this._fallbackLocale;
        } else {
            this._activeLocale = saved;
        }

        this._applyDirection();
        this.translateDOM();
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

        let saved = null;
        if (typeof window !== 'undefined' && window.nbStore && typeof window.nbStore.get === 'function') {
            saved = window.nbStore.get('locale');
        }
        if (!saved) {
            saved = this._getSavedLocale() || this._fallbackLocale;
        }

        // ضبط سباق التهيئة الأولية للغة المستعادة من التخزين بعد تسجيل اللغات
        if (cleanCode === saved || cleanCode === this._activeLocale) {
            this._activeLocale = cleanCode;
            this._applyDirection();
            this.translateDOM();
        }
    },

    /**
     * دالة عزل اتجاهي مدمجة لمنع تشوه النصوص ثنائية الاتجاه (BiDi Isolation)
     * @param {string} text النص المراد عزله
     * @param {'rtl'|'ltr'} [dir] الاتجاه المستهدف
     * @returns {string} النص محاطاً برموز العزل الاتجاهي
     */
    bidi(text, dir = null) {
        if (text === null || text === undefined) return '';
        const str = String(text);
        const targetDir = dir || (this.getActiveMeta ? this.getActiveMeta().dir : 'rtl');
        const isolateStart = targetDir === 'rtl' ? '\u2067' : '\u2066';
        const isolateEnd = '\u2069';
        return `${isolateStart}${str}${isolateEnd}`;
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

        let fallback = fallbackText;
        let actualParams = params;

        // دعم تمرير كائن المتغيرات كمعامل ثانٍ مباشرة: i18n.t('key', { name: '...' })
        if (fallbackText && typeof fallbackText === 'object' && (!params || Object.keys(params).length === 0)) {
            actualParams = fallbackText;
            fallback = null;
        }

        const activeDict = this._locales[this._activeLocale]?.strings || {};
        const fallbackDict = this._locales[this._fallbackLocale]?.strings || {};

        let text = activeDict[key] ?? fallbackDict[key] ?? (typeof fallback === 'string' ? fallback : key);

        // حقن المتغيرات إذا وُجدت {param} مع تعقيم الرموز الخاصة في المفتاح واستخدام دالة استبدال لمنع معالجة $& و $$
        if (actualParams && typeof actualParams === 'object') {
            for (const [pKey, pVal] of Object.entries(actualParams)) {
                const escapedKey = String(pKey).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                const valStr = String(pVal !== undefined && pVal !== null ? pVal : '');
                text = text.replace(new RegExp(`\\{${escapedKey}\\}`, 'g'), () => valStr);
            }
        }

        return text;
    },

    /**
     * استخراج المتغيرات الممررة للعنصر عبر سمات data-i18n-params أو data-i18n-param-*
     * @private
     * @param {Element} el
     * @returns {Object}
     */
    _extractParams(el) {
        if (!el || !el.dataset) return {};
        const params = {};

        if (el.dataset.i18nParams) {
            try {
                const parsed = JSON.parse(el.dataset.i18nParams);
                if (parsed && typeof parsed === 'object') {
                    Object.assign(params, parsed);
                }
            } catch (e) {
                console.warn('i18n: Failed to parse data-i18n-params JSON:', el.dataset.i18nParams, e);
            }
        }

        for (const key of Object.keys(el.dataset)) {
            if (key.startsWith('i18nParam') && key.length > 9) {
                const rawParam = key.slice(9);
                const paramName = rawParam.charAt(0).toLowerCase() + rawParam.slice(1);
                params[paramName] = el.dataset[key];
            }
        }

        return params;
    },

    /**
     * ترجمة تصريحية فورية لكافة العناصر الموسومة في شجرة DOM
     * يدعم السمات:
     * - [data-i18n]: ترجمة النص الداخلي textContent مع دعم المعاملات
     * - [data-i18n-aria]: ترجمة سمة aria-label
     * - [data-i18n-placeholder]: ترجمة سمة placeholder
     * - [data-i18n-title]: ترجمة سمة title
     * @param {Element|Document|string} [root=document] العنصر الجذر أو محدد الاستعلام
     */
    translateDOM(root = (typeof document !== 'undefined' ? document : null)) {
        if (typeof document === 'undefined' || !root) return;

        let container = root;
        if (typeof root === 'string') {
            container = document.querySelector(root);
        }
        if (!container) return;

        const selector = '[data-i18n], [data-i18n-aria], [data-i18n-placeholder], [data-i18n-title]';
        const elements = Array.from(container.querySelectorAll ? container.querySelectorAll(selector) : []);

        // إذا كان العنصر الجذر نفسه يطابق المحدد
        if (container.matches && container.matches(selector)) {
            elements.unshift(container);
        }

        for (let i = 0; i < elements.length; i++) {
            const el = elements[i];
            const params = this._extractParams(el);

            // 1. [data-i18n] -> textContent
            if (el.hasAttribute('data-i18n')) {
                const key = el.getAttribute('data-i18n');
                if (key) {
                    const fallback = el.textContent || key;
                    const translated = this.t(key, fallback, params);
                    if (translated !== undefined && translated !== null) {
                        el.textContent = translated;
                    }
                }
            }

            // 2. [data-i18n-aria] -> aria-label
            if (el.hasAttribute('data-i18n-aria')) {
                const key = el.getAttribute('data-i18n-aria');
                if (key) {
                    const fallback = el.getAttribute('aria-label') || key;
                    const translated = this.t(key, fallback, params);
                    if (translated !== undefined && translated !== null) {
                        el.setAttribute('aria-label', translated);
                    }
                }
            }

            // 3. [data-i18n-placeholder] -> placeholder
            if (el.hasAttribute('data-i18n-placeholder')) {
                const key = el.getAttribute('data-i18n-placeholder');
                if (key) {
                    const fallback = el.getAttribute('placeholder') || key;
                    const translated = this.t(key, fallback, params);
                    if (translated !== undefined && translated !== null) {
                        el.setAttribute('placeholder', translated);
                    }
                }
            }

            // 4. [data-i18n-title] -> title
            if (el.hasAttribute('data-i18n-title')) {
                const key = el.getAttribute('data-i18n-title');
                if (key) {
                    const fallback = el.getAttribute('title') || key;
                    const translated = this.t(key, fallback, params);
                    if (translated !== undefined && translated !== null) {
                        el.setAttribute('title', translated);
                    }
                }
            }
        }
    },

    /**
     * تغيير اللغة النشطة وتحديث اتجاه المستند والترجمة التصريحية ومزامنة المتجر
     * @param {string} code رمز اللغة الجديدة
     * @param {Object} [options] خيارات إضافية { silent, fromStore }
     */
    setLocale(code, options = {}) {
        if (!code || typeof code !== 'string') return;
        const cleanCode = code.trim().toLowerCase();

        if (!this._locales[cleanCode]) {
            console.warn(`i18n: Locale '${cleanCode}' is not registered yet.`);
            return;
        }

        const previousLocale = this._activeLocale;
        this._activeLocale = cleanCode;

        try {
            if (typeof localStorage !== 'undefined') {
                localStorage.setItem(this._storageKey, cleanCode);
            }
        } catch (e) {
            console.warn('i18n: Failed to save locale preference', e);
        }

        this._applyDirection();
        this.translateDOM();

        // مزامنة موزع الحالة الموحد
        if (typeof window !== 'undefined' && window.nbStore && typeof window.nbStore.set === 'function') {
            if (window.nbStore.get('locale') !== cleanCode) {
                window.nbStore.set('locale', cleanCode, { source: 'i18n', fromManager: true });
            }
        }

        // بث حدث تغيير اللغة لتحديث الواجهات التفاعلية
        if (typeof window !== 'undefined' && !options.silent) {
            window.dispatchEvent(new CustomEvent('nb:locale-changed', {
                detail: {
                    locale: cleanCode,
                    previousLocale: previousLocale,
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

// التصدير والتسجيل التلقائي في النطاق العام
if (typeof globalThis !== 'undefined') {
    globalThis.i18n = i18n;
}
if (typeof window !== 'undefined') {
    window.i18n = i18n;
}
if (typeof module !== 'undefined' && module.exports) {
    module.exports = i18n;
}

// تهيئة تلقائية عند تحميل الصفحة
if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => i18n.init());
    } else {
        i18n.init();
    }
}
