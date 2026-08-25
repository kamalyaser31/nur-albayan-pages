/**
 * ============================================================================
 * منصة نور البيان التفاعلية — موزع الحالة الموحد ومصدر الحقيقة المركزي
 * Central Reactive State Store & Dispatcher (Single Source of Truth)
 * ============================================================================
 *
 * الخصائص والمواصفات:
 * 1. المصدر الوحيد للحقيقة (Single Source of Truth) للحالة المشتركة:
 *    - locale: رمز اللغة النشطة ('ar' | 'en' ...)
 *    - activeStudentId: معرف الطالب النشط (أو null لوضع الضيف / الحصة العامة)
 *    - settings: كائن إعدادات المعلم والمنظومة
 *    - currentLessonId: رقم الدرس / الصفحة الحالية
 *    - score: رصيد النقاط للدرس / الجولة الحالية
 * 2. واجهة اشتراك وتحديث موحدة ومتسقة:
 *    - getState(): جلب نسخة غير قابلة للتعديل المباشر من الحالة كاملة
 *    - get(slice): جلب قيمة شريحة محددة (مع استنساخ الكائنات)
 *    - setState(partial, options): تحديث جزئي أو كلي لشرائح الحالة
 *    - set(slice, val, options): تحديث شريحة محددة
 *    - subscribe(slice, listener): الاشتراك في التغييرات مع إرجاع دالة unsubscribe
 * 3. بث الأحداث القياسية في DOM:
 *    - 'nb:store-changed' (detail: { slice, prev, next, state, changes })
 *    - 'nb:locale-changed' (detail: { locale, previousLocale, meta })
 *    - 'nb:student-changed' (detail: { activeStudentId, student })
 *    - 'nb:settings-changed' (detail: { settings, previousSettings })
 * 4. حماية منيعة ضد الحلقات اللانهائية والارتداد (Re-entrancy & Infinite Loop Guard).
 * 5. توزيع الحالة والأحداث في الذاكرة، مع تفويض الحفظ الدائم إلى المدير المختص.
 */

(function (global) {
    'use strict';

    // الإعدادات الافتراضية للمعلم
    const DEFAULT_SETTINGS = Object.freeze({
        soundEnabled: true,
        volume: 80,
        gameBreaksEnabled: false,
        defaultGameMode: 'computer',
        defaultDifficulty: 'easy',
        timerDuration: 10,
        fontScale: 'normal',
        shuffleCards: false,
        noPenaltyMode: false,
        manualAdvance: false,
        remediationDrillMode: 'loop',
        repeatGradingPolicy: 'best'
    });

    /**
     * استنساخ عميق آمن للكائنات والبيانات
     * @private
     */
    function _clone(val) {
        if (val === null || val === undefined) return val;
        if (typeof val !== 'object') return val;
        if (typeof structuredClone === 'function') {
            try {
                return structuredClone(val);
            } catch (_) {}
        }
        try {
            return JSON.parse(JSON.stringify(val));
        } catch (_) {
            return Object.assign({}, val);
        }
    }

    /**
     * التحقق من تطابق القيم والأشجار الكائنية لمنع التحديثات المكررة
     * @private
     */
    function _isEqual(a, b) {
        if (Object.is(a, b)) return true;
        if (a === null || b === null || typeof a !== 'object' || typeof b !== 'object') return false;

        const keysA = Object.keys(a);
        const keysB = Object.keys(b);
        if (keysA.length !== keysB.length) return false;

        for (let i = 0; i < keysA.length; i++) {
            const key = keysA[i];
            if (!Object.prototype.hasOwnProperty.call(b, key)) return false;
            if (!_isEqual(a[key], b[key])) return false;
        }
        return true;
    }

    /**
     * استرجاع تفضيل اللغة المحفوظ
     * @private
     */
    function _getSavedLocale() {
        if (typeof global.i18n !== 'undefined' && typeof global.i18n.getLocale === 'function') {
            return global.i18n.getLocale();
        }
        return 'ar';
    }

    /**
     * استرجاع معرف الطالب النشط المحفوظ
     * @private
     */
    function _getSavedActiveStudentId() {
        if (typeof global.studentManager !== 'undefined' && typeof global.studentManager.getActiveStudentId === 'function') {
            return global.studentManager.getActiveStudentId();
        }
        return null;
    }

    /**
     * استرجاع إعدادات المعلم المحفوظة
     * @private
     */
    function _getSavedSettings() {
        if (typeof global.settingsManager !== 'undefined' && typeof global.settingsManager.get === 'function') {
            return Object.assign({}, DEFAULT_SETTINGS, global.settingsManager.get());
        }
        return Object.assign({}, DEFAULT_SETTINGS);
    }

    /**
     * استكشاف رقم الدرس الحالي من السياق أو الرابط
     * @private
     */
    function _detectLessonId() {
        if (typeof global.PAGE_CONFIG !== 'undefined' && global.PAGE_CONFIG) {
            if (global.PAGE_CONFIG.lessonId !== undefined) return String(global.PAGE_CONFIG.lessonId).trim();
            if (typeof global.PAGE_CONFIG.subtitle === 'string') {
                const subMatch = global.PAGE_CONFIG.subtitle.match(/Page\s+(\d+)/i);
                if (subMatch && subMatch[1]) return String(subMatch[1]).trim();
            }
        }
        if (typeof global.currentLessonId !== 'undefined' && global.currentLessonId !== null) {
            return String(global.currentLessonId).trim();
        }
        if (typeof global.lessonId !== 'undefined' && global.lessonId !== null) {
            return String(global.lessonId).trim();
        }
        try {
            if (typeof location !== 'undefined' && location.pathname) {
                const match = location.pathname.match(/(?:pages\/|lesson[_-]?)(\d+)(?:\.html)?/i);
                if (match && match[1]) {
                    return String(match[1]).trim();
                }
            }
        } catch (_) {}
        return null;
    }

    // الحالة المركزية المغلفة (Internal Encapsulated State)
    const _state = {
        locale: 'ar',
        activeStudentId: null,
        settings: Object.assign({}, DEFAULT_SETTINGS),
        currentLessonId: null,
        score: 0
    };

    /**
     * كائن موزع الحالة المركزي (Central Store)
     */
    const nbStore = {
        // قائمة المشتركين لكل شريحة
        _listeners: {
            '*': new Set(),
            locale: new Set(),
            activeStudentId: new Set(),
            settings: new Set(),
            currentLessonId: new Set(),
            score: new Set()
        },

        _isInitialized: false,
        _domEventsBound: false,

        /**
         * تهيئة الحالة الأولية واستعادة البيانات من مصادر التخزين والمديرين
         * @returns {Object} لقطة من الحالة الأولية
         */
        init() {
            if (this._isInitialized) return this.getState();

            _state.locale = _getSavedLocale();
            _state.activeStudentId = _getSavedActiveStudentId();
            _state.settings = _getSavedSettings();
            _state.currentLessonId = _detectLessonId();
            _state.score = 0;

            this._bindDOMEvents();
            this._isInitialized = true;

            return this.getState();
        },

        /**
         * جلب لقطة نقية ومعزولة لكامل الحالة
         * @returns {Object}
         */
        getState() {
            return {
                locale: _state.locale,
                activeStudentId: _state.activeStudentId,
                settings: _clone(_state.settings),
                currentLessonId: _state.currentLessonId,
                score: _state.score
            };
        },

        /**
         * جلب قيمة شريحة محددة من الحالة
         * @param {string} [slice] اسم الشريحة
         * @param {*} [fallback] قيمة بديلة اختيارية
         * @returns {*}
         */
        get(slice, fallback = null) {
            if (!slice) return this.getState();
            if (!Object.prototype.hasOwnProperty.call(_state, slice)) {
                return fallback;
            }
            const val = _state[slice];
            return (typeof val === 'object' && val !== null) ? _clone(val) : val;
        },

        /**
         * تحديث قيمة شريحة محددة
         * @param {string} slice اسم الشريحة
         * @param {*} val القيمة الجديدة
         * @param {Object} [options] خيارات إضافية { silent, fromDOMEvent, fromManager }
         * @returns {Object} الحالة بعد التحديث
         */
        set(slice, val, options = {}) {
            if (!slice || typeof slice !== 'string') return this.getState();
            return this.setState({ [slice]: val }, options);
        },

        /**
         * تحديث جزئي أو كلي لشرائح الحالة مع فحص الفروق وبث الأحداث
         * @param {Object} partial كائن يحتوي الشرائح المراد تحديثها
         * @param {Object} [options] خيارات { silent, fromDOMEvent, fromManager }
         * @returns {Object} الحالة بعد التحديث
         */
        setState(partial, options = {}) {
            if (!partial || typeof partial !== 'object') return this.getState();

            const changes = [];

            for (const [slice, nextVal] of Object.entries(partial)) {
                if (!Object.prototype.hasOwnProperty.call(_state, slice)) {
                    _state[slice] = (typeof nextVal === 'object' && nextVal !== null) ? _clone(nextVal) : nextVal;
                    changes.push({ slice, prev: undefined, next: _clone(_state[slice]) });
                    continue;
                }

                const prevVal = _state[slice];
                let normalizedNext = nextVal;

                if (slice === 'settings') {
                    normalizedNext = Object.assign({}, _state.settings, nextVal);
                } else if (slice === 'score') {
                    normalizedNext = Math.max(0, Math.floor(Number(nextVal) || 0));
                } else if (slice === 'locale') {
                    normalizedNext = typeof nextVal === 'string' ? nextVal.trim().toLowerCase() : _state.locale;
                } else if (slice === 'activeStudentId') {
                    normalizedNext = (nextVal && nextVal !== 'guest' && nextVal !== 'null') ? String(nextVal).trim() : null;
                } else if (slice === 'currentLessonId') {
                    normalizedNext = (nextVal !== null && nextVal !== undefined) ? String(nextVal).trim() : null;
                }

                // تجنب التحديث إذا لم تتغير القيمة لمنع الحلقات اللانهائية
                if (_isEqual(prevVal, normalizedNext)) {
                    continue;
                }

                _state[slice] = (typeof normalizedNext === 'object' && normalizedNext !== null) ? _clone(normalizedNext) : normalizedNext;
                changes.push({ slice, prev: _clone(prevVal), next: _clone(_state[slice]) });
            }

            if (changes.length === 0) {
                return this.getState();
            }

            const currentFullState = this.getState();

            // 1. مزامنة التخزين المحلي والمديرين المعنيين
            for (let i = 0; i < changes.length; i++) {
                const ch = changes[i];
                this._syncExternalManagers(ch.slice, ch.next, options);
            }

            // 2. إخطار المشتركين عبر subscribe
            for (let i = 0; i < changes.length; i++) {
                const ch = changes[i];
                this._notifySliceSubscribers(ch.slice, ch.next, ch.prev, currentFullState);
            }
            this._notifyGlobalSubscribers(currentFullState, changes);

            // 3. بث أحداث DOM المخصصة مع حماية الارتداد
            if (!options.silent) {
                for (let i = 0; i < changes.length; i++) {
                    const ch = changes[i];
                    this._broadcastDOMEvent(ch.slice, ch.next, ch.prev, options);
                }
                this._dispatchStoreChanged(changes, currentFullState, options);
            }

            return currentFullState;
        },

        /**
         * الاشتراك في تغييرات شريحة معينة أو كافة تغييرات الحالة
         * @param {string|Function} sliceOrListener اسم الشريحة (أو دالة المشترك للاشتراك الشامل)
         * @param {Function} [maybeListener] دالة المشترك عند تحديد شريحة
         * @returns {Function} دالة إلغاء الاشتراك unsubscribe()
         */
        subscribe(sliceOrListener, maybeListener) {
            let slice = '*';
            let listener = null;

            if (typeof sliceOrListener === 'function') {
                slice = '*';
                listener = sliceOrListener;
            } else if (typeof sliceOrListener === 'string' && typeof maybeListener === 'function') {
                slice = sliceOrListener.trim() || '*';
                listener = maybeListener;
            }

            if (typeof listener !== 'function') {
                console.warn('[nbStore] subscribe requires a valid listener function');
                return () => {};
            }

            if (!this._listeners[slice]) {
                this._listeners[slice] = new Set();
            }

            this._listeners[slice].add(listener);

            return () => {
                if (this._listeners[slice]) {
                    this._listeners[slice].delete(listener);
                }
            };
        },

        /**
         * اسم رديف للاشتراك (Alias for subscribe)
         */
        on(sliceOrListener, maybeListener) {
            return this.subscribe(sliceOrListener, maybeListener);
        },

        /**
         * مزامنة التخزين المحلي والمديرين الخارجيين
         * @private
         */
        _syncExternalManagers(slice, nextVal, options) {
            if (options && options.fromManager) return;

            if (slice === 'locale') {
                if (typeof global.i18n !== 'undefined' && typeof global.i18n.setLocale === 'function') {
                    if (global.i18n.getLocale() !== nextVal) {
                        global.i18n.setLocale(nextVal, { fromStore: true });
                    }
                }
            } else if (slice === 'activeStudentId') {
                if (typeof global.studentManager !== 'undefined' && typeof global.studentManager.setActiveStudent === 'function') {
                    if (global.studentManager.getActiveStudentId() !== nextVal) {
                        global.studentManager.setActiveStudent(nextVal);
                    }
                }
            } else if (slice === 'settings') {
                if (typeof global.settingsManager !== 'undefined') {
                    if (typeof global.settingsManager.apply === 'function') {
                        global.settingsManager.apply(nextVal);
                    }
                    if (global.SettingsValues) global.SettingsValues.replaceMemory(nextVal);
                }
            } else if (slice === 'score') {
                if (typeof global.app !== 'undefined' && global.app && global.app.score !== undefined) {
                    global.app.score = nextVal;
                }
            }
        },

        /**
         * إخطار المشتركين بشريحة محددة
         * @private
         */
        _notifySliceSubscribers(slice, nextVal, prevVal, fullState) {
            const set = this._listeners[slice];
            if (set && set.size > 0) {
                const callbacks = Array.from(set);
                for (let i = 0; i < callbacks.length; i++) {
                    try {
                        callbacks[i](nextVal, prevVal, slice, fullState);
                    } catch (err) {
                        console.error(`[nbStore] Error in subscriber for slice '${slice}':`, err);
                    }
                }
            }
        },

        /**
         * إخطار المشتركين الشاملين (*)
         * @private
         */
        _notifyGlobalSubscribers(fullState, changes) {
            const set = this._listeners['*'];
            if (set && set.size > 0) {
                const callbacks = Array.from(set);
                for (let i = 0; i < callbacks.length; i++) {
                    try {
                        callbacks[i](fullState, changes);
                    } catch (err) {
                        console.error('[nbStore] Error in global subscriber (*):', err);
                    }
                }
            }
        },

        /**
         * بث أحداث DOM القياسية
         * @private
         */
        _broadcastDOMEvent(slice, nextVal, prevVal, options) {
            if (typeof window === 'undefined' || typeof window.dispatchEvent !== 'function') return;
            if (options && options.fromDOMEvent) return;

            if (slice === 'locale') {
                return;
            } else if (slice === 'activeStudentId') {
                const student = (typeof global.studentManager !== 'undefined' && typeof global.studentManager.getActiveStudent === 'function')
                    ? global.studentManager.getActiveStudent()
                    : null;

                window.dispatchEvent(new CustomEvent(global.NBContracts.EVENTS.STUDENT_CHANGED, {
                    detail: {
                        activeStudentId: nextVal,
                        student: student
                    }
                }));
            } else if (slice === 'settings') {
                window.dispatchEvent(new CustomEvent(global.NBContracts.EVENTS.SETTINGS_CHANGED, {
                    detail: {
                        settings: _clone(nextVal),
                        previousSettings: _clone(prevVal)
                    }
                }));
            }
        },

        /**
         * بث حدث التغيير الشامل في المتجر
         * @private
         */
        _dispatchStoreChanged(changes, currentState, options) {
            if (typeof window === 'undefined' || typeof window.dispatchEvent !== 'function') return;

            window.dispatchEvent(new CustomEvent('nb:store-changed', {
                detail: {
                    changes: _clone(changes),
                    slice: changes.length === 1 ? changes[0].slice : null,
                    prev: changes.length === 1 ? changes[0].prev : null,
                    next: changes.length === 1 ? changes[0].next : null,
                    state: currentState,
                    sourceOptions: options
                }
            }));
        },

        /**
         * ربط أحداث DOM والتخزين المشترك
         * @private
         */
        _bindDOMEvents() {
            if (typeof window === 'undefined') return;
            if (this._domEventsBound) return;
            this._domEventsBound = true;

            // المزامنة عند تغيير اللغة من خارج المتجر
            const events = global.NBContracts ? global.NBContracts.EVENTS : {};
            window.addEventListener(events.LOCALE_CHANGED || 'nb:locale-changed', (e) => {
                if (e.detail && e.detail.locale && e.detail.locale !== _state.locale) {
                    this.set('locale', e.detail.locale, { fromDOMEvent: true });
                }
            });

            // المزامنة عند تغيير الطالب النشط من خارج المتجر
            window.addEventListener(events.STUDENT_CHANGED || 'nb:student-changed', (e) => {
                if (e.detail && e.detail.activeStudentId !== undefined && e.detail.activeStudentId !== _state.activeStudentId) {
                    this.set('activeStudentId', e.detail.activeStudentId, { fromDOMEvent: true });
                }
            });

            // المزامنة عند تغيير الإعدادات من خارج المتجر
            window.addEventListener(events.SETTINGS_CHANGED || 'nb:settings-changed', (e) => {
                if (e.detail && e.detail.settings && !_isEqual(e.detail.settings, _state.settings)) {
                    this.set('settings', e.detail.settings, { fromDOMEvent: true });
                }
            });

            // مزامنة التخزين عبر النوافذ والألسنة المتعددة (Multi-tab Storage Sync)
            window.addEventListener('storage', (e) => {
                if (e.key === 'nb_language' && e.newValue) {
                    if (global.i18n && typeof global.i18n.setLocale === 'function') {
                        global.i18n.setLocale(e.newValue);
                    } else {
                        this.set('locale', e.newValue);
                    }
                } else if (e.key === 'nb_students_data') {
                    try {
                        const parsed = JSON.parse(e.newValue || '{}');
                        this.set('activeStudentId', parsed.activeStudentId || null);
                    } catch (_) {}
                } else if (e.key === 'nb_teacher_settings' && e.newValue) {
                    try {
                        const parsed = JSON.parse(e.newValue);
                        if (parsed && typeof parsed === 'object') {
                            this.set('settings', parsed);
                        }
                    } catch (_) {}
                }
            });
        }
    };

    // التصدير والتسجيل التلقائي في النطاق العام
    if (typeof global !== 'undefined') {
        global.nbStore = nbStore;
    }
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = nbStore;
    }

    // تهيئة فورية للمتجر
    nbStore.init();

    // إعادة الضبط والمزامنة عند اكتمال جاهزية المستند
    if (typeof document !== 'undefined') {
        const onReady = () => {
            if (!_state.currentLessonId) {
                const detected = _detectLessonId();
                if (detected) nbStore.set('currentLessonId', detected, { silent: true });
            }
            if (!_state.activeStudentId && typeof global.studentManager !== 'undefined') {
                const stdId = global.studentManager.getActiveStudentId();
                if (stdId) nbStore.set('activeStudentId', stdId, { silent: true });
            }
            if (typeof global.settingsManager !== 'undefined') {
                nbStore.set('settings', global.settingsManager.get(), {
                    silent: true,
                    fromManager: true
                });
            }
        };

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', onReady);
        } else {
            onReady();
        }
    }

})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
