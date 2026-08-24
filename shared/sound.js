/**
 * Nour Al-Bayan Interactive Platform - Shared Audio & FX Engine
 * Refactored & Hardened (Zero Memory Leaks, Zero Frame Drops, Perceptual Volume, Mobile Unlock)
 */

const Sound = {
    ctx: null,
    masterGain: null,
    compressor: null,
    _unlocked: false,

    // تهيئة السياق الصوتي وفك تعليقه بطريقة آمنة ومحصنة ضد أخطاء المتصفح
    getCtx() {
        if (typeof window === 'undefined') return null;
        try {
            if (!this.ctx) {
                const AudioCtx = window.AudioContext || window.webkitAudioContext;
                if (!AudioCtx) return null;
                this.ctx = new AudioCtx();
                this._initGraph();
            }
            if (this.ctx.state === 'suspended') {
                this.ctx.resume().catch(() => {});
            } else if (this.ctx.state === 'closed') {
                const AudioCtx = window.AudioContext || window.webkitAudioContext;
                this.ctx = AudioCtx ? new AudioCtx() : null;
                if (this.ctx) this._initGraph();
            }
        } catch (e) {
            console.warn('AudioContext initialization error:', e);
            this.ctx = null;
        }
        return this.ctx;
    },

    // بناء ناقل التحكم العام masterGain وعقدة الضاغط الديناميكي لمنع التشبع الصوتي
    _initGraph() {
        if (!this.ctx) return;
        try {
            this.compressor = this.ctx.createDynamicsCompressor();
            this.compressor.threshold.setValueAtTime(-24, this.ctx.currentTime);
            this.compressor.knee.setValueAtTime(30, this.ctx.currentTime);
            this.compressor.ratio.setValueAtTime(12, this.ctx.currentTime);
            this.compressor.attack.setValueAtTime(0.003, this.ctx.currentTime);
            this.compressor.release.setValueAtTime(0.25, this.ctx.currentTime);

            this.masterGain = this.ctx.createGain();
            this.updateMasterVolume();

            // ربط السلسلة الصوتية: masterGain -> compressor -> destination
            this.masterGain.connect(this.compressor);
            this.compressor.connect(this.ctx.destination);
        } catch (e) {
            console.warn('Audio graph initialization error:', e);
        }
    },

    // تحديث مستوى الناقل العام فورياً عند تعديل الإعدادات
    updateMasterVolume() {
        const vol = this.getVol();
        if (this.masterGain && this.ctx) {
            try {
                this.masterGain.gain.setValueAtTime(vol, this.ctx.currentTime);
            } catch (_) {
                try {
                    this.masterGain.gain.value = vol;
                } catch (_) {}
            }
        }
    },

    // فك تعليق الصوت التلقائي عند أول تفاعل للمستخدم على شاشات اللمس
    setupUnlock() {
        if (this._unlocked || typeof window === 'undefined') return;
        const unlock = () => {
            try {
                const ctx = this.getCtx();
                if (ctx) {
                    if (ctx.state === 'suspended') {
                        ctx.resume().then(() => {
                            this._unlocked = true;
                            this.updateMasterVolume();
                        }).catch(() => {});
                    } else {
                        this._unlocked = true;
                        this.updateMasterVolume();
                    }
                }
            } catch (_) {}
            window.removeEventListener('pointerdown', unlock, { capture: true });
            window.removeEventListener('touchstart', unlock, { capture: true });
            window.removeEventListener('keydown', unlock, { capture: true });
            window.removeEventListener('click', unlock, { capture: true });
        };
        window.addEventListener('pointerdown', unlock, { capture: true, once: true });
        window.addEventListener('touchstart', unlock, { capture: true, once: true });
        window.addEventListener('keydown', unlock, { capture: true, once: true });
        window.addEventListener('click', unlock, { capture: true, once: true });
    },

    // استخراج شدة الصوت الحقيقية مع تصحيح علة الصفر الزائف وتطبيق المنحنى الإدراكي
    getVol() {
        if (typeof settingsManager !== 'undefined') {
            const s = settingsManager.get();
            if (!s || !s.soundEnabled) return 0;
            const rawVol = (typeof s.volume === 'number') ? s.volume : 80;
            if (rawVol <= 0) return 0;
            const normalized = Math.max(0, Math.min(100, rawVol)) / 100;
            return normalized * normalized; // منحنى تربيعي إدراكي مريح
        }
        return 0.64; // 0.8^2
    },

    // إرجاع نقطة الاتصال الصوتية المجمعة (الناقل العام أو المخرج المباشر)
    getDestination() {
        return this.masterGain || (this.ctx ? this.ctx.destination : null);
    },

    // تنظيف وفصل عقد الصوت فور انتهاء النغمة لمنع تسريب الذاكرة وقطع الإحالة الحلقية
    _cleanup(osc, gainNode) {
        osc.onended = () => {
            osc.onended = null;
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

    // دالة توافقية توجه الاستدعاء مباشرة إلى دالة tone مع ترتيب المعاملات المناسب
    playTone(freq, type = 'sine', duration = 0.2) {
        this.tone(freq, duration, type);
    },

    playChime() {
        const vol = this.getVol();
        if (vol <= 0) return;
        const ctx = this.getCtx();
        if (!ctx) return;
        this.updateMasterVolume();

        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();
        const dest = this.getDestination();
        if (!dest) return;

        osc.type = 'sine';
        osc.connect(gainNode);
        gainNode.connect(dest);

        osc.frequency.setValueAtTime(523.25, now);
        osc.frequency.setValueAtTime(659.25, now + 0.1);
        osc.frequency.setValueAtTime(783.99, now + 0.2);
        osc.frequency.setValueAtTime(1046.50, now + 0.3);

        gainNode.gain.setValueAtTime(0.0001, now);
        gainNode.gain.linearRampToValueAtTime(0.18, now + 0.02);
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
        this.updateMasterVolume();

        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();
        const dest = this.getDestination();
        if (!dest) return;

        osc.type = type;
        osc.frequency.setValueAtTime(freq, now);
        osc.connect(gainNode);
        gainNode.connect(dest);

        const attack = Math.min(0.015, d * 0.2);
        gainNode.gain.setValueAtTime(0.0001, now);
        gainNode.gain.linearRampToValueAtTime(0.18, now + attack);
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
        this.updateMasterVolume();

        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();
        const dest = this.getDestination();
        if (!dest) return;

        osc.type = 'sine';
        osc.frequency.setValueAtTime(330, now);
        osc.frequency.linearRampToValueAtTime(220, now + 0.18);
        osc.connect(gainNode);
        gainNode.connect(dest);

        // منع النقر الصوتي (Audio Pop) عبر الصعود الميكروي من 0.0001
        gainNode.gain.setValueAtTime(0.0001, now);
        gainNode.gain.linearRampToValueAtTime(0.15, now + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);
        gainNode.gain.setValueAtTime(0, now + 0.19);

        this._cleanup(osc, gainNode);
        osc.start(now);
        osc.stop(now + 0.19);
    }
};

// تهيئة مستمعات اللمس وتحديث الصوت تلقائياً
if (typeof window !== 'undefined') {
    Sound.setupUnlock();
    window.addEventListener('storage', () => {
        if (Sound.ctx && Sound.masterGain) Sound.updateMasterVolume();
    });
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
    if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
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
