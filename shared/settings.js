/**
 * Settings Manager - نظام إدارة وحفظ إعدادات المعلم والمنظومة
 * المنظومة: نور البيان
 *
 * الخصائص:
 * 1. الحفظ التلقائي الفوري في المتصفح مع ذاكرة وسيطة (LocalStorage + In-Memory Fallback).
 * 2. نافذة إعدادات منبثقة تفاعلية ويسيرة الوصول (Accessible Modal with Focus Trap & Restoration).
 * 3. سريان الإعدادات تلقائياً على الصفحة الرئيسية وكافة صفحات الدروس الـ 33.
 */

const settingsManager = {
    STORAGE_KEY: 'nb_teacher_settings',
    _memoryCache: null,
    _lastFocusedElement: null,

    // الإعدادات الافتراضية
    defaults: {
        soundEnabled: true,
        volume: 80, // من 0 إلى 100
        gameBreaksEnabled: false, // استراحات الألعاب أثناء الدرس
        defaultGameMode: 'computer', // 'computer' (ضد الكمبيوتر) | 'teacher' (مع المعلم)
        defaultDifficulty: 'easy', // 'easy' (سهل) | 'smart' (ذكي)
        timerEnabled: false, // مؤقت القراءة
        timerDuration: 10, // بالثواني
        fontScale: 'normal', // 'normal' (100%) | 'large' (122%) | 'xlarge' (145%)
        shuffleCards: false, // الترتيب العشوائي للكلمات (منع حفظ الموضع)
        noPenaltyMode: false, // نمط التشجيع الإيجابي (بدون خصم نقاط عند الخطأ)
        manualAdvance: false // التقدم اليدوي للبطاقات بعد التقييم (للشرح)
    },

    // جلب الإعدادات الحالية من localStorage أو الذاكرة الوسيطة
    get() {
        if (this._memoryCache) {
            return Object.assign({}, this.defaults, this._memoryCache);
        }
        try {
            const raw = localStorage.getItem(this.STORAGE_KEY);
            if (raw) {
                this._memoryCache = JSON.parse(raw);
                return Object.assign({}, this.defaults, this._memoryCache);
            }
        } catch (e) {
            console.warn('تعذر قراءة الإعدادات من localStorage:', e);
        }
        this._memoryCache = Object.assign({}, this.defaults);
        return this._memoryCache;
    },

    // حفظ تعديل جزئي أو كلي وتطبيقه فوراً
    save(newSettings) {
        const current = this.get();
        const updated = Object.assign({}, current, newSettings);
        this._memoryCache = updated;

        // تطبيق التعديل في الذاكرة الحية فوراً
        this.apply(updated);

        // محاولة الحفظ الدائم في localStorage
        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(updated));
            this.showToast('✓ تم حفظ الإعدادات تلقائياً');
        } catch (e) {
            console.warn('تعذر الحفظ الدائم في localStorage (جلسة خاصة):', e);
            this.showToast('✓ تم تطبيق الإعدادات للجلسة الحالية');
        }
        return updated;
    },

    // استعادة الإعدادات الافتراضية
    reset() {
        this._memoryCache = Object.assign({}, this.defaults);
        try {
            localStorage.removeItem(this.STORAGE_KEY);
        } catch (_) {}
        this.apply(this.defaults);
        this.syncFormWithSettings(this.defaults);
        this.showToast('✓ تمت استعادة الإعدادات الافتراضية');
    },

    // تطبيق الإعدادات الحالية على الصفحة النشطة
    apply(settings) {
        if (!settings) settings = this.get();

        // 1. تطبيق مقياس الخط القرآني
        document.documentElement.classList.remove('font-scale-normal', 'font-scale-large', 'font-scale-xlarge');
        document.documentElement.classList.add(`font-scale-${settings.fontScale || 'normal'}`);

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
    },

    // فتح نافذة الإعدادات مع حصر التركيز (Focus Trap)
    open() {
        this._lastFocusedElement = document.activeElement;
        this.ensureModalExists();
        const modal = document.getElementById('nb-settings-modal');
        if (!modal) return;

        this.syncFormWithSettings(this.get());
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        document.body.style.overflow = 'hidden';

        // نقل التركيز لزر الإغلاق للوصولية
        const closeBtn = document.getElementById('nb-settings-close-btn');
        if (closeBtn) closeBtn.focus();
    },

    // إغلاق نافذة الإعدادات واستعادة التركيز
    close() {
        const modal = document.getElementById('nb-settings-modal');
        if (!modal) return;
        modal.classList.add('hidden');
        modal.classList.remove('flex');
        document.body.style.overflow = '';

        // استعادة التركيز للعنصر الذي فتح النافذة
        if (this._lastFocusedElement && typeof this._lastFocusedElement.focus === 'function') {
            this._lastFocusedElement.focus();
        }
    },

    // مزامنة عناصر الإدخال في النموذج مع القيم
    syncFormWithSettings(s) {
        const setVal = (id, prop, isCheck = false) => {
            const el = document.getElementById(id);
            if (el) {
                if (isCheck) el.checked = !!s[prop];
                else el.value = s[prop];
            }
        };

        setVal('cfg-sound-enabled', 'soundEnabled', true);
        setVal('cfg-volume', 'volume');
        const volVal = document.getElementById('cfg-volume-val');
        if (volVal) volVal.innerText = `${s.volume || 0}%`;

        setVal('cfg-game-breaks', 'gameBreaksEnabled', true);
        setVal('cfg-game-mode', 'defaultGameMode');
        setVal('cfg-game-diff', 'defaultDifficulty');

        setVal('cfg-timer-duration', 'timerDuration');
        setVal('cfg-font-scale', 'fontScale');
        setVal('cfg-shuffle-cards', 'shuffleCards', true);
        setVal('cfg-no-penalty', 'noPenaltyMode', true);
        setVal('cfg-manual-advance', 'manualAdvance', true);
    },

    // إنشاء هيكل النافذة المنبثقة إن لم تكن موجودة في الصفحة
    ensureModalExists() {
        if (document.getElementById('nb-settings-modal')) return;

        const modalHtml = `
        <div id="nb-settings-modal" class="hidden fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm items-center justify-center p-3 sm:p-4 overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby="settings-modal-title">
            <div class="bg-white w-full max-w-lg rounded-[2rem] shadow-2xl border border-emerald-100 overflow-hidden flex flex-col my-auto animate-in fade-in zoom-in duration-150" dir="rtl">
                <!-- Header -->
                <div class="bg-gradient-to-l from-emerald-600 to-teal-700 p-4 sm:p-5 text-white flex items-center justify-between shadow-md">
                    <div class="flex items-center gap-2.5">
                        <span class="text-2xl sm:text-3xl" aria-hidden="true">⚙️</span>
                        <div>
                            <h2 id="settings-modal-title" class="text-lg sm:text-xl font-black tracking-tight leading-tight">إعدادات المعلم والمنظومة</h2>
                            <p class="text-xs text-emerald-100 font-medium">تُحفظ التفضيلات تلقائياً في هذا المتصفح</p>
                        </div>
                    </div>
                    <button id="nb-settings-close-btn" onclick="settingsManager.close()" class="p-2 rounded-full hover:bg-white/20 text-white/90 hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-white" aria-label="إغلاق نافذة الإعدادات">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                </div>

                <!-- Body Controls -->
                <div class="p-4 sm:p-6 space-y-4 sm:space-y-5 overflow-y-auto max-h-[70vh] text-slate-700 text-sm">
                    
                    <!-- Section 1: الصوتيات -->
                    <div class="bg-slate-50 p-3.5 sm:p-4 rounded-2xl border border-slate-200 space-y-3">
                        <h3 class="font-black text-emerald-800 flex items-center gap-2 text-xs sm:text-sm">
                            <span aria-hidden="true">🔊</span> <span>الصوتيات والمؤثرات</span>
                        </h3>
                        <div class="flex items-center justify-between">
                            <label for="cfg-sound-enabled" class="font-bold text-slate-700 cursor-pointer select-none">تفعيل المؤثرات الصوتية والتشجيع</label>
                            <input type="checkbox" id="cfg-sound-enabled" onchange="settingsManager.save({soundEnabled: this.checked})" class="w-5 h-5 accent-emerald-600 rounded cursor-pointer">
                        </div>
                        <div class="space-y-1 pt-1">
                            <div class="flex justify-between text-xs font-bold text-slate-600">
                                <label for="cfg-volume">مستوى الصوت</label>
                                <span id="cfg-volume-val" class="font-mono text-emerald-700">80%</span>
                            </div>
                            <input type="range" id="cfg-volume" min="0" max="100" value="80" oninput="document.getElementById('cfg-volume-val').innerText = this.value + '%'" onchange="settingsManager.save({volume: parseInt(this.value)})" class="w-full accent-emerald-600 cursor-pointer">
                        </div>
                    </div>

                    <!-- Section 2: استراحات الألعاب والخصم الآلي -->
                    <div class="bg-slate-50 p-3.5 sm:p-4 rounded-2xl border border-slate-200 space-y-3">
                        <h3 class="font-black text-emerald-800 flex items-center gap-2 text-xs sm:text-sm">
                            <span aria-hidden="true">🎮</span> <span>استراحات الألعاب وألعاب الألواح</span>
                        </h3>
                        <div class="flex items-center justify-between">
                            <label for="cfg-game-breaks" class="font-bold text-slate-700 cursor-pointer select-none">تفعيل استراحة الألعاب في منتصف الدرس</label>
                            <input type="checkbox" id="cfg-game-breaks" onchange="settingsManager.save({gameBreaksEnabled: this.checked})" class="w-5 h-5 accent-emerald-600 rounded cursor-pointer">
                        </div>
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                            <div>
                                <label for="cfg-game-mode" class="block text-xs font-bold text-slate-600 mb-1">الخصم الافتراضي:</label>
                                <select id="cfg-game-mode" onchange="settingsManager.save({defaultGameMode: this.value})" class="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 font-bold text-xs text-slate-700 outline-none focus:border-emerald-500">
                                    <option value="computer">🤖 ضد الكمبيوتر</option>
                                    <option value="teacher">👨‍🏫 مع المعلم</option>
                                </select>
                            </div>
                            <div>
                                <label for="cfg-game-diff" class="block text-xs font-bold text-slate-600 mb-1">صعوبة الكمبيوتر:</label>
                                <select id="cfg-game-diff" onchange="settingsManager.save({defaultDifficulty: this.value})" class="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 font-bold text-xs text-slate-700 outline-none focus:border-emerald-500">
                                    <option value="easy">سهل وممتع 😊 (عشوائي)</option>
                                    <option value="smart">ذكي خفيف 🧠 (تحدٍّ)</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <!-- Section 3: مؤقت القراءة وحجم الخط والترتيب العشوائي ونظام التقييم -->
                    <div class="bg-slate-50 p-3.5 sm:p-4 rounded-2xl border border-slate-200 space-y-3">
                        <h3 class="font-black text-emerald-800 flex items-center gap-2 text-xs sm:text-sm">
                            <span aria-hidden="true">⏱️</span> <span>المؤقت وحجم الخط ونظام التقييم</span>
                        </h3>
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            <div>
                                <label for="cfg-timer-duration" class="block text-xs font-bold text-slate-600 mb-1">زمن التحدي السريع:</label>
                                <select id="cfg-timer-duration" onchange="settingsManager.save({timerDuration: parseFloat(this.value)})" class="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 font-bold text-xs text-slate-700 outline-none focus:border-emerald-500">
                                    <option value="5">⚡ 5 ثوانٍ (سريع)</option>
                                    <option value="10">⏱️ 10 ثوانٍ (قياسي)</option>
                                    <option value="15">🐢 15 ثانية (تمهيدي)</option>
                                </select>
                            </div>
                            <div>
                                <label for="cfg-font-scale" class="block text-xs font-bold text-slate-600 mb-1">حجم الخط القرآني:</label>
                                <select id="cfg-font-scale" onchange="settingsManager.save({fontScale: this.value})" class="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 font-bold text-xs text-slate-700 outline-none focus:border-emerald-500">
                                    <option value="normal">عادي (100%)</option>
                                    <option value="large">كبير (122%) 🔍</option>
                                    <option value="xlarge">كبير جداً (145%) 🔎</option>
                                </select>
                            </div>
                        </div>
                        <div class="pt-2 border-t border-slate-200/80 flex items-center justify-between">
                            <div>
                                <label for="cfg-shuffle-cards" class="font-bold text-slate-700 cursor-pointer select-none text-xs sm:text-sm block">ترتيب عشوائي لبطاقات التحدي</label>
                                <span class="text-[11px] text-slate-400 block">خلط الكلمات لاختبار التهجي ومنع حفظ موضعها</span>
                            </div>
                            <input type="checkbox" id="cfg-shuffle-cards" onchange="settingsManager.save({shuffleCards: this.checked})" class="w-5 h-5 accent-emerald-600 rounded cursor-pointer">
                        </div>
                        <div class="pt-2 border-t border-slate-200/80 flex items-center justify-between">
                            <div>
                                <label for="cfg-no-penalty" class="font-bold text-slate-700 cursor-pointer select-none text-xs sm:text-sm block">نمط التشجيع الإيجابي (بدون خصم نقاط)</label>
                                <span class="text-[11px] text-slate-400 block">منع إنقاص النقاط عند الخطأ لتشجيع الناشئة</span>
                            </div>
                            <input type="checkbox" id="cfg-no-penalty" onchange="settingsManager.save({noPenaltyMode: this.checked})" class="w-5 h-5 accent-emerald-600 rounded cursor-pointer">
                        </div>
                        <div class="pt-2 border-t border-slate-200/80 flex items-center justify-between">
                            <div>
                                <label for="cfg-manual-advance" class="font-bold text-slate-700 cursor-pointer select-none text-xs sm:text-sm block">التقدم اليدوي للبطاقات (الشرح والتأني)</label>
                                <span class="text-[11px] text-slate-400 block">إيقاف الانتقال التلقائي للوقوف على بيان الكلمة</span>
                            </div>
                            <input type="checkbox" id="cfg-manual-advance" onchange="settingsManager.save({manualAdvance: this.checked})" class="w-5 h-5 accent-emerald-600 rounded cursor-pointer">
                        </div>
                    </div>

                </div>

                <!-- Footer Actions -->
                <div class="bg-slate-100 p-3.5 sm:p-4 border-t border-slate-200 flex items-center justify-between gap-2">
                    <button onclick="settingsManager.reset()" class="text-xs font-bold text-rose-600 hover:text-rose-700 px-3 py-2 rounded-xl hover:bg-rose-50 transition-colors" aria-label="استعادة الإعدادات الافتراضية">
                        🔄 استعادة الافتراضي
                    </button>
                    <button onclick="settingsManager.close()" class="bg-emerald-600 hover:bg-emerald-700 text-white font-black px-6 py-2.5 rounded-xl text-xs sm:text-sm shadow-md transition-transform hover:scale-105" aria-label="تم وحفظ">
                        حفظ وإغلاق ✓
                    </button>
                </div>
            </div>
        </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);

        // ربط حصر التركيز والإغلاق بمفتاح Escape
        const modal = document.getElementById('nb-settings-modal');
        if (modal) {
            modal.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    this.close();
                    return;
                }
                // Focus Trap
                if (e.key === 'Tab') {
                    const focusables = modal.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
                    if (focusables.length === 0) return;
                    const first = focusables[0];
                    const last = focusables[focusables.length - 1];
                    if (e.shiftKey) {
                        if (document.activeElement === first) {
                            e.preventDefault();
                            last.focus();
                        }
                    } else {
                        if (document.activeElement === last) {
                            e.preventDefault();
                            first.focus();
                        }
                    }
                }
            });

            // إغلاق عند النقر على الغطاء المظلم
            modal.addEventListener('click', (e) => {
                if (e.target === modal) this.close();
            });
        }
    },

    // إشعار عائم خفيف بحفظ الإعدادات
    showToast(msg) {
        let toast = document.getElementById('nb-settings-toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'nb-settings-toast';
            toast.className = 'fixed bottom-4 left-1/2 -translate-x-1/2 bg-slate-900/90 text-white font-bold text-xs px-4 py-2 rounded-full shadow-lg z-[100] transition-opacity duration-300 pointer-events-none opacity-0';
            document.body.appendChild(toast);
        }
        toast.innerText = msg;
        toast.style.opacity = '1';
        clearTimeout(this._toastTimer);
        this._toastTimer = setTimeout(() => {
            toast.style.opacity = '0';
        }, 1800);
    }
};

// تشغيل وتطبيق الإعدادات تلقائياً عند تحميل DOM
if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        if (typeof settingsManager !== 'undefined') {
            settingsManager.apply();
        }
    });
}
