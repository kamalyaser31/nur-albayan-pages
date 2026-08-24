/**
 * Nour Al-Bayan Interactive Platform - Core Engine Bundle (shared/core.js)
 * Unified bundle containing all audio, UI templates, state management, and mini-games.
 * Generated automatically by bundle_js.py.
 */

/* ==========================================================================
   MODULE: settings.js
   ========================================================================== */

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
        shuffleCards: false // الترتيب العشوائي للكلمات (منع حفظ الموضع)
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

                    <!-- Section 3: مؤقت القراءة وحجم الخط والترتيب العشوائي -->
                    <div class="bg-slate-50 p-3.5 sm:p-4 rounded-2xl border border-slate-200 space-y-3">
                        <h3 class="font-black text-emerald-800 flex items-center gap-2 text-xs sm:text-sm">
                            <span aria-hidden="true">⏱️</span> <span>المؤقت وحجم الخط ونظام القراءة</span>
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

/* ==========================================================================
   MODULE: sound.js
   ========================================================================== */

/**
 * Nour Al-Bayan Interactive Platform - Shared Audio & FX Engine
 * Refactored & Hardened (Zero Memory Leaks, Zero Frame Drops, Perceptual Volume, Mobile Unlock)
 */

const Sound = {
    ctx: null,
    _unlocked: false,

    // تهيئة السياق الصوتي وفك تعليقه بطريقة آمنة
    getCtx() {
        if (!this.ctx) {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (!AudioCtx) return null;
            this.ctx = new AudioCtx();
        }
        if (this.ctx.state === 'suspended') {
            this.ctx.resume().catch(() => {});
        } else if (this.ctx.state === 'closed') {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            this.ctx = AudioCtx ? new AudioCtx() : null;
        }
        return this.ctx;
    },

    // فك تعليق الصوت التلقائي عند أول تفاعل للمستخدم على شاشات اللمس
    setupUnlock() {
        if (this._unlocked) return;
        const unlock = () => {
            const ctx = this.getCtx();
            if (ctx && ctx.state === 'suspended') {
                ctx.resume().then(() => {
                    this._unlocked = true;
                }).catch(() => {});
            } else {
                this._unlocked = true;
            }
            window.removeEventListener('pointerdown', unlock, { capture: true });
            window.removeEventListener('keydown', unlock, { capture: true });
        };
        window.addEventListener('pointerdown', unlock, { capture: true, once: true });
        window.addEventListener('keydown', unlock, { capture: true, once: true });
    },

    // استخراج شدة الصوت الحقيقية مع تصحيح علة الصفر الزائف وتطبيق المنحنى الإدراكي
    getVol() {
        if (typeof settingsManager !== 'undefined') {
            const s = settingsManager.get();
            if (!s.soundEnabled) return 0;
            const rawVol = (typeof s.volume === 'number') ? s.volume : 80;
            if (rawVol <= 0) return 0;
            const normalized = Math.max(0, Math.min(100, rawVol)) / 100;
            return normalized * normalized; // منحنى تربيعي إدراكي مريح
        }
        return 0.64; // 0.8^2
    },

    // تنظيف وفصل عقد الصوت فور انتهاء النغمة لمنع تسريب الذاكرة
    _cleanup(osc, gainNode) {
        osc.onended = () => {
            try {
                osc.disconnect();
                gainNode.disconnect();
            } catch (_) {}
        };
    },

    init() {
        this.getCtx();
        this.setupUnlock();
    },

    playChime() {
        const vol = this.getVol();
        if (vol <= 0) return;
        const ctx = this.getCtx();
        if (!ctx) return;

        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();

        osc.type = 'sine';
        osc.connect(gainNode);
        gainNode.connect(ctx.destination);

        osc.frequency.setValueAtTime(523.25, now);
        osc.frequency.setValueAtTime(659.25, now + 0.1);
        osc.frequency.setValueAtTime(783.99, now + 0.2);
        osc.frequency.setValueAtTime(1046.50, now + 0.3);

        gainNode.gain.setValueAtTime(0.0001, now);
        gainNode.gain.linearRampToValueAtTime(0.18 * vol, now + 0.02);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.5);
        gainNode.gain.setValueAtTime(0, now + 0.51);

        this._cleanup(osc, gainNode);
        osc.start(now);
        osc.stop(now + 0.51);
    },

    tone(freq, d = 0.2, type = 'sine') {
        const vol = this.getVol();
        if (vol <= 0) return;
        const ctx = this.getCtx();
        if (!ctx) return;

        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(freq, now);
        osc.connect(gainNode);
        gainNode.connect(ctx.destination);

        gainNode.gain.setValueAtTime(0.0001, now);
        gainNode.gain.linearRampToValueAtTime(0.18 * vol, now + 0.015);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, now + d);
        gainNode.gain.setValueAtTime(0, now + d + 0.01);

        this._cleanup(osc, gainNode);
        osc.start(now);
        osc.stop(now + d + 0.01);
    },

    danger() { this.tone(220, 0.3, 'sawtooth'); },
    fail() { this.tone(180, 0.25, 'sawtooth'); },

    stepUp(step = 1, max = 5) {
        const freqs = [392, 440, 493.88, 523.25, 587.33, 659.25, 698.46, 783.99, 880, 987.77, 1046.50];
        const f = freqs[Math.min(step, freqs.length - 1)] || (392 + step * 45);
        this.tone(f, 0.16, 'triangle');
    },

    stepDown() {
        const vol = this.getVol();
        if (vol <= 0) return;
        const ctx = this.getCtx();
        if (!ctx) return;

        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(330, now);
        osc.frequency.linearRampToValueAtTime(220, now + 0.18);
        osc.connect(gainNode);
        gainNode.connect(ctx.destination);

        // منع النقر الصوتي (Audio Pop) عبر الصعود الميكروي من 0.0001
        gainNode.gain.setValueAtTime(0.0001, now);
        gainNode.gain.linearRampToValueAtTime(0.15 * vol, now + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);
        gainNode.gain.setValueAtTime(0, now + 0.19);

        this._cleanup(osc, gainNode);
        osc.start(now);
        osc.stop(now + 0.19);
    }
};

// تهيئة مستمعات اللمس تلقائياً
if (typeof window !== 'undefined') {
    Sound.setupUnlock();
}

/**
 * دالة الاحتفال المطورة والمحمية من تجميد الإطارات (Throttled & Allocated-Hoisted)
 */
const _CELEBRATION_COLORS = ['#3b82f6', '#10b981', '#fb7185', '#facc15'];
const _CONF_LEFT = { particleCount: 5, angle: 60, spread: 55, origin: { x: 0 }, colors: _CELEBRATION_COLORS };
const _CONF_RIGHT = { particleCount: 5, angle: 120, spread: 55, origin: { x: 1 }, colors: _CELEBRATION_COLORS };

let _celebrationActive = false;
let _celebrationTimer = null;

function fireCelebration() {
    if (typeof confetti !== 'function') return;
    if (_celebrationActive) return; // حماية ضد الاستدعاء المتزامن المتكرر

    _celebrationActive = true;
    const duration = 2400;
    const intervalMs = 120; // إطلاق دفعات منتظمة كل 120ms بدلاً من كل إطار rAF
    const endTime = Date.now() + duration;

    _celebrationTimer = setInterval(() => {
        if (Date.now() > endTime) {
            clearInterval(_celebrationTimer);
            _celebrationTimer = null;
            _celebrationActive = false;
            return;
        }
        confetti(_CONF_LEFT);
        confetti(_CONF_RIGHT);
    }, intervalMs);
}

const wordwallColors = ['#e11d48', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#6366f1', '#06b6d4', '#f97316', '#84cc16', '#a855f7', '#64748b', '#059669', '#d97706'];

/* ==========================================================================
   MODULE: ui-template.js
   ========================================================================== */

function escapeHTML(str) {
    return String(str || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function buildAppUI() {
    if (document.getElementById('learning-stage')) return; // Already exists

    const cfg = window.PAGE_CONFIG || {};
    const title = escapeHTML(cfg.title || document.title || 'Nour Al-Bayan');
    const subtitle = escapeHTML(cfg.subtitle || 'Harakat & Reading Practice');
    const footerText = escapeHTML(cfg.footer || 'Nour Al-Bayan Learning System');
    const hasRules = (typeof rulesData !== 'undefined' && rulesData.length > 0) || (cfg.rules && cfg.rules.length > 0);
    const game3Type = cfg.game3 || (typeof riddlesGame !== 'undefined' ? 'riddles' : (hasRules ? 'riddles' : 'memory'));

    const rulesButtonHtml = hasRules ? `
        <button onclick="app.jumpTo('rules')" class="bg-indigo-600 hover:bg-indigo-700 text-white font-black py-3.5 px-6 rounded-[1.5rem] text-lg shadow-[0_4px_0_#3730a3] active:translate-y-1 active:shadow-none transition-all flex items-center justify-between" aria-label="Open Lesson Rules">
            <span class="flex items-center gap-2">📖 <span>Lesson Rules</span></span>
            <span class="text-xl" aria-hidden="true">➡</span>
        </button>` : '';

    const ruleStageHtml = hasRules ? `
        <!-- STAGE 0: LESSON RULES -->
        <section id="rule-stage" class="hidden w-full h-full flex flex-col justify-center items-center gap-4 py-4 overflow-hidden shrink-0" role="region" aria-label="Lesson Rules">
            <div class="text-center shrink-0">
                <span id="rule-step-indicator" class="text-xs font-bold text-emerald-600 bg-emerald-100 px-3.5 py-1 rounded-full uppercase tracking-wider" aria-live="polite">LESSON RULE</span>
                <h2 id="rule-title" class="text-2xl sm:text-3xl font-black text-slate-800 mt-2">Rule Title</h2>
                <p id="rule-desc" class="text-sm sm:text-base text-slate-500 max-w-md mx-auto mt-1 leading-relaxed">Description of current rule</p>
            </div>
            <div class="w-full max-w-3xl bg-white border-4 sm:border-8 border-emerald-400 rounded-[2.5rem] shadow-xl p-6 flex flex-col justify-center items-center h-[38vh] min-h-[200px] max-h-[340px]">
                <span id="rule-big-text" class="quran-font text-center text-slate-800 leading-normal tracking-wide select-text px-4 w-full break-words" style="font-size: clamp(3rem, 10vh, 6.5rem);" role="region" aria-label="Rule example" aria-live="polite">
                    Rule Content
                </span>
            </div>
            <div class="flex justify-center gap-4 w-full max-w-sm mt-3 shrink-0">
                <button id="rule-prev-btn" onclick="ruleManager.prev()" class="hidden bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold py-3.5 px-6 rounded-2xl text-sm transition-colors shadow-sm" aria-label="Previous rule">
                    ⬅ Back
                </button>
                <button id="rule-next-btn" onclick="ruleManager.next()" class="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-black py-4 px-8 rounded-2xl text-sm shadow-[0_4px_0_#047857] active:translate-y-1 active:shadow-none transition-all flex-1" aria-label="Next rule or start challenge">
                    Start Challenge! 🚀
                </button>
            </div>
        </section>` : '';

    const game3StageHtml = (game3Type === 'riddles') ? `
        <!-- STAGE 3C: MIDPOINT GAME 3 (SECRET RIDDLES) -->
        <section id="riddles-stage" class="hidden w-full h-full flex flex-col justify-center items-center text-center p-4 sm:p-6 rounded-[2.5rem] shadow-2xl text-white bg-gradient-to-b from-indigo-900 to-purple-900 shrink-0 z-10">
            <h2 class="text-3xl sm:text-4xl font-black text-amber-400 mt-2">👑 Secret Riddles Box 👑</h2>
            <div id="riddle-container" class="bg-white/10 p-5 rounded-3xl backdrop-blur-sm border border-white/20 min-h-[180px] w-full max-w-2xl flex flex-col justify-center gap-4 mt-3">
                <p id="riddle-question" class="text-lg sm:text-2xl font-bold leading-normal"></p>
                <div id="riddle-options" class="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3"></div>
            </div>
            <p id="riddle-feedback" class="text-lg sm:text-xl font-bold h-8 text-emerald-400 mt-3"></p>
            <div class="flex flex-wrap justify-center gap-3 w-full mt-2 max-w-md">
                <button onclick="riddlesGame.reset()" class="bg-purple-800/40 hover:bg-purple-800/60 border border-purple-400/30 text-white px-6 py-2.5 rounded-full font-bold text-sm backdrop-blur-sm">Reset 🔄</button>
                <button id="riddles-resume-btn" onclick="app.resume(3)" class="bg-yellow-400 hover:bg-yellow-300 text-purple-900 px-8 py-2.5 rounded-full font-black text-sm shadow-md transition transform hover:-translate-y-0.5">Skip to Wordwall ⏭️</button>
            </div>
        </section>` : `
        <!-- STAGE 3C: MIDPOINT GAME 3 (MEMORY MATCH) -->
        <section id="memory-stage" class="hidden w-full h-full flex flex-col justify-center items-center text-center p-4 rounded-[2.5rem] shadow-2xl text-white bg-gradient-to-br from-indigo-800 to-purple-900 relative overflow-hidden shrink-0 z-10">
            <h2 class="text-2xl sm:text-3xl font-black text-amber-400 drop-shadow-md mt-1">Memory Match 🧠</h2>
            <div id="memory-board" class="mem-board mt-3"></div>
            <div class="bg-black/20 py-1.5 px-6 rounded-full inline-block backdrop-blur-sm border border-white/10 shadow-sm mt-3">
                <h3 id="memory-status" class="text-xs sm:text-sm font-bold text-white tracking-wide">Find all matching pairs!</h3>
            </div>
            <div class="flex flex-wrap justify-center gap-3 w-full mt-4 max-w-md">
                <button onclick="memoryGame.reset()" class="bg-purple-800/40 hover:bg-purple-800/60 border border-purple-400/30 text-white px-6 py-2.5 rounded-full font-bold text-sm backdrop-blur-sm">Reset 🔄</button>
                <button id="memory-resume-btn" onclick="app.resume(3)" class="bg-yellow-400 hover:bg-yellow-300 text-purple-900 px-8 py-2.5 rounded-full font-black text-sm shadow-md transition transform hover:-translate-y-0.5">Skip to Wordwall ⏭️</button>
            </div>
        </section>`;

    const fullHtml = `
    <!-- Interactive Feedback Badge -->
    <div id="badge-ui" class="feedback-badge bg-white shadow-xl px-8 py-3 rounded-full text-2xl sm:text-3xl font-black border-4 border-emerald-400 whitespace-nowrap" role="status" aria-live="assertive"></div>

    <!-- Navigation Header with Interactive Progress Bar -->
    <header id="top-nav" class="w-full bg-white/95 backdrop-blur-sm border-b border-slate-200/80 px-3 sm:px-6 py-2 flex justify-between items-center shadow-sm shrink-0 z-30 relative">
        <div id="progress-bar" style="width: 0%;"></div>
        <div class="w-full max-w-5xl mx-auto flex justify-between items-center gap-2">
            <!-- Score & Timer Pill -->
            <div class="flex items-center gap-2 sm:gap-3">
                <div class="flex items-center gap-2 bg-emerald-50/80 border border-emerald-200 px-3 py-1 rounded-full shadow-inner">
                    <span class="text-slate-400 text-[10px] sm:text-xs font-black uppercase tracking-wider">Score</span>
                    <span id="score-val" class="text-base sm:text-lg font-black text-emerald-600 leading-none" aria-live="polite" aria-label="Current score">0</span>
                </div>
                <div id="challenge-timer" class="hidden bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full font-mono font-bold text-xs shadow-inner" role="timer">
                    ⏱ <span id="timer-val">10.0</span>s
                </div>
            </div>

            <!-- Teacher Manual Feedback Triggers -->
            <div class="flex items-center gap-1 sm:gap-1.5 bg-slate-50 px-2 sm:px-2.5 py-1 rounded-full border border-slate-200" role="toolbar" aria-label="Teacher praise controls">
                <button onclick="app.triggerFeedback('⭐', '#f59e0b', true)" class="p-1 sm:p-1.5 bg-amber-100 text-amber-500 rounded-full hover:bg-amber-200 hover:scale-110 transition-all shadow-sm text-base sm:text-lg leading-none" aria-label="Star praise" title="Star">⭐</button>
                <button onclick="app.triggerFeedback('❤️', '#ef4444', true)" class="p-1 sm:p-1.5 bg-rose-100 text-rose-500 rounded-full hover:bg-rose-200 hover:scale-110 transition-all shadow-sm text-base sm:text-lg leading-none" aria-label="Heart praise" title="Heart">❤️</button>
                <div class="w-px h-4 bg-slate-200 mx-0.5" aria-hidden="true"></div>
                <button onclick="app.triggerFeedback('Perfect! 🌟', '#8b5cf6', true)" class="px-2 py-0.5 bg-purple-100 text-purple-700 rounded-md font-black text-[10px] sm:text-xs hover:bg-purple-200 transition-colors" aria-label="Perfect praise">Perfect</button>
                <button onclick="app.triggerFeedback('Excellent! 🏆', '#10b981', true)" class="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-md font-black text-[10px] sm:text-xs hover:bg-emerald-200 transition-colors" aria-label="Excellent praise">Excellent</button>
            </div>

            <!-- Dropdown Navigator & Settings Button -->
            <div class="flex items-center gap-1.5">
                <div id="selector-wrapper" class="flex items-center bg-slate-50 px-2 sm:px-3 py-1 rounded-full border border-slate-200 max-w-[130px] sm:max-w-[200px]">
                    <select id="example-navigator" onchange="app.jumpTo(this.value)" class="bg-transparent text-emerald-700 font-bold text-xs sm:text-sm outline-none cursor-pointer w-full text-center truncate" aria-label="Lesson section navigator">
                    </select>
                </div>
                <button onclick="if(typeof settingsManager!=='undefined')settingsManager.open()" class="p-1.5 sm:p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full transition-colors shadow-sm text-sm sm:text-base leading-none" aria-label="Open Teacher Settings" title="Teacher Settings">⚙️</button>
            </div>
        </div>
    </header>

    <main class="flex-1 w-full max-w-5xl px-3 sm:px-4 flex flex-col justify-center items-center overflow-hidden relative">

        <!-- STAGE -1: MAIN MENU -->
        <section id="main-menu-stage" class="w-full h-full flex flex-col justify-center items-center gap-3 sm:gap-4 py-3 overflow-y-auto shrink-0 custom-scrollbar">
            <div class="text-center mb-1">
                <h1 class="text-3xl sm:text-4xl md:text-5xl font-black text-emerald-600 drop-shadow-sm tracking-tight mb-1 leading-tight">${title}</h1>
                <p class="text-slate-500 font-bold text-xs sm:text-sm md:text-base leading-relaxed">${subtitle}</p>
            </div>

            <!-- Developer & Dedication Card -->
            <div class="w-full max-w-sm sm:max-w-md bg-white border-2 border-emerald-200/90 rounded-[2rem] p-4 sm:p-5 shadow-sm text-left relative overflow-hidden">
                <div class="space-y-1 text-xs sm:text-sm text-slate-600 font-medium">
                    <p><span class="text-slate-400">Developed by:</span> <strong class="text-slate-800 font-black">Sheikh Gehad Elsayad</strong></p>
                    <p><span class="text-slate-400">Phone / WhatsApp:</span> <strong class="text-slate-800 font-black tracking-wide">01147992249</strong></p>
                </div>
                <hr class="my-2.5 border-slate-100">
                <div class="space-y-1">
                    <p class="text-[11px] sm:text-xs text-slate-400 italic">Please pray for my father and brother Mohammed (RIP)</p>
                    <p class="text-xs sm:text-sm text-slate-600 font-bold leading-relaxed text-center" style="font-family: 'Amiri', 'Traditional Arabic', serif; direction: rtl;">نسألكم الدعاء لوالدي ولأخي محمد رحمهما الله</p>
                </div>
            </div>

            <!-- Mid-Lesson Game Breaks Option -->
            <div class="w-full max-w-sm sm:max-w-md px-4 py-2 bg-emerald-50/80 border border-emerald-200 rounded-2xl flex items-center justify-between shadow-inner">
                <label for="toggle-game-breaks" class="flex items-center gap-2 cursor-pointer text-xs sm:text-sm font-bold text-emerald-900 select-none">
                    <span>🎮</span>
                    <span>Enable Mid-Lesson Game Breaks</span>
                </label>
                <input type="checkbox" id="toggle-game-breaks" onchange="app.toggleGameBreaks(this.checked)" class="w-5 h-5 accent-emerald-600 rounded cursor-pointer" aria-label="Enable Mid-Lesson Game Breaks">
            </div>

            <!-- Menu Action Buttons -->
            <div class="grid grid-cols-1 gap-2.5 w-full max-w-sm sm:max-w-md px-2" role="group" aria-label="Main navigation actions">
                ${rulesButtonHtml}
                <button onclick="app.startChallenge()" class="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-black py-3.5 px-6 rounded-[1.5rem] text-lg shadow-[0_5px_0_#047857] active:translate-y-[5px] active:shadow-none transition-all flex items-center justify-between" aria-label="Start Challenge">
                    <span class="flex items-center gap-2">🚀 <span>Start Challenge</span></span>
                    <span class="text-2xl" aria-hidden="true">➡</span>
                </button>
                <button onclick="app.jumpTo('ww_box')" class="bg-white border-4 border-amber-400 hover:bg-amber-50 text-amber-500 font-black py-3 px-6 rounded-[1.5rem] text-base shadow-[0_5px_0_#d97706] active:translate-y-[5px] active:shadow-none transition-all flex items-center justify-between" aria-label="Open Word Games">
                    <span class="flex items-center gap-2">🎡 <span>Word Games</span></span>
                    <span class="text-2xl" aria-hidden="true">➡</span>
                </button>
            </div>
        </section>

        ${ruleStageHtml}

        <!-- STAGE 0.5: GAME TRANSITION -->
        <section id="game-transition-stage" class="hidden w-full h-full flex flex-col justify-center items-center text-center p-6 rounded-[2.5rem] shadow-xl text-white bg-gradient-to-br from-indigo-500 to-purple-600 relative overflow-hidden shrink-0 z-20" role="dialog" aria-modal="true" aria-labelledby="transition-title">
            <h2 id="transition-title" class="text-3xl sm:text-5xl font-black text-yellow-300 drop-shadow-md mb-3 animate-bounce">Amazing Job! 🌟</h2>
            <p class="text-lg sm:text-2xl font-bold text-white mb-6">You are an excellent student!<br>You deserve a game break!</p>
            <div class="flex flex-col sm:flex-row gap-3 sm:gap-4 w-full max-w-md">
                <button id="btn-play-game" onclick="app.enterGame()" class="flex-1 bg-yellow-400 hover:bg-yellow-300 text-indigo-900 py-3.5 sm:py-4 rounded-2xl text-lg font-black shadow-[0_5px_0_#ca8a04] active:translate-y-[5px] active:shadow-none transition-all" aria-label="Play game">
                    🎮 Play <span id="transition-game-name">Game</span>
                </button>
                <button id="btn-skip-game" onclick="app.resume(app.pendingGame)" class="flex-1 bg-white/20 hover:bg-white/30 text-white border-2 border-white/50 py-3.5 sm:py-4 rounded-2xl text-lg font-bold transition-all backdrop-blur-sm" aria-label="Skip game and resume">
                    ⏭️ Skip & Read
                </button>
            </div>
        </section>

        <!-- STAGE 1: LEARNING / READING CHALLENGE -->
        <section id="learning-stage" class="hidden w-full flex flex-col justify-between items-center gap-2 py-2 flex-1 overflow-hidden relative">
            <div class="w-full max-w-4xl flex justify-between items-center px-4 shrink-0 h-8">
                <span id="progress-text" class="text-slate-400 font-black text-xs sm:text-sm tracking-widest uppercase" aria-live="polite">Card 1</span>
                <div id="status-banner" class="text-center py-1 px-4 rounded-full font-bold text-white shadow-md hidden text-xs uppercase tracking-wide" role="status" aria-live="polite"></div>
            </div>

            <div class="flex-1 flex items-center justify-center w-full px-2 py-1 overflow-hidden" id="word-display-area" role="region" aria-label="Current Reading Word" aria-live="polite" aria-atomic="true"></div>

            <div class="w-full max-w-md sm:max-w-lg space-y-2 shrink-0 pb-3 px-2">
                <div class="grid grid-cols-2 gap-3 sm:gap-4">
                    <button onclick="app.evaluate(false)" class="bg-rose-500 hover:bg-rose-600 text-white py-3.5 sm:py-4 rounded-[1.75rem] text-lg sm:text-xl shadow-[0_5px_0_#be123c] active:translate-y-[5px] active:shadow-none transition-all flex items-center justify-center gap-2 font-black" aria-label="Mark incorrect">
                        ❌ Incorrect
                    </button>
                    <button onclick="app.evaluate(true)" class="bg-emerald-500 hover:bg-emerald-600 text-white py-3.5 sm:py-4 rounded-[1.75rem] text-lg sm:text-xl shadow-[0_5px_0_#047857] active:translate-y-[5px] active:shadow-none transition-all flex items-center justify-center gap-2 font-black" aria-label="Mark correct">
                        ✔ Correct
                    </button>
                </div>
                <div class="flex justify-center pt-1">
                    <button onclick="app.prev()" class="bg-slate-200/90 hover:bg-slate-300 text-slate-600 py-1.5 px-5 rounded-full text-xs font-bold transition-colors shadow-sm flex items-center gap-1.5" aria-label="Previous card">
                        <span>⬅</span> <span>Previous Card</span>
                    </button>
                </div>
            </div>
        </section>

        <!-- STAGE 2: MIDPOINT GAME 1 (TIC-TAC-TOE) -->
        <section id="xo-stage" class="hidden w-full h-full flex flex-col justify-center items-center text-center p-2 sm:p-4 rounded-[2.5rem] text-white bg-gradient-to-br from-teal-600 via-emerald-600 to-green-700 relative overflow-hidden shrink-0 z-10">
            <div class="relative z-10 flex flex-col items-center justify-center h-full w-full max-w-3xl gap-2 sm:gap-3">
                <div class="flex flex-col items-center gap-1">
                    <h2 class="text-3xl sm:text-4xl font-black text-yellow-300 drop-shadow-md">Tic-Tac-Toe! 🎮</h2>
                    <!-- Controls Toolbar -->
                    <div class="flex items-center justify-center gap-2 mt-1" role="toolbar" aria-label="Game mode and difficulty">
                        <button id="xo-mode-btn" onclick="if(typeof gameAI!=='undefined')gameAI.toggleMode('xo')" class="bg-emerald-500/80 hover:bg-emerald-500 text-white border border-emerald-300/40 px-3.5 py-1.5 rounded-full font-bold text-xs shadow-sm transition-all" aria-label="Toggle computer or teacher mode">🤖 ضد الكمبيوتر</button>
                        <button id="xo-diff-btn" onclick="if(typeof gameAI!=='undefined')gameAI.toggleDifficulty()" class="bg-amber-400 hover:bg-amber-300 text-amber-950 font-bold px-3 py-1.5 rounded-full text-xs shadow-sm transition-all" aria-label="Toggle difficulty level">مستوى: سهل 😊</button>
                    </div>
                </div>
                <div class="xo-board-container mt-1">
                    <div id="xo-board" class="grid grid-cols-3 gap-2.5 sm:gap-3 bg-white/20 p-3 sm:p-4 rounded-[2rem] backdrop-blur-md shadow-inner border border-white/25 w-full h-full"></div>
                </div>
                <div class="bg-black/20 py-1.5 px-6 rounded-full inline-block backdrop-blur-sm border border-white/10 shadow-sm mt-1">
                    <h3 id="xo-status" class="text-sm sm:text-base font-bold text-white tracking-wide">Player X Turn!</h3>
                </div>
                <div class="flex flex-wrap justify-center gap-3 w-full mt-2">
                    <button onclick="xoGame.reset()" class="bg-white/20 hover:bg-white/30 text-white border border-white/30 px-6 py-2.5 rounded-full font-bold text-sm transition-transform hover:scale-105 backdrop-blur-sm">Reset 🔄</button>
                    <button id="xo-resume-btn" onclick="app.resume(1)" class="bg-yellow-400 hover:bg-yellow-300 text-teal-900 px-8 py-2.5 rounded-full font-black text-sm shadow-md transform transition hover:-translate-y-0.5">Skip & Read ⏭️</button>
                </div>
            </div>
        </section>

        <!-- STAGE 3B: MIDPOINT GAME 2 (CONNECT 4) -->
        <section id="c4-stage" class="hidden w-full h-full flex flex-col justify-center items-center text-center p-3 sm:p-4 rounded-[2.5rem] shadow-xl text-white bg-gradient-to-br from-sky-400 via-blue-500 to-indigo-700 relative overflow-hidden shrink-0 z-10">
            <div class="relative z-10 flex flex-col items-center gap-2 sm:gap-3">
                <div class="flex flex-col items-center gap-1">
                    <h2 class="text-2xl sm:text-3xl font-black text-yellow-300 drop-shadow-md">Connect 4 🔴🟡</h2>
                    <!-- Controls Toolbar -->
                    <div class="flex items-center justify-center gap-2 mt-1" role="toolbar" aria-label="Game mode and difficulty">
                        <button id="c4-mode-btn" onclick="if(typeof gameAI!=='undefined')gameAI.toggleMode('c4')" class="bg-sky-500/80 hover:bg-sky-500 text-white border border-sky-300/40 px-3.5 py-1.5 rounded-full font-bold text-xs shadow-sm transition-all" aria-label="Toggle computer or teacher mode">🤖 ضد الكمبيوتر</button>
                        <button id="c4-diff-btn" onclick="if(typeof gameAI!=='undefined')gameAI.toggleDifficulty()" class="bg-amber-400 hover:bg-amber-300 text-amber-950 font-bold px-3 py-1.5 rounded-full text-xs shadow-sm transition-all" aria-label="Toggle difficulty level">مستوى: سهل 😊</button>
                    </div>
                </div>
                <div id="c4-board-container" class="c4-board-new grid-cols-7 mx-auto mt-1"></div>
                <div class="bg-black/20 py-1.5 px-6 rounded-full inline-block backdrop-blur-sm border border-white/10 shadow-sm mt-2">
                    <h3 id="c4-status" class="text-xs sm:text-sm font-bold text-white tracking-wide">Select any column</h3>
                </div>
                <div class="flex flex-wrap justify-center gap-3 w-full mt-3">
                    <button onclick="c4Game.reset()" class="bg-blue-800/40 hover:bg-blue-800/60 border border-blue-400/30 text-white px-6 py-2.5 rounded-full font-bold text-sm backdrop-blur-sm">Reset 🔄</button>
                    <button id="c4-resume-btn" onclick="app.resume(2)" class="bg-yellow-400 hover:bg-yellow-300 text-blue-900 px-8 py-2.5 rounded-full font-black text-sm shadow-md transition transform hover:-translate-y-0.5">Skip & Read ⏭️</button>
                </div>
            </div>
        </section>

        ${game3StageHtml}

        <!-- STAGE 4: WORDWALL PLAYROOM -->
        <section id="wordwall-stage" class="hidden w-full h-full flex flex-col items-center py-3 px-2 overflow-hidden bg-slate-50 rounded-3xl border border-slate-200 shadow-inner">
            <div class="w-full max-w-4xl flex flex-col sm:flex-row justify-between items-center mb-3 shrink-0 gap-3 px-3">
                <h2 class="text-xl sm:text-2xl font-black text-emerald-600 drop-shadow-sm flex items-center gap-2">
                    <span>🎡</span> Games Room
                </h2>
                <nav class="bg-white p-1 rounded-2xl shadow-sm border border-slate-200 flex flex-wrap gap-1">
                    <button onclick="wordwallRoom.switchMode('box')" id="tab-box" class="game-tab active py-1.5 px-3 rounded-xl font-bold text-slate-600 bg-slate-50 hover:bg-slate-100 flex items-center justify-center gap-1.5 text-xs sm:text-sm border border-transparent" aria-label="Open Boxes game">
                        <span class="text-base sm:text-lg">🎁</span> <span class="hidden sm:inline">Box</span>
                    </button>
                    <button onclick="wordwallRoom.switchMode('curtain')" id="tab-curtain" class="game-tab py-1.5 px-3 rounded-xl font-bold text-slate-600 bg-slate-50 hover:bg-slate-100 flex items-center justify-center gap-1.5 text-xs sm:text-sm border border-transparent" aria-label="Curtain Reveal game">
                        <span class="text-base sm:text-lg">🎭</span> <span class="hidden sm:inline">Curtain</span>
                    </button>
                    <button onclick="wordwallRoom.switchMode('ladder')" id="tab-ladder" class="game-tab py-1.5 px-3 rounded-xl font-bold text-slate-600 bg-slate-50 hover:bg-slate-100 flex items-center justify-center gap-1.5 text-xs sm:text-sm border border-transparent" aria-label="Mastery Ladder game">
                        <span class="text-base sm:text-lg">🪜</span> <span class="hidden sm:inline">Ladder</span>
                    </button>
                    <button onclick="wordwallRoom.switchMode('wheel')" id="tab-wheel" class="game-tab py-1.5 px-3 rounded-xl font-bold text-slate-600 bg-slate-50 hover:bg-slate-100 flex items-center justify-center gap-1.5 text-xs sm:text-sm border border-transparent" aria-label="Spin the wheel game">
                        <span class="text-base sm:text-lg">🎡</span> <span class="hidden sm:inline">Wheel</span>
                    </button>
                    <button onclick="wordwallRoom.switchMode('cards')" id="tab-cards" class="game-tab py-1.5 px-3 rounded-xl font-bold text-slate-600 bg-slate-50 hover:bg-slate-100 flex items-center justify-center gap-1.5 text-xs sm:text-sm border border-transparent" aria-label="Random cards game">
                        <span class="text-base sm:text-lg">🃏</span> <span class="hidden sm:inline">Cards</span>
                    </button>
                </nav>
            </div>

            <div class="flex-1 w-full flex flex-col items-center justify-center overflow-hidden relative min-h-0">
                <div id="ww-box-container" class="w-full h-full flex flex-col items-center min-h-0 overflow-hidden">
                    <div id="box-prompt-text" class="bg-indigo-100 text-indigo-800 px-3.5 py-1 rounded-full text-xs font-bold mb-2 shrink-0 shadow-sm border border-indigo-200">
                        Tap any box to reveal the hidden word!
                    </div>
                    <div id="box-grid" class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2.5 sm:gap-3.5 w-full max-w-5xl flex-1 overflow-y-auto p-3 custom-scrollbar pb-20"></div>
                </div>

                <div id="ww-ladder-container" class="hidden w-full h-full flex flex-col items-center justify-between p-2 max-w-4xl mx-auto overflow-y-auto custom-scrollbar" role="region" aria-label="Mastery Ladder Game">
                    <!-- Live Region for Blind Teacher: Announces step and word -->
                    <div id="ladder-live-announcer" class="sr-only" aria-live="assertive" aria-atomic="true"></div>

                    <!-- Header with Round Selector & Step Counter -->
                    <div class="w-full flex justify-between items-center bg-white/80 border border-slate-200 rounded-2xl px-4 py-2 shrink-0 shadow-sm">
                        <div class="flex items-center gap-2">
                            <span class="text-xs font-black text-slate-500 uppercase tracking-wider">Round:</span>
                            <button id="ladder-btn-5" onclick="ladderGame.setTarget(5)" class="py-1 px-3.5 rounded-full font-bold text-xs bg-emerald-500 text-white shadow-sm transition-all" aria-label="5 steps round">5 Steps</button>
                            <button id="ladder-btn-10" onclick="ladderGame.setTarget(10)" class="py-1 px-3.5 rounded-full font-bold text-xs bg-slate-100 text-slate-700 hover:bg-slate-200 transition-all" aria-label="10 steps round">10 Steps</button>
                        </div>
                        <span id="ladder-step-indicator" class="text-xs sm:text-sm font-black text-emerald-700 bg-emerald-100/80 px-3 py-1 rounded-full" aria-live="polite">الدرجة 0 من 5</span>
                    </div>

                    <!-- Main Play Area: Ladder Visualization on Left, Big Word Card on Right -->
                    <div class="grid grid-cols-1 md:grid-cols-12 gap-3 w-full flex-1 my-2 min-h-0 items-center">
                        <div class="md:col-span-4 flex flex-col gap-1.5 w-full max-h-[260px] md:max-h-[340px] overflow-y-auto custom-scrollbar p-2 bg-slate-100/80 rounded-2xl border border-slate-200" id="ladder-rungs" role="region" aria-label="Ladder Steps">
                        </div>

                        <div class="md:col-span-8 flex flex-col justify-center items-center bg-white border-4 border-emerald-400 rounded-3xl shadow-xl p-4 min-h-[180px] md:min-h-[280px] w-full">
                            <div id="ladder-word-display" class="w-full flex-1 flex items-center justify-center text-center" role="region" aria-label="Current Challenge Word" aria-live="polite">
                            </div>
                        </div>
                    </div>

                    <!-- Control & Grading Buttons -->
                    <div class="w-full max-w-md shrink-0 space-y-2 pb-1">
                        <div class="grid grid-cols-2 gap-3">
                            <button onclick="ladderGame.grade(false)" class="bg-rose-500 hover:bg-rose-600 text-white py-3 rounded-2xl text-base font-black shadow-[0_4px_0_#be123c] active:translate-y-1 active:shadow-none transition-all flex items-center justify-center gap-2" aria-label="Mark Missed, Step Down">
                                ❌ Missed (1)
                            </button>
                            <button onclick="ladderGame.grade(true)" class="bg-emerald-500 hover:bg-emerald-600 text-white py-3 rounded-2xl text-base font-black shadow-[0_4px_0_#047857] active:translate-y-1 active:shadow-none transition-all flex items-center justify-center gap-2" aria-label="Mark Correct, Step Up">
                                ✔ Correct (2)
                            </button>
                        </div>
                        <div class="flex justify-center">
                            <button id="ladder-reset-btn" onclick="ladderGame.reset()" class="bg-slate-200 hover:bg-slate-300 text-slate-700 py-1.5 px-6 rounded-full text-xs font-bold transition-colors shadow-sm" aria-label="Restart Round">
                                Restart Round 🔄
                            </button>
                        </div>
                    </div>
                </div>

                <div id="ww-wheel-container" class="hidden w-full h-full flex flex-col justify-center items-center gap-4" role="region" aria-label="Spin the wheel game">
                    <div class="bg-amber-100 text-amber-800 px-3.5 py-1 rounded-full text-xs font-bold shrink-0 shadow-sm border border-amber-200" id="wheel-status" role="status" aria-live="polite">
                        Tap SPIN or the center circle to rotate!
                    </div>
                    <div class="relative w-[80vw] max-w-[340px] aspect-square flex items-center justify-center shrink-0 drop-shadow-2xl">
                        <canvas id="wheel-canvas" width="400" height="400" class="w-full h-full object-contain" role="img" aria-label="Word wheel display"></canvas>
                        <div class="absolute -top-3 left-1/2 -translate-x-1/2 w-8 h-10 bg-rose-600 z-10 border-4 border-white pointer-events-none drop-shadow-md" style="clip-path: polygon(50% 100%, 0 0, 100% 0);" aria-hidden="true"></div>
                        <button onclick="wheelGame.spin()" id="spin-btn" class="absolute w-18 h-18 sm:w-22 sm:h-22 bg-white hover:bg-slate-50 border-[5px] border-emerald-400 rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(0,0,0,0.3)] z-20 cursor-pointer font-black text-emerald-600 text-base sm:text-lg hover:scale-105 active:scale-95 transition-all" aria-label="Spin the wheel">
                            SPIN
                        </button>
                    </div>
                </div>

                <div id="ww-cards-container" class="hidden w-full h-full flex flex-col justify-center items-center gap-6" role="region" aria-label="Random cards game">
                    <div class="bg-rose-100 text-rose-800 px-3.5 py-1 rounded-full text-xs font-bold shrink-0 shadow-sm border border-rose-200">
                        Tap the deck to deal a random card!
                    </div>
                    <div class="card-pile flex justify-center items-center shrink-0 mt-2">
                        <div class="stacked-card bg-rose-700 border-[3px] border-white/50 transform rotate-6 translate-x-4 translate-y-3" aria-hidden="true"></div>
                        <div class="stacked-card bg-rose-500 border-[3px] border-white/70 transform -rotate-3 -translate-x-3 -translate-y-2" aria-hidden="true"></div>
                        <button type="button" onclick="cardsGame.dealNextCard()" id="active-deck-card" class="stacked-card bg-gradient-to-br from-rose-500 to-pink-600 border-4 border-white flex flex-col items-center justify-center text-white cursor-pointer hover:-translate-y-6 hover:rotate-2 transition-all duration-300 z-10 shadow-2xl" aria-label="Deal a random word card">
                            <span class="text-6xl drop-shadow-md" aria-hidden="true">🃏</span>
                            <span class="font-black mt-4 text-xs tracking-[0.2em] bg-black/20 px-3.5 py-1 rounded-full">DEAL</span>
                        </button>
                    </div>
                </div>
            </div>
            
            <div class="flex justify-center w-full mt-2 shrink-0 pt-2 border-t border-slate-200">
                <button onclick="app.finishToSummary()" class="bg-slate-800 hover:bg-slate-900 text-white px-6 py-2.5 rounded-full font-black text-xs sm:text-sm shadow-md transition-transform hover:-translate-y-0.5 flex items-center gap-2" aria-label="View final performance report">
                    <span>View Final Report</span> <span class="text-base" aria-hidden="true">🏆</span>
                </button>
            </div>
        </section>

        <!-- GIGANTIC WORD DISPLAY MODAL OVERLAY -->
        <div id="word-overlay" class="hidden fixed inset-0 bg-slate-900/80 z-50 flex flex-col justify-center items-center p-3 sm:p-6 backdrop-blur-md" role="dialog" aria-modal="true" aria-labelledby="revealed-info">
            <div class="giant-word-overlay bg-white rounded-[2.5rem] w-full max-w-3xl max-h-[90vh] p-5 sm:p-8 flex flex-col justify-between items-center shadow-2xl border-4 border-emerald-400 overflow-y-auto custom-scrollbar">
                <div class="w-full flex justify-between items-center px-2 shrink-0 mb-3">
                    <span id="revealed-info" class="bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full font-bold text-xs uppercase tracking-wider">Question</span>
                    <button onclick="app.closeOverlay()" class="bg-slate-100 text-slate-500 hover:bg-rose-100 hover:text-rose-600 px-3.5 py-1 rounded-full text-xs font-black transition-colors" aria-label="Close dialog">✕ Close</button>
                </div>
                <div id="giant-arabic-word" class="flex-1 flex items-center justify-center w-full py-4 min-h-[160px]" role="region" aria-label="Revealed Word" aria-live="polite">
                </div>
                <div class="w-full max-w-sm shrink-0 mt-4">
                    <div class="grid grid-cols-2 gap-3">
                        <button onclick="app.gradeResult(false)" class="bg-rose-500 hover:bg-rose-600 text-white py-3.5 rounded-2xl text-base shadow-[0_4px_0_#be123c] active:translate-y-1 active:shadow-none transition-all flex items-center justify-center gap-2 font-black" aria-label="Mark as missed">
                            ❌ Missed
                        </button>
                        <button onclick="app.gradeResult(true)" class="bg-emerald-500 hover:bg-emerald-600 text-white py-3.5 rounded-2xl text-base shadow-[0_4px_0_#047857] active:translate-y-1 active:shadow-none transition-all flex items-center justify-center gap-2 font-black" aria-label="Mark as perfect">
                            ✔ Perfect
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <!-- STAGE 5: FINAL SUMMARY SCREEN -->
        <section id="summary-screen" class="hidden w-full max-w-2xl bg-white rounded-[2.5rem] p-6 sm:p-8 shadow-2xl text-center space-y-5 border-4 border-emerald-100 shrink-0 my-auto z-10" role="region" aria-label="Final performance summary">
            <h2 class="text-3xl sm:text-4xl font-black text-slate-800">Challenge Completed! 🎉</h2>
            <div class="grid grid-cols-2 gap-4 items-center">
                <div class="space-y-2">
                    <span class="text-slate-400 font-bold uppercase text-xs sm:text-sm tracking-wider">Points Gathered</span>
                    <div id="final-score" class="text-5xl sm:text-6xl font-black text-emerald-600 drop-shadow-sm leading-none" role="status" aria-live="polite">0</div>
                </div>
                <div class="flex flex-col items-center">
                    <div class="chart-container"><canvas id="summaryChart" role="img" aria-label="Performance chart summary"></canvas></div>
                </div>
            </div>
            <div class="flex flex-wrap justify-center pt-2 gap-3">
                <button id="btn-review-mistakes" onclick="app.startReview()" class="hidden bg-rose-500 hover:bg-rose-600 text-white text-base font-bold py-3 px-8 rounded-full shadow-lg transition-all flex items-center gap-2" aria-label="Review mistakes made during challenge">
                    <span>Review Mistakes</span> <span aria-hidden="true">🎯</span>
                </button>
                <button onclick="app.jumpTo('ww_box')" class="bg-slate-200 text-slate-700 text-base font-bold py-3 px-6 rounded-full shadow-md hover:bg-slate-300 transition-all" aria-label="Open Games Room">Games Room 🎮</button>
                <button onclick="location.reload()" class="bg-slate-900 text-white text-base font-bold py-3 px-8 rounded-full shadow-lg hover:bg-black transition-all" aria-label="Play lesson challenge again">Play Again 🔄</button>
            </div>
        </section>

    </main>

    <footer class="text-center text-[10px] text-slate-400 py-1 shrink-0 h-6">
        ${footerText}
    </footer>
    `;

    // Prepend to body before scripts
    const container = document.createElement('div');
    container.className = 'w-full h-full flex flex-col items-center overflow-hidden';
    container.innerHTML = fullHtml;
    document.body.insertBefore(container, document.body.firstChild);
}

/* ==========================================================================
   MODULE: app.js
   ========================================================================== */

const app = {
    idx: 0, score: 0, stats: { ok: 0, err: 0 }, clock: 10.0, timer: null, feedbackTimer: null,
    hasPlayedGame1: false, hasPlayedGame2: false, hasPlayedGame3: false, currentActiveIndex: null, pendingGame: 0, chartInstance: null,
    mistakeIndices: [], isReviewMode: false, reviewQueue: [], reviewIdx: 0, keyboardBound: false,
    enableGameBreaks: false,

    init() {
        buildAppUI();
        if (typeof settingsManager !== 'undefined') {
            const s = settingsManager.get();
            this.enableGameBreaks = !!s.gameBreaksEnabled;
            settingsManager.apply(s);
        } else {
            try {
                const saved = localStorage.getItem('nb_teacher_settings') || localStorage.getItem('nour_enable_game_breaks');
                if (saved !== null) this.enableGameBreaks = (saved === '1' || JSON.parse(saved).gameBreaksEnabled);
            } catch(e) {}
        }
        const toggleEl = document.getElementById('toggle-game-breaks');
        if (toggleEl) toggleEl.checked = this.enableGameBreaks;

        this.populateSelector();
        this.jumpTo('menu');
        if (typeof xoGame !== 'undefined') xoGame.init();
        if (typeof c4Game !== 'undefined') c4Game.init();
        if (typeof memoryGame !== 'undefined' && document.getElementById('memory-stage')) memoryGame.init();
        if (typeof riddlesGame !== 'undefined' && document.getElementById('riddles-stage')) riddlesGame.init();
        if (typeof wordwallRoom !== 'undefined') wordwallRoom.init();
        if (typeof ruleManager !== 'undefined' && typeof rulesData !== 'undefined' && rulesData.length > 0) ruleManager.init();

        if (!this.keyboardBound) {
            this.keyboardBound = true;
            document.addEventListener('keydown', (e) => {
                // حظر التفاعل بالمفاتيح السريعة إذا كان التركيز داخل حقل إدخال
                if (e.target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;

                const overlay = document.getElementById('word-overlay');
                const isOverlayOpen = overlay && !overlay.classList.contains('hidden');
                const learningStage = document.getElementById('learning-stage');
                const isLearning = learningStage && !learningStage.classList.contains('hidden');

                if (isOverlayOpen) {
                    if (e.key === 'Escape') app.closeOverlay();
                    else if (e.key === '1' || e.key === 'ArrowUp') app.gradeResult(false);
                    else if (e.key === '2' || e.key === 'Enter' || e.key === ' ') { e.preventDefault(); app.gradeResult(true); }
                    return;
                }

                const wwStage = document.getElementById('wordwall-stage');
                const isWordwall = wwStage && !wwStage.classList.contains('hidden');
                if (isWordwall && typeof wordwallRoom !== 'undefined' && wordwallRoom.mode === 'ladder' && typeof ladderGame !== 'undefined') {
                    if (e.key === '1' || e.key === 'ArrowDown') ladderGame.grade(false);
                    else if (e.key === '2' || e.key === 'Enter' || e.key === ' ') { e.preventDefault(); ladderGame.grade(true); }
                    else if (e.key === 'r' || e.key === 'R') ladderGame.reset();
                    return;
                }

                if (isLearning) {
                    if (e.key === 'ArrowRight' || e.key === 'PageUp') app.prev();
                    else if (e.key === '1' || e.key === 'ArrowDown') app.evaluate(false);
                    else if (e.key === '2' || e.key === ' ' || e.key === 'Enter') { e.preventDefault(); app.evaluate(true); }
                }
            });
        }
    },

    hideAll() {
        if (this.timer) { clearInterval(this.timer); this.timer = null; }
        if (this.feedbackTimer) { clearTimeout(this.feedbackTimer); this.feedbackTimer = null; }
        this.closeOverlay();
        ['main-menu-stage', 'rule-stage', 'game-transition-stage', 'learning-stage', 'xo-stage', 'c4-stage', 'memory-stage', 'riddles-stage', 'wordwall-stage', 'summary-screen'].forEach(id => {
            const el = document.getElementById(id); if (el) el.classList.add('hidden');
        });
    },

    jumpTo(val) {
        this.hideAll();
        this.isReviewMode = false;
        const topNav = document.getElementById('top-nav'); if (topNav) topNav.classList.remove('hidden');
        if (val.startsWith('word_')) {
            const targetWordIdx = parseInt(val.split('_')[1], 10);
            if (!this.order && typeof dataset !== 'undefined') {
                this.order = Array.from({ length: dataset.length }, (_, i) => i);
                const settings = (typeof settingsManager !== 'undefined') ? settingsManager.get() : {};
                if (settings.shuffleCards) {
                    this.shuffle(this.order);
                }
            }
            const foundPos = (this.order) ? this.order.indexOf(targetWordIdx) : targetWordIdx;
            this.idx = (foundPos !== -1) ? foundPos : targetWordIdx;
            const stage = document.getElementById('learning-stage'); if (stage) stage.classList.remove('hidden');
            this.render();
        } else if (val === 'menu') {
            const menu = document.getElementById('main-menu-stage'); if (menu) menu.classList.remove('hidden');
        } else if (val === 'rules') {
            const rStage = document.getElementById('rule-stage'); if (rStage) { rStage.classList.remove('hidden'); if (typeof ruleManager !== 'undefined') ruleManager.render(); }
        } else if (val === 'transition_1') { this.showGameTransition(1); }
        else if (val === 'transition_2') { this.showGameTransition(2); }
        else if (val === 'transition_3') { this.showGameTransition(3); }
        else if (val === 'game_xo') { const s = document.getElementById('xo-stage'); if (s) s.classList.remove('hidden'); }
        else if (val === 'game_c4') { const s = document.getElementById('c4-stage'); if (s) s.classList.remove('hidden'); }
        else if (val === 'game_memory') { const s = document.getElementById('memory-stage'); if (s) { s.classList.remove('hidden'); if (typeof memoryGame !== 'undefined') memoryGame.init(); } }
        else if (val === 'game_riddles') { const s = document.getElementById('riddles-stage'); if (s) { s.classList.remove('hidden'); if (typeof riddlesGame !== 'undefined') riddlesGame.reset(); } }
        else if (val === 'ww_box') { const s = document.getElementById('wordwall-stage'); if (s) s.classList.remove('hidden'); if (typeof wordwallRoom !== 'undefined') wordwallRoom.switchMode('box'); }
        else if (val === 'ww_curtain') { const s = document.getElementById('wordwall-stage'); if (s) s.classList.remove('hidden'); if (typeof wordwallRoom !== 'undefined') wordwallRoom.switchMode('curtain'); }
        else if (val === 'ww_ladder') { const s = document.getElementById('wordwall-stage'); if (s) s.classList.remove('hidden'); if (typeof wordwallRoom !== 'undefined') wordwallRoom.switchMode('ladder'); }
        else if (val === 'ww_wheel') { const s = document.getElementById('wordwall-stage'); if (s) s.classList.remove('hidden'); if (typeof wordwallRoom !== 'undefined') wordwallRoom.switchMode('wheel'); }
        else if (val === 'ww_cards') { const s = document.getElementById('wordwall-stage'); if (s) s.classList.remove('hidden'); if (typeof wordwallRoom !== 'undefined') wordwallRoom.switchMode('cards'); }
        else if (val === 'summary') { this.finishToSummary(); }
        const sel = document.getElementById('example-navigator'); if (sel) sel.value = val;
    },

    startChallenge() {
        this.idx = 0; this.score = 0; this.stats = { ok: 0, err: 0 };
        this.hasPlayedGame1 = false; this.hasPlayedGame2 = false; this.hasPlayedGame3 = false;
        this.mistakeIndices = []; this.isReviewMode = false; this.reviewQueue = []; this.reviewIdx = 0;
        const scoreEl = document.getElementById('score-val'); if (scoreEl) scoreEl.innerText = '0';

        if (typeof dataset !== 'undefined' && Array.isArray(dataset)) {
            this.order = Array.from({ length: dataset.length }, (_, i) => i);
            const settings = (typeof settingsManager !== 'undefined') ? settingsManager.get() : {};
            if (settings.shuffleCards) {
                this.shuffle(this.order);
            }
        } else {
            this.order = null;
        }

        const firstWordIdx = (this.order && this.order.length > 0) ? this.order[0] : 0;
        this.jumpTo(`word_${firstWordIdx}`);
    },

    populateSelector() {
        const selector = document.getElementById('example-navigator');
        if (!selector || typeof dataset === 'undefined') return;
        selector.innerHTML = '';

        const mainGroup = document.createElement('optgroup');
        mainGroup.label = "📌 Overview & Rules (نظرة عامة والقواعد)";
        const menuOpt = document.createElement('option');
        menuOpt.value = 'menu';
        menuOpt.textContent = '🏠 Main Menu (القائمة الرئيسية)';
        mainGroup.appendChild(menuOpt);

        if (typeof rulesData !== 'undefined' && rulesData.length > 0) {
            const ruleOpt = document.createElement('option');
            ruleOpt.value = 'rules';
            ruleOpt.textContent = '📖 Rules & Introduction (القواعد والشرح)';
            mainGroup.appendChild(ruleOpt);
        }
        selector.appendChild(mainGroup);

        const cardGroup = document.createElement('optgroup');
        cardGroup.label = "🔤 Word & Letter Cards (بطاقات الكلمات والحروف)";
        dataset.forEach((item, index) => {
            const opt = document.createElement('option');
            opt.value = `word_${index}`;
            const plain = this.getPlainWord(item);
            opt.textContent = `Card ${index + 1}: ${plain}`;
            cardGroup.appendChild(opt);
        });
        selector.appendChild(cardGroup);

        const gamesGroup = document.createElement('optgroup');
        gamesGroup.label = "🎮 Mini-Games & Challenges (الألعاب والتحديات)";
        const g1 = document.createElement('option'); g1.value = 'game_xo'; g1.textContent = '🕹️ Tic-Tac-Toe (إكس-أو)'; gamesGroup.appendChild(g1);
        const g2 = document.createElement('option'); g2.value = 'game_c4'; g2.textContent = '🕹️ Connect 4 (أربعة في خط)'; gamesGroup.appendChild(g2);
        const g3 = document.createElement('option'); g3.value = 'game_memory'; g3.textContent = '🧠 Memory Match (الذاكرة)'; gamesGroup.appendChild(g3);
        const g4 = document.createElement('option'); g4.value = 'game_riddles'; g4.textContent = '❓ Secret Riddles (الألغاز)'; gamesGroup.appendChild(g4);
        selector.appendChild(gamesGroup);

        const wwGroup = document.createElement('optgroup');
        wwGroup.label = "🌟 Wordwall Zone (حائط الألعاب التفاعلية)";
        const w1 = document.createElement('option'); w1.value = 'ww_box'; w1.textContent = '📦 Open The Box (افتح الصندوق)'; wwGroup.appendChild(w1);
        const w2 = document.createElement('option'); w2.value = 'ww_curtain'; w2.textContent = '🎭 Curtain Reveal (كشف الستار)'; wwGroup.appendChild(w2);
        const w3 = document.createElement('option'); w3.value = 'ww_ladder'; w3.textContent = '🪜 Mastery Ladder (سلم الإتقان)'; wwGroup.appendChild(w3);
        const w4 = document.createElement('option'); w4.value = 'ww_wheel'; w4.textContent = '🎡 Spin The Wheel (عجلة الكلمات)'; wwGroup.appendChild(w4);
        const w5 = document.createElement('option'); w5.value = 'ww_cards'; w5.textContent = '🎴 Random Cards (البطاقات العشوائية)'; wwGroup.appendChild(w5);
        selector.appendChild(wwGroup);
    },

    shuffle(arr) {
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
    },

    // تعقيم وتطهير نصوص HTML ضد هجمات XSS مع حماية كاملة للمخططات
    setSafeHTML(el, htmlStr) {
        if (!el) return;
        const template = document.createElement('template');
        template.innerHTML = htmlStr || '';
        const content = template.content;

        content.querySelectorAll('script, iframe, object, embed, style, link, svg, math, base, meta, form').forEach(e => e.remove());

        const elements = content.querySelectorAll('*');
        for (let i = 0; i < elements.length; i++) {
            const child = elements[i];
            for (let j = child.attributes.length - 1; j >= 0; j--) {
                const attr = child.attributes[j];
                const name = attr.name.toLowerCase();
                const val = attr.value.replace(/\s+/g, '').toLowerCase();

                if (name.startsWith('on') || val.includes('javascript:') || val.includes('data:text/html') || val.includes('vbscript:')) {
                    child.removeAttribute(attr.name);
                }
            }
        }
        el.replaceChildren(content);
    },

    renderWordInto(container, item) {
        if (!container || !item) return;
        container.innerHTML = '';
        const currentTheme = item.theme || 'pink';

        if (item.segs && Array.isArray(item.segs)) {
            const colorClasses = ['c-red', 'c-blue', 'c-black'];
            const wrap = document.createElement('div');
            wrap.className = 'segmented-container';
            item.segs.forEach((ch, i) => {
                const sb = document.createElement('div');
                sb.className = `seg-box theme-${currentTheme} quran-font ${colorClasses[i % 3]}`;
                sb.innerText = ch;
                wrap.appendChild(sb);
            });
            container.appendChild(wrap);
        } else if (item.boxes && Array.isArray(item.boxes)) {
            const wrap = document.createElement('div');
            wrap.className = 'segmented-container';
            item.boxes.forEach(segments => {
                const sb = document.createElement('div');
                sb.className = `seg-box theme-${currentTheme} quran-font`;
                sb.style.direction = 'rtl';
                const inner = segments.map(([t, c]) => `<span class="color-${c}">${t}</span>`).join('');
                this.setSafeHTML(sb, `<bdi style="white-space:nowrap">${inner}</bdi>`);
                wrap.appendChild(sb);
            });
            container.appendChild(wrap);
        } else if (item.multiBox && Array.isArray(item.w)) {
            const wrap = document.createElement('div');
            wrap.className = 'segmented-container';
            item.w.forEach((char, i) => {
                const sb = document.createElement('div');
                sb.className = `seg-box theme-${currentTheme} quran-font color-${i % 3}`;
                sb.innerText = char;
                wrap.appendChild(sb);
            });
            container.appendChild(wrap);
        } else if (item.groups && Array.isArray(item.groups)) {
            const box = document.createElement('div');
            box.className = `letter-box quran-font theme-${currentTheme}`;
            box.style.direction = 'rtl';
            this.setSafeHTML(box, item.groups.map(g => `<span class="${g[1]}" style="margin:0 .25em">${g[0]}</span>`).join(''));
            container.appendChild(box);
        } else if (item.html) {
            const box = document.createElement('div');
            box.className = `letter-box quran-font theme-${currentTheme}`;
            box.style.direction = 'rtl';
            this.setSafeHTML(box, item.html);
            container.appendChild(box);
        } else if (Array.isArray(item.w)) {
            const box = document.createElement('div');
            box.className = `letter-box quran-font theme-${currentTheme}`;
            box.style.direction = 'rtl';
            const inner = item.w.map((seg, i) => `<span class="color-${i % 3}">${seg}</span>`).join('');
            this.setSafeHTML(box, `<bdi style="white-space:nowrap">${inner}</bdi>`);
            container.appendChild(box);
        } else {
            const box = document.createElement('div');
            box.className = `letter-box theme-${currentTheme}`;
            this.setSafeHTML(box, `<span class="word-wrapper quran-font text-center">${item.w}</span>`);
            container.appendChild(box);
        }
    },

    getPlainWord(item) {
        if (!item) return '';
        if (item.plain) return item.plain;
        if (item.html) return item.html.replace(/<[^>]+>/g, '').replace(/&zwj;/g, '').replace(/&nbsp;/g, ' ').trim();
        if (Array.isArray(item.w)) return item.w.join('').replace(/<[^>]+>/g, '').replace(/&zwj;/g, '').replace(/&nbsp;/g, ' ').replace(/ـ/g, '').trim();
        if (typeof item.w === 'string') return item.w.replace(/<[^>]+>/g, '').replace(/&zwj;/g, '').replace(/&nbsp;/g, ' ').trim();
        if (item.boxes) return item.boxes.map(b => b.map(s => s[0]).join('')).join(' ').trim();
        if (item.groups) return item.groups.map(g => g[0]).join('').trim();
        return '';
    },

    render() {
        if (typeof dataset === 'undefined' || dataset.length === 0) return;
        const currentItemIdx = (this.order && this.order[this.idx] !== undefined) ? this.order[this.idx] : this.idx;
        const item = dataset[currentItemIdx];
        if (!item) return;

        const area = document.getElementById('word-display-area');
        const banner = document.getElementById('status-banner');
        const timerBox = document.getElementById('challenge-timer');
        const navSelect = document.getElementById('example-navigator');
        if (navSelect) navSelect.value = `word_${currentItemIdx}`;
        this.updateProgress(this.idx + 1, dataset.length, 'Card');
        if (area) {
            this.renderWordInto(area, item);
            const plain = this.getPlainWord(item);
            area.setAttribute('aria-label', `Card ${this.idx + 1} of ${dataset.length}: ${plain}`);
            area.tabIndex = -1;
            area.focus({ preventScroll: true });
        }
        if (banner) { banner.classList.add('hidden'); banner.classList.remove('pulse-danger'); }
        if (timerBox) timerBox.classList.add('hidden');
        if (this.timer) { clearInterval(this.timer); this.timer = null; }

        if (item.t === 'golden') {
            Sound.playChime();
            if (banner) {
                banner.innerText = "🌟 Golden Word! (+10)";
                banner.className = "text-center py-1 px-4 rounded-full font-bold text-white shadow-md w-fit bg-amber-500 block animate-bounce uppercase tracking-wide text-xs shrink-0";
                banner.classList.remove('hidden');
            }
        } else if (item.t === 'danger') {
            Sound.danger();
            if (banner) {
                banner.innerText = "⚠️ High Focus! (-5)";
                banner.className = "text-center py-1 px-4 rounded-full font-bold text-white shadow-md w-fit bg-rose-600 block pulse-danger uppercase tracking-wide text-xs shrink-0";
                banner.classList.remove('hidden');
            }
        } else if (item.t === 'speed') {
            if (banner) {
                banner.innerText = "⚡ SPEED CHALLENGE!";
                banner.className = "text-center py-1 px-4 rounded-full font-bold text-white shadow-md w-fit bg-blue-500 block uppercase tracking-wide text-xs shrink-0";
                banner.classList.remove('hidden');
            }
            if (timerBox) timerBox.classList.remove('hidden');
            this.startClock();
        }
    },

    startClock() {
        let dur = 10.0;
        if (typeof settingsManager !== 'undefined') {
            const s = settingsManager.get();
            if (s.timerDuration) dur = parseFloat(s.timerDuration);
        }
        this.clock = dur;
        const el = document.getElementById('timer-val');
        if (el) el.innerText = this.clock.toFixed(1);
        if (this.timer) clearInterval(this.timer);
        this.timer = setInterval(() => {
            this.clock = Math.max(0, this.clock - 0.1);
            if (this.clock <= 0) { clearInterval(this.timer); this.timer = null; }
            if (el) el.innerText = this.clock.toFixed(1);
        }, 100);
    },

    updateProgress(current, total, prefix = 'Card') {
        const progText = document.getElementById('progress-text');
        const pBar = document.getElementById('progress-bar');
        if (progText) progText.innerText = `${prefix} ${current} of ${total}`;
        if (pBar && total > 0) pBar.style.width = `${(current / total) * 100}%`;
    },

    evaluate(isCorrect) {
        if (typeof dataset === 'undefined' || dataset.length === 0) return;
        const currentItemIdx = (this.order && this.order[this.idx] !== undefined) ? this.order[this.idx] : this.idx;
        const item = dataset[currentItemIdx];
        if (!item) return;
        const type = item.t;
        if (isCorrect) {
            this.stats.ok++;
            let points = (type === 'golden') ? 10 : (type === 'speed' && this.clock > 0) ? 5 : 2;
            this.score += points;
            const feedbacks = ['Excellent! 🌟', 'Awesome! 🏆', 'Hero! 🧠', 'Great Job! ❤️⭐', 'Very Good! ⭐', 'Genius! 🎓', 'Perfect! 👏', '⭐⭐⭐⭐⭐', '❤️❤️❤️❤️❤️'];
            const randomFeedback = feedbacks[Math.floor(Math.random() * feedbacks.length)];
            this.triggerFeedback(randomFeedback, '#10b981', true);

            if (this.isReviewMode) {
                this.reviewIdx++;
                if (this.reviewIdx < this.reviewQueue.length) {
                    setTimeout(() => this.renderReview(), 600);
                } else {
                    this.isReviewMode = false;
                    setTimeout(() => this.finishToSummary(), 600);
                }
                const scoreEl = document.getElementById('score-val'); if (scoreEl) scoreEl.innerText = this.score;
                return;
            }

            const third1 = Math.floor(dataset.length / 3) - 1;
            const third2 = Math.floor((dataset.length * 2) / 3) - 1;
            if (this.enableGameBreaks && this.idx === third1 && !this.hasPlayedGame1 && dataset.length >= 3) {
                setTimeout(() => this.jumpTo('transition_1'), 600);
            } else if (this.enableGameBreaks && this.idx === third2 && !this.hasPlayedGame2 && dataset.length >= 3) {
                setTimeout(() => this.jumpTo('transition_2'), 600);
            } else if (this.enableGameBreaks && this.idx === dataset.length - 1 && !this.hasPlayedGame3 && dataset.length >= 3) {
                setTimeout(() => this.jumpTo('transition_3'), 600);
            } else {
                if (this.idx < dataset.length - 1) { this.idx++; setTimeout(() => this.render(), 600); }
                else { setTimeout(() => this.playWordwall(), 600); }
            }
        } else {
            this.stats.err++;
            if (!this.mistakeIndices.includes(currentItemIdx)) {
                this.mistakeIndices.push(currentItemIdx);
            }
            let points = (type === 'danger') ? -5 : -2;
            this.score += points; if (this.score < 0) this.score = 0;
            this.triggerFeedback(type === 'danger' ? '-5 Warning! ⚠️' : '-2 Needs Practice', '#f43f5e', true);
            Sound.fail();

            if (this.isReviewMode) {
                this.reviewIdx++;
                if (this.reviewIdx < this.reviewQueue.length) {
                    setTimeout(() => this.renderReview(), 600);
                } else {
                    this.isReviewMode = false;
                    setTimeout(() => this.finishToSummary(), 600);
                }
                return;
            }

            if (this.idx < dataset.length - 1) {
                const third1 = Math.floor(dataset.length / 3) - 1;
                const third2 = Math.floor((dataset.length * 2) / 3) - 1;
                if (this.enableGameBreaks && this.idx === third1 && !this.hasPlayedGame1 && dataset.length >= 3) {
                    setTimeout(() => this.jumpTo('transition_1'), 600);
                } else if (this.enableGameBreaks && this.idx === third2 && !this.hasPlayedGame2 && dataset.length >= 3) {
                    setTimeout(() => this.jumpTo('transition_2'), 600);
                } else if (this.enableGameBreaks && this.idx === dataset.length - 1 && !this.hasPlayedGame3 && dataset.length >= 3) {
                    setTimeout(() => this.jumpTo('transition_3'), 600);
                } else {
                    this.idx++; setTimeout(() => this.render(), 600);
                }
            } else {
                if (this.enableGameBreaks && !this.hasPlayedGame3 && dataset.length >= 3) {
                    setTimeout(() => this.jumpTo('transition_3'), 600);
                } else {
                    setTimeout(() => this.playWordwall(), 600);
                }
            }
        }
        const scoreEl = document.getElementById('score-val'); if (scoreEl) scoreEl.innerText = this.score;
    },

    startReview() {
        if (this.mistakeIndices.length === 0 || typeof dataset === 'undefined') return;
        this.isReviewMode = true;
        this.reviewQueue = [...this.mistakeIndices];
        this.reviewIdx = 0;
        this.renderReview();
    },

    renderReview() {
        if (this.reviewIdx >= this.reviewQueue.length) {
            this.isReviewMode = false;
            this.finishToSummary();
            return;
        }
        const origIndex = this.reviewQueue[this.reviewIdx];
        const item = dataset[origIndex];
        const area = document.getElementById('word-display-area');
        this.hideAll();
        const stage = document.getElementById('learning-stage'); if (stage) stage.classList.remove('hidden');
        this.updateProgress(this.reviewIdx + 1, this.reviewQueue.length, 'Mistake Review');

        if (area) {
            this.renderWordInto(area, item);
            const plain = this.getPlainWord(item);
            area.setAttribute('aria-label', `Review Card ${this.reviewIdx + 1} of ${this.reviewQueue.length}: ${plain}`);
            area.tabIndex = -1;
            area.focus({ preventScroll: true });
        }
    },

    toggleGameBreaks(enabled) {
        this.enableGameBreaks = enabled;
        if (typeof settingsManager !== 'undefined') {
            settingsManager.save({ gameBreaksEnabled: enabled });
        }
    },

    prev() {
        if (this.isReviewMode) {
            if (this.reviewIdx > 0) { this.reviewIdx--; this.renderReview(); }
        } else {
            if (this.idx > 0) { this.idx--; this.render(); }
        }
    },

    triggerFeedback(txt, color, playSound = false) {
        if (playSound) {
            if (typeof Sound !== 'undefined') Sound.playChime();
            if (typeof confetti === 'function') confetti({ particleCount: 40, spread: 50, origin: { y: 0.2 } });
        }
        const badge = document.getElementById('badge-ui'); if (!badge) return;
        badge.innerText = txt; badge.style.color = color; badge.style.borderColor = color; badge.classList.add('active'); badge.style.opacity = '1';
        if (this.feedbackTimer) clearTimeout(this.feedbackTimer);
        this.feedbackTimer = setTimeout(() => {
            badge.classList.remove('active');
            badge.style.opacity = '0';
            this.feedbackTimer = null;
        }, 1200);
    },

    setGameResumeState(btnId, isFinished, targetText = 'Continue Reading 📖', defaultText = 'Skip & Read ⏭️') {
        const btn = document.getElementById(btnId);
        if (!btn) return;
        const defaultTextColors = {
            'xo-resume-btn': 'text-teal-900',
            'c4-resume-btn': 'text-blue-900',
            'memory-resume-btn': 'text-purple-900',
            'riddles-resume-btn': 'text-purple-900'
        };
        if (isFinished) {
            btn.textContent = targetText;
            btn.classList.add('animate-bounce', 'bg-emerald-400', 'text-white');
            btn.classList.remove('bg-yellow-400', 'text-teal-900', 'text-blue-900', 'text-purple-900');
        } else {
            btn.textContent = defaultText;
            btn.classList.remove('animate-bounce', 'bg-emerald-400', 'text-white');
            btn.classList.add('bg-yellow-400', defaultTextColors[btnId]);
        }
    },

    showGameTransition(gameNum) {
        this.pendingGame = gameNum;
        const stage = document.getElementById('game-transition-stage'); if (stage) stage.classList.remove('hidden');
        let gameName = "";
        if (gameNum === 1) gameName = "Tic-Tac-Toe";
        else if (gameNum === 2) gameName = "Connect 4";
        else if (gameNum === 3) gameName = "Wordwall Arena";
        const titleEl = document.getElementById('transition-game-name'); if (titleEl) titleEl.innerText = gameName;
    },

    enterGame() {
        if (this.pendingGame === 1) this.jumpTo('game_xo');
        else if (this.pendingGame === 2) this.jumpTo('game_c4');
        else if (this.pendingGame === 3) this.playWordwall();
    },

    resume(gameNum) {
        if (gameNum === 1) this.hasPlayedGame1 = true;
        if (gameNum === 2) this.hasPlayedGame2 = true;
        if (gameNum === 3) { this.hasPlayedGame3 = true; this.playWordwall(); return; }
        if (typeof dataset !== 'undefined' && this.idx < dataset.length - 1) {
            this.idx++;
            const wordIdx = (this.order && this.order[this.idx] !== undefined) ? this.order[this.idx] : this.idx;
            this.jumpTo(`word_${wordIdx}`);
        }
        else { this.playWordwall(); }
    },

    playWordwall() { this.jumpTo('ww_box'); },

    revealWord(index, triggerType) {
        if (typeof dataset === 'undefined' || !dataset[index]) return;
        this.currentActiveIndex = index;
        const item = dataset[index];
        const infoEl = document.getElementById('revealed-info'); if (infoEl) infoEl.innerText = `${item.info || 'Card'} • #${index + 1}`;
        const giantSpan = document.getElementById('giant-arabic-word');
        if (giantSpan) {
            this.renderWordInto(giantSpan, item);
        }
        const overlay = document.getElementById('word-overlay');
        if (overlay) {
            overlay.classList.remove('hidden');
            const closeBtn = overlay.querySelector('button');
            if (closeBtn) closeBtn.focus();
        }
        if ((triggerType === 'box' || triggerType === 'curtain') && typeof wordwallRoom !== 'undefined') {
            const boxEl = document.getElementById(`box-${index}`); if (boxEl) boxEl.classList.add('opened');
            wordwallRoom.openedBoxes.add(index);
        }
    },

    closeOverlay() { const overlay = document.getElementById('word-overlay'); if (overlay) overlay.classList.add('hidden'); },

    gradeResult(isCorrect) {
        if (isCorrect) { this.score += 5; this.stats.ok++; this.triggerFeedback('Magnificent! ❤️⭐', '#10b981', true); }
        else {
            this.stats.err++;
            if (this.currentActiveIndex !== null && !this.mistakeIndices.includes(this.currentActiveIndex)) {
                this.mistakeIndices.push(this.currentActiveIndex);
            }
            this.triggerFeedback('Keep Trying! ⭐', '#f43f5e', false);
        }
        const scoreEl = document.getElementById('score-val'); if (scoreEl) scoreEl.innerText = this.score;
        this.closeOverlay();
    },

    finishToSummary() {
        this.hideAll();
        const summary = document.getElementById('summary-screen'); if (summary) summary.classList.remove('hidden');
        const finalScore = document.getElementById('final-score'); if (finalScore) finalScore.innerText = this.score;
        const reviewBtn = document.getElementById('btn-review-mistakes');
        if (reviewBtn) {
            if (this.mistakeIndices.length > 0) reviewBtn.classList.remove('hidden');
            else reviewBtn.classList.add('hidden');
        }
        this.drawChart();
    },

    drawChart() {
        if (typeof Chart === 'undefined') return;
        if (this.chartInstance) this.chartInstance.destroy();
        const canvas = document.getElementById('summaryChart'); if (!canvas) return;
        const ctx = canvas.getContext('2d');
        this.chartInstance = new Chart(ctx, {
            type: 'doughnut',
            data: { labels: ['Correct', 'Mistakes'], datasets: [{ data: [this.stats.ok, this.stats.err], backgroundColor: ['#10b981', '#f43f5e'], borderWidth: 0, hoverOffset: 6 }] },
            options: { maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { font: { family: 'Fredoka', weight: 'bold' } } } } }
        });
    }
};

// تشغيل التطبيق تلقائياً عند جاهزية DOM
if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        if (typeof app !== 'undefined') {
            app.init();
        }
    });
}

/* ==========================================================================
   MODULE: games-wordwall.js
   ========================================================================== */

const wordwallRoom = {
    mode: 'box', openedBoxes: new Set(),
    init() {
        this.renderBoxes();
        if (typeof wheelGame !== 'undefined') wheelGame.init();
        if (typeof cardsGame !== 'undefined') cardsGame.init();
        if (typeof ladderGame !== 'undefined') ladderGame.init();
    },
    switchMode(mode) {
        this.mode = mode;
        document.querySelectorAll('#wordwall-stage .game-tab').forEach(tab => tab.classList.remove('active'));
        const activeTab = document.getElementById(`tab-${mode}`); if (activeTab) activeTab.classList.add('active');
        const boxC = document.getElementById('ww-box-container');
        const wheelC = document.getElementById('ww-wheel-container');
        const cardsC = document.getElementById('ww-cards-container');
        const ladderC = document.getElementById('ww-ladder-container');
        if (boxC) boxC.classList.add('hidden');
        if (wheelC) wheelC.classList.add('hidden');
        if (cardsC) cardsC.classList.add('hidden');
        if (ladderC) ladderC.classList.add('hidden');

        if (mode === 'box' || mode === 'curtain') {
            if (boxC) {
                boxC.classList.remove('hidden');
                const promptEl = document.getElementById('box-prompt-text');
                if (promptEl) {
                    promptEl.innerText = (mode === 'curtain')
                        ? 'Tap any curtain to reveal the hidden word! 🎭'
                        : 'Tap any box to reveal the hidden word! 🎁';
                }
                this.renderBoxes();
            }
        }
        else if (mode === 'ladder' && ladderC) {
            ladderC.classList.remove('hidden');
            if (typeof ladderGame !== 'undefined') ladderGame.init();
        }
        else if (mode === 'wheel' && wheelC) {
            wheelC.classList.remove('hidden');
            if (typeof wheelGame !== 'undefined') setTimeout(() => wheelGame.draw(), 50);
        }
        else if (mode === 'cards' && cardsC) {
            cardsC.classList.remove('hidden');
        }
        const navSelect = document.getElementById('example-navigator');
        if (navSelect) navSelect.value = `ww_${mode}`;
    },
    renderBoxes() {
        const container = document.getElementById('box-grid');
        if (!container || typeof dataset === 'undefined') return;
        container.textContent = '';
        const isCurtain = (this.mode === 'curtain');
        const labelType = isCurtain ? 'Curtain' : 'Box';

        dataset.forEach((item, index) => {
            const box = document.createElement('button');
            box.type = 'button';
            box.className = `wordwall-box relative aspect-square w-full flex items-center justify-center rounded-2xl ${isCurtain ? 'curtain-box' : ''} ${this.openedBoxes.has(index) ? 'opened opacity-50 grayscale-[50%]' : ''}`;
            box.id = `box-${index}`;
            box.setAttribute('aria-label', `${labelType} ${index + 1}${this.openedBoxes.has(index) ? ', opened' : ', closed'}`);
            const color = wordwallColors[index % wordwallColors.length];
            
            if (isCurtain) {
                box.innerHTML = `
                    <div class="wordwall-box-inner relative w-full h-full duration-500" aria-hidden="true">
                        <div class="box-front rounded-2xl flex flex-col items-center justify-center text-white border-[3px] border-amber-300 shadow-lg hover:scale-105 transition-transform overflow-hidden curtain-bg" style="--curtain-color: ${color};">
                            <div class="curtain-drape"></div>
                            <span class="text-4xl sm:text-5xl lg:text-6xl font-black drop-shadow-md z-10">${index + 1}</span>
                            <span class="text-[10px] sm:text-xs font-bold uppercase tracking-wider mt-2 bg-amber-400 text-slate-900 px-3 py-0.5 rounded-full shadow-sm z-10">Reveal</span>
                        </div>
                        <div class="box-back rounded-2xl flex items-center justify-center text-slate-400 bg-slate-100 border-[3px] border-slate-300 shadow-inner"><span class="text-4xl">✔</span></div>
                    </div>`;
            } else {
                box.innerHTML = `
                    <div class="wordwall-box-inner relative w-full h-full duration-500" aria-hidden="true">
                        <div class="box-front rounded-2xl flex flex-col items-center justify-center text-white border-[3px] border-white/40 shadow-lg hover:scale-105 transition-transform" style="background-color: ${color}">
                            <span class="text-4xl sm:text-5xl lg:text-6xl font-black drop-shadow-md">${index + 1}</span>
                            <span class="text-[10px] sm:text-xs font-bold uppercase tracking-wider mt-2 bg-black/20 px-3 py-1 rounded-full backdrop-blur-sm">Open</span>
                        </div>
                        <div class="box-back rounded-2xl flex items-center justify-center text-slate-400 bg-slate-100 border-[3px] border-slate-300 shadow-inner"><span class="text-4xl">✔</span></div>
                    </div>`;
            }
            
            box.onclick = () => {
                if (!this.openedBoxes.has(index)) {
                    box.setAttribute('aria-label', `${labelType} ${index + 1}, opened`);
                    app.revealWord(index, isCurtain ? 'curtain' : 'box');
                }
            };
            container.appendChild(box);
        });
    },
    reset() {
        this.openedBoxes.clear();
        this.renderBoxes();
        this.switchMode('box');
        if (typeof cardsGame !== 'undefined') cardsGame.init();
        if (typeof ladderGame !== 'undefined') ladderGame.init();
    }
};

const wheelGame = {
    canvas: null, ctx: null, angle: 0, angularVelocity: 0, friction: 0.985, isSpinning: false, animFrameId: null, revealTimer: null,
    init() {
        this.reset();
        this.canvas = document.getElementById('wheel-canvas');
        if (!this.canvas) return;
        this.ctx = this.canvas.getContext('2d');
        this.draw();
    },
    reset() {
        if (this.animFrameId) { cancelAnimationFrame(this.animFrameId); this.animFrameId = null; }
        if (this.revealTimer) { clearTimeout(this.revealTimer); this.revealTimer = null; }
        this.isSpinning = false;
        this.angularVelocity = 0;
    },
    draw() {
        if (!this.canvas || !this.ctx || typeof dataset === 'undefined' || dataset.length === 0) return;
        const numSlices = dataset.length; const sliceAngle = (Math.PI * 2) / numSlices; const radius = this.canvas.width / 2;
        const fontSize = numSlices > 24 ? 'bold 13px Fredoka' : 'bold 17px Fredoka';
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.save(); this.ctx.translate(radius, radius); this.ctx.rotate(this.angle);
        for (let i = 0; i < numSlices; i++) {
            const col = wordwallColors[i % wordwallColors.length];
            this.ctx.beginPath(); this.ctx.moveTo(0, 0); this.ctx.arc(0, 0, radius - 8, i * sliceAngle, (i + 1) * sliceAngle); this.ctx.closePath();
            this.ctx.fillStyle = col; this.ctx.fill(); this.ctx.lineWidth = 2; this.ctx.strokeStyle = '#ffffff'; this.ctx.stroke();
            this.ctx.save(); this.ctx.rotate(i * sliceAngle + sliceAngle / 2);
            const red = parseInt(col.slice(1, 3), 16) / 255;
            const green = parseInt(col.slice(3, 5), 16) / 255;
            const blue = parseInt(col.slice(5, 7), 16) / 255;
            const lum = 0.2126 * red + 0.7152 * green + 0.0722 * blue;
            this.ctx.fillStyle = lum > 0.45 ? '#1a1a2e' : '#ffffff';
            this.ctx.font = fontSize; this.ctx.textAlign = 'right'; this.ctx.fillText((i + 1).toString(), radius - 25, 5); this.ctx.restore();
        }
        this.ctx.beginPath(); this.ctx.arc(0, 0, 30, 0, Math.PI * 2); this.ctx.fillStyle = '#ffffff'; this.ctx.fill(); this.ctx.lineWidth = 4; this.ctx.strokeStyle = '#34d399'; this.ctx.stroke();
        this.ctx.restore();
    },
    spin() {
        if (this.isSpinning || typeof dataset === 'undefined' || dataset.length === 0) return;
        this.reset();
        this.isSpinning = true;
        this.angularVelocity = Math.random() * 0.4 + 0.4;
        this.animate();
    },
    animate() {
        if (this.angularVelocity > 0.002) {
            this.angle += this.angularVelocity;
            this.angularVelocity *= this.friction;
            this.draw();
            this.animFrameId = requestAnimationFrame(() => this.animate());
        } else {
            this.isSpinning = false;
            this.angularVelocity = 0;
            this.animFrameId = null;
            this.calculateStoppingSlice();
        }
    },
    calculateStoppingSlice() {
        if (typeof dataset === 'undefined' || dataset.length === 0) return;
        const numSlices = dataset.length; const sliceAngle = (Math.PI * 2) / numSlices;
        let normalizedAngle = (Math.PI * 2.5 - (this.angle % (Math.PI * 2))) % (Math.PI * 2);
        let sliceIndex = Math.floor(normalizedAngle / sliceAngle) % numSlices;
        const status = document.getElementById('wheel-status');
        if (status) status.innerText = `Wheel landed on Word ${sliceIndex + 1}`;
        this.revealTimer = setTimeout(() => {
            if (typeof app !== 'undefined') app.revealWord(sliceIndex, 'wheel');
            this.revealTimer = null;
        }, 400);
    }
};

const cardsGame = {
    cardDeckIndices: [], isAnimating: false, animTimer: null,
    init() {
        if (this.animTimer) { clearTimeout(this.animTimer); this.animTimer = null; }
        this.isAnimating = false;
        if (typeof dataset === 'undefined' || dataset.length === 0) return;
        this.cardDeckIndices = Array.from({ length: dataset.length }, (_, i) => i);
        this.shuffleDeck();
        const activeCard = document.getElementById('active-deck-card');
        if (activeCard) activeCard.onclick = () => this.dealNextCard();
    },
    shuffleDeck() {
        if (typeof app !== 'undefined' && typeof app.shuffle === 'function') {
            app.shuffle(this.cardDeckIndices);
        } else {
            for (let i = this.cardDeckIndices.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [this.cardDeckIndices[i], this.cardDeckIndices[j]] = [this.cardDeckIndices[j], this.cardDeckIndices[i]];
            }
        }
    },
    dealNextCard() {
        if (this.isAnimating) return;
        if (this.cardDeckIndices.length === 0) {
            if (typeof app !== 'undefined') app.triggerFeedback('Reshuffling Deck... 🃏', '#3b82f6');
            this.init();
            return;
        }
        this.isAnimating = true;
        const activeCardIndex = this.cardDeckIndices.pop();
        const activeUIElement = document.getElementById('active-deck-card');
        if (activeUIElement) {
            activeUIElement.style.transform = 'translateY(-120px) rotateY(360deg) scale(1.15)';
            activeUIElement.style.opacity = '0.1';
            this.animTimer = setTimeout(() => {
                activeUIElement.style.transform = 'none';
                activeUIElement.style.opacity = '1';
                this.isAnimating = false;
                this.animTimer = null;
                if (typeof app !== 'undefined') app.revealWord(activeCardIndex, 'cards');
            }, 600);
        } else {
            this.isAnimating = false;
            if (typeof app !== 'undefined') app.revealWord(activeCardIndex, 'cards');
        }
    }
};

const ladderGame = {
    targetSteps: 5,
    currentStep: 0,
    wordQueue: [],
    queueIdx: 0,
    currentWordItem: null,
    isCompleted: false,

    init() {
        if (typeof dataset === 'undefined' || dataset.length === 0) return;
        this.currentStep = 0;
        this.isCompleted = false;
        this.queueIdx = 0;
        this.buildQueue();
        this.renderLadder();
        this.showCurrentWord();
        const resetBtn = document.getElementById('ladder-reset-btn');
        if (resetBtn) resetBtn.textContent = 'Restart Round 🔄';
    },

    setTarget(steps) {
        this.targetSteps = steps;
        const btn5 = document.getElementById('ladder-btn-5');
        const btn10 = document.getElementById('ladder-btn-10');
        if (btn5) {
            btn5.className = (steps === 5)
                ? 'py-1 px-3.5 rounded-full font-bold text-xs bg-emerald-500 text-white shadow-sm transition-all'
                : 'py-1 px-3.5 rounded-full font-bold text-xs bg-slate-100 text-slate-700 hover:bg-slate-200 transition-all';
        }
        if (btn10) {
            btn10.className = (steps === 10)
                ? 'py-1 px-3.5 rounded-full font-bold text-xs bg-emerald-500 text-white shadow-sm transition-all'
                : 'py-1 px-3.5 rounded-full font-bold text-xs bg-slate-100 text-slate-700 hover:bg-slate-200 transition-all';
        }
        this.init();
    },

    buildQueue() {
        this.wordQueue = Array.from({ length: dataset.length }, (_, i) => i);
        if (typeof app !== 'undefined' && typeof app.shuffle === 'function') {
            app.shuffle(this.wordQueue);
        } else {
            for (let i = this.wordQueue.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [this.wordQueue[i], this.wordQueue[j]] = [this.wordQueue[j], this.wordQueue[i]];
            }
        }
    },

    showCurrentWord() {
        if (typeof dataset === 'undefined') return;
        if (this.queueIdx >= this.wordQueue.length) {
            this.buildQueue();
            this.queueIdx = 0;
        }
        const wordIndex = this.wordQueue[this.queueIdx];
        this.currentWordItem = dataset[wordIndex];

        const wordDisplay = document.getElementById('ladder-word-display');
        if (wordDisplay && this.currentWordItem && typeof app !== 'undefined') {
            app.renderWordInto(wordDisplay, this.currentWordItem);
            if (this.currentWordItem.info) {
                const infoEl = document.createElement('div');
                infoEl.className = 'mt-2 text-xs sm:text-sm font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-full';
                infoEl.textContent = this.currentWordItem.info;
                wordDisplay.appendChild(infoEl);
            }
        }

        this.announceStatus();
    },

    announceStatus() {
        const liveRegion = document.getElementById('ladder-live-announcer');
        if (liveRegion && this.currentWordItem && typeof app !== 'undefined') {
            const plainWord = app.getPlainWord(this.currentWordItem);
            liveRegion.textContent = `الدرجة ${this.currentStep}: ${plainWord}`;
        }
    },

    renderLadder() {
        const rungsContainer = document.getElementById('ladder-rungs');
        if (!rungsContainer) return;
        rungsContainer.innerHTML = '';

        for (let s = this.targetSteps; s >= 1; s--) {
            const rung = document.createElement('div');
            const isReached = this.currentStep >= s;
            const isCurrent = this.currentStep === s;
            const isCrown = (s === this.targetSteps);

            rung.className = `ladder-rung flex items-center justify-between px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl transition-all duration-300 font-bold text-xs sm:text-sm ${
                isCrown ? (isReached ? 'bg-amber-400 text-slate-900 border-2 border-amber-300 shadow-lg scale-105' : 'bg-amber-100 text-amber-800 border-2 border-amber-300/60') :
                isReached ? 'bg-emerald-500 text-white shadow-md' :
                'bg-white/60 text-slate-400 border border-slate-200'
            } ${isCurrent ? 'ring-4 ring-emerald-300 scale-102 font-black' : ''}`;
            
            rung.id = `ladder-rung-${s}`;
            rung.setAttribute('aria-label', `Step ${s}${isReached ? ', reached' : ''}${isCrown ? ', top crown' : ''}`);

            rung.innerHTML = `
                <div class="flex items-center gap-2">
                    <span class="w-6 h-6 rounded-full flex items-center justify-center text-xs ${isReached ? 'bg-white text-emerald-700 font-black' : 'bg-slate-200 text-slate-600'}">${s}</span>
                    <span>${isCrown ? '👑 القمة' : `الدرجة ${s}`}</span>
                </div>
                <span class="text-sm">${isReached ? (isCrown ? '🏆' : '✔') : '🔒'}</span>
            `;
            rungsContainer.appendChild(rung);
        }

        const stepCountEl = document.getElementById('ladder-step-indicator');
        if (stepCountEl) {
            stepCountEl.textContent = `الدرجة ${this.currentStep} من ${this.targetSteps}`;
        }
    },

    grade(isCorrect) {
        if (this.isCompleted) return;

        if (isCorrect) {
            this.currentStep++;
            Sound.stepUp(this.currentStep, this.targetSteps);
            this.renderLadder();

            if (this.currentStep >= this.targetSteps) {
                this.isCompleted = true;
                fireCelebration();
                Sound.playChime();
                const wordDisplay = document.getElementById('ladder-word-display');
                if (wordDisplay) {
                    wordDisplay.innerHTML = `
                        <div class="flex flex-col items-center justify-center p-4 text-center animate-bounce">
                            <span class="text-6xl sm:text-7xl">👑</span>
                            <h3 class="text-2xl sm:text-3xl font-black text-amber-500 mt-2">ما شاء الله! بلغت القمة!</h3>
                            <p class="text-sm text-slate-600 mt-1 font-bold">أتممت درجات الارتقاء بنجاح تام</p>
                        </div>
                    `;
                }
                const liveRegion = document.getElementById('ladder-live-announcer');
                if (liveRegion) {
                    liveRegion.textContent = `أحسنت! بلغت القمة والدرجة ${this.targetSteps}`;
                }
                return;
            }
        } else {
            this.currentStep = Math.max(0, this.currentStep - 1);
            Sound.stepDown();
            this.renderLadder();
        }

        this.queueIdx++;
        this.showCurrentWord();
    },

    reset() {
        this.init();
    }
};

/* ==========================================================================
   MODULE: games-board.js
   ========================================================================== */

const xoGame = {
    board: ['', '', '', '', '', '', '', '', ''], currentPlayer: 'X', gameActive: true,
    init() {
        const container = document.getElementById('xo-board'); if (!container) return; container.textContent = '';
        for (let i = 0; i < 9; i++) {
            let cell = document.createElement('button');
            cell.type = 'button';
            cell.className = 'xo-cell-new shadow-[0_4px_0_#047857] active:shadow-none active:translate-y-1';
            cell.setAttribute('aria-label', `Cell ${i + 1}, empty`);
            cell.onclick = () => {
                if (typeof gameAI !== 'undefined' && gameAI.mode === 'computer' && this.currentPlayer === 'O') return;
                this.play(i, cell);
            };
            container.appendChild(cell);
        }
    },
    play(idx, cell) {
        if (this.board[idx] !== '' || !this.gameActive) return;
        this.board[idx] = this.currentPlayer;
        cell.innerText = this.currentPlayer;
        cell.setAttribute('aria-label', `Cell ${idx + 1}, ${this.currentPlayer}`);
        cell.classList.add(this.currentPlayer === 'X' ? 'xo-x' : 'xo-o');
        let winLine = this.checkWin();
        if (winLine) {
            const status = document.getElementById('xo-status'); if (status) { status.innerText = `${this.currentPlayer} Won! 🎉`; status.classList.add('text-yellow-300'); }
            this.gameActive = false; fireCelebration();
            if (typeof app !== 'undefined') app.setGameResumeState('xo-resume-btn', true, "Continue Reading 📖");
            const container = document.getElementById('xo-board');
            if (container) { const cells = container.children; winLine.forEach(i => { if (cells[i]) cells[i].classList.add('win-anim'); }); }
            return;
        }
        if (!this.board.includes('')) {
            const status = document.getElementById('xo-status'); if (status) status.innerText = "Draw Game! 🤝";
            this.gameActive = false;
            if (typeof app !== 'undefined') app.setGameResumeState('xo-resume-btn', true, "Continue Reading 📖");
            return;
        }
        this.currentPlayer = this.currentPlayer === 'X' ? 'O' : 'X';
        const isComp = typeof gameAI !== 'undefined' && gameAI.mode === 'computer';
        const status = document.getElementById('xo-status');
        if (status) {
            status.innerText = (isComp && this.currentPlayer === 'O') ? 'الكمبيوتر يفكر... 🤖' : `Player ${this.currentPlayer} Turn`;
            status.classList.remove('text-yellow-300');
        }
        if (isComp && this.currentPlayer === 'O' && this.gameActive) {
            setTimeout(() => { if (typeof gameAI !== 'undefined') gameAI.makeXOMove(); }, 450);
        }
    },
    checkWin() {
        const winCond = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
        for (let winningCombo of winCond) { if (this.board[winningCombo[0]] && this.board[winningCombo[0]] === this.board[winningCombo[1]] && this.board[winningCombo[1]] === this.board[winningCombo[2]]) return winningCombo; }
        return null;
    },
    reset() {
        this.board = ['', '', '', '', '', '', '', '', '']; this.currentPlayer = 'X'; this.gameActive = true;
        const status = document.getElementById('xo-status'); if (status) { status.innerText = 'Player X Turn!'; status.classList.remove('text-yellow-300'); }
        if (typeof app !== 'undefined') app.setGameResumeState('xo-resume-btn', false, '', "Skip & Read ⏭️");
        if (typeof gameAI !== 'undefined') gameAI.updateUI();
        this.init();
    }
};

const c4Game = {
    rows: 6, cols: 7, board: [], currentPlayer: 'red', gameActive: true,
    init() {
        const container = document.getElementById('c4-board-container'); if (!container) return; container.innerHTML = '';
        this.board = Array(this.rows).fill(null).map(() => Array(this.cols).fill(null));
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                let cell = document.createElement('button');
                cell.type = 'button';
                cell.className = 'c4-cell-new';
                cell.id = `c4-${r}-${c}`;
                cell.setAttribute('aria-label', `Row ${r + 1}, Column ${c + 1}`);
                cell.onclick = () => {
                    if (typeof gameAI !== 'undefined' && gameAI.mode === 'computer' && this.currentPlayer === 'yellow') return;
                    this.drop(c);
                };
                container.appendChild(cell);
            }
        }
        if (typeof gameAI !== 'undefined') gameAI.updateUI();
    },
    drop(col) {
        if (!this.gameActive) return;
        for (let row = this.rows - 1; row >= 0; row--) {
            if (!this.board[row][col]) {
                this.board[row][col] = this.currentPlayer;
                let cell = document.getElementById(`c4-${row}-${col}`);
                if (cell) {
                    cell.classList.add(this.currentPlayer === 'red' ? 'c4-red' : 'c4-yellow');
                    cell.setAttribute('aria-label', `Row ${row + 1}, Column ${col + 1}, ${this.currentPlayer}`);
                }
                if (cell) {
                    let piece = document.createElement('div'); piece.className = `absolute inset-0 rounded-full w-full h-full ${this.currentPlayer === 'red' ? 'c4-red-new' : 'c4-yellow-new'}`; cell.appendChild(piece);
                }
                let winCells = this.checkWin(row, col);
                if (winCells) {
                    let winnerName = this.currentPlayer === 'red' ? 'Red 🔴' : (typeof gameAI !== 'undefined' && gameAI.mode === 'computer' ? 'الكمبيوتر 🤖' : 'Yellow 🟡');
                    const status = document.getElementById('c4-status'); if (status) { status.textContent = `${winnerName} Wins! 🎉`; status.className = 'text-yellow-300'; }
                    this.gameActive = false;
                    if (typeof app !== 'undefined') app.setGameResumeState('c4-resume-btn', true, "Continue Reading 📖");
                    setTimeout(() => {
                        if (this.currentPlayer === 'red') fireCelebration();
                        winCells.forEach(([wr, wc]) => {
                            const cEl = document.getElementById(`c4-${wr}-${wc}`); if (cEl && cEl.firstElementChild) cEl.firstElementChild.classList.add('win-anim');
                        });
                    }, 500);
                    return;
                }
                // Check draw
                if (this.board.every(r => r.every(c => c !== null))) {
                    const status = document.getElementById('c4-status'); if (status) status.textContent = "Draw Game! 🤝";
                    this.gameActive = false;
                    if (typeof app !== 'undefined') app.setGameResumeState('c4-resume-btn', true, "Continue Reading 📖");
                    return;
                }
                this.currentPlayer = this.currentPlayer === 'red' ? 'yellow' : 'red';
                const isComp = typeof gameAI !== 'undefined' && gameAI.mode === 'computer';
                const status = document.getElementById('c4-status');
                if (status) {
                    status.innerText = (isComp && this.currentPlayer === 'yellow') ? 'الكمبيوتر يفكر... 🤖' : (this.currentPlayer === 'red' ? "Red's Turn 🔴" : "Yellow's Turn 🟡");
                }
                if (isComp && this.currentPlayer === 'yellow' && this.gameActive) {
                    setTimeout(() => { if (typeof gameAI !== 'undefined') gameAI.makeC4Move(); }, 450);
                }
                return;
            }
        }
    },
    checkWin(row, col) {
        const color = this.board[row][col];
        const check = (dr, dc) => {
            let count = 0; let winningCells = [];
            for (let i = -3; i <= 3; i++) {
                let nr = row + i * dr, nc = col + i * dc;
                if (nr >= 0 && nr < this.rows && nc >= 0 && nc < this.cols && this.board[nr][nc] === color) {
                    winningCells.push([nr, nc]); count++; if (count >= 4) return winningCells.slice(-4);
                } else { count = 0; winningCells = []; }
            }
            return null;
        };
        return check(0, 1) || check(1, 0) || check(1, 1) || check(1, -1);
    },
    reset() {
        this.currentPlayer = 'red'; this.gameActive = true;
        const status = document.getElementById('c4-status'); if (status) status.innerText = `Your Turn! Drop a red piece`;
        if (typeof app !== 'undefined') app.setGameResumeState('c4-resume-btn', false, '', "Skip & Read ⏭️");
        this.init();
    }
};

/* ==========================================================================
   MODULE: game-ai.js
   ========================================================================== */

/**
 * Game AI Module - وحدة الخصم الآلي ومستويات اللعب لألعاب الاستراحة
 * المنظومة: نور البيان
 *
 * الخصائص:
 * 1. وضع اللعب: ضد الكمبيوتر (🤖 ضد الكمبيوتر) / مع المعلم (👨‍🏫 مع المعلم)
 * 2. مستويات الصعوبة: سهل (😊 حركات عفوية ممتعة) / ذكي (🧠 حركات متوازنة بحذر)
 * 3. استقلالية تامة: ملف منفصل يُستدعى اختيارياً دون تضخيم المنطق الأساسي للألعاب
 */

const gameAI = {
    mode: 'computer', // 'computer' (ضد الكمبيوتر) | 'teacher' (مع المعلم)
    difficulty: 'easy', // 'easy' (سهل عشوائي) | 'smart' (ذكي خفيف)

    // تبديل وضع اللعب (كمبيوتر / معلم)
    toggleMode(gameType) {
        this.mode = this.mode === 'computer' ? 'teacher' : 'computer';
        this.updateUI();
        if (gameType === 'xo' && typeof xoGame !== 'undefined') xoGame.reset();
        if (gameType === 'c4' && typeof c4Game !== 'undefined') c4Game.reset();
    },

    // تبديل مستوى الصعوبة (سهل / ذكي)
    toggleDifficulty() {
        this.difficulty = this.difficulty === 'easy' ? 'smart' : 'easy';
        this.updateUI();
    },

    // حركة الكمبيوتر في لعبة إكس-أو (Tic-Tac-Toe)
    makeXOMove() {
        if (this.mode !== 'computer' || !xoGame.gameActive || xoGame.currentPlayer !== 'O') return;

        const available = xoGame.board.map((v, i) => v === '' ? i : null).filter(v => v !== null);
        if (available.length === 0) return;

        let move = -1;

        // في المستوى الذكي: فحص الفوز أو الحجب
        if (this.difficulty === 'smart') {
            const winCond = [
                [0, 1, 2], [3, 4, 5], [6, 7, 8],
                [0, 3, 6], [1, 4, 7], [2, 5, 8],
                [0, 4, 8], [2, 4, 6]
            ];

            // 1. فرصة فوز للكمبيوتر
            for (const [a, b, c] of winCond) {
                const line = [xoGame.board[a], xoGame.board[b], xoGame.board[c]];
                if (line.filter(x => x === 'O').length === 2 && line.includes('')) {
                    move = [a, b, c][line.indexOf('')];
                    break;
                }
            }

            // 2. حجب فوز الطفل
            if (move === -1) {
                for (const [a, b, c] of winCond) {
                    const line = [xoGame.board[a], xoGame.board[b], xoGame.board[c]];
                    if (line.filter(x => x === 'X').length === 2 && line.includes('')) {
                        move = [a, b, c][line.indexOf('')];
                        break;
                    }
                }
            }

            // 3. اختيار المركز
            if (move === -1 && xoGame.board[4] === '' && Math.random() > 0.4) {
                move = 4;
            }
        }

        // في المستوى السهل أو في غياب شروط الفوز: اختيار خانة عشوائية ليفوز الطفل بسهولة
        if (move === -1) {
            move = available[Math.floor(Math.random() * available.length)];
        }

        const container = document.getElementById('xo-board');
        if (container && container.children[move]) {
            xoGame.play(move, container.children[move]);
        }
    },

    // حركة الكمبيوتر في لعبة Connect 4 (أربعة في خط)
    makeC4Move() {
        if (this.mode !== 'computer' || !c4Game.gameActive || c4Game.currentPlayer !== 'yellow') return;

        const validCols = [];
        for (let c = 0; c < c4Game.cols; c++) {
            if (c4Game.board[0][c] === null) validCols.push(c);
        }
        if (validCols.length === 0) return;

        let bestCol = -1;

        if (this.difficulty === 'smart') {
            // 1. فحص الفوز للكمبيوتر (أصفر)
            for (const col of validCols) {
                const r = this.getC4LowestRow(col);
                if (r !== -1) {
                    c4Game.board[r][col] = 'yellow';
                    if (c4Game.checkWin(r, col)) bestCol = col;
                    c4Game.board[r][col] = null;
                    if (bestCol !== -1) break;
                }
            }

            // 2. حجب فوز الطفل (أحمر)
            if (bestCol === -1) {
                for (const col of validCols) {
                    const r = this.getC4LowestRow(col);
                    if (r !== -1) {
                        c4Game.board[r][col] = 'red';
                        if (c4Game.checkWin(r, col)) bestCol = col;
                        c4Game.board[r][col] = null;
                        if (bestCol !== -1) break;
                    }
                }
            }
        }

        // في المستوى السهل أو غياب الشروط: اختيار عمود عشوائي خفيف
        if (bestCol === -1) {
            bestCol = validCols[Math.floor(Math.random() * validCols.length)];
        }

        c4Game.drop(bestCol);
    },

    // دالة مساعدة لمعرفة أدنى صف فارغ في العمود
    getC4LowestRow(col) {
        for (let r = c4Game.rows - 1; r >= 0; r--) {
            if (!c4Game.board[r][col]) return r;
        }
        return -1;
    },

    // تحديث مظهر وتسميات أزرار التحكم
    updateUI() {
        const isComp = this.mode === 'computer';
        const modeLabel = isComp ? '🤖 ضد الكمبيوتر' : '👨‍🏫 مع المعلم';
        const diffLabel = this.difficulty === 'easy' ? 'سهل 😊' : 'ذكي 🧠';

        // أزرار XO
        const xoModeBtn = document.getElementById('xo-mode-btn');
        const xoDiffBtn = document.getElementById('xo-diff-btn');
        if (xoModeBtn) {
            xoModeBtn.innerText = modeLabel;
            xoModeBtn.className = isComp
                ? 'bg-emerald-500/80 hover:bg-emerald-500 text-white border border-emerald-300/40 px-3.5 py-1.5 rounded-full font-bold text-xs shadow-sm transition-all'
                : 'bg-indigo-500/80 hover:bg-indigo-500 text-white border border-indigo-300/40 px-3.5 py-1.5 rounded-full font-bold text-xs shadow-sm transition-all';
        }
        if (xoDiffBtn) {
            xoDiffBtn.style.display = isComp ? 'inline-block' : 'none';
            xoDiffBtn.innerText = `مستوى: ${diffLabel}`;
        }

        // أزرار Connect 4
        const c4ModeBtn = document.getElementById('c4-mode-btn');
        const c4DiffBtn = document.getElementById('c4-diff-btn');
        if (c4ModeBtn) {
            c4ModeBtn.innerText = modeLabel;
            c4ModeBtn.className = isComp
                ? 'bg-sky-500/80 hover:bg-sky-500 text-white border border-sky-300/40 px-3.5 py-1.5 rounded-full font-bold text-xs shadow-sm transition-all'
                : 'bg-indigo-500/80 hover:bg-indigo-500 text-white border border-indigo-300/40 px-3.5 py-1.5 rounded-full font-bold text-xs shadow-sm transition-all';
        }
        if (c4DiffBtn) {
            c4DiffBtn.style.display = isComp ? 'inline-block' : 'none';
            c4DiffBtn.innerText = `مستوى: ${diffLabel}`;
        }
    }
};

// تهيئة تلقائية للواجهة عند التحميل
document.addEventListener('DOMContentLoaded', () => {
    if (typeof gameAI !== 'undefined') gameAI.updateUI();
});

/* ==========================================================================
   MODULE: games-extra.js
   ========================================================================== */

const memoryGame = {
    iconSets: [
        ['🍎', '🍌', '🍉', '🍇', '🍓', '🥑', '🥕', '🌽'],
        ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼'],
        ['🚗', '🚕', '🚙', '🚌', '🚓', '🚑', '🚒', '🚜'],
        ['⚽', '🏀', '🏈', '⚾', '🎾', '🏐', '🏓', '🎱'],
        ['🌞', '🌝', '🌛', '🌜', '🌙', '⭐', '🌟', '☄️']
    ],
    currentSetIndex: 0, cards: [], hasFlippedCard: false, lockBoard: false, firstCard: null, secondCard: null, matchedPairs: 0, gameActive: true, flipTimer: null,
    init() {
        if (this.flipTimer) { clearTimeout(this.flipTimer); this.flipTimer = null; }
        this.cards = [...this.iconSets[this.currentSetIndex], ...this.iconSets[this.currentSetIndex]];
        this.shuffleCards(); this.renderBoard();
        this.matchedPairs = 0; this.hasFlippedCard = false; this.lockBoard = false; this.firstCard = null; this.secondCard = null; this.gameActive = true;
        const status = document.getElementById('memory-status'); if (status) { status.textContent = "Find all matching pairs! 🧠"; status.classList.remove('text-yellow-300'); }
        if (typeof app !== 'undefined') app.setGameResumeState('memory-resume-btn', false, '', "Skip to Wordwall ⏭️");
    },
    shuffleCards() {
        if (typeof app !== 'undefined' && typeof app.shuffle === 'function') {
            app.shuffle(this.cards);
        } else {
            for (let i = this.cards.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
            }
        }
    },
    renderBoard() {
        const board = document.getElementById('memory-board'); if (!board) return; board.textContent = '';
        this.cards.forEach((icon, idx) => {
            const scene = document.createElement('div'); scene.className = 'mem-scene';
            const card = document.createElement('button');
            card.type = 'button';
            card.className = 'mem-card';
            card.dataset.icon = icon;
            card.setAttribute('aria-label', `Memory card ${idx + 1}, hidden`);
            card.setAttribute('aria-pressed', 'false');
            card.onclick = () => this.flipCard(card);
            const front = document.createElement('div'); front.className = 'mem-face mem-face-front shadow-[0_4px_0_#be123c] active:translate-y-1 active:shadow-none'; front.innerText = '❓';
            const back = document.createElement('div'); back.className = 'mem-face mem-face-back'; back.innerText = icon;
            card.appendChild(front); card.appendChild(back); scene.appendChild(card); board.appendChild(scene);
        });
    },
    flipCard(card) {
        if (!this.gameActive || this.lockBoard || card === this.firstCard || card.classList.contains('is-flipped')) return;
        card.classList.add('is-flipped');
        card.setAttribute('aria-label', `Card with ${card.dataset.icon}`);
        card.setAttribute('aria-pressed', 'true');
        if (!this.hasFlippedCard) { this.hasFlippedCard = true; this.firstCard = card; return; }
        this.secondCard = card; this.checkForMatch();
    },
    checkForMatch() {
        let isMatch = this.firstCard.dataset.icon === this.secondCard.dataset.icon;
        if (isMatch) this.disableCards(); else this.unflipCards();
    },
    disableCards() {
        this.firstCard.setAttribute('aria-label', `Matched pair: ${this.firstCard.dataset.icon}`);
        this.secondCard.setAttribute('aria-label', `Matched pair: ${this.secondCard.dataset.icon}`);
        this.firstCard.disabled = true;
        this.secondCard.disabled = true;
        this.firstCard.onclick = null; this.secondCard.onclick = null; this.matchedPairs++; this.resetBoard();
        if (this.matchedPairs === 8) {
            this.gameActive = false;
            const status = document.getElementById('memory-status'); if (status) { status.textContent = "🏆 Fantastic! You matched them all!"; status.classList.add('text-yellow-300'); }
            fireCelebration();
            if (typeof app !== 'undefined') app.setGameResumeState('memory-resume-btn', true, "Wordwall Games 🎡");
        }
    },
    unflipCards() {
        this.lockBoard = true;
        if (this.flipTimer) clearTimeout(this.flipTimer);
        this.flipTimer = setTimeout(() => {
            if (this.firstCard) {
                this.firstCard.classList.remove('is-flipped');
                this.firstCard.setAttribute('aria-label', 'Memory card, hidden');
                this.firstCard.setAttribute('aria-pressed', 'false');
            }
            if (this.secondCard) {
                this.secondCard.classList.remove('is-flipped');
                this.secondCard.setAttribute('aria-label', 'Memory card, hidden');
                this.secondCard.setAttribute('aria-pressed', 'false');
            }
            this.resetBoard();
            this.flipTimer = null;
        }, 1000);
    },
    resetBoard() { [this.hasFlippedCard, this.lockBoard] = [false, false]; [this.firstCard, this.secondCard] = [null, null]; },
    reset() {
        if (this.flipTimer) { clearTimeout(this.flipTimer); this.flipTimer = null; }
        this.currentSetIndex = (this.currentSetIndex + 1) % this.iconSets.length;
        this.init();
    }
};

const riddlesGame = {
    idx: 0,
    isAnswering: false,
    timer: null,
    data: [
        { questionText: "What speaks all languages in the world but has no tongue?", options: ["A telephone", "An echo", "A book", "A flag"], answerIndex: 1 },
        { questionText: "What gets larger the more you take away from it, and smaller if you add to it?", options: ["A hole", "Time", "Age", "Money"], answerIndex: 0 },
        { questionText: "What has many teeth but cannot bite?", options: ["A crocodile", "A saw", "A comb", "A key"], answerIndex: 2 }
    ],
    init() { this.idx = 0; this.isAnswering = false; },
    reset() {
        if (this.timer) { clearTimeout(this.timer); this.timer = null; }
        this.init();
        if (typeof app !== 'undefined') app.setGameResumeState('riddles-resume-btn', false, '', "Skip to Wordwall ⏭️");
        this.loadNext();
    },
    loadNext() {
        if (this.idx >= this.data.length) {
            fireCelebration();
            const qEl = document.getElementById('riddle-question'); if (qEl) qEl.innerText = "🏆 Unbelievable! You solved all the riddles and earned the Quran Genius Badge!";
            const optsDiv = document.getElementById('riddle-options'); if (optsDiv) optsDiv.textContent = '';
            if (typeof app !== 'undefined') app.setGameResumeState('riddles-resume-btn', true, "Wordwall Room 🎡");
            return;
        }
        const riddle = this.data[this.idx];
        const qEl = document.getElementById('riddle-question'); if (qEl) qEl.innerText = riddle.questionText;
        const optsDiv = document.getElementById('riddle-options'); if (optsDiv) optsDiv.textContent = '';
        const fbEl = document.getElementById('riddle-feedback'); if (fbEl) fbEl.innerText = '';
        if (optsDiv) {
            riddle.options.forEach((opt, i) => {
                let btn = document.createElement('button');
                btn.className = "bg-white/20 hover:bg-white/30 text-xl font-bold py-5 rounded-2xl shadow-md transition-all active:scale-95 text-left px-6 flex justify-between items-center shadow-[0_4px_0_#d97706] active:translate-y-1 active:shadow-none";
                btn.innerHTML = `<span>${opt}</span><span class="text-sm opacity-55">Option ${i + 1}</span>`;
                btn.onclick = () => this.check(i, btn);
                optsDiv.appendChild(btn);
            });
        }
    },
    check(selectedIdx, btn) {
        if (this.isAnswering) return;
        this.isAnswering = true;
        const correctIdx = this.data[this.idx].answerIndex;
        const fb = document.getElementById('riddle-feedback');
        if (selectedIdx === correctIdx) {
            btn.classList.remove('bg-white/20');
            btn.classList.add('bg-emerald-500');
            if (fb) { fb.innerText = "Genius correct answer! Excellent 👏"; fb.className = "text-lg sm:text-xl font-bold h-8 text-emerald-400 mt-3"; }
            if (typeof confetti === 'function') confetti({ particleCount: 50, spread: 60, origin: { y: 0.8 } });
            this.timer = setTimeout(() => {
                this.idx++;
                this.isAnswering = false;
                this.timer = null;
                this.loadNext();
            }, 1500);
        } else {
            btn.classList.remove('bg-white/20');
            btn.classList.add('bg-rose-500');
            if (fb) { fb.innerText = "Oops! Think again!"; fb.className = "text-lg sm:text-xl font-bold h-8 text-rose-400 mt-3"; }
            this.timer = setTimeout(() => {
                btn.classList.remove('bg-rose-500');
                btn.classList.add('bg-white/20');
                if (fb) { fb.innerText = ""; fb.className = "text-lg sm:text-xl font-bold h-8 text-emerald-400 mt-3"; }
                this.isAnswering = false;
                this.timer = null;
            }, 1000);
        }
    }
};

/* ==========================================================================
   MODULE: rule-manager.js
   ========================================================================== */

const ruleManager = {
    step: 0,
    init() { this.step = 0; this.render(); },
    render() {
        if (typeof rulesData === 'undefined' || !Array.isArray(rulesData) || rulesData.length === 0) return;
        if (this.step < 0) this.step = 0;
        if (this.step >= rulesData.length) this.step = rulesData.length - 1;
        const data = rulesData[this.step];
        if (!data) return;

        const indicator = document.getElementById('rule-step-indicator');
        if (indicator) indicator.innerText = rulesData.length === 1 ? 'LESSON RULE' : `RULE ${this.step + 1} OF ${rulesData.length}`;
        const titleEl = document.getElementById('rule-title'); if (titleEl) titleEl.innerText = data.title || '';
        const descEl = document.getElementById('rule-desc'); if (descEl) descEl.innerText = data.desc || '';
        const bigText = document.getElementById('rule-big-text'); 
        if (bigText && typeof app !== 'undefined') {
            app.setSafeHTML(bigText, data.html || '');
        }
        const prevBtn = document.getElementById('rule-prev-btn');
        if (prevBtn) { if (this.step > 0) prevBtn.classList.remove('hidden'); else prevBtn.classList.add('hidden'); }
        const nextBtn = document.getElementById('rule-next-btn');
        if (nextBtn) {
            if (this.step === rulesData.length - 1) {
                nextBtn.innerText = "Start Challenge! 🚀";
                nextBtn.className = "bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-black py-4 px-8 rounded-2xl text-sm transition-transform active:scale-95 shadow-lg flex-1 animate-pulse";
            } else {
                nextBtn.innerText = "Next Rule ➡";
                nextBtn.className = "bg-emerald-500 hover:bg-emerald-600 text-white font-black py-4 px-8 rounded-2xl text-sm transition-transform active:scale-95 shadow-md flex-1";
            }
        }
    },
    next() {
        if (typeof rulesData === 'undefined' || !Array.isArray(rulesData) || rulesData.length === 0) {
            if (typeof app !== 'undefined') app.startChallenge();
            return;
        }
        if (this.step < rulesData.length - 1) { this.step++; this.render(); }
        else { if (typeof app !== 'undefined') app.startChallenge(); }
    },
    prev() {
        if (this.step > 0) { this.step--; this.render(); }
    }
};

