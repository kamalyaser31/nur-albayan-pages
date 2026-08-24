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

    /**
     * كائن إدارة الطلاب والتقدم التراكمي
     */
    const studentManager = {
        STORAGE_KEY: STORAGE_KEY,

        // الحالة الحية في الذاكرة الوسيطة (In-Memory Cache)
        _state: {
            version: 1,
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
                    if (event.key === STORAGE_KEY && event.newValue) {
                        this._loadFromStorage();
                        this._dispatchEvent('nb:student-progress-updated', { studentId: this._state.activeStudentId });
                        this._dispatchEvent('nb:student-changed', { studentId: this._state.activeStudentId });
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
         * قراءة البيانات من LocalStorage إلى الذاكرة الوسيطة مع الحماية
         * @private
         */
        _loadFromStorage() {
            try {
                if (typeof localStorage !== 'undefined') {
                    const raw = localStorage.getItem(STORAGE_KEY);
                    if (raw) {
                        const parsed = JSON.parse(raw);
                        if (parsed && typeof parsed === 'object') {
                            this._state.version = parsed.version || 1;
                            this._state.activeStudentId = parsed.activeStudentId || null;
                            this._state.students = Array.isArray(parsed.students) ? parsed.students : [];
                            return;
                        }
                    }
                }
            } catch (err) {
                console.warn('[studentManager] تعذر قراءة البيانات من LocalStorage (تصفح خاص أو قيود أمان):', err);
            }

            // في حال عدم وجود بيانات صالحة، نبقي الحالة الافتراضية
            this._state = {
                version: 1,
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
                if (typeof localStorage !== 'undefined') {
                    const payload = JSON.stringify(this._state);
                    localStorage.setItem(STORAGE_KEY, payload);
                    return true;
                }
            } catch (err) {
                // فحص خطأ نفاد السعة أو حظر التخزين
                const isQuota = err && (
                    err.name === 'QuotaExceededError' ||
                    err.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
                    err.code === 22 ||
                    err.code === 1014
                );

                if (isQuota) {
                    console.error('[studentManager] نفاد مساحة LocalStorage! جارٍ الاعتماد على الذاكرة الحية:', err);
                    this._showNotification('⚠️ تنبيه: نفدت سعة تخزين المتصفح، تم الحفظ مؤقتاً في الذاكرة الحالية.');
                } else {
                    console.warn('[studentManager] تعذر الحفظ في LocalStorage (جلسة تصفح خاصة):', err);
                }
            }
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
         * تنقية النصوص وإزالة وسوم HTML لمنع ثغرات XSS
         * @private
         */
        _sanitizeText(str, fallback = '') {
            if (typeof str !== 'string') return fallback;
            const clean = str.replace(/<[^>]*>/g, '').trim();
            return clean.length > 0 ? clean : fallback;
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
            return JSON.parse(JSON.stringify(obj));
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
         * إنشاء طالب جديد وإضافته للمنظومة
         * @param {Object} options خيارات الطالب { name, avatar, color }
         * @returns {Object} كائن الطالب المنشأ
         */
        createStudent({ name, avatar, color } = {}) {
            this.init();

            const sanitizedName = this._sanitizeText(name, 'طالب جديد');
            const chosenAvatar = this._sanitizeText(avatar) || sanitizedName.charAt(0) || DEFAULT_AVATARS[Math.floor(Math.random() * DEFAULT_AVATARS.length)];
            const chosenColor = this._sanitizeText(color) || DEFAULT_COLORS[this._state.students.length % DEFAULT_COLORS.length];

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

            this._saveToStorage();
            this._dispatchEvent('nb:student-created', { student: this._clone(newStudent) });
            this._dispatchEvent('nb:student-progress-updated', { studentId: newStudent.id });
            this.updateIndexBadges();

            return this._clone(newStudent);
        },

        /**
         * تحديث بيانات طالب موجود
         * @param {string} id معرف الطالب
         * @param {Object} patchData التعديلات الجزئية
         * @returns {Object|null} الطالب بعد التحديث
         */
        updateStudent(id, patchData = {}) {
            this.init();
            const student = this._state.students.find(s => s.id === id);
            if (!student) return null;

            if (patchData.name !== undefined) {
                student.name = this._sanitizeText(patchData.name, student.name);
            }
            if (patchData.avatar !== undefined) {
                student.avatar = this._sanitizeText(patchData.avatar, student.avatar);
            }
            if (patchData.color !== undefined) {
                student.color = this._sanitizeText(patchData.color, student.color);
            }
            if (typeof patchData.totalScore === 'number') {
                student.totalScore = Math.max(0, Math.floor(patchData.totalScore));
            }

            student.lastActive = Date.now();
            this._saveToStorage();
            this._dispatchEvent('nb:student-updated', { student: this._clone(student) });
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
            const idx = this._state.students.findIndex(s => s.id === id);
            if (idx === -1) return false;

            this._state.students.splice(idx, 1);

            // إذا كان الطالب المحذوف هو النشط، نعود إلى وضع الضيف / الحصة العامة
            if (this._state.activeStudentId === id) {
                this._state.activeStudentId = null;
            }

            this._saveToStorage();
            this._dispatchEvent('nb:student-deleted', { studentId: id });
            this._dispatchEvent('nb:student-changed', { activeStudentId: this._state.activeStudentId, student: null });
            this._dispatchEvent('nb:student-progress-updated', { studentId: null });
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

            this._saveToStorage();
            const active = this.getActiveStudent();
            this._dispatchEvent('nb:student-changed', { activeStudentId: this._state.activeStudentId, student: active });
            this._dispatchEvent('nb:student-progress-updated', { studentId: this._state.activeStudentId });
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
         * @param {string|number} lessonId رقم الدرس / الصفحة (مثل "10")
         * @param {boolean} isCorrect نتيجة القراءة (صواب / خطأ)
         * @param {number} pointsAwarded النقاط المكتسبة أو المخصومة
         * @param {string|Object} wordData بيانات الكلمة المقروءة
         * @param {number} [cardIndex=0] موضع البطاقة في الدرس
         * @param {number} [totalCards=0] إجمالي بطاقات الدرس
         * @returns {Object|null} الطالب المحدث أو null
         */
        recordCardEvaluation(lessonIdOrConfig, isCorrect, pointsAwarded = 0, wordData = '', cardIndex = 0, totalCards = 0) {
            this.init();
            if (!this.hasActiveStudent()) {
                // وضع الضيف — لا يتم التسجيل في ملف طالب محدد
                return null;
            }

            // دعم كل من الوسائط الموضعية وكائن الخيارات (DTO)
            let lessonId, correct, points, word, cIdx, tCards;
            if (typeof lessonIdOrConfig === 'object' && lessonIdOrConfig !== null) {
                lessonId = lessonIdOrConfig.lessonId;
                correct = Boolean(lessonIdOrConfig.isCorrect);
                points = Number(lessonIdOrConfig.pointsAwarded || lessonIdOrConfig.points) || 0;
                word = lessonIdOrConfig.wordData || lessonIdOrConfig.word || '';
                cIdx = Number(lessonIdOrConfig.cardIndex) || 0;
                tCards = Number(lessonIdOrConfig.totalCards) || 0;
            } else {
                lessonId = lessonIdOrConfig;
                correct = Boolean(isCorrect);
                points = Number(pointsAwarded) || 0;
                word = wordData;
                cIdx = Number(cardIndex) || 0;
                tCards = Number(totalCards) || 0;
            }

            const student = this._state.students.find(s => s.id === this._state.activeStudentId);
            if (!student) return null;

            const lessonKey = String(lessonId).trim();
            const plainWord = this._extractPlainWord(word);
            const now = Date.now();

            // 1. زيادة إجمالي النقاط التراكمية فوراً
            student.totalScore = Math.max(0, (student.totalScore || 0) + points);
            student.lastActive = now;

            // 2. تسجيل/تحديث تقدم الدرس
            if (!student.completedLessons) student.completedLessons = {};
            if (!student.completedLessons[lessonKey]) {
                student.completedLessons[lessonKey] = {
                    score: 0,
                    bestScore: 0,
                    accuracy: 100,
                    stars: 0,
                    attempts: 0,
                    lastStudiedAt: now
                };
            }

            const lessonRecord = student.completedLessons[lessonKey];
            lessonRecord.lastStudiedAt = now;

            // 3. إدارة بنك الأخطاء الذكي
            if (!student.mistakeBank) student.mistakeBank = [];

            if (!correct && plainWord) {
                // إضافة الكلمة إلى بنك الأخطاء أو زيادة عداد تكرارها
                const existingMistake = student.mistakeBank.find(
                    m => m.word === plainWord && String(m.lessonId) === lessonKey
                );

                if (existingMistake) {
                    existingMistake.count = (existingMistake.count || 1) + 1;
                    existingMistake.timestamp = now;
                    existingMistake.mastered = false;
                    existingMistake.consecutiveCorrect = 0;
                } else {
                    student.mistakeBank.push({
                        word: plainWord,
                        lessonId: lessonKey,
                        timestamp: now,
                        count: 1,
                        mastered: false,
                        consecutiveCorrect: 0
                    });
                }
            }

            // 4. الحفظ الفوري في التخزين
            this._saveToStorage();

            // 5. بث حدث التحديث اللحظي للربط مع واجهات المستخدم المختلفة
            this._dispatchEvent('nb:student-progress-updated', {
                studentId: student.id,
                lessonId: lessonKey,
                isCorrect: !!isCorrect,
                pointsAwarded: points,
                totalScore: student.totalScore,
                cardIndex,
                totalCards,
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

            const lessonKey = String(lessonId).trim();
            const scoreNum = Math.max(0, Math.floor(Number(finalScore) || 0));
            const accNum = Math.min(100, Math.max(0, Math.round(Number(accuracy) || 0)));
            const starNum = Math.min(3, Math.max(0, Math.floor(Number(stars) || 0)));
            const now = Date.now();

            if (!student.completedLessons) student.completedLessons = {};
            const prev = student.completedLessons[lessonKey] || {
                score: 0,
                bestScore: 0,
                accuracy: 0,
                stars: 0,
                attempts: 0,
                lastStudiedAt: now
            };

            // قراءة سياسة احتساب درجات التكرار من إعدادات المعلم إن وجدت
            let policy = 'best';
            if (typeof settingsManager !== 'undefined' && typeof settingsManager.get === 'function') {
                const s = settingsManager.get();
                if (s && s.repeatGradingPolicy) {
                    policy = s.repeatGradingPolicy;
                }
            }

            let nextScore = scoreNum;
            let nextAccuracy = accNum;
            let nextStars = starNum;

            if (policy === 'latest') {
                nextScore = scoreNum;
                nextAccuracy = accNum;
                nextStars = starNum;
            } else if (policy === 'cumulative') {
                nextScore = (prev.score || 0) + scoreNum;
                const totalAttempts = (prev.attempts || 0) + 1;
                nextAccuracy = prev.attempts > 0 
                    ? Math.round(((prev.accuracy || 0) * prev.attempts + accNum) / totalAttempts) 
                    : accNum;
                nextStars = Math.max(prev.stars || 0, starNum);
            } else {
                // السياسة القياسية الافتراضية 'best' (الأعلى إنجازاً)
                nextScore = Math.max(prev.score || 0, scoreNum);
                nextAccuracy = Math.max(prev.accuracy || 0, accNum);
                nextStars = Math.max(prev.stars || 0, starNum);
            }

            const updatedLesson = {
                score: nextScore,
                bestScore: Math.max(prev.bestScore || 0, scoreNum),
                accuracy: nextAccuracy,
                stars: nextStars,
                attempts: (prev.attempts || 0) + 1,
                lastStudiedAt: now
            };

            student.completedLessons[lessonKey] = updatedLesson;
            student.lastActive = now;

            this._saveToStorage();

            this._dispatchEvent('nb:lesson-completed', {
                studentId: student.id,
                lessonId: lessonKey,
                lessonData: this._clone(updatedLesson)
            });

            this._dispatchEvent('nb:student-progress-updated', {
                studentId: student.id,
                lessonId: lessonKey
            });

            this.updateIndexBadges();

            return this._clone(updatedLesson);
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
         * إزالة كلمة من بنك الأخطاء أو تمييزها كمتقنة
         * @param {string} studentIdOrWord معرف الطالب أو الكلمة إذا كان الطالب نشطاً
         * @param {string} [word] الكلمة المراد حذفها
         * @returns {Array<Object>} بنك الأخطاء بعد التعديل
         */
        removeMistake(studentIdOrWord, word) {
            this.init();
            let targetStudentId = this._state.activeStudentId;
            let targetWord = studentIdOrWord;

            if (word !== undefined) {
                targetStudentId = studentIdOrWord;
                targetWord = word;
            }

            if (!targetStudentId || !targetWord) return [];

            const student = this._state.students.find(s => s.id === targetStudentId);
            if (!student || !Array.isArray(student.mistakeBank)) return [];

            const cleanTarget = this._extractPlainWord(targetWord);
            student.mistakeBank = student.mistakeBank.filter(m => m.word !== cleanTarget);
            student.lastActive = Date.now();

            this._saveToStorage();
            this._dispatchEvent('nb:student-progress-updated', { studentId: targetStudentId });

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

            if (typeof wordOrIsCorrect === 'string') {
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
            const mistakeItem = student.mistakeBank.find(m => m.word === cleanTarget);

            if (!mistakeItem) {
                return { mastered: true, consecutiveCorrect: 2, remainingMistakes: student.mistakeBank.length };
            }

            let wasMastered = false;
            if (isCorrect) {
                mistakeItem.consecutiveCorrect = (mistakeItem.consecutiveCorrect || 0) + 1;
                student.totalScore += 2; // نقطتان لكل قراءة صحيحة

                if (mistakeItem.consecutiveCorrect >= 2) {
                    // إتقان راسخ - حذف الكلمة من البنك ومنح مكافأة إضافية
                    student.mistakeBank = student.mistakeBank.filter(m => m.word !== cleanTarget);
                    student.totalScore += 3; // مكافأة إتمام الإتقان
                    wasMastered = true;
                }
            } else {
                mistakeItem.consecutiveCorrect = 0;
                mistakeItem.count = (mistakeItem.count || 1) + 1;
                mistakeItem.timestamp = Date.now();
            }

            student.lastActive = Date.now();
            this._saveToStorage();

            this._dispatchEvent('nb:student-progress-updated', {
                studentId: student.id,
                word: cleanTarget,
                isCorrect,
                wasMastered
            });

            return {
                mastered: wasMastered,
                consecutiveCorrect: wasMastered ? 2 : (mistakeItem.consecutiveCorrect || 0),
                remainingMistakes: student.mistakeBank.length
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
                mistake.mastered = true;
                student.lastActive = Date.now();
                this._saveToStorage();
                this._dispatchEvent('nb:student-progress-updated', { studentId: targetStudentId });
                return true;
            }
            return false;
        },

        /**
         * تصدير بيانات كافة الطلاب كملف JSON للنسخ الاحتياطي
         * @returns {string} محتوى نص JSON المصدر
         */
        exportJSON() {
            this.init();

            const exportPayload = {
                app: 'nur-albayan-pages',
                schemaVersion: 1,
                exportedAt: new Date().toISOString(),
                activeStudentId: this._state.activeStudentId,
                students: this._state.students
            };

            const jsonText = JSON.stringify(exportPayload, null, 2);

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
                let parsed = jsonInput;
                if (typeof jsonInput === 'string') {
                    parsed = JSON.parse(jsonInput);
                }

                if (!parsed || typeof parsed !== 'object') {
                    throw new Error('صيغة الملف غير صالحة، يجب أن يكون كائناً بصيغة JSON.');
                }

                // استخراج مصفوفة الطلاب المدخلة
                let candidateStudents = [];
                if (Array.isArray(parsed)) {
                    candidateStudents = parsed;
                } else if (Array.isArray(parsed.students)) {
                    candidateStudents = parsed.students;
                } else {
                    throw new Error('لم يتم العثور على مصفوفة طلاب صالحة داخل الملف.');
                }

                const validatedStudents = [];

                for (let i = 0; i < candidateStudents.length; i++) {
                    const raw = candidateStudents[i];
                    if (!raw || typeof raw !== 'object') continue;

                    const id = typeof raw.id === 'string' && raw.id.trim() ? raw.id.trim() : this.generateId();
                    const name = this._sanitizeText(raw.name, `طالب ${i + 1}`);
                    const avatar = this._sanitizeText(raw.avatar, '👦');
                    const color = this._sanitizeText(raw.color, '#059669');
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
                                completedLessons[cleanKey] = {
                                    score: Math.max(0, Math.floor(Number(l.score) || 0)),
                                    bestScore: Math.max(0, Math.floor(Number(l.bestScore || l.score) || 0)),
                                    accuracy: Math.min(100, Math.max(0, Math.round(Number(l.accuracy) || 0))),
                                    stars: Math.min(3, Math.max(0, Math.floor(Number(l.stars) || 0))),
                                    attempts: Math.max(1, Math.floor(Number(l.attempts) || 1)),
                                    lastStudiedAt: Number(l.lastStudiedAt) || Date.now()
                                };
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
                                        mastered: !!m.mastered
                                    });
                                }
                            }
                        });
                    }

                    const createdAt = Number(raw.createdAt) || Date.now();
                    const lastActive = Number(raw.lastActive) || Date.now();

                    validatedStudents.push({
                        id,
                        name,
                        avatar,
                        color,
                        totalScore,
                        completedLessons,
                        mistakeBank,
                        createdAt,
                        lastActive
                    });
                }

                if (validatedStudents.length === 0) {
                    throw new Error('الملف لا يحتوي على أي سجلات طلاب صالحة للاستيراد.');
                }

                // تعيين الحالة الجديدة
                this._state.students = validatedStudents;

                // التحقق من تعيين الطالب النشط إذا وجد في النسخة
                if (parsed.activeStudentId && validatedStudents.some(s => s.id === parsed.activeStudentId)) {
                    this._state.activeStudentId = parsed.activeStudentId;
                } else if (validatedStudents.length > 0) {
                    this._state.activeStudentId = validatedStudents[0].id;
                } else {
                    this._state.activeStudentId = null;
                }

                this._saveToStorage();
                this._dispatchEvent('nb:student-changed', { activeStudentId: this._state.activeStudentId, student: this.getActiveStudent() });
                this._dispatchEvent('nb:student-progress-updated', { studentId: this._state.activeStudentId });
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
            if (typeof document === 'undefined') return;

            const cards = document.querySelectorAll('.lesson-card, a[href*="pages/"]');
            if (!cards || cards.length === 0) return;

            const activeStudent = this.getActiveStudent();

            cards.forEach(card => {
                // إزالة الشارات المحقونة مسبقاً
                const oldBadges = card.querySelectorAll('.nb-student-lesson-badge');
                oldBadges.forEach(el => el.remove());

                if (!activeStudent || !activeStudent.completedLessons) return;

                // استخراج رقم الدرس من رابط الصفحة أو وسم الرقم
                let lessonId = null;
                const href = card.getAttribute('href') || '';
                const match = href.match(/pages\/(\d+)\.html/);
                if (match && match[1]) {
                    lessonId = match[1];
                } else {
                    const numEl = card.querySelector('.card-num');
                    if (numEl && numEl.textContent) {
                        lessonId = numEl.textContent.trim();
                    }
                }

                if (!lessonId) return;

                const lessonData = activeStudent.completedLessons[lessonId];
                if (!lessonData || lessonData.attempts <= 0) return;

                // إنشاء شارة الإنجاز والنجوم
                const starsCount = Math.min(3, Math.max(0, lessonData.stars || 0));
                const starsDisplay = starsCount > 0 ? '⭐'.repeat(starsCount) : '✓';
                const scoreText = `${lessonData.bestScore || lessonData.score || 0} نقطة`;

                const badgeEl = document.createElement('div');
                badgeEl.className = 'nb-student-lesson-badge inline-flex items-center gap-1.5 text-[11px] font-bold mt-1 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-900 border border-amber-200/80 shadow-xs select-none animate-in fade-in duration-200';
                badgeEl.setAttribute('aria-label', `إنجاز الطالب: ${starsCount} نجوم، ${scoreText}`);
                badgeEl.innerHTML = `
                    <span class="text-amber-500 font-bold">${starsDisplay}</span>
                    <span class="text-slate-600 font-mono text-[10px]">(${scoreText})</span>
                `;

                // حقن الشارة داخل معلومات البطاقة
                const infoContainer = card.querySelector('.card-info');
                if (infoContainer) {
                    infoContainer.appendChild(badgeEl);
                } else {
                    card.appendChild(badgeEl);
                }
            });
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
