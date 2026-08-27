(function (global) {
    'use strict';

    const SettingsDialog = {
    open() {
        this._lastFocusedElement = document.activeElement;
        this.ensureModalExists();
        const modal = document.getElementById('nb-settings-modal');
        if (!modal) return;

        if (typeof i18n !== 'undefined' && typeof i18n.translateDOM === 'function') {
            i18n.translateDOM(modal);
        }

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
        if (this._lastFocusedElement && typeof this._lastFocusedElement.focus === 'function' && document.body.contains(this._lastFocusedElement)) {
            this._lastFocusedElement.focus();
        }
        this._lastFocusedElement = null;
    },

    // مزامنة عناصر الإدخال في النموذج مع القيم عبر حلقة بيانات موحدة
    syncFormWithSettings(s) {
        const fieldMap = [
            { id: 'cfg-sound-enabled', prop: 'soundEnabled', check: true },
            { id: 'cfg-volume', prop: 'volume' },
            { id: 'cfg-game-breaks', prop: 'gameBreaksEnabled', check: true },
            { id: 'cfg-game-mode', prop: 'defaultGameMode' },
            { id: 'cfg-game-diff', prop: 'defaultDifficulty' },
            { id: 'cfg-timer-duration', prop: 'timerDuration' },
            { id: 'cfg-font-scale', prop: 'fontScale' },
            { id: 'cfg-theme-mode', prop: 'themeMode' },
            { id: 'cfg-shuffle-cards', prop: 'shuffleCards', check: true },
            { id: 'cfg-no-penalty', prop: 'noPenaltyMode', check: true },
            { id: 'cfg-manual-advance', prop: 'manualAdvance', check: true },
            { id: 'cfg-remediation-drill-mode', prop: 'remediationDrillMode' },
            { id: 'nb-opt-repeat-policy', prop: 'repeatGradingPolicy' }
        ];

        fieldMap.forEach(({ id, prop, check }) => {
            const el = document.getElementById(id);
            if (!el || s[prop] === undefined) return;
            if (check) {
                el.checked = !!s[prop];
            } else {
                el.value = s[prop];
            }
        });

        const volVal = document.getElementById('cfg-volume-val');
        if (volVal) volVal.innerText = `${s.volume || 0}%`;
    },

    // توليد كود HTML لنافذة الإعدادات مزيناً بكافة سمات data-i18n*
    getModalHTML() {
        const t = (k, f) => this._t(k, f);
        return `
        <div id="nb-settings-modal" class="hidden fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm items-center justify-center p-3 sm:p-4 overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby="settings-modal-title">
            <div class="bg-white w-full max-w-lg rounded-[2rem] shadow-2xl border border-emerald-100 overflow-hidden flex flex-col my-auto animate-in fade-in zoom-in duration-150" dir="${(typeof i18n !== 'undefined' && i18n.getActiveMeta) ? i18n.getActiveMeta().dir : 'rtl'}">
                <!-- Header -->
                <div class="bg-gradient-to-l from-emerald-600 to-teal-700 p-4 sm:p-5 text-white flex items-center justify-between shadow-md">
                    <div class="flex items-center gap-2.5">
                        <span class="text-2xl sm:text-3xl" aria-hidden="true">⚙️</span>
                        <div>
                            <h2 id="settings-modal-title" data-i18n="settings_modal_title" class="text-lg sm:text-xl font-black tracking-tight leading-tight">${t("settings_modal_title", "إعدادات المنظومة")}</h2>
                            <p data-i18n="settings_saved_notice" class="text-xs text-emerald-100 font-medium">${t("settings_saved_notice", "يتم حفظ التعديلات فورياً")}</p>
                        </div>
                    </div>
                    <button id="nb-settings-close-btn" data-i18n-aria="close" onclick="settingsManager.close()" class="p-2 rounded-full hover:bg-white/20 text-white/90 hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-white" aria-label="${t('close', 'إغلاق')}">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                </div>

                <!-- Body Controls -->
                <div class="p-4 sm:p-6 space-y-4 sm:space-y-5 overflow-y-auto max-h-[70vh] text-slate-700 text-sm">
                    
                    <!-- Section 1: الصوتيات -->
                    <div class="bg-slate-50 p-3.5 sm:p-4 rounded-2xl border border-slate-200 space-y-3">
                        <h3 class="font-black text-emerald-800 flex items-center gap-2 text-xs sm:text-sm">
                            <span aria-hidden="true">🔊</span> <span data-i18n="audio_effects">${t("audio_effects", "المؤثرات الصوتية")}</span>
                        </h3>
                        <div class="flex items-center justify-between">
                            <label for="cfg-sound-enabled" data-i18n="sound_toggle_label" class="font-bold text-slate-700 cursor-pointer select-none">${t("sound_toggle_label", "تفعيل الصوت")}</label>
                            <input type="checkbox" id="cfg-sound-enabled" onchange="settingsManager.save({soundEnabled: this.checked}, {silent: true})" class="w-5 h-5 accent-emerald-600 rounded cursor-pointer">
                        </div>
                        <div class="space-y-1 pt-1">
                            <div class="flex justify-between text-xs font-bold text-slate-600">
                                <label for="cfg-volume" data-i18n="volume_level">${t("volume_level", "مستوى الصوت")}</label>
                                <span id="cfg-volume-val" class="font-mono text-emerald-700">80%</span>
                            </div>
                            <input type="range" id="cfg-volume" min="0" max="100" value="80" oninput="document.getElementById('cfg-volume-val').innerText = this.value + '%'" onchange="settingsManager.save({volume: parseInt(this.value, 10)}, {silent: true})" class="w-full accent-emerald-600 cursor-pointer">
                        </div>
                    </div>

                    <!-- Section 2: استراحات الألعاب والخصم الآلي -->
                    <div class="bg-slate-50 p-3.5 sm:p-4 rounded-2xl border border-slate-200 space-y-3">
                        <h3 class="font-black text-emerald-800 flex items-center gap-2 text-xs sm:text-sm">
                            <span aria-hidden="true">🎮</span> <span data-i18n="enable_game_breaks">${t("enable_game_breaks", "استراحات الألعاب")}</span>
                        </h3>
                        <div class="flex items-center justify-between">
                            <label for="cfg-game-breaks" data-i18n="game_breaks_toggle_label" class="font-bold text-slate-700 cursor-pointer select-none">${t("game_breaks_toggle_label", "تفعيل الاستراحات أثناء القراءة")}</label>
                            <input type="checkbox" id="cfg-game-breaks" onchange="settingsManager.save({gameBreaksEnabled: this.checked}, {silent: true})" class="w-5 h-5 accent-emerald-600 rounded cursor-pointer">
                        </div>
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                            <div>
                                <label for="cfg-game-mode" data-i18n="default_game_mode" class="block text-xs font-bold text-slate-600 mb-1">${t("default_game_mode", "وضع اللعب")}</label>
                                <select id="cfg-game-mode" onchange="settingsManager.save({defaultGameMode: this.value}, {silent: true})" class="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 font-bold text-xs text-slate-700 outline-none focus:border-emerald-500">
                                    <option value="computer" data-i18n="mode_vs_computer">${t("mode_vs_computer", "ضد الحاسوب")}</option>
                                    <option value="teacher" data-i18n="mode_vs_teacher">${t("mode_vs_teacher", "مع المعلم")}</option>
                                </select>
                            </div>
                            <div>
                                <label for="cfg-game-diff" data-i18n="ai_difficulty_label" class="block text-xs font-bold text-slate-600 mb-1">${t("ai_difficulty_label", "مستوى الذكاء")}</label>
                                <select id="cfg-game-diff" onchange="settingsManager.save({defaultDifficulty: this.value}, {silent: true})" class="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 font-bold text-xs text-slate-700 outline-none focus:border-emerald-500">
                                    <option value="easy" data-i18n="diff_easy">${t("diff_easy", "سهل")}</option>
                                    <option value="smart" data-i18n="diff_smart">${t("diff_smart", "ذكي")}</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <!-- Section 3: مؤقت القراءة وحجم الخط والترتيب العشوائي ونظام التقييم -->
                    <div class="bg-slate-50 p-3.5 sm:p-4 rounded-2xl border border-slate-200 space-y-3">
                        <h3 class="font-black text-emerald-800 flex items-center gap-2 text-xs sm:text-sm">
                            <span aria-hidden="true">⏱️</span> <span data-i18n="section_timer_font_eval">${t("section_timer_font_eval", "المؤقت وحجم الخط وخيارات الدرس")}</span>
                        </h3>
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            <div>
                                <label for="cfg-timer-duration" data-i18n="timer_duration_label" class="block text-xs font-bold text-slate-600 mb-1">${t("timer_duration_label", "مدة المؤقت")}</label>
                                <select id="cfg-timer-duration" onchange="settingsManager.save({timerDuration: parseFloat(this.value)}, {silent: true})" class="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 font-bold text-xs text-slate-700 outline-none focus:border-emerald-500">
                                    <option value="5" data-i18n="timer_5s">${t("timer_5s", "5 ثوانٍ")}</option>
                                    <option value="10" data-i18n="timer_10s">${t("timer_10s", "10 ثوانٍ")}</option>
                                    <option value="15" data-i18n="timer_15s">${t("timer_15s", "15 ثانية")}</option>
                                </select>
                            </div>
                            <div>
                                <label for="cfg-font-scale" data-i18n="font_scale_label" class="block text-xs font-bold text-slate-600 mb-1">${t("font_scale_label", "حجم الخط")}</label>
                                <select id="cfg-font-scale" onchange="settingsManager.save({fontScale: this.value}, {silent: true})" class="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 font-bold text-xs text-slate-700 outline-none focus:border-emerald-500">
                                    <option value="normal" data-i18n="font_normal">${t("font_normal", "افتراضي (100%)")}</option>
                                    <option value="large" data-i18n="font_large">${t("font_large", "كبير (122%)")}</option>
                                    <option value="xlarge" data-i18n="font_xlarge">${t("font_xlarge", "كبير جداً (145%)")}</option>
                                </select>
                            </div>
                            <div>
                                <label for="cfg-theme-mode" data-i18n="theme_mode_label" class="block text-xs font-bold text-slate-600 mb-1">${t("theme_mode_label", "سمة العرض")}</label>
                                <select id="cfg-theme-mode" onchange="settingsManager.save({themeMode: this.value}, {silent: true})" class="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 font-bold text-xs text-slate-700 outline-none focus:border-emerald-500">
                                    <option value="system" data-i18n="theme_system">${t("theme_system", "وفق النظام")}</option>
                                    <option value="light" data-i18n="theme_light">${t("theme_light", "فاتحة")}</option>
                                    <option value="dark" data-i18n="theme_dark">${t("theme_dark", "داكنة")}</option>
                                </select>
                            </div>
                        </div>
                        <div class="pt-2 border-t border-slate-200/80 flex items-center justify-between">
                            <div>
                                <label for="cfg-shuffle-cards" data-i18n="shuffle_cards_label" class="font-bold text-slate-700 cursor-pointer select-none text-xs sm:text-sm block">${t("shuffle_cards_label", "خلط الكلمات عشوائياً")}</label>
                                <span data-i18n="shuffle_cards_desc" class="text-[11px] text-slate-400 block">${t("shuffle_cards_desc", "منع حفظ مواضع الكلمات في الدرس")}</span>
                            </div>
                            <input type="checkbox" id="cfg-shuffle-cards" onchange="settingsManager.save({shuffleCards: this.checked}, {silent: true})" class="w-5 h-5 accent-emerald-600 rounded cursor-pointer">
                        </div>
                        <div class="pt-2 border-t border-slate-200/80 flex items-center justify-between">
                            <div>
                                <label for="cfg-no-penalty" data-i18n="no_penalty_label" class="font-bold text-slate-700 cursor-pointer select-none text-xs sm:text-sm block">${t("no_penalty_label", "نمط بدون خصم نقاط")}</label>
                                <span data-i18n="no_penalty_desc" class="text-[11px] text-slate-400 block">${t("no_penalty_desc", "تعزيز الثقة دون عقوبة عند الخطأ")}</span>
                            </div>
                            <input type="checkbox" id="cfg-no-penalty" onchange="settingsManager.save({noPenaltyMode: this.checked}, {silent: true})" class="w-5 h-5 accent-emerald-600 rounded cursor-pointer">
                        </div>
                        <div class="pt-2 border-t border-slate-200/80 flex items-center justify-between">
                            <div>
                                <label for="cfg-manual-advance" data-i18n="manual_advance_label" class="font-bold text-slate-700 cursor-pointer select-none text-xs sm:text-sm block">${t("manual_advance_label", "التقدم اليدوي للبطاقات")}</label>
                                <span data-i18n="manual_advance_desc" class="text-[11px] text-slate-400 block">${t("manual_advance_desc", "البقاء على الكلمة بعد التقييم للشرح")}</span>
                            </div>
                            <input type="checkbox" id="cfg-manual-advance" onchange="settingsManager.save({manualAdvance: this.checked}, {silent: true})" class="w-5 h-5 accent-emerald-600 rounded cursor-pointer">
                        </div>
                        <div class="pt-2 border-t border-slate-200/80">
                            <label for="cfg-remediation-drill-mode" data-i18n="remediation_drill_mode_label" class="block text-xs font-bold text-slate-600 mb-1">${t("remediation_drill_mode_label", "نمط جلسة المعالجة")}</label>
                            <select id="cfg-remediation-drill-mode" onchange="settingsManager.save({remediationDrillMode: this.value}, {silent: true})" class="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 font-bold text-xs text-slate-700 outline-none focus:border-emerald-500">
                                <option value="loop" data-i18n="drill_mode_loop">${t("drill_mode_loop", "تدوير الكلمات حتى الإتقان")}</option>
                                <option value="single_pass" data-i18n="drill_mode_single_pass">${t("drill_mode_single_pass", "مرور مفرد على الكلمات")}</option>
                                <option value="instant_repeat" data-i18n="drill_mode_instant_repeat">${t("drill_mode_instant_repeat", "تكرار موضعي فوري 3 مرات")}</option>
                            </select>
                        </div>
                    </div>

                    <!-- Section 4: سياسة تقييم تكرار الدروس للطلاب -->
                    <div class="bg-slate-50 p-3.5 sm:p-4 rounded-2xl border border-slate-200 space-y-3">
                        <h3 class="font-black text-emerald-800 flex items-center gap-2 text-xs sm:text-sm">
                            <span aria-hidden="true">📊</span> <span data-i18n="section_repeat_policy">${t("section_repeat_policy", "سياسة تكرار الدروس")}</span>
                        </h3>
                        <div>
                            <label for="nb-opt-repeat-policy" data-i18n="repeat_policy_label" class="block text-xs font-bold text-slate-600 mb-1">${t("repeat_policy_label", "سياسة احتساب النتيجة عند الإعادة")}</label>
                            <select id="nb-opt-repeat-policy" onchange="settingsManager.save({repeatGradingPolicy: this.value}, {silent: true})" class="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 font-bold text-xs text-slate-700 outline-none focus:border-emerald-500">
                                <option value="best" data-i18n="policy_best">${t("policy_best", "أعلى نتيجة محققة")}</option>
                                <option value="latest" data-i18n="policy_latest">${t("policy_latest", "نتيجة آخر محاولة")}</option>
                                <option value="cumulative" data-i18n="policy_cumulative">${t("policy_cumulative", "نقاط تراكمية إضافية")}</option>
                            </select>
                            <span data-i18n="repeat_policy_desc" class="text-[11px] text-slate-400 block mt-1">${t("repeat_policy_desc", "تحدد كيفية تحديث سجل الطالب عند تكرار نفس الدرس")}</span>
                        </div>
                    </div>

                </div>

                <!-- Footer Actions -->
                <div class="bg-slate-100 p-3.5 sm:p-4 border-t border-slate-200 flex items-center justify-between gap-2">
                    <button onclick="settingsManager.reset()" data-i18n-aria="settings_reset_btn" class="text-xs font-bold text-rose-600 hover:text-rose-700 px-3 py-2 rounded-xl hover:bg-rose-50 transition-colors" aria-label="${t('settings_reset_btn', 'استعادة الافتراضي')}">
                        <span data-i18n="settings_reset_btn">${t("settings_reset_btn", "استعادة الافتراضي")}</span>
                    </button>
                    <button onclick="settingsManager.close()" data-i18n-aria="save_and_close" class="bg-emerald-600 hover:bg-emerald-700 text-white font-black px-6 py-2.5 rounded-xl text-xs sm:text-sm shadow-md transition-transform hover:scale-105" aria-label="${t('save_and_close', 'حفظ وإغلاق')}">
                        <span data-i18n="save_and_close">${t("save_and_close", "حفظ وإغلاق")}</span>
                    </button>
                </div>
            </div>
        </div>
        `;
    },

    // إنشاء هيكل النافذة المنبثقة إن لم تكن موجودة في الصفحة
    ensureModalExists() {
        if (document.getElementById('nb-settings-modal')) return;
        const modalHtml = this.getModalHTML();
        document.body.insertAdjacentHTML('beforeend', modalHtml);

        // ربط حصر التركيز والإغلاق بمفتاح Escape
        const modal = document.getElementById('nb-settings-modal');
        if (modal) {
            if (typeof i18n !== 'undefined' && typeof i18n.translateDOM === 'function') {
                i18n.translateDOM(modal);
            }

            modal.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    e.preventDefault();
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

    // إشعار عائم بحفظ الإعدادات مع دعم قارئات الشاشة (Screen Reader Live Region)
    showToast(msg) {
        let toast = document.getElementById('nb-settings-toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'nb-settings-toast';
            toast.setAttribute('role', 'status');
            toast.setAttribute('aria-live', 'polite');
            toast.setAttribute('aria-atomic', 'true');
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

    global.SettingsDialog = SettingsDialog;
})(typeof window !== 'undefined' ? window : globalThis);
