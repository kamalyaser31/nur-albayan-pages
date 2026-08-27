/**
 * ============================================================================
 * منصة نور البيان التفاعلية — محرك إدارة بيانات الطلاب والتخزين المحلي
 * Student Data & Local Storage Engine Module (Clean Code & Safe Contract)
 * ============================================================================
 *
 * الخصائص والمواصفات:
 * 1. التخزين المزدوج (In-Memory Cache + LocalStorage) تحت المفتاح 'nb_students_data'.
 * 2. حراسة دفاعية ضد أخطاء التصفح الخاص (Private Browsing) ونفاد السعة QuotaExceededError.
 * 3. إدارة الملفات الشخصية للطلاب (معرف فريد، أفاتار، لون، إجمالي نقاط، سجل الدروس، بنك الأخطاء).
 * 4. التسجيل الذري اللحظي للتقييمات وبث أحداث مخصصة 'nb:student-progress-updated'.
 * 5. دعم سياسات احتساب درجات التكرار ('best' | 'latest' | 'cumulative').
 * 6. بنك الأخطاء الذكي وتصدير/استيراد النسخ الاحتياطية بصيغة JSON مع تحقق صارم.
 * 7. دعم التحديث التلقائي لشارات ونجوم الفهرس في DOM.
 */

(function (global) {
    'use strict';

    const STORAGE_KEY = 'nb_students_data';
    const DEFAULT_AVATARS = ['👦', '👧', '🌟', '🦁', '🦅', '👑', '🚀', '🎯', '🦄', '🐬', '🏆', '🌸'];
    const DEFAULT_COLORS = ['#059669', '#0d9488', '#2563eb', '#4f46e5', '#7c3aed', '#d97706', '#e11d48', '#0891b2'];
    const HEX_COLOR_REGEX = /^#[0-9a-fA-F]{6}$/;

    /**
     * كائن إدارة الطلاب والتقدم التراكمي
     */
    const studentManager = {
        STORAGE_KEY: STORAGE_KEY,

        // الحالة الحية في الذاكرة الوسيطة (In-Memory Cache)
        _state: {
            version: NBContracts.DATA_SCHEMA_VERSION,
            activeStudentId: null,
            students: []
        },

        _isInitialized: false,

        // ========================================================================
        // 1. التهيئة وقراءة وحفظ التخزين (Storage & Initialization)
        // ========================================================================

        /**
         * تهيئة المحرك وقراءة البيانات من التخزين المحلي
         * @returns {Object} الحالة الحالية
         */
        init() {
            if (this._isInitialized) return this._state;

            this._loadFromStorage();
            this._isInitialized = true;

            // الاستماع لتغييرات التخزين عبر النوافذ والألسنة المتعددة (Multi-tab Storage Sync)
            if (typeof window !== 'undefined' && !this._storageListenerBound) {
                window.addEventListener('storage', (event) => {
                    if (event.key === STORAGE_KEY) {
                        if (event.newValue === null) {
                            // تم تفريغ أو مسح التخزين في لسان آخر - إعادة تعيين الحالة فوراً
                            this._state = {
                                version: NBContracts.DATA_SCHEMA_VERSION,
                                activeStudentId: null,
                                students: []
                            };
                        } else {
                            this._loadFromStorage();
                        }
                        this._dispatchEvent(NBContracts.EVENTS.STUDENT_PROGRESS_UPDATED, { studentId: this._state.activeStudentId });
                        this._dispatchEvent(NBContracts.EVENTS.STUDENT_CHANGED, { activeStudentId: this._state.activeStudentId, student: this.getActiveStudent() });
                        this.updateIndexBadges();
                    }
                });
                this._storageListenerBound = true;
            }

            // تحديث الشارات تلقائياً إذا كان المستند جاهزاً
            if (typeof document !== 'undefined') {
                if (document.readyState === 'loading') {
                    document.addEventListener('DOMContentLoaded', () => this.updateIndexBadges());
                } else {
                    this.updateIndexBadges();
                }
            }

            return this._state;
        },

        /**
         * تسوية وتطهير هيكل سجل الطالب لمنع انهيار الحسابات عند تلف أو نقص الحقول
         * @private
         * @param {Object} raw بيانات الطالب الخام
         * @param {number} [index=0] ترتيب الطالب للاستعانة به في القيم الافتراضية
         * @returns {Object|null} كائن الطالب المطهر والمسوّى
         */
        _normalizeStudent(raw, index = 0) {
            if (!raw || typeof raw !== 'object') return null;

            const id = typeof raw.id === 'string' && raw.id.trim() ? raw.id.trim() : this.generateId();
            const name = this._sanitizeText(raw.name, `طالب ${index + 1}`);
            const avatar = this._sanitizeText(raw.avatar, '👦') || name.charAt(0) || DEFAULT_AVATARS[index % DEFAULT_AVATARS.length];
            
            const rawColor = typeof raw.color === 'string' ? raw.color.trim() : '';
            const color = HEX_COLOR_REGEX.test(rawColor) ? rawColor : DEFAULT_COLORS[index % DEFAULT_COLORS.length];
            
            const totalScore = Math.max(0, Math.floor(Number(raw.totalScore) || 0));

            // تنقية سجل الدروس بحراسة ضد تلوث النموذج الأولي (Prototype Pollution Guard)
            const completedLessons = Object.create(null);
            const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype']);
            if (raw.completedLessons && typeof raw.completedLessons === 'object') {
                Object.keys(raw.completedLessons).forEach(key => {
                    const cleanKey = String(key).trim();
                    if (FORBIDDEN_KEYS.has(cleanKey)) return;
                    const l = raw.completedLessons[key];
                    if (l && typeof l === 'object') {
                        completedLessons[cleanKey] = StudentProgress.normalizedRecord(l);
                    }
                });
            }

            // تنقية بنك الأخطاء
            const mistakeBank = [];
            if (Array.isArray(raw.mistakeBank)) {
                raw.mistakeBank.forEach(m => {
                    if (m && typeof m === 'object') {
                        const plain = this._extractPlainWord(m.word);
                        if (plain) {
                            mistakeBank.push({
                                word: plain,
                                lessonId: String(m.lessonId || '').trim(),
                                timestamp: Number(m.timestamp) || Date.now(),
                                count: Math.max(1, Math.floor(Number(m.count) || 1)),
                                mastered: !!m.mastered,
                                consecutiveCorrect: Math.max(0, Math.floor(Number(m.consecutiveCorrect) || 0)),
                                item: (m.item && typeof m.item === 'object') ? this._clone(m.item) : null
                            });
                        }
                    }
                });
            }

            const createdAt = Number(raw.createdAt) || Date.now();
            const lastActive = Number(raw.lastActive) || Date.now();

            return {
                id,
                name,
                avatar,
                color,
                totalScore,
                completedLessons,
                mistakeBank,
                createdAt,
                lastActive
            };
        },

        /**
         * قراءة البيانات من LocalStorage إلى الذاكرة الوسيطة مع الحماية والتسوية الهيكلية
         * @private
         */
        _loadFromStorage() {
            try {
                const parsed = StudentRepository.read(STORAGE_KEY);
                if (parsed && typeof parsed === 'object') {
                    this._state.version = NBContracts.DATA_SCHEMA_VERSION;
                    this._state.activeStudentId = parsed.activeStudentId || null;
                    const rawStudents = Array.isArray(parsed.students) ? parsed.students : [];
                    this._state.students = rawStudents
                        .map((student, index) => this._normalizeStudent(student, index))
                        .filter(Boolean);
                    const policy = this._getRepeatPolicy();
                    this._state.students.forEach(student => {
                        student.totalScore = StudentProgress.totalScore(student.completedLessons, policy);
                    });
                    if ((parsed.version || 1) < NBContracts.DATA_SCHEMA_VERSION) {
                        this._saveToStorage();
                    }
                    return;
                }
            } catch (err) {
                console.warn('[studentManager] تعذر قراءة البيانات من LocalStorage (تصفح خاص أو قيود أمان):', err);
            }

            // في حال عدم وجود بيانات صالحة، نبقي الحالة الافتراضية
            this._state = {
                version: NBContracts.DATA_SCHEMA_VERSION,
                activeStudentId: null,
                students: []
            };
        },

        /**
         * حفظ الحالة الحالية في LocalStorage مع حراسة أخطاء الحصة ونفاد السعة
         * @private
         * @returns {boolean} نجاح أو فشل الحفظ الدائم
         */
        _saveToStorage() {
            try {
                return StudentRepository.write(STORAGE_KEY, this._state);
            } catch (err) {
                // فحص خطأ نفاد السعة أو حظر التخزين
                const isQuota = err && (
                    err.name === 'QuotaExceededError' ||
                    err.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
                    err.code === 22 ||
                    err.code === 1014
                );

                if (isQuota) {
                    console.error('[studentManager] نفدت مساحة LocalStorage؛ رُفض التغيير:', err);
                } else {
                    console.warn('[studentManager] تعذر الحفظ في LocalStorage (جلسة تصفح خاصة):', err);
                }
            }
            return false;
        },

        _getRepeatPolicy() {
            if (typeof settingsManager === 'undefined' || typeof settingsManager.get !== 'function') {
                return NBContracts.SCORE_POLICIES.BEST;
            }
            return NBContracts.normalizeScorePolicy(settingsManager.get().repeatGradingPolicy);
        },

        _snapshotState() {
            return StudentRepository.clone(this._state);
        },

        _persistOrRollback(previousState) {
            if (this._saveToStorage()) return true;
            this._state = previousState;
            this._showNotification('تعذر حفظ التغيير. لم تُمس بيانات الطالب السابقة.');
            return false;
        },

        /**
         * إشعار عائم داخلي في حال وجود واجهة للمستخدم
         * @private
         */
        _showNotification(msg) {
            if (typeof document === 'undefined') return;
            let toast = document.getElementById('nb-student-toast');
            if (!toast) {
                toast = document.createElement('div');
                toast.id = 'nb-student-toast';
                toast.setAttribute('role', 'status');
                toast.setAttribute('aria-live', 'polite');
                toast.className = 'fixed bottom-4 left-1/2 -translate-x-1/2 bg-slate-900/95 text-white font-bold text-xs px-4 py-2 rounded-full shadow-xl z-[110] transition-opacity duration-300 pointer-events-none opacity-0';
                document.body.appendChild(toast);
            }
            toast.textContent = msg;
            toast.style.opacity = '1';
            clearTimeout(this._toastTimer);
            this._toastTimer = setTimeout(() => {
                toast.style.opacity = '0';
            }, 2500);
        },

        /**
         * بث حدث مخصص في DOM
         * @private
         */
        _dispatchEvent(eventName, detail = {}) {
            if (typeof window !== 'undefined' && typeof window.CustomEvent === 'function') {
                const event = new CustomEvent(eventName, { detail, bubbles: true });
                window.dispatchEvent(event);
                if (typeof document !== 'undefined') {
                    document.dispatchEvent(event);
                }
            }
        },

        // ========================================================================
        // 2. دوال المساعدة والتنقية (Helpers & Sanitizers)
        // ========================================================================

        /**
         * توليد معرف فريد للطالب
         * نمط: std_ + timestamp + _ + random5
         */
        generateId() {
            const randomPart = Math.random().toString(36).substring(2, 7) || 'x9a2k';
            return `std_${Date.now()}_${randomPart}`;
        },

        /**
         * ترميز الكيانات الخاصة لمنع ثغرات XSS وحماية سمات ARIA والأحداث المضمنة
         * @param {string} str
         * @returns {string}
         */
        escapeHTML(str) {
            return String(str || '')
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#39;');
        },

        /**
         * تنقية النصوص وإزالة وسوم HTML وترميز الكيانات الخاصة لمنع ثغرات XSS وحماية سمات ARIA
         * @private
         */
        _sanitizeText(str, fallback = '') {
            if (str === null || str === undefined) return fallback;
            const clean = String(str).replace(/<[^>]*>/g, '').trim();
            if (clean.length === 0) return fallback;
            return this.escapeHTML(clean);
        },

        /**
         * استخراج النص العربي الصافي من كائن الكلمة أو وسوم HTML
         * @private
         */
        _extractPlainWord(wordData) {
            if (!wordData) return '';
            if (typeof wordData === 'string') {
                return wordData.replace(/<[^>]+>/g, '').replace(/&zwj;/g, '').replace(/&nbsp;/g, ' ').trim();
            }
            if (wordData.word && typeof wordData.word === 'string') {
                return wordData.word.replace(/<[^>]+>/g, '').replace(/&zwj;/g, '').replace(/&nbsp;/g, ' ').trim();
            }
            if (wordData.plain && typeof wordData.plain === 'string') {
                return wordData.plain.trim();
            }
            if (wordData.html && typeof wordData.html === 'string') {
                return wordData.html.replace(/<[^>]+>/g, '').replace(/&zwj;/g, '').replace(/&nbsp;/g, ' ').trim();
            }
            if (Array.isArray(wordData.w)) {
                return wordData.w.join('').replace(/<[^>]+>/g, '').replace(/&zwj;/g, '').replace(/&nbsp;/g, ' ').replace(/ـ/g, '').trim();
            }
            if (typeof wordData.w === 'string') {
                return wordData.w.replace(/<[^>]+>/g, '').replace(/&zwj;/g, '').replace(/&nbsp;/g, ' ').trim();
            }
            if (Array.isArray(wordData.boxes)) {
                return wordData.boxes.map(b => Array.isArray(b) ? b.map(s => s[0]).join('') : '').join(' ').trim();
            }
            if (Array.isArray(wordData.groups)) {
                return wordData.groups.map(g => Array.isArray(g) ? g[0] : g).join('').trim();
            }
            return String(wordData).trim();
        },

        /**
         * توليد نسخة عميقة آمنة من كائن لمنع التعديل المباشر
         * @private
         */
        _clone(obj) {
            if (obj === null || obj === undefined) return obj;
            if (typeof structuredClone === 'function') {
                try {
                    return structuredClone(obj);
                } catch (_) {}
            }
            try {
                return JSON.parse(JSON.stringify(obj));
            } catch (_) {
                return obj;
            }
        },

        // ========================================================================
        // 3. إدارة كائنات الطلاب والحالة (Students & Active State CRUD)
        // ========================================================================

        /**
         * جلب قائمة كافة الطلاب
         * @returns {Array<Object>} نسخة من مصفوفة الطلاب
         */
        getStudents() {
            this.init();
            return this._clone(this._state.students);
        },

        /**
         * جلب طالب محدد بالمعرف
         * @param {string} id معرف الطالب
         * @returns {Object|null} كائن الطالب أو null
         */
        getStudent(id) {
            this.init();
            if (!id) return null;
            const student = this._state.students.find(s => s.id === id);
            return student ? this._clone(student) : null;
        },

        /**
         * إنشاء طالب جديد وإضافته للمنظومة مع التحقق الصارم من صحة الألوان
         * @param {Object} options خيارات الطالب { name, avatar, color }
         * @returns {Object} كائن الطالب المنشأ
         */
        createStudent({ name, avatar, color } = {}) {
            this.init();
            const previousState = this._snapshotState();

            const sanitizedName = this._sanitizeText(name, 'طالب جديد');
            const chosenAvatar = this._sanitizeText(avatar) || sanitizedName.charAt(0) || DEFAULT_AVATARS[Math.floor(Math.random() * DEFAULT_AVATARS.length)];
            
            const fallbackColor = DEFAULT_COLORS[this._state.students.length % DEFAULT_COLORS.length];
            const rawColor = typeof color === 'string' ? color.trim() : '';
            const chosenColor = HEX_COLOR_REGEX.test(rawColor) ? rawColor : fallbackColor;

            const now = Date.now();
            const newStudent = {
                id: this.generateId(),
                name: sanitizedName,
                avatar: chosenAvatar,
                color: chosenColor,
                totalScore: 0,
                completedLessons: {},
                mistakeBank: [],
                createdAt: now,
                lastActive: now
            };

            this._state.students.push(newStudent);

            // تفعيل الطالب تلقائياً إذا لم يكن هناك طالب نشط
            if (!this._state.activeStudentId) {
                this._state.activeStudentId = newStudent.id;
            }

            if (!this._persistOrRollback(previousState)) return null;
            this._dispatchEvent(NBContracts.EVENTS.STUDENT_CREATED, { student: this._clone(newStudent) });
            this._dispatchEvent(NBContracts.EVENTS.STUDENT_PROGRESS_UPDATED, { studentId: newStudent.id });
            this.updateIndexBadges();

            return this._clone(newStudent);
        },

        /**
         * تحديث بيانات طالب موجود والتحقق من صحة اللون والاسم
         * @param {string} id معرف الطالب
         * @param {Object} patchData التعديلات الجزئية
         * @returns {Object|null} الطالب بعد التحديث
         */
        updateStudent(id, patchData = {}) {
            this.init();
            const previousState = this._snapshotState();
            const student = this._state.students.find(s => s.id === id);
            if (!student) return null;

            if (patchData.name !== undefined) {
                student.name = this._sanitizeText(patchData.name, student.name);
            }
            if (patchData.avatar !== undefined) {
                student.avatar = this._sanitizeText(patchData.avatar, student.avatar);
            }
            if (patchData.color !== undefined) {
                const rawCol = typeof patchData.color === 'string' ? patchData.color.trim() : '';
                if (HEX_COLOR_REGEX.test(rawCol)) {
                    student.color = rawCol;
                }
            }
            if (typeof patchData.totalScore === 'number') {
                student.totalScore = Math.max(0, Math.floor(patchData.totalScore));
            }

            student.lastActive = Date.now();
            if (!this._persistOrRollback(previousState)) return null;
            this._dispatchEvent(NBContracts.EVENTS.STUDENT_UPDATED, { student: this._clone(student) });
            this.updateIndexBadges();

            return this._clone(student);
        },

        /**
         * حذف طالب بالمعرف
         * @param {string} id معرف الطالب المراد حذفه
         * @returns {boolean} نجاح العملية
         */
        deleteStudent(id) {
            this.init();
            const previousState = this._snapshotState();
            const idx = this._state.students.findIndex(s => s.id === id);
            if (idx === -1) return false;

            this._state.students.splice(idx, 1);

            // إذا كان الطالب المحذوف هو النشط، نعود إلى وضع الضيف / الحصة العامة
            if (this._state.activeStudentId === id) {
                this._state.activeStudentId = null;
            }

            if (!this._persistOrRollback(previousState)) return false;
            this._dispatchEvent(NBContracts.EVENTS.STUDENT_DELETED, { studentId: id });
            this._dispatchEvent(NBContracts.EVENTS.STUDENT_CHANGED, { activeStudentId: this._state.activeStudentId, student: null });
            this._dispatchEvent(NBContracts.EVENTS.STUDENT_PROGRESS_UPDATED, { studentId: null });
            this.updateIndexBadges();

            return true;
        },

        /**
         * جلب معرف الطالب النشط
         * @returns {string|null} معرف الطالب أو null لوضع الضيف
         */
        getActiveStudentId() {
            this.init();
            return this._state.activeStudentId;
        },

        /**
         * جلب كائن الطالب النشط حالياً
         * @returns {Object|null} كائن الطالب النشط أو null
         */
        getActiveStudent() {
            this.init();
            if (!this._state.activeStudentId) return null;
            const student = this._state.students.find(s => s.id === this._state.activeStudentId);
            return student ? this._clone(student) : null;
        },

        /**
         * تعيين الطالب النشط (إذا تم تمرير null أو 'guest' يُفعل وضع "حصة عامة / ضيف")
         * @param {string|null} id معرف الطالب أو null
         * @returns {Object|null} الطالب النشط الجديد أو null
         */
        setActiveStudent(id) {
            this.init();
            const previousState = this._snapshotState();

            if (!id || id === 'guest' || id === 'null') {
                this._state.activeStudentId = null;
            } else {
                const found = this._state.students.find(s => s.id === id);
                if (found) {
                    this._state.activeStudentId = id;
                    found.lastActive = Date.now();
                } else {
                    console.warn(`[studentManager] الطالب بالمعرف ${id} غير موجود، تم التحويل لوضع الضيف`);
                    this._state.activeStudentId = null;
                }
            }

            if (!this._persistOrRollback(previousState)) return this.getActiveStudent();
            const active = this.getActiveStudent();
            this._dispatchEvent(NBContracts.EVENTS.STUDENT_CHANGED, { activeStudentId: this._state.activeStudentId, student: active });
            this._dispatchEvent(NBContracts.EVENTS.STUDENT_PROGRESS_UPDATED, { studentId: this._state.activeStudentId });
            this.updateIndexBadges();

            return active;
        },

        /**
         * التحقق هل يوجد طالب نشط حالياً (وليس في وضع الضيف)
         * @returns {boolean} true إذا وجد طالب نشط مسجل
         */
        hasActiveStudent() {
            this.init();
            if (!this._state.activeStudentId) return false;
            return this._state.students.some(s => s.id === this._state.activeStudentId);
        },

        // ========================================================================
        // 4. التسجيل الذري اللحظي للتقييم والتقدم (Atomic Real-Time Evaluation)
        // ========================================================================

        /**
         * تسجيل تقييم بطاقة/كلمة فردية لحظياً وبشكل ذري
         * الواجهة المعتمدة كائن CardEvaluationRequest. تبقى الوسائط الموضعية
         * القديمة مدة انتقالية لحماية المستدعين الخارجيين.
         * @param {CardEvaluationRequest|string|number} requestOrLessonId الطلب أو رقم الدرس القديم
         * @param {...*} legacyArguments الوسائط الموضعية القديمة
         * @returns {Object|null} الطالب المحدث أو null
         */
        recordCardEvaluation(requestOrLessonId, ...legacyArguments) {
            this.init();
            if (!this.hasActiveStudent()) {
                return null;
            }

            const request = typeof requestOrLessonId === 'object'
                ? NBContracts.cardEvaluationRequest(requestOrLessonId)
                : NBContracts.cardEvaluationRequest({
                    lessonId: requestOrLessonId,
                    isCorrect: legacyArguments[0],
                    pointsAwarded: legacyArguments[1],
                    wordData: legacyArguments[2],
                    cardIndex: legacyArguments[3],
                    totalCards: legacyArguments[4]
                });

            const student = this._state.students.find(s => s.id === this._state.activeStudentId);
            if (!student) return null;

            const previousState = this._snapshotState();
            const lessonKey = request.lessonId;
            const plainWord = this._extractPlainWord(request.wordData);
            const now = Date.now();

            student.lastActive = now;

            if (!student.mistakeBank) student.mistakeBank = [];
            if (!request.isCorrect) {
                MistakeBank.recordIncorrect(student.mistakeBank, lessonKey, plainWord, now, request.wordData);
            }

            if (!this._persistOrRollback(previousState)) return null;

            this._dispatchEvent(NBContracts.EVENTS.STUDENT_PROGRESS_UPDATED, {
                studentId: student.id,
                lessonId: lessonKey,
                isCorrect: request.isCorrect,
                pointsAwarded: request.pointsAwarded,
                totalScore: student.totalScore,
                cardIndex: request.cardIndex,
                totalCards: request.totalCards,
                word: plainWord
            });

            return this._clone(student);
        },

        /**
         * تسجيل إتمام درس كامل وتحديث النجوم والنتائج وفق سياسة التكرار
         * @param {string|number} lessonId رقم الدرس
         * @param {number} finalScore الدرجة النهائية المحققة في الجولة
         * @param {number} accuracy نسبة الدقة (0-100)
         * @param {number} stars عدد النجوم المحرزة (0-3)
         * @returns {Object|null} سجل الدرس المحدث
         */
        recordLessonCompletion(lessonId, finalScore = 0, accuracy = 100, stars = 0) {
            this.init();
            if (!this.hasActiveStudent()) return null;

            const student = this._state.students.find(s => s.id === this._state.activeStudentId);
            if (!student) return null;

            const previousState = this._snapshotState();
            const lessonKey = String(lessonId).trim();
            const scoreNum = Math.max(0, Math.floor(Number(finalScore) || 0));
            const accNum = Math.min(100, Math.max(0, Math.round(Number(accuracy) || 0)));
            const starNum = Math.min(3, Math.max(0, Math.floor(Number(stars) || 0)));
            const now = Date.now();

            if (!student.completedLessons) student.completedLessons = {};
            const prev = student.completedLessons[lessonKey] || null;

            const policy = this._getRepeatPolicy();
            const updatedLesson = StudentProgress.completion(prev, {
                score: scoreNum,
                accuracy: accNum,
                stars: starNum,
                completedAt: now
            }, policy);

            student.completedLessons[lessonKey] = updatedLesson;
            student.totalScore = StudentProgress.totalScore(student.completedLessons, policy);
            student.lastActive = now;

            if (!this._persistOrRollback(previousState)) return null;

            this._dispatchEvent(NBContracts.EVENTS.LESSON_COMPLETED, {
                studentId: student.id,
                lessonId: lessonKey,
                lessonData: this._clone(updatedLesson)
            });

            this._dispatchEvent(NBContracts.EVENTS.STUDENT_PROGRESS_UPDATED, {
                studentId: student.id,
                lessonId: lessonKey
            });

            this.updateIndexBadges();

            return this._clone(updatedLesson);
        },

        /**
         * حذف تقدم درس محدد لطالب وإعادة احتساب النقاط بدقة
         * @param {string} studentId معرف الطالب
         * @param {string|number} lessonId رقم الدرس المراد إلغاء تقدمه
         * @returns {boolean} نجاح العملية
         */
        deleteLessonProgress(studentId, lessonId) {
            this.init();
            if (!studentId || lessonId === undefined) return false;
            const student = this._state.students.find(s => s.id === studentId);
            if (!student || !student.completedLessons) return false;

            const lessonKey = String(lessonId).trim();
            if (!student.completedLessons[lessonKey]) return false;

            const previousState = this._snapshotState();
            delete student.completedLessons[lessonKey];
            student.totalScore = StudentProgress.totalScore(
                student.completedLessons,
                this._getRepeatPolicy()
            );
            student.lastActive = Date.now();

            if (!this._persistOrRollback(previousState)) return false;
            this._dispatchEvent(NBContracts.EVENTS.STUDENT_UPDATED, { student: this._clone(student) });
            this._dispatchEvent(NBContracts.EVENTS.LESSON_PROGRESS_DELETED, { studentId, lessonId: lessonKey });
            this._dispatchEvent(NBContracts.EVENTS.STUDENT_PROGRESS_UPDATED, { studentId, lessonId: lessonKey });
            this.updateIndexBadges();

            return true;
        },

        /**
         * إعادة احتساب وضبط إجمالي النقاط التراكمية لطالب محدد بدقة من واقع الدروس المنجزة
         * @param {string} [studentId] معرف الطالب (إذا لم يُمرر يُستخدم الطالب النشط)
         * @returns {number} إجمالي النقاط المحتسبة
         */
        recalculateStudentScore(studentId) {
            this.init();
            const targetId = studentId || this._state.activeStudentId;
            if (!targetId) return 0;

            const student = this._state.students.find(s => s.id === targetId);
            if (!student) return 0;

            const previousState = this._snapshotState();
            const recalculated = StudentProgress.totalScore(
                student.completedLessons,
                this._getRepeatPolicy()
            );

            student.totalScore = recalculated;
            student.lastActive = Date.now();

            if (!this._persistOrRollback(previousState)) return previousState.students
                .find(entry => entry.id === targetId)?.totalScore || 0;
            this._dispatchEvent(NBContracts.EVENTS.STUDENT_UPDATED, { student: this._clone(student) });
            this._dispatchEvent(NBContracts.EVENTS.STUDENT_PROGRESS_UPDATED, { studentId: targetId, totalScore: recalculated });
            this.updateIndexBadges();

            return recalculated;
        },

        recalculateAllStudentScores() {
            this.init();
            const previousState = this._snapshotState();
            const policy = this._getRepeatPolicy();
            this._state.students.forEach(student => {
                student.totalScore = StudentProgress.totalScore(student.completedLessons, policy);
            });
            if (!this._persistOrRollback(previousState)) return false;
            this._dispatchEvent(NBContracts.EVENTS.STUDENT_PROGRESS_UPDATED, {
                studentId: null,
                scorePolicy: policy
            });
            this.updateIndexBadges();
            return true;
        },

        // ========================================================================
        // 5. بنك الأخطاء والنسخ الاحتياطي (Mistake Bank & JSON Backup)
        // ========================================================================

        /**
         * جلب بنك الأخطاء لطالب محدد أو الطالب النشط
         * @param {string} [studentId] معرف الطالب (اختياري)
         * @returns {Array<Object>} مصفوفة الأخطاء المسجلة
         */
        getMistakes(studentId) {
            this.init();
            const targetId = studentId || this._state.activeStudentId;
            if (!targetId) return [];

            const student = this._state.students.find(s => s.id === targetId);
            if (!student || !Array.isArray(student.mistakeBank)) return [];

            return this._clone(student.mistakeBank);
        },

        /**
         * إزالة كلمة من بنك الأخطاء أو تمييزها كمتقنة مع دعم حصر الحذف بدرس محدد لمنع الحذف العشوائي
         * @param {string} studentIdOrWord معرف الطالب أو الكلمة إذا كان الطالب نشطاً
         * @param {string} [word] الكلمة المراد حذفها
         * @param {string|number} [lessonId] رقم الدرس المراد قصر الحذف عليه اختيارياً
         * @returns {Array<Object>} بنك الأخطاء بعد التعديل
         */
        removeMistake(studentIdOrWord, word, lessonId) {
            this.init();
            let targetStudentId = this._state.activeStudentId;
            let targetWord = studentIdOrWord;
            let targetLessonId = undefined;

            if (lessonId !== undefined) {
                targetStudentId = studentIdOrWord;
                targetWord = word;
                targetLessonId = String(lessonId).trim();
            } else if (word !== undefined) {
                const isStudent = this._state.students.some(s => s.id === studentIdOrWord);
                if (isStudent) {
                    targetStudentId = studentIdOrWord;
                    targetWord = word;
                } else {
                    targetStudentId = this._state.activeStudentId;
                    targetWord = studentIdOrWord;
                    targetLessonId = String(word).trim();
                }
            }

            if (!targetStudentId || !targetWord) return [];

            const student = this._state.students.find(s => s.id === targetStudentId);
            if (!student || !Array.isArray(student.mistakeBank)) return [];

            const cleanTarget = this._extractPlainWord(targetWord);
            const previousState = this._snapshotState();
            student.mistakeBank = student.mistakeBank.filter(m => {
                if (m.word !== cleanTarget) return true;
                if (targetLessonId !== undefined && targetLessonId !== '') {
                    return String(m.lessonId).trim() !== targetLessonId;
                }
                return false;
            });
            student.lastActive = Date.now();

            if (!this._persistOrRollback(previousState)) {
                return this.getMistakes(targetStudentId);
            }
            this._dispatchEvent(NBContracts.EVENTS.STUDENT_PROGRESS_UPDATED, { studentId: targetStudentId });

            return this._clone(student.mistakeBank);
        },

        /**
         * تسجيل محاولة معالجة لكلمة في جلسة تدريب الأخطاء
         * تطبيق قاعدة الإتقان الراسخ (Double-Check Mastery): تتطلب الكلمة إتقانها مرتين متتاليتين لحذفها
         * @param {string} studentIdOrWord معرف الطالب أو الكلمة إن كان الطالب نشطاً
         * @param {string|boolean} wordOrIsCorrect الكلمة أو صحة الإجابة
         * @param {boolean} [isCorrectVal] صحة الإجابة إذا تم تمرير المعرف
         * @returns {Object} { mastered: boolean, consecutiveCorrect: number, remainingMistakes: number }
         */
        recordRemediationAttempt(studentIdOrWord, wordOrIsCorrect, isCorrectVal) {
            this.init();
            let targetStudentId = this._state.activeStudentId;
            let targetWord = studentIdOrWord;
            let isCorrect = !!wordOrIsCorrect;

            if (isCorrectVal !== undefined) {
                targetStudentId = studentIdOrWord;
                targetWord = wordOrIsCorrect;
                isCorrect = !!isCorrectVal;
            }

            if (!targetStudentId || !targetWord) {
                return { mastered: false, consecutiveCorrect: 0, remainingMistakes: 0 };
            }

            const student = this._state.students.find(s => s.id === targetStudentId);
            if (!student || !Array.isArray(student.mistakeBank)) {
                return { mastered: false, consecutiveCorrect: 0, remainingMistakes: 0 };
            }

            const cleanTarget = this._extractPlainWord(targetWord);
            if (!cleanTarget) {
                return { mastered: false, consecutiveCorrect: 0, remainingMistakes: student.mistakeBank.length };
            }

            const mistakeItem = student.mistakeBank.find(m => m.word === cleanTarget);

            if (!mistakeItem) {
                return { mastered: false, consecutiveCorrect: 0, remainingMistakes: student.mistakeBank.length };
            }

            const previousState = this._snapshotState();
            let wasMastered = false;
            if (isCorrect) {
                mistakeItem.consecutiveCorrect = (mistakeItem.consecutiveCorrect || 0) + 1;

                if (mistakeItem.consecutiveCorrect >= 2) {
                    // الإتقان يعالج بنك الأخطاء ولا يبدل مجموع نتائج الدروس.
                    mistakeItem.mastered = true;
                    student.mistakeBank = student.mistakeBank.filter(m => m.word !== cleanTarget);
                    wasMastered = true;
                }
            } else {
                mistakeItem.consecutiveCorrect = 0;
                mistakeItem.count = (mistakeItem.count || 1) + 1;
                mistakeItem.timestamp = Date.now();
                mistakeItem.mastered = false;
            }

            student.lastActive = Date.now();
            if (!this._persistOrRollback(previousState)) {
                return {
                    mastered: false,
                    consecutiveCorrect: 0,
                    remainingMistakes: this.getMistakes(targetStudentId).length,
                    saved: false
                };
            }

            this._dispatchEvent(NBContracts.EVENTS.STUDENT_PROGRESS_UPDATED, {
                studentId: student.id,
                word: cleanTarget,
                isCorrect,
                wasMastered
            });

            return {
                mastered: wasMastered,
                consecutiveCorrect: wasMastered ? 2 : (mistakeItem.consecutiveCorrect || 0),
                remainingMistakes: student.mistakeBank.length,
                saved: true
            };
        },

        /**
         * تمييز كلمة في بنك الأخطاء كـ "تم إتقانها" (Mastered)
         * @param {string} studentIdOrWord معرف الطالب أو الكلمة
         * @param {string} [word] الكلمة
         * @returns {boolean} نجاح العملية
         */
        markMistakeMastered(studentIdOrWord, word) {
            this.init();
            let targetStudentId = this._state.activeStudentId;
            let targetWord = studentIdOrWord;

            if (word !== undefined) {
                targetStudentId = studentIdOrWord;
                targetWord = word;
            }

            if (!targetStudentId || !targetWord) return false;

            const student = this._state.students.find(s => s.id === targetStudentId);
            if (!student || !Array.isArray(student.mistakeBank)) return false;

            const cleanTarget = this._extractPlainWord(targetWord);
            const mistake = student.mistakeBank.find(m => m.word === cleanTarget);
            if (mistake) {
                const previousState = this._snapshotState();
                mistake.mastered = true;
                student.lastActive = Date.now();
                if (!this._persistOrRollback(previousState)) return false;
                this._dispatchEvent(NBContracts.EVENTS.STUDENT_PROGRESS_UPDATED, { studentId: targetStudentId });
                return true;
            }
            return false;
        },

        /**
         * تفريغ بنك الأخطاء لطالب محدد أو الطالب النشط بشكل ذري ودفعة واحدة
         * يحفظ الحالة في التخزين ويبث أحداث التحديث مرة واحدة بدلاً من التكرار المجهد
         * @param {string} [studentId] معرف الطالب (إذا لم يُمرر يُستخدم الطالب النشط)
         * @returns {boolean} نجاح العملية
         */
        clearStudentMistakes(studentId) {
            this.init();
            const targetId = studentId || this._state.activeStudentId;
            if (!targetId) return false;

            const student = this._state.students.find(s => s.id === targetId);
            if (!student) return false;

            const countBefore = Array.isArray(student.mistakeBank) ? student.mistakeBank.length : 0;
            const previousState = this._snapshotState();
            student.mistakeBank = [];
            student.lastActive = Date.now();

            if (!this._persistOrRollback(previousState)) return false;
            this._dispatchEvent(NBContracts.EVENTS.STUDENT_UPDATED, { student: this._clone(student) });
            this._dispatchEvent(NBContracts.EVENTS.STUDENT_PROGRESS_UPDATED, {
                studentId: targetId,
                mistakesCleared: countBefore,
                mistakeBank: []
            });

            return true;
        },

        /**
         * تصدير بيانات كافة الطلاب كملف JSON للنسخ الاحتياطي
         * @returns {string} محتوى نص JSON المصدر
         */
        exportJSON() {
            this.init();

            const jsonText = StudentBackup.stringify(this._state);

            // تشغيل تنزيل الملف في بيئة المتصفح
            if (typeof window !== 'undefined' && typeof document !== 'undefined') {
                try {
                    const dateStr = new Date().toISOString().slice(0, 10);
                    const blob = new Blob([jsonText], { type: 'application/json;charset=utf-8' });
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = `nur-albayan-students-backup-${dateStr}.json`;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    URL.revokeObjectURL(url);
                    this._showNotification('✓ تم تصدير النسخة الاحتياطية بنجاح');
                } catch (e) {
                    console.warn('[studentManager] تعذر التنزيل التلقائي لملف JSON:', e);
                }
            }

            return jsonText;
        },

        /**
         * استيراد والتحقق الصارم من صحة بيانات JSON للطلاب
         * @param {string|Object} jsonInput نص الـ JSON أو الكائن المستورد
         * @returns {Object} تقرير النتيجة { success, count, error }
         */
        importJSON(jsonInput) {
            this.init();

            try {
                const parsed = StudentBackup.parse(jsonInput);
                const previousState = this._snapshotState();
                const candidateStudents = parsed.students;

                const validatedStudents = candidateStudents
                    .map((raw, i) => this._normalizeStudent(raw, i))
                    .filter(Boolean);

                if (validatedStudents.length === 0) {
                    throw new Error('الملف لا يحتوي على أي سجلات طلاب صالحة للاستيراد.');
                }

                const importedIds = new Set();
                for (const student of validatedStudents) {
                    if (importedIds.has(student.id)) {
                        throw new Error(`معرف طالب مكرر في ملف الاستيراد: ${student.id}`);
                    }
                    importedIds.add(student.id);
                }

                this._state.students = validatedStudents;
                this._state.version = NBContracts.DATA_SCHEMA_VERSION;
                const policy = this._getRepeatPolicy();
                validatedStudents.forEach(student => {
                    student.totalScore = StudentProgress.totalScore(student.completedLessons, policy);
                });

                if (parsed.activeStudentId && validatedStudents.some(s => s.id === parsed.activeStudentId)) {
                    this._state.activeStudentId = parsed.activeStudentId;
                } else if (validatedStudents.length > 0) {
                    this._state.activeStudentId = validatedStudents[0].id;
                } else {
                    this._state.activeStudentId = null;
                }

                if (!this._persistOrRollback(previousState)) {
                    throw new Error('تعذر حفظ النسخة المستوردة؛ أُبقيت البيانات السابقة.');
                }
                this._dispatchEvent(NBContracts.EVENTS.STUDENT_CHANGED, { activeStudentId: this._state.activeStudentId, student: this.getActiveStudent() });
                this._dispatchEvent(NBContracts.EVENTS.STUDENT_PROGRESS_UPDATED, { studentId: this._state.activeStudentId });
                this.updateIndexBadges();
                this._showNotification(`✓ تم استيراد بيانات (${validatedStudents.length}) طالب بنجاح`);

                return {
                    success: true,
                    count: validatedStudents.length
                };

            } catch (err) {
                console.error('[studentManager] خطأ في استيراد ملف JSON:', err);
                this._showNotification(`❌ خطأ في الاستيراد: ${err.message}`);
                return {
                    success: false,
                    count: 0,
                    error: err.message
                };
            }
        },

        // ========================================================================
        // 6. دالة مساعدة الفهرس وتحديث شارات النجوم (Index Badges Helper)
        // ========================================================================

        /**
         * البحث في بطاقات الدروس في DOM وتحديث عناصر النجوم وشارات الإنجاز للطالب النشط
         */
        updateIndexBadges() {
            if (typeof IndexProgressView !== 'undefined') {
                IndexProgressView.update(this.getActiveStudent());
            }
        }
    };

    // ========================================================================
    // 7. التصدير والتسجيل التلقائي في النطاق العام (Global Export)
    // ========================================================================

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = studentManager;
    }

    if (typeof global !== 'undefined') {
        global.studentManager = studentManager;
    }

    // تهيئة المحرك تلقائياً
    if (typeof document !== 'undefined') {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                studentManager.init();
            });
        } else {
            studentManager.init();
        }
    }

})(typeof window !== 'undefined' ? window : globalThis);
